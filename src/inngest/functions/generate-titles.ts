/**
 * Generate Titles Inngest Function
 * 
 * This function generates SEO-optimized title suggestions and content angles
 * for Content Ideas records when status is set to "Generate Title".
 * It works with clustered keywords linked from Keyword Bank.
 * 
 * TypeScript Note: This function uses Claude to generate creative content
 * (titles) based on structured data (keyword clusters, metrics, SERP data, etc.).
 */

import { inngest } from "../client.js";
import { generate } from "../../lib/claude.js";
import {
  getIdeaRecord,
  updateIdeaRecord,
  getKeywordBankRecord,
} from "../../lib/airtable-keywords.js";

/**
 * Build the prompt for title generation
 * 
 * TypeScript Note: This function constructs a detailed prompt string
 * that includes all the context Claude needs to generate good titles.
 */
function buildTitlePrompt(ctx: {
  clusterName: string;
  primaryKeyword: string;
  keywords: Array<{
    keyword: string;
    volume: number;
    difficulty: number;
  }>;
  contentType: string;
  intent: string;
  industry?: any;
  persona?: any;
  problem?: any;
}): string {
  return `Generate an SEO title and content angles for a content cluster.

## Cluster: ${ctx.clusterName}
Primary Keyword: ${ctx.primaryKeyword}
Content Type: ${ctx.contentType}
Intent: ${ctx.intent}

## Keywords in Cluster
${ctx.keywords
  .map((kw) => `- "${kw.keyword}" (${kw.volume}/mo, KD ${kw.difficulty})`)
  .join("\n")}

${
  ctx.industry
    ? `## Industry: ${ctx.industry.Name || ""}
${ctx.industry["Pain Points"] || ctx.industry.Description || ""}
`
    : ""
}

${
  ctx.persona
    ? `## Persona: ${ctx.persona["Persona Name"] || ctx.persona.Name || ""}
Role: ${ctx.persona["Role/Title"] || ctx.persona.Title || ""}
Goals: ${ctx.persona.Goals || ""}
Pain Points: ${ctx.persona["Pain Points"] || ""}
`
    : ""
}

${
  ctx.problem
    ? `## Problem: ${ctx.problem["Problem Name"] || ctx.problem.Name || ""}
${ctx.problem.Description || ""}
`
    : ""
}

## Output JSON only (no markdown, no explanation):
{
  "title": "SEO title under 60 chars with primary keyword",
  "angles": [
    {"hook": "Opening premise", "sections": ["Section 1", "Section 2"]}
  ],
  "competitorAnalysis": "What competitors do, how to differentiate"
}`;
}

/**
 * Parse title response from Claude
 * 
 * Extracts JSON from Claude's response, handling cases where
 * Claude adds extra text around the JSON.
 */
function parseTitleResponse(response: string): {
  title: string;
  angles: string;
  competitorAnalysis: string;
} {
  try {
    // Extract JSON from response (Claude might add markdown formatting)
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in response");
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      title: parsed.title || "",
      angles: JSON.stringify(parsed.angles || [], null, 2),
      competitorAnalysis: parsed.competitorAnalysis || "",
    };
  } catch (e) {
    console.error("Failed to parse title response:", e);
    // Return defaults as fallback
    return {
      title: "",
      angles: response,
      competitorAnalysis: "",
    };
  }
}

/**
 * Generate Titles Function
 * 
 * Triggered by: keyword/generate-title event
 * 
 * Event data: { recordId: string }
 */
export const generateTitles = inngest.createFunction(
  {
    id: "generate-titles",
    retries: 2,
  },
  { event: "keyword/generate-title" },
  async ({ event, step }) => {
    const { recordId } = event.data;

    // Step 1: Get the Content Ideas record
    const idea = await step.run("get-idea", async () => {
      return await getIdeaRecord(recordId);
    });

    // Step 2: Update status to "Generating"
    await step.run("status-generating", async () => {
      await updateIdeaRecord(recordId, {
        Status: "Generating",
      });
    });

    // Step 3: Get linked keywords from Keyword Bank
    const keywordIds = idea.fields.Keywords || [];
    if (keywordIds.length === 0) {
      await step.run("no-keywords-error", async () => {
        await updateIdeaRecord(recordId, {
          Status: "Draft",
        });
      });
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

    // Step 4: Get entity context if linked (would need separate tables)
    // For now, we'll work with what's in the Content Ideas record
    const industry = idea.fields.Industry?.[0]
      ? { Name: idea.fields.Industry[0] }
      : undefined;
    const persona = idea.fields.Persona?.[0]
      ? { Name: idea.fields.Persona[0] }
      : undefined;
    const problem = idea.fields.Problem?.[0]
      ? { Name: idea.fields.Problem[0] }
      : undefined;

    // Step 5: Build prompt with clustered keyword data
    const titlePrompt = buildTitlePrompt({
      clusterName: idea.fields["Cluster Name"] || "",
      primaryKeyword: idea.fields["Primary Keyword"] || keywords[0].fields.Keyword,
      keywords: keywords.map((kw) => ({
        keyword: kw.fields.Keyword,
        volume: kw.fields["Search Volume"] || 0,
        difficulty: kw.fields["Keyword Difficulty"] || 50,
      })),
      contentType: idea.fields["Content Type"] || "blog",
      intent: idea.fields["Search Intent"] || "Informational",
      industry,
      persona,
      problem,
    });

    // Step 6: Generate title + angles with Claude
    const titleResponse = await step.run("generate", async () => {
      return await generate({
        prompt: titlePrompt,
        recordId,
        step: "generate-title",
        maxTokens: 1500,
      });
    });

    // Step 7: Parse response
    const parsed = parseTitleResponse(titleResponse.text);

    // Step 8: Update Content Ideas record
    await step.run("save-title", async () => {
      await updateIdeaRecord(recordId, {
        Title: parsed.title,
        "Content Angles": parsed.angles,
        "Competitor Analysis": parsed.competitorAnalysis,
        Status: "Review",
      });
    });

    return {
      status: "complete",
      recordId,
      title: parsed.title,
    };
  }
);


