/**
 * Generate Draft - Standalone Function
 * 
 * This function generates a draft after outline approval and then completes (no waiting).
 * It replaces the monolithic pipeline's draft generation stage with a separate,
 * self-contained function that ends immediately after saving the draft to Airtable.
 * 
 * Triggered by the "content/outline.approved" event which includes all context needed
 * for draft generation (title, contentType, industryId, personaId, keywords, outline, feedback).
 */

import { inngest } from "../client.js";
import {
  updateRecord,
  getIndustry,
  getPersona,
  getActiveArtifacts,
} from "../../lib/airtable.js";
import { getPrompt } from "../../lib/langfuse.js";
import { generate } from "../../lib/claude.js";
import { getContextBundle } from "../../lib/context.js";

/**
 * Standalone draft generation function
 * 
 * Triggered by "content/outline.approved" event with full context. Generates draft
 * using the approved outline and saves to Airtable, then the function ends.
 * The draft-approved webhook will trigger finalization separately.
 */
export const generateDraft = inngest.createFunction(
  {
    id: "generate-draft-standalone",
    retries: 3,
  },
  { event: "content/outline.approved" },
  async ({ event, step }) => {
    // Extract all context from the event (enriched by the webhook)
    const {
      recordId,
      outline,
      feedback,
      title,
      contentType,
      industryId,
      personaId,
      keywords,
    } = event.data;

    // Update status to Drafting
    await step.run("update-drafting-status", async () => {
      await updateRecord(recordId, {
        Status: "Drafting",
      });
    });

    // Assemble context - load from context files and Airtable
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
      
      // Load industry/persona from Airtable (use IDs from event)
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
      };
    });

    // Generate draft using all context
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
        // From previous step (outline approval)
        outline: outline,
        feedback: feedback || "",
        // From Airtable row
        keywords: keywords || "",
      });

      const result = await generate({
        prompt: promptTemplate,
        recordId,
        step: "draft",
        maxTokens: 8192,
      });

      return result.text;
    });

    // Update Airtable and end function (no waiting for approval)
    await step.run("update-draft", async () => {
      await updateRecord(recordId, {
        Draft: draft,
        Status: "Draft Review",
      });
    });

    // Function completes here - draft-approved webhook will trigger finalization
    return { recordId, status: "draft-ready" };
  }
);

