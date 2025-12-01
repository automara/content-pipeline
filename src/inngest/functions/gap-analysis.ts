/**
 * Gap Analysis Inngest Function
 * 
 * This function scans for content gaps by generating keyword candidates
 * from entity combinations (industries × personas × problems) and researching
 * them to find opportunities that don't already exist.
 * 
 * TypeScript Note: This function is more complex because it needs to coordinate
 * multiple steps: loading data, generating candidates, filtering, and researching.
 */

import { inngest } from "../client.js";
import { dataForSEO, type KeywordData } from "../../lib/dataforseo.js";
import {
  createIdeaRecord,
  getAllIdeas,
} from "../../lib/airtable-keywords.js";
import { calculateSEOScore } from "./keyword-research.js";

/**
 * Keyword candidate with entity context
 */
interface KeywordCandidate {
  keyword: string;
  industryId?: string;
  personaId?: string;
  problemId?: string;
  contentType: string;
  seedTopic: string;
}

/**
 * Generate keyword candidates from entity combinations
 * 
 * TypeScript Note: This function takes arrays of entities and generates
 * keyword combinations. Since we're using separate bases, we'll work with
 * simplified entity data structures.
 */
function generateKeywordCandidates(
  scope: "all" | "industries" | "personas" | "problems"
): KeywordCandidate[] {
  const candidates: KeywordCandidate[] = [];

  // For now, we'll generate candidates from common patterns
  // In a full implementation, you'd load Industries, Personas, Problems tables
  // from the keyword base and combine them

  // Pattern: "[solution] for [industry]"
  if (scope === "all" || scope === "industries") {
    const industries = ["SaaS", "Fintech", "Healthcare", "E-commerce"];
    const solutions = [
      "pseo tools",
      "content systems",
      "landing page automation",
      "abm platform",
    ];

    for (const industry of industries) {
      for (const solution of solutions) {
        candidates.push({
          keyword: `${solution} for ${industry.toLowerCase()}`,
          contentType: "industry_page",
          seedTopic: `${solution} × ${industry}`,
        });
      }
    }
  }

  // Pattern: "[solution] for [persona]"
  if (scope === "all" || scope === "personas") {
    const personas = ["CTO", "CMO", "VP Marketing", "Founder"];
    const solutions = [
      "content systems",
      "pseo tools",
      "landing page automation",
      "abm platform",
    ];

    for (const persona of personas) {
      for (const solution of solutions) {
        candidates.push({
          keyword: `${solution} for ${persona.toLowerCase()}`,
          contentType: "persona_page",
          seedTopic: `${solution} × ${persona}`,
        });
      }
    }
  }

  // Pattern: "how to [problem/use case]"
  if (scope === "all" || scope === "problems") {
    const problems = [
      "scale content production",
      "improve seo rankings",
      "automate landing pages",
      "implement abm strategy",
    ];

    for (const problem of problems) {
      candidates.push({
        keyword: `how to ${problem.toLowerCase()}`,
        contentType: "how-to",
        seedTopic: problem,
      });
    }
  }

  // Pattern: "[thing] vs [thing]" comparisons
  const comparisonPairs = [
    ["pseo", "traditional seo"],
    ["pseo", "content marketing"],
    ["abm", "demand gen"],
    ["modular content", "custom content"],
  ];

  for (const [a, b] of comparisonPairs) {
    candidates.push({
      keyword: `${a} vs ${b}`,
      contentType: "comparison",
      seedTopic: `${a} vs ${b}`,
    });
  }

  return candidates;
}

/**
 * Gap Analysis Function
 * 
 * Triggered by: keyword/gap-analysis.start event
 */
export const gapAnalysis = inngest.createFunction(
  {
    id: "gap-analysis",
    retries: 2,
  },
  { event: "keyword/gap-analysis.start" },
  async ({ event, step }) => {
    const scope = event.data.scope || "all";

    // Step 1: Load existing ideas and content to filter duplicates
    const [existingIdeas, existingContent] = await step.run(
      "load-existing",
      async () => {
        // Get all existing ideas from keyword base
        const ideas = await getAllIdeas();

        // Get existing keywords from Content Pipeline (would need to query that base)
        // For now, we'll just use ideas from keyword base
        const existingKeywords = new Set(
          ideas
            .map((r) => r.fields.Keyword?.toLowerCase())
            .filter(Boolean) as string[]
        );

        return { existingKeywords, ideas };
      }
    );

    // Step 2: Generate keyword candidates from entity combinations
    const candidates = await step.run("generate-candidates", async () => {
      return generateKeywordCandidates(scope);
    });

    // Step 3: Filter out already-researched keywords
    const newCandidates = candidates.filter(
      (c) => !existingIdeas.existingKeywords.has(c.keyword.toLowerCase())
    );

    // Step 4: Research new candidates (batch to manage API costs)
    const batchSize = 20;
    const results: string[] = [];

    // Limit to first 100 candidates to control costs
    const candidatesToResearch = newCandidates.slice(0, 100);

    for (let i = 0; i < candidatesToResearch.length; i += batchSize) {
      const batch = candidatesToResearch.slice(i, i + batchSize);

      const batchResults = await step.run(
        `research-batch-${i}`,
        async () => {
          // Research each candidate in parallel
          const researched = await Promise.all(
            batch.map(async (candidate) => {
              try {
                const data = await dataForSEO.researchKeyword(candidate.keyword);
                return { ...candidate, ...data };
              } catch (error) {
                console.error(
                  `Failed to research keyword "${candidate.keyword}":`,
                  error
                );
                return null; // Skip failed research
              }
            })
          );

          return researched.filter((r) => r !== null) as (KeywordCandidate &
            KeywordData)[];
        }
      );

      // Create records for promising keywords
      for (const result of batchResults) {
        const seoScore = calculateSEOScore(result);

        // Only create ideas with decent SEO scores
        if (seoScore < 25) {
          continue;
        }

        const recordId = await step.run(
          `create-${result.keyword}`,
          async () => {
            const fields: any = {
              Keyword: result.keyword,
              "Search Volume": result.searchVolume,
              "Keyword Difficulty": result.keywordDifficulty,
              CPC: result.cpc,
              "Search Intent": result.searchIntent,
              "SERP Features": result.serpFeatures,
              "Related Keywords": JSON.stringify(result.relatedKeywords),
              "Competitor URLs": JSON.stringify(result.competitorUrls),
              "Content Type Suggestion": result.contentType,
              "SEO Score": seoScore,
              Status: "Review",
              Source: "Gap Scan",
              "Seed Topic": result.seedTopic,
              "Research Date": new Date().toISOString().split("T")[0],
            };

            // Add entity IDs if available
            if (result.industryId) {
              fields.Industry = [result.industryId];
            }
            if (result.personaId) {
              fields.Persona = [result.personaId];
            }
            if (result.problemId) {
              fields.Problem = [result.problemId];
            }

            return await createIdeaRecord(fields);
          }
        );

        results.push(recordId);
      }
    }

    return {
      status: "complete",
      candidatesFound: newCandidates.length,
      ideasCreated: results.length,
    };
  }
);

