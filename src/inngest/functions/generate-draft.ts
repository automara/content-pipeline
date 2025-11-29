/**
 * Generate Draft - Standalone Function
 * 
 * This is an alternative approach - a standalone function for generating drafts.
 * Useful if you want more granular control per step instead of one big pipeline.
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
 * Standalone draft generation function
 * 
 * This function can be triggered independently to generate a draft
 * without running the full pipeline.
 */
export const generateDraft = inngest.createFunction(
  {
    id: "generate-draft-standalone",
    retries: 3,
  },
  { event: "content/draft.generate" },
  async ({ event, step }) => {
    const { recordId } = event.data;

    const record = await step.run("get-record", async () => {
      return await getRecord(recordId);
    });

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

    const draft = await step.run("generate", async () => {
      const contentType = record.fields["Content Type"];
      const prompt = await getPrompt(`draft-${contentType}`, {
        title: record.fields.Title,
        companyProfile: context.companyProfile,
        voiceGuidelines: context.voiceGuidelines,
        outline: record.fields.Outline || "",
        feedback: record.fields["Outline Feedback"] || "",
        keywords: record.fields["Target Keywords"] || "",
      });

      return (
        await generate({ prompt, recordId, step: "draft", maxTokens: 8192 })
      ).text;
    });

    await step.run("update-record", async () => {
      await updateRecord(recordId, {
        Draft: draft,
        Status: "Draft Review",
      });
    });

    return { recordId, status: "draft-ready" };
  }
);

