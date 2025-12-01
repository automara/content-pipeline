/**
 * Auto-Cluster Inngest Function
 * 
 * This function handles automatic keyword clustering when a Content Ideas record's
 * status is set to "Auto-Cluster". It finds unclustered keywords matching the seed
 * topic, uses Claude to select the best keywords for the cluster, and links them
 * to the Content Ideas record.
 * 
 * TypeScript Note: Inngest functions are async functions that receive
 * events and can use step.run() for retryable operations.
 */

import { inngest } from "../client.js";
import { generate } from "../../lib/claude.js";
import {
  getIdeaRecord,
  updateIdeaRecord,
  getKeywordsBySeed,
  updateKeywordBankRecord,
} from "../../lib/airtable-keywords.js";

/**
 * Auto-Cluster Function
 * 
 * Triggered by: keyword/cluster.auto event
 * 
 * Event data: { recordId: string, seedTopic: string }
 */
export const autoCluster = inngest.createFunction(
  {
    id: "auto-cluster",
    retries: 3,
  },
  { event: "keyword/cluster.auto" },
  async ({ event, step }) => {
    const { recordId, seedTopic } = event.data;

    // Step 1: Update Content Ideas status to "Clustering"
    await step.run("status-clustering", async () => {
      await updateIdeaRecord(recordId, {
        Status: "Clustering",
      });
    });

    // Step 2: Get unclustered keywords from Keyword Bank matching seed topic
    const keywords = await step.run("get-keywords", async () => {
      return await getKeywordsBySeed(seedTopic);
    });

    if (keywords.length === 0) {
      await step.run("no-keywords", async () => {
        await updateIdeaRecord(recordId, {
          Status: "Draft",
        });
      });
      return { status: "no-keywords", message: "No unclustered keywords found" };
    }

    // Step 3: Prepare keyword list for Claude
    const keywordList = await step.run("prepare-keywords", async () => {
      return keywords.map((kw) => ({
        id: kw.id,
        keyword: kw.fields.Keyword,
        volume: kw.fields["Search Volume"] || 0,
        difficulty: kw.fields["Keyword Difficulty"] || 50,
        intent: kw.fields["Search Intent"] || "Informational",
      }));
    });

    // Step 4: Use Claude to select best keywords for cluster
    const clusterResult = await step.run("claude-cluster", async () => {
      const prompt = `You are an SEO strategist. Select the best keywords for a content cluster.

## Available Keywords
${keywordList
  .map(
    (kw) =>
      `- ID: ${kw.id} | "${kw.keyword}" (${kw.volume}/mo, KD ${kw.difficulty}, ${kw.intent})`
  )
  .join("\n")}

## Instructions
1. Select 3-6 keywords that belong together (can be covered by ONE content piece)
2. Pick the primary keyword (best balance of volume + relevance)
3. Suggest a content type based on the keywords' intent
4. Identify the dominant search intent

## Output JSON only (no markdown, no explanation):
{
  "selectedIds": ["id1", "id2", "id3"],
  "primaryKeyword": "the main keyword",
  "contentType": "blog|how-to|comparison|industry_page|persona_page",
  "intent": "Informational|Commercial|Transactional|Navigational"
}`;

      const result = await generate({
        prompt,
        recordId,
        step: "auto-cluster",
        maxTokens: 500,
      });

      // Extract JSON from response
      const jsonMatch = result.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in Claude response");
      }

      return JSON.parse(jsonMatch[0]);
    });

    // Step 5: Link selected keywords to Content Ideas record and update their status
    const linkedIds: string[] = [];
    for (const kwId of clusterResult.selectedIds || []) {
      await step.run(`link-${kwId}`, async () => {
        // Link keyword to Content Ideas record
        await updateKeywordBankRecord(kwId, {
          Cluster: [recordId],
          Status: "Clustered",
        });
        linkedIds.push(kwId);
      });
    }

    // Step 6: Update Content Ideas record with cluster information
    await step.run("update-idea", async () => {
      const fields: any = {
        "Primary Keyword": clusterResult.primaryKeyword || keywordList[0].keyword,
        "Content Type": clusterResult.contentType || "blog",
        "Search Intent": clusterResult.intent || "Informational",
        Keywords: linkedIds, // Link the keywords
        Status: "Review",
      };

      await updateIdeaRecord(recordId, fields);
    });

    return {
      status: "complete",
      keywordsClustered: linkedIds.length,
      clusterName: clusterResult.primaryKeyword,
    };
  }
);

