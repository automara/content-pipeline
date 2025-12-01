/**
 * Promote to Pipeline Inngest Function
 * 
 * This function creates a Content Pipeline record when a Content Ideas record's
 * status is set to "Approved". It reads the cluster, gets all linked keywords,
 * and creates a record in the existing Content Pipeline base.
 * 
 * TypeScript Note: This function bridges the keyword ideation system
 * (separate base) with the content pipeline system (existing base).
 */

import { inngest } from "../client.js";
import {
  getIdeaRecord,
  updateIdeaRecord,
  createPipelineRecord,
  getKeywordBankRecord,
} from "../../lib/airtable-keywords.js";

/**
 * Promote to Pipeline Function
 * 
 * Triggered by: keyword/promote event
 * 
 * Event data: { recordId: string }
 */
export const promoteToPipeline = inngest.createFunction(
  { id: "promote-to-pipeline" },
  { event: "keyword/promote" },
  async ({ event, step }) => {
    const { recordId } = event.data;

    // Step 1: Get the Content Ideas record
    const idea = await step.run("get-idea", async () => {
      return await getIdeaRecord(recordId);
    });

    // Step 2: Get all linked keywords from Keyword Bank
    const keywordIds = idea.fields.Keywords || [];
    if (keywordIds.length === 0) {
      return {
        status: "error",
        message: "No keywords linked to this Content Idea",
      };
    }

    const keywords = await step.run("get-keywords", async () => {
      return await Promise.all(
        keywordIds.map((id: string) => getKeywordBankRecord(id))
      );
    });

    // Step 3: Build comma-separated keyword list
    const targetKeywords = keywords
      .map((kw) => kw.fields.Keyword)
      .join(", ");

    // Step 4: Get title (use generated title or cluster name as fallback)
    const title =
      idea.fields.Title ||
      idea.fields["Cluster Name"] ||
      idea.fields["Primary Keyword"] ||
      keywords[0].fields.Keyword;

    // Step 5: Extract entity IDs (linked records)
    const industryId = Array.isArray(idea.fields.Industry)
      ? idea.fields.Industry[0]
      : undefined;
    const personaId = Array.isArray(idea.fields.Persona)
      ? idea.fields.Persona[0]
      : undefined;

    // Step 6: Build notes with cluster context
    const notes = [
      `Cluster: ${idea.fields["Cluster Name"] || "N/A"}`,
      `Total Volume: ${idea.fields["Total Volume"] || "N/A"}`,
      `Avg Difficulty: ${Math.round(idea.fields["Avg Difficulty"] || 0)}`,
      `Search Intent: ${idea.fields["Search Intent"] || "N/A"}`,
      "",
      `Content Angles:`,
      idea.fields["Content Angles"] || "N/A",
      "",
      idea.fields["Competitor Analysis"]
        ? `Competitor Analysis:\n${idea.fields["Competitor Analysis"]}`
        : "",
    ]
      .filter(Boolean)
      .join("\n");

    // Step 7: Create Content Pipeline record
    const pipelineRecordId = await step.run("create-pipeline-record", async () => {
      return await createPipelineRecord({
        title,
        industryId,
        personaId,
        contentType: idea.fields["Content Type"] || "blog",
        keywords: targetKeywords,
        notes,
      });
    });

    // Step 8: Update Content Ideas status and link back
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
      keywordsCount: keywords.length,
    };
  }
);


