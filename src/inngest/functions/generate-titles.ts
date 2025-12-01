/**
 * Generate Titles Inngest Function
 * 
 * This function generates SEO-optimized title suggestions for approved
 * keyword ideas using Claude. It builds a comprehensive prompt with
 * keyword data, entity context, and competitor analysis.
 * 
 * TypeScript Note: This function uses Claude to generate creative content
 * (titles) based on structured data (keyword metrics, SERP data, etc.).
 */

import { inngest } from "../client.js";
import { generate } from "../../lib/claude.js";
import {
  getIdeaRecord,
  updateIdeaRecord,
} from "../../lib/airtable-keywords.js";
import type { ContentIdeaRecord } from "../../types/index.js";

/**
 * Build the prompt for title generation
 * 
 * TypeScript Note: This function constructs a detailed prompt string
 * that includes all the context Claude needs to generate good titles.
 */
function buildTitlePrompt(ctx: {
  keyword: string;
  searchIntent: string;
  searchVolume: number;
  contentType: string;
  serpFeatures: string[];
  competitorUrls: string;
  industry?: any;
  persona?: any;
  problem?: any;
}): string {
  return `You are an SEO content strategist. Generate title ideas and content angles for a piece targeting this keyword.

## Keyword Data
- Primary Keyword: ${ctx.keyword}
- Search Intent: ${ctx.searchIntent}
- Monthly Volume: ${ctx.searchVolume}
- Suggested Content Type: ${ctx.contentType}
- SERP Features Present: ${ctx.serpFeatures.join(", ") || "None"}

## Competitor URLs (Top 5)
${ctx.competitorUrls || "Not available"}

${
  ctx.industry
    ? `## Industry Context
Name: ${ctx.industry.Name || ""}
Description: ${ctx.industry.Description || ""}
Pain Points: ${ctx.industry["Pain Points"] || ""}
`
    : ""
}

${
  ctx.persona
    ? `## Target Persona
Name: ${ctx.persona["Persona Name"] || ctx.persona.Name || ""}
Role: ${ctx.persona["Role/Title"] || ctx.persona.Title || ""}
Goals: ${ctx.persona.Goals || ""}
Pain Points: ${ctx.persona["Pain Points"] || ""}
`
    : ""
}

${
  ctx.problem
    ? `## Problem Being Addressed
Name: ${ctx.problem["Problem Name"] || ctx.problem.Name || ""}
Description: ${ctx.problem.Description || ""}
`
    : ""
}

## Instructions

Generate 5 title options and 3 content angles for this keyword.

### Title Guidelines:
1. Include the primary keyword naturally
2. Keep titles under 60 characters for SERP display
3. Match the search intent (${ctx.searchIntent})
4. If Featured Snippet is present, consider question-format titles
5. Include a number or specific claim when appropriate
6. Vary the formats: how-to, list, question, statement, comparison

### Content Angle Guidelines:
1. Describe a unique angle or hook for the content
2. Explain what differentiates this from competitor content
3. Include specific sections or subtopics to cover

## Output Format

Return your response in this exact JSON format:
{
  "titles": [
    {"title": "Title 1", "charCount": 45, "format": "how-to"},
    {"title": "Title 2", "charCount": 52, "format": "list"},
    ...
  ],
  "contentAngles": [
    {
      "angle": "Description of angle",
      "hook": "Opening hook or premise",
      "sections": ["Section 1", "Section 2", "Section 3"]
    },
    ...
  ]
}`;
}

/**
 * Parse title response from Claude
 * 
 * Extracts JSON from Claude's response, handling cases where
 * Claude adds extra text around the JSON.
 */
function parseTitleResponse(response: string): {
  titles: any[];
  contentAngles: string;
} {
  try {
    // Extract JSON from response (Claude might add markdown formatting)
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in response");
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      titles: parsed.titles || [],
      contentAngles: JSON.stringify(parsed.contentAngles || [], null, 2),
    };
  } catch (e) {
    console.error("Failed to parse title response:", e);
    // Return empty arrays as fallback
    return {
      titles: [],
      contentAngles: response, // Return raw response as fallback
    };
  }
}

/**
 * Generate Titles Function
 * 
 * Triggered by: keyword/generate-titles event
 */
export const generateTitles = inngest.createFunction(
  {
    id: "generate-titles",
    retries: 2,
  },
  { event: "keyword/generate-titles" },
  async ({ event, step }) => {
    const { recordId } = event.data;

    // Get the idea record
    const idea = await step.run("get-idea", async () => {
      return await getIdeaRecord(recordId);
    });

    const keyword = idea.fields.Keyword;
    const searchIntent = idea.fields["Search Intent"] || "Informational";
    const searchVolume = idea.fields["Search Volume"] || 0;
    const contentType =
      idea.fields["Content Type Suggestion"] || "blog";
    const serpFeatures = idea.fields["SERP Features"] || [];
    const competitorUrls = idea.fields["Competitor URLs"] || "[]";

    // Parse competitor URLs if stored as JSON string
    let competitorUrlsArray: string[] = [];
    try {
      if (typeof competitorUrls === "string") {
        competitorUrlsArray = JSON.parse(competitorUrls);
      }
    } catch {
      // If parsing fails, use empty array
      competitorUrlsArray = [];
    }

    // Get entity context if linked (stored as text IDs, would need to fetch)
    // For now, we'll work with what we have in the idea record
    const industry = idea.fields.Industry?.[0]
      ? { Name: idea.fields.Industry[0] }
      : undefined;
    const persona = idea.fields.Persona?.[0]
      ? { Name: idea.fields.Persona[0] }
      : undefined;
    const problem = idea.fields.Problem?.[0]
      ? { Name: idea.fields.Problem[0] }
      : undefined;

    // Update status to "Generating"
    await step.run("status-generating", async () => {
      await updateIdeaRecord(recordId, { Status: "Generating" });
    });

    // Build prompt
    const titlePrompt = buildTitlePrompt({
      keyword,
      searchIntent,
      searchVolume,
      contentType,
      serpFeatures,
      competitorUrls: competitorUrlsArray.join("\n"),
      industry,
      persona,
      problem,
    });

    // Generate titles with Claude
    const titleResponse = await step.run("generate-titles", async () => {
      return await generate({
        prompt: titlePrompt,
        recordId,
        step: "title-generation",
        maxTokens: 1000,
      });
    });

    // Parse titles from response
    const { titles, contentAngles } = parseTitleResponse(titleResponse.text);

    // Update record with generated content
    await step.run("save-titles", async () => {
      await updateIdeaRecord(recordId, {
        "Title Ideas": JSON.stringify(titles),
        "Content Angles": contentAngles,
        Status: "Ready",
      });
    });

    return {
      status: "complete",
      recordId,
      titlesGenerated: titles.length,
    };
  }
);

