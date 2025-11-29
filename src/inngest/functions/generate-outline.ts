/**
 * Generate Outline - Standalone Function
 * 
 * This function generates an outline and then completes (no waiting for approval).
 * It replaces the monolithic pipeline's outline generation stage with a separate,
 * self-contained function that ends immediately after saving the outline to Airtable.
 * 
 * TypeScript Note: This function listens to "content/pipeline.start" and completes
 * quickly, unlike the old pipeline which would wait for days.
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
 * Standalone outline generation function
 * 
 * Triggered by "content/pipeline.start" event. Generates outline and saves to Airtable,
 * then the function ends. The outline-approved webhook will trigger draft generation separately.
 */
export const generateOutline = inngest.createFunction(
  {
    id: "generate-outline-standalone",
    retries: 3,
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

    // Get full record data (in case some fields are missing from event)
    const record = await step.run("get-record", async () => {
      return await getRecord(recordId);
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
      
      // Load industry/persona from Airtable (use event data if available, otherwise fetch)
      const industry = industryId 
        ? await getIndustry(industryId)
        : record.fields.Industry?.[0] 
          ? await getIndustry(record.fields.Industry[0])
          : null;
      const persona = personaId 
        ? await getPersona(personaId)
        : record.fields.Persona?.[0]
          ? await getPersona(record.fields.Persona[0])
          : null;

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
        keywords: keywords || record.fields["Target Keywords"] || "",
      };
    });

    // Generate outline
    const outline = await step.run("generate-outline", async () => {
      const finalContentType = contentType || record.fields["Content Type"];
      const finalTitle = title || record.fields.Title;

      const promptTemplate = await getPrompt(`outline-${finalContentType}`, {
        title: finalTitle,
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

    // Update Airtable and end function (no waiting for approval)
    await step.run("update-outline", async () => {
      await updateRecord(recordId, {
        Outline: outline,
        Status: "Outline Review",
      });
    });

    // Function completes here - outline-approved webhook will trigger draft generation
    return { recordId, status: "outline-ready" };
  }
);

