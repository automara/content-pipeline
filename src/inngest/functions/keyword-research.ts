/**
 * Keyword Research Inngest Function
 * 
 * This function handles keyword research when a Keyword Bank record's status
 * is set to "Research". It researches the seed keyword via DataForSEO,
 * updates the original record with data, and creates new Keyword Bank records
 * for related keywords.
 * 
 * TypeScript Note: Inngest functions are async functions that receive
 * events and can use step.run() for retryable operations.
 */

import { inngest } from "../client.js";
import { dataForSEO } from "../../lib/dataforseo.js";
import {
  getKeywordBankRecord,
  updateKeywordBankRecord,
  createKeywordBankRecord,
  createResearchJob,
  updateResearchJob,
} from "../../lib/airtable-keywords.js";

/**
 * Keyword Research Function
 * 
 * Triggered by: keyword/research.start event
 * 
 * Event data: { recordId: string, keyword: string }
 */
export const keywordResearch = inngest.createFunction(
  {
    id: "keyword-research",
    retries: 3,
    concurrency: { limit: 5 }, // Respect API rate limits
  },
  { event: "keyword/research.start" },
  async ({ event, step }) => {
    const { recordId, keyword } = event.data;
    const startTime = new Date().toISOString();

    // Step 1: Create Research Job record
    const jobRecordId = await step.run("create-research-job", async () => {
      return await createResearchJob({
        "Job ID": event.id,
        "Seed Keywords": keyword,
        Status: "Running",
        Started: startTime,
        Source: "Manual",
      });
    });

    // Step 2: Update record status to "Researching"
    await step.run("status-researching", async () => {
      await updateKeywordBankRecord(recordId, {
        Status: "Researching",
      });
    });

    // Step 3: Research the seed keyword (gets seed + related keywords)
    const keywords = await step.run("research-seed", async () => {
      return await dataForSEO.researchSeed(keyword, 30);
    });

    // Step 4: Find the seed keyword data and update original record
    const seedData = keywords.find(
      (k) => k.keyword.toLowerCase() === keyword.toLowerCase()
    );

    if (seedData) {
      await step.run("update-seed-record", async () => {
        await updateKeywordBankRecord(recordId, {
          "Search Volume": seedData.searchVolume,
          "Keyword Difficulty": seedData.keywordDifficulty,
          CPC: seedData.cpc,
          "Search Intent": seedData.searchIntent,
          "SERP Features": seedData.serpFeatures,
          Trend: seedData.trend || "Stable",
          "Competitor URLs": JSON.stringify(seedData.competitorUrls),
          Status: "New",
          "Seed Topic": keyword, // Store original seed
          "Research Date": new Date().toISOString().split("T")[0],
        });
      });
    }

    // Step 5: Create new Keyword Bank records for related keywords
    // Filter out the seed keyword and low-volume keywords (volume >= 50)
    const relatedKeywords = keywords.filter(
      (k) =>
        k.keyword.toLowerCase() !== keyword.toLowerCase() &&
        k.searchVolume >= 50
    );

    const createdRecords: string[] = [];

    for (const kwData of relatedKeywords) {
      const newRecordId = await step.run(
        `create-related-${kwData.keyword.slice(0, 20).replace(/\s+/g, "-")}`,
        async () => {
          return await createKeywordBankRecord({
            Keyword: kwData.keyword,
            "Search Volume": kwData.searchVolume,
            "Keyword Difficulty": kwData.keywordDifficulty,
            CPC: kwData.cpc,
            "Search Intent": kwData.searchIntent,
            "SERP Features": kwData.serpFeatures,
            Trend: kwData.trend || "Stable",
            "Competitor URLs": JSON.stringify(kwData.competitorUrls),
            Status: "New",
            "Seed Topic": keyword,
            Source: "Manual",
            "Research Date": new Date().toISOString().split("T")[0],
          });
        }
      );

      createdRecords.push(newRecordId);
    }

    const totalKeywordsCreated = createdRecords.length + 1; // +1 for the original record

    // Step 6: Update Research Job as complete
    await step.run("update-research-job-complete", async () => {
      await updateResearchJob(jobRecordId, {
        Status: "Complete",
        Completed: new Date().toISOString(),
        "Keywords Created": totalKeywordsCreated,
      });
    });

    return {
      status: "complete",
      keywordsCreated: totalKeywordsCreated,
      recordIds: [recordId, ...createdRecords],
      jobRecordId,
    };
  }
);

