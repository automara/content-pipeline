/**
 * Keyword Research Inngest Function
 * 
 * This function handles manual keyword research from seed topics.
 * It expands seeds into related keywords, researches them via DataForSEO,
 * calculates SEO opportunity scores, and creates Content Ideas records.
 * 
 * TypeScript Note: Inngest functions are async functions that receive
 * events and can use step.run() for retryable operations.
 */

import { inngest } from "../client.js";
import { dataForSEO, type KeywordData } from "../../lib/dataforseo.js";
import {
  createIdeaRecord,
  updateIdeaRecord,
} from "../../lib/airtable-keywords.js";

/**
 * Calculate SEO opportunity score
 * 
 * Higher volume + lower difficulty = higher score
 * Score ranges from 0-100
 * 
 * TypeScript Note: This is a pure function (no side effects) that
 * takes data and returns a number. Easy to test!
 * 
 * Exported so it can be reused in other functions.
 */
export function calculateSEOScore(data: KeywordData): number {
  // Volume score: up to 50 points (normalized by 100 searches = 1 point)
  const volumeScore = Math.min(data.searchVolume / 100, 50);

  // Difficulty score: up to 50 points (lower difficulty = higher score)
  const difficultyScore = 50 - data.keywordDifficulty / 2;

  // Bonus for SERP features we can target
  let featureBonus = 0;
  if (data.serpFeatures.includes("Featured Snippet")) featureBonus += 5;
  if (data.serpFeatures.includes("PAA")) featureBonus += 3;

  return Math.round(volumeScore + difficultyScore + featureBonus);
}

/**
 * Keyword Research Function
 * 
 * Triggered by: keyword/research.start event
 */
export const keywordResearch = inngest.createFunction(
  {
    id: "keyword-research",
    retries: 3,
    concurrency: { limit: 5 }, // Respect API rate limits
  },
  { event: "keyword/research.start" },
  async ({ event, step }) => {
    const {
      seedTopics,
      industryId,
      personaId,
      problemId,
      expandKeywords = true,
      limit = 10,
    } = event.data;

    const results: string[] = [];

    // Process each seed topic
    for (const seed of seedTopics) {
      // Step 1: Expand seed into related keywords (optional)
      let keywords = [seed];

      if (expandKeywords) {
        const relatedKeywords = await step.run(
          `expand-${seed}`,
          async () => {
            return await dataForSEO.getKeywordIdeas(seed, limit);
          }
        );
        // Combine seed with related keywords, limit total
        keywords = [seed, ...relatedKeywords.slice(0, limit - 1)];
      }

      // Step 2: Research each keyword
      for (const keyword of keywords) {
        const keywordData = await step.run(
          `research-${keyword}`,
          async () => {
            return await dataForSEO.researchKeyword(keyword);
          }
        );

        // Step 3: Calculate SEO opportunity score
        const seoScore = calculateSEOScore(keywordData);

        // Step 4: Skip low-opportunity keywords
        if (seoScore < 20) {
          console.log(
            `Skipping keyword "${keyword}" - SEO score too low: ${seoScore}`
          );
          continue; // Not worth pursuing
        }

        // Step 5: Create idea record in Airtable
        const recordId = await step.run(`create-idea-${keyword}`, async () => {
          // Prepare fields for Airtable
          const fields: any = {
            Keyword: keyword,
            "Search Volume": keywordData.searchVolume,
            "Keyword Difficulty": keywordData.keywordDifficulty,
            CPC: keywordData.cpc,
            "Search Intent": keywordData.searchIntent,
            "SERP Features": keywordData.serpFeatures,
            "Related Keywords": JSON.stringify(keywordData.relatedKeywords),
            "Competitor URLs": JSON.stringify(keywordData.competitorUrls),
            "SEO Score": seoScore,
            Status: "Review",
            Source: "Manual",
            "Seed Topic": seed,
            "Research Date": new Date().toISOString().split("T")[0],
          };

          // Add entity links if provided (stored as text IDs)
          if (industryId) {
            fields.Industry = [industryId];
          }
          if (personaId) {
            fields.Persona = [personaId];
          }
          if (problemId) {
            fields.Problem = [problemId];
          }

          return await createIdeaRecord(fields);
        });

        results.push(recordId);
      }
    }

    return {
      status: "complete",
      ideasCreated: results.length,
      recordIds: results,
    };
  }
);

