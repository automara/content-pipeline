/**
 * Generate Outline - Standalone Function
 * 
 * This is an alternative approach - a standalone function for generating outlines.
 * Useful if you want more granular control per step instead of one big pipeline.
 * 
 * TypeScript Note: This function listens for a different event than the main pipeline,
 * so it can be triggered independently if needed.
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

/**
 * Standalone outline generation function
 * 
 * This function can be triggered independently to generate an outline
 * without running the full pipeline.
 */
export const generateOutline = inngest.createFunction(
  {
    id: "generate-outline-standalone",
    retries: 3,
  },
  { event: "content/outline.generate" },
  async ({ event, step }) => {
    const { recordId } = event.data;

    // Get record data
    const record = await step.run("get-record", async () => {
      return await getRecord(recordId);
    });

    // Assemble context
    const context = await step.run("assemble-context", async () => {
      const artifacts = await getActiveArtifacts();
      const industryId = record.fields.Industry?.[0];
      const personaId = record.fields.Persona?.[0];

      return {
        companyProfile: artifacts["company_profile"] || "",
        voiceGuidelines: artifacts["voice_guidelines"] || "",
        industry: industryId ? await getIndustry(industryId) : null,
        persona: personaId ? await getPersona(personaId) : null,
      };
    });

    // Generate outline
    const outline = await step.run("generate", async () => {
      const contentType = record.fields["Content Type"];
      const prompt = await getPrompt(`outline-${contentType}`, {
        title: record.fields.Title,
        companyProfile: context.companyProfile,
        voiceGuidelines: context.voiceGuidelines,
        industryName: context.industry?.name || "General",
        industryDescription: context.industry?.description || "",
        personaName: context.persona?.name || "General audience",
        keywords: record.fields["Target Keywords"] || "",
      });

      return (await generate({ prompt, recordId, step: "outline" })).text;
    });

    // Update Airtable
    await step.run("update-record", async () => {
      await updateRecord(recordId, {
        Outline: outline,
        Status: "Outline Review",
      });
    });

    return { recordId, status: "outline-ready" };
  }
);

