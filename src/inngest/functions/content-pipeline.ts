/**
 * Content Pipeline - Main Orchestration Function
 * 
 * ⚠️ DEPRECATED: This monolithic pipeline is kept for testing/comparison purposes.
 * The recommended approach is to use separate stage functions:
 * - generate-outline.ts (listens to content/pipeline.start)
 * - generate-draft.ts (listens to content/outline.approved)
 * - finalize-content.ts (listens to content/draft.approved)
 * 
 * The separate functions complete quickly and don't stay in "Running" state while
 * waiting for approvals, providing better error handling and observability.
 * 
 * This function stays in "Running" state for days while waiting for manual approvals,
 * which makes it harder to debug and monitor. Both approaches can run in parallel
 * temporarily for comparison.
 * 
 * This is the main workflow that orchestrates the entire content generation process:
 * 1. Assemble context (company info, industry, persona)
 * 2. Generate outline
 * 3. Wait for outline approval
 * 4. Generate draft
 * 5. Wait for draft approval
 * 6. Finalize
 * 
 * TypeScript Note: Inngest functions are typed - the event parameter will
 * be automatically typed based on the event name we're listening for.
 */

import { inngest } from "../client.js";
import {
  getRecord,
  updateRecord,
  getIndustry,
  getPersona,
  getActiveArtifacts,
} from "../../lib/airtable.js";
import { getPrompt } from "../../lib/langfuse.js";
import { generate } from "../../lib/claude.js";
import { getContextBundle } from "../../lib/context.js";

/**
 * Main content pipeline function
 * 
 * This function is triggered by the "content/pipeline.start" event.
 * It handles the entire workflow from outline generation to final content.
 */
export const contentPipeline = inngest.createFunction(
  {
    id: "content-pipeline",
    retries: 3, // Automatically retry up to 3 times if it fails
  },
  { event: "content/pipeline.start" },
  async ({ event, step, runId }) => {
    // Extract data from the event
    const { recordId, title, industryId, personaId, contentType, keywords } =
      event.data;

    // Store run ID for debugging
    await step.run("store-run-id", async () => {
      await updateRecord(recordId, {
        "Inngest Run ID": runId,
        Status: "Generating",
      });
    });

    // =========================================
    // STEP 1: Assemble Context
    // =========================================
    const context = await step.run("assemble-context", async () => {
      // Load static context from markdown files in /context folder
      const staticContext = getContextBundle([
        "company-profile",
        "voice-guidelines",
        "product-overview",
        "differentiators",
      ]);

      // Load dynamic context from Airtable (optional, for things that change often)
      const artifacts = await getActiveArtifacts();
      
      // Load industry/persona from Airtable
      const industry = industryId ? await getIndustry(industryId) : null;
      const persona = personaId ? await getPersona(personaId) : null;

      return {
        // From markdown files (stable, version-controlled)
        companyProfile: staticContext["company-profile"],
        voiceGuidelines: staticContext["voice-guidelines"],
        productOverview: staticContext["product-overview"],
        differentiators: staticContext["differentiators"],
        
        // From Airtable Context Artifacts table (optional override)
        ...artifacts,
        
        // From Airtable linked records
        industry,
        persona,
        keywords: keywords || "",
      };
    });

    // =========================================
    // STEP 2: Generate Outline
    // =========================================
    const outline = await step.run("generate-outline", async () => {
      const promptTemplate = await getPrompt(`outline-${contentType}`, {
        title,
        // From context files
        companyProfile: context.companyProfile,
        voiceGuidelines: context.voiceGuidelines,
        productOverview: context.productOverview,
        differentiators: context.differentiators,
        // From Airtable industry/persona
        industryName: context.industry?.name || "General",
        industryDescription: context.industry?.description || "",
        industryPainPoints: context.industry?.painPoints || "",
        personaName: context.persona?.name || "General audience",
        personaTitle: context.persona?.title || "",
        personaGoals: context.persona?.goals || "",
        personaPainPoints: context.persona?.painPoints || "",
        // From Airtable row
        keywords: context.keywords,
      });

      const result = await generate({
        prompt: promptTemplate,
        recordId,
        step: "outline",
      });

      return result.text;
    });

    // =========================================
    // STEP 3: Update Airtable & Wait for Approval
    // =========================================
    await step.run("update-outline", async () => {
      await updateRecord(recordId, {
        Outline: outline,
        Status: "Outline Review",
      });
    });

    // Wait for outline approval (up to 30 days)
    // TypeScript Note: waitForEvent returns the event data when it arrives
    const outlineApproval = await step.waitForEvent("wait-outline-approval", {
      event: "content/outline.approved",
      timeout: "30d",
      match: "data.recordId", // Only match events for this recordId
    });

    if (!outlineApproval) {
      await updateRecord(recordId, { Status: "Error" });
      return { status: "timeout", stage: "outline" };
    }

    // =========================================
    // STEP 4: Generate Draft
    // =========================================
    const finalOutline = outlineApproval.data.outline;
    const outlineFeedback = outlineApproval.data.feedback;

    await step.run("update-drafting-status", async () => {
      await updateRecord(recordId, { Status: "Drafting" });
    });

    const draft = await step.run("generate-draft", async () => {
      const promptTemplate = await getPrompt(`draft-${contentType}`, {
        title,
        // From context files
        companyProfile: context.companyProfile,
        voiceGuidelines: context.voiceGuidelines,
        productOverview: context.productOverview,
        differentiators: context.differentiators,
        // From Airtable industry/persona
        industryName: context.industry?.name || "General",
        personaName: context.persona?.name || "General audience",
        // From previous step
        outline: finalOutline,
        feedback: outlineFeedback || "",
        // From Airtable row
        keywords: context.keywords,
      });

      const result = await generate({
        prompt: promptTemplate,
        recordId,
        step: "draft",
        maxTokens: 8192,
      });

      return result.text;
    });

    // =========================================
    // STEP 5: Update Airtable & Wait for Draft Approval
    // =========================================
    await step.run("update-draft", async () => {
      await updateRecord(recordId, {
        Draft: draft,
        Status: "Draft Review",
      });
    });

    // Wait for draft approval
    const draftApproval = await step.waitForEvent("wait-draft-approval", {
      event: "content/draft.approved",
      timeout: "30d",
      match: "data.recordId",
    });

    if (!draftApproval) {
      await updateRecord(recordId, { Status: "Error" });
      return { status: "timeout", stage: "draft" };
    }

    // =========================================
    // STEP 6: Finalize
    // =========================================
    const finalDraft = draftApproval.data.draft;

    await step.run("finalize", async () => {
      await updateRecord(recordId, {
        "Final Content": finalDraft,
        Status: "Complete",
      });
    });

    return {
      status: "complete",
      recordId,
    };
  }
);

