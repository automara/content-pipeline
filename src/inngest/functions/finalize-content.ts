/**
 * Finalize Content - Standalone Function
 * 
 * This function finalizes content after draft approval. It's triggered by the
 * "content/draft.approved" event. If feedback exists, it generates a refined version
 * of the draft. Otherwise, it copies the approved draft to final content.
 * 
 * TypeScript Note: We conditionally generate based on whether feedback exists.
 * This allows users to either approve as-is or request refinements.
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
 * Finalize content function
 * 
 * Triggered by "content/draft.approved" event with full context. If feedback exists,
 * generates a refined version using a Langfuse prompt. Otherwise, copies draft directly.
 */
export const finalizeContent = inngest.createFunction(
  {
    id: "finalize-content",
    retries: 3,
  },
  { event: "content/draft.approved" },
  async ({ event, step }) => {
    // Extract all context from the event (enriched by the webhook)
    const {
      recordId,
      draft,
      feedback,
      title,
      contentType,
      industryId,
      personaId,
      keywords,
    } = event.data;

    // Check if feedback exists - if so, generate refined version
    const hasFeedback = feedback && feedback.trim().length > 0;

    if (hasFeedback) {
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

      // Generate refined version using feedback
      const finalContent = await step.run("generate-refined-content", async () => {
        const promptTemplate = await getPrompt(`finalize-${contentType}`, {
          title,
          // From context files
          companyProfile: context.companyProfile,
          voiceGuidelines: context.voiceGuidelines,
          productOverview: context.productOverview,
          differentiators: context.differentiators,
          // From Airtable industry/persona
          industryName: context.industry?.name || "General",
          personaName: context.persona?.name || "General audience",
          // From previous step (draft approval)
          draft: draft,
          feedback: feedback || "",
          // From Airtable row
          keywords: keywords || "",
        });

        const result = await generate({
          prompt: promptTemplate,
          recordId,
          step: "finalize",
          maxTokens: 8192,
        });

        return result.text;
      });

      // Save refined content and mark complete
      await step.run("finalize", async () => {
        await updateRecord(recordId, {
          "Final Content": finalContent,
          Status: "Complete",
        });
      });

      return {
        status: "complete",
        recordId,
        refined: true,
      };
    } else {
      // No feedback - copy draft directly to final content
      await step.run("finalize", async () => {
        await updateRecord(recordId, {
          "Final Content": draft,
          Status: "Complete",
        });
      });

      return {
        status: "complete",
        recordId,
        refined: false,
      };
    }
  }
);

