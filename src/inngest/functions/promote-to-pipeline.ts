/**
 * Promote to Pipeline Inngest Function
 * 
 * This function creates a Content Pipeline record when a keyword idea
 * is promoted. It reads the idea, extracts the selected title, and creates
 * a record in the existing Content Pipeline base.
 * 
 * TypeScript Note: This function bridges the keyword ideation system
 * (separate base) with the content pipeline system (existing base).
 */

import { inngest } from "../client.js";
import {
  getIdeaRecord,
  updateIdeaRecord,
  createPipelineRecord,
} from "../../lib/airtable-keywords.js";

/**
 * Promote to Pipeline Function
 * 
 * Triggered by: keyword/promote event
 */
export const promoteToPipeline = inngest.createFunction(
  { id: "promote-to-pipeline" },
  { event: "keyword/promote" },
  async ({ event, step }) => {
    const { recordId, selectedTitleIndex = 0 } = event.data;

    // Get the idea record
    const idea = await step.run("get-idea", async () => {
      return await getIdeaRecord(recordId);
    });

    // Parse title selection
    let selectedTitle = idea.fields.Keyword; // Default to keyword if no titles

    try {
      const titleIdeasJson = idea.fields["Title Ideas"];
      if (titleIdeasJson) {
        const titles = JSON.parse(titleIdeasJson);
        if (Array.isArray(titles) && titles[selectedTitleIndex]) {
          selectedTitle = titles[selectedTitleIndex].title || titles[selectedTitleIndex];
        }
      }
    } catch (error) {
      console.warn(
        `Failed to parse title ideas for record ${recordId}:`,
        error
      );
      // Fall back to keyword as title
    }

    // Extract entity IDs (stored as text or linked records)
    const industryId = Array.isArray(idea.fields.Industry)
      ? idea.fields.Industry[0]
      : idea.fields.Industry;
    const personaId = Array.isArray(idea.fields.Persona)
      ? idea.fields.Persona[0]
      : idea.fields.Persona;

    // Build notes with SEO context
    const notes = [
      `SEO Score: ${idea.fields["SEO Score"] || "N/A"}`,
      `Search Volume: ${idea.fields["Search Volume"] || 0}`,
      `Keyword Difficulty: ${idea.fields["Keyword Difficulty"] || "N/A"}`,
      `Search Intent: ${idea.fields["Search Intent"] || "N/A"}`,
      `Content Angles: ${idea.fields["Content Angles"] || "N/A"}`,
    ].join("\n");

    // Create Content Pipeline record
    const pipelineRecordId = await step.run(
      "create-pipeline-record",
      async () => {
        return await createPipelineRecord({
          title: selectedTitle,
          industryId: industryId as string | undefined,
          personaId: personaId as string | undefined,
          contentType: idea.fields["Content Type Suggestion"] || "blog",
          keywords: idea.fields.Keyword,
          notes,
        });
      }
    );

    // Update idea status and link back
    await step.run("update-idea-status", async () => {
      await updateIdeaRecord(recordId, {
        Status: "Promoted",
        "Promoted Record ID": pipelineRecordId,
      });
    });

    return {
      status: "complete",
      ideaRecordId: recordId,
      pipelineRecordId,
    };
  }
);

