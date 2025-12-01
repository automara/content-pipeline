# Automara Keyword & Content Ideation System

## DataForSEO + Airtable + Inngest + Claude

> Upstream ideation system that discovers keywords and generates content ideas before they hit your production pipeline.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              AIRTABLE                                            │
│                                                                                  │
│  ┌───────────────────────────────────────────────────────────────────────────┐  │
│  │  CONTENT IDEAS TABLE                                                       │  │
│  │  ────────────────────────────────────────────────────────────────────────  │  │
│  │  │ Keyword        │ Volume │ KD │ Intent  │ Title Ideas   │ Status     │  │  │
│  │  ├────────────────┼────────┼────┼─────────┼───────────────┼────────────┤  │  │
│  │  │ pseo for saas  │ 720    │ 32 │ Info    │ [3 titles]    │ Review     │  │  │
│  │  │ abm content... │ 480    │ 28 │ Commer. │ [3 titles]    │ Approved   │  │  │
│  │  │ landing page...│ 1.9K   │ 45 │ Info    │ [3 titles]    │ Promoted   │  │  │
│  │  └────────────────────────────────────────────────────────────────────────┘  │
│  │                                                                               │
│  │  TRIGGERS                                                                     │
│  │  • Button: "Research Keywords" ──────► Webhook: Manual Research              │
│  │  • Cron: Weekly ─────────────────────► Webhook: Automated Gap Scan           │
│  │  • When Status → "Approved" ─────────► Webhook: Generate Titles              │
│  │  • When Status → "Promoted" ─────────► Create in Content Pipeline            │
│  └───────────────────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────┬─────────────────────────────────────────┘
                                        │
                                        ▼
┌───────────────────────────────────────────────────────────────────────────────────┐
│                         RAILWAY (Your API)                                        │
│                                                                                   │
│   ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────────────────┐  │
│   │  Webhook Routes │    │ Inngest Client  │    │   Inngest Functions         │  │
│   │                 │    │                 │    │                             │  │
│   │ POST /keyword/  │───►│ inngest.send()  │───►│ • keyword-research          │  │
│   │   research      │    │                 │    │ • gap-analysis              │  │
│   │ POST /keyword/  │    │                 │    │ • generate-titles           │  │
│   │   gap-scan      │    │                 │    │ • promote-to-pipeline       │  │
│   │ POST /keyword/  │    │                 │    │                             │  │
│   │   generate-title│    │                 │    │                             │  │
│   └─────────────────┘    └─────────────────┘    └───────────┬─────────────────┘  │
│                                                              │                   │
└──────────────────────────────────────────────────────────────┼───────────────────┘
                                                               │
                    ┌──────────────────────────────────────────┼────────────────┐
                    │                                          │                │
                    ▼                                          ▼                ▼
          ┌─────────────────┐                      ┌─────────────────┐  ┌───────────────┐
          │   DATAFORSEO    │                      │  INNGEST CLOUD  │  │    CLAUDE     │
          │                 │                      │                 │  │               │
          │ • SERP Analysis │◄── Keyword Data ────│ • Event Queue   │  │ Title Ideas   │
          │ • Keyword Data  │                      │ • Cron Jobs     │  │ Content Angles│
          │ • Competitors   │                      │ • Retries       │  │ SEO Scoring   │
          └─────────────────┘                      └─────────────────┘  └───────────────┘
```

---

## Integration with Existing System

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           IDEATION → PRODUCTION FLOW                             │
│                                                                                  │
│   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────────┐  │
│   │  Seed Topic │───►│  DataForSEO │───►│  Ideas      │───►│ Content Pipeline │  │
│   │  or Gap Scan│    │  Research   │    │  Review     │    │ (Your Existing)  │  │
│   └─────────────┘    └─────────────┘    └─────────────┘    └─────────────────┘  │
│                                               │                                  │
│                                               │                                  │
│        UPSTREAM: This System                  │     DOWNSTREAM: Batch Processing │
│        ─────────────────────────              │     ────────────────────────────  │
│        • Keyword discovery                    │     • Outline generation          │
│        • Search volume/difficulty             ▼     • Draft generation            │
│        • Title generation               ┌───────────┐ • Human review checkpoints  │
│        • Content angle ideation         │  PROMOTE  │ • Publishing                │
│                                         └───────────┘                             │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Part 1: Airtable Structure

### Table: Content Ideas

| Field Name | Field Type | Purpose |
|------------|------------|---------|
| **Keyword** | Single line text | Primary keyword/topic |
| **Search Volume** | Number | Monthly search volume |
| **Keyword Difficulty** | Number | 0-100 difficulty score |
| **CPC** | Currency | Cost per click indicator |
| **Search Intent** | Single select | `Informational`, `Commercial`, `Transactional`, `Navigational` |
| **SERP Features** | Multiple select | `Featured Snippet`, `PAA`, `Video`, `Local Pack`, etc. |
| **Related Keywords** | Long text | JSON array of related terms |
| **Competitor URLs** | Long text | Top-ranking URLs for analysis |
| **Industry** | Link to Industries | Entity graph mapping |
| **Persona** | Link to Personas | Entity graph mapping |
| **Problem** | Link to Problems | Entity graph mapping |
| **Content Type Suggestion** | Single select | `blog`, `industry_page`, `comparison`, `how-to` |
| **Title Ideas** | Long text | JSON array of 3-5 SEO-optimized titles |
| **Content Angles** | Long text | AI-generated content angles |
| **SEO Score** | Number | Opportunity score (volume/difficulty ratio) |
| **Status** | Single select | Workflow state |
| **Source** | Single select | `Manual`, `Gap Scan`, `Competitor Analysis` |
| **Seed Topic** | Single line text | Original topic that spawned this |
| **Promoted Record ID** | Single line text | Link to Content Pipeline record |
| **Research Date** | Date | When keyword data was fetched |
| **Created** | Created time | Auto |

### Status Values

```
1. ⚪ Queued         - Waiting for keyword research (gray)
2. 🔵 Researching    - DataForSEO lookup in progress (blue)
3. 🟠 Review         - Ready for human review (orange)
4. 🟡 Approved       - Ready for title generation (yellow)
5. 🔵 Generating     - Titles being generated (blue)
6. 🟢 Ready          - Titles generated, ready to promote (green)
7. ✅ Promoted       - Pushed to Content Pipeline (green checkmark)
8. ⛔ Rejected       - Not worth pursuing (red)
```

### Table: Research Jobs (Optional - for batch tracking)

| Field Name | Field Type | Purpose |
|------------|------------|---------|
| **Job ID** | Single line text | Inngest run ID |
| **Job Type** | Single select | `Manual`, `Gap Scan`, `Competitor Analysis` |
| **Seed Topics** | Long text | Input topics |
| **Ideas Generated** | Number | Count of ideas created |
| **Status** | Single select | `Running`, `Complete`, `Failed` |
| **Started** | Date time | Job start |
| **Completed** | Date time | Job end |
| **Error** | Long text | Error message if failed |

---

## Part 2: DataForSEO Integration

### API Overview

DataForSEO provides several endpoints relevant to ideation:

| Endpoint | Use Case | Cost |
|----------|----------|------|
| `/keywords_data/google/search_volume/live` | Volume, CPC, competition | $0.05/100 keywords |
| `/keywords_data/google/keyword_ideas/live` | Related keyword suggestions | $0.05/task |
| `/serp/google/organic/live/regular` | SERP analysis, competitor URLs | $0.002-0.004/task |
| `/dataforseo_labs/google/keyword_suggestions/live` | AI-powered suggestions | $0.015/task |

### DataForSEO Client

```typescript
// src/lib/dataforseo.ts

interface DataForSEOConfig {
  login: string;
  password: string;
  baseUrl?: string;
}

interface KeywordData {
  keyword: string;
  searchVolume: number;
  cpc: number;
  competition: number;
  keywordDifficulty: number;
  searchIntent: string;
  serpFeatures: string[];
  relatedKeywords: string[];
  competitorUrls: string[];
}

export class DataForSEOClient {
  private config: DataForSEOConfig;
  
  constructor(config: DataForSEOConfig) {
    this.config = {
      ...config,
      baseUrl: config.baseUrl || 'https://api.dataforseo.com/v3'
    };
  }

  private async request(endpoint: string, data: any[]): Promise<any> {
    const auth = Buffer.from(
      `${this.config.login}:${this.config.password}`
    ).toString('base64');

    const response = await fetch(`${this.config.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error(`DataForSEO API error: ${response.status}`);
    }

    const result = await response.json();
    
    if (result.status_code !== 20000) {
      throw new Error(`DataForSEO error: ${result.status_message}`);
    }

    return result;
  }

  /**
   * Get search volume and metrics for keywords
   */
  async getKeywordVolume(keywords: string[], location: number = 2840): Promise<Map<string, any>> {
    const result = await this.request('/keywords_data/google/search_volume/live', [{
      keywords,
      location_code: location, // 2840 = United States
      language_code: 'en'
    }]);

    const metrics = new Map();
    for (const item of result.tasks?.[0]?.result || []) {
      metrics.set(item.keyword, {
        searchVolume: item.search_volume || 0,
        cpc: item.cpc || 0,
        competition: item.competition || 0,
        monthlySearches: item.monthly_searches || []
      });
    }
    return metrics;
  }

  /**
   * Get keyword suggestions/ideas from a seed
   */
  async getKeywordIdeas(seed: string, limit: number = 50): Promise<string[]> {
    const result = await this.request('/dataforseo_labs/google/keyword_suggestions/live', [{
      keyword: seed,
      location_code: 2840,
      language_code: 'en',
      include_serp_info: false,
      include_seed_keyword: true,
      limit
    }]);

    return result.tasks?.[0]?.result?.[0]?.items?.map((item: any) => item.keyword) || [];
  }

  /**
   * Get SERP data including competitors and features
   */
  async getSerpData(keyword: string): Promise<{
    serpFeatures: string[];
    competitorUrls: string[];
    searchIntent: string;
  }> {
    const result = await this.request('/serp/google/organic/live/regular', [{
      keyword,
      location_code: 2840,
      language_code: 'en',
      device: 'desktop',
      depth: 10
    }]);

    const serpData = result.tasks?.[0]?.result?.[0] || {};
    
    // Extract SERP features
    const serpFeatures: string[] = [];
    if (serpData.item_types) {
      if (serpData.item_types.includes('featured_snippet')) serpFeatures.push('Featured Snippet');
      if (serpData.item_types.includes('people_also_ask')) serpFeatures.push('PAA');
      if (serpData.item_types.includes('video')) serpFeatures.push('Video');
      if (serpData.item_types.includes('local_pack')) serpFeatures.push('Local Pack');
      if (serpData.item_types.includes('knowledge_graph')) serpFeatures.push('Knowledge Graph');
    }

    // Extract top competitor URLs
    const competitorUrls = serpData.items
      ?.filter((item: any) => item.type === 'organic')
      ?.slice(0, 5)
      ?.map((item: any) => item.url) || [];

    // Infer search intent from SERP features and content
    const searchIntent = this.inferSearchIntent(serpData, keyword);

    return { serpFeatures, competitorUrls, searchIntent };
  }

  /**
   * Get keyword difficulty score
   */
  async getKeywordDifficulty(keywords: string[]): Promise<Map<string, number>> {
    const result = await this.request('/dataforseo_labs/google/keyword_difficulty/live', [{
      keywords,
      location_code: 2840,
      language_code: 'en'
    }]);

    const difficulties = new Map();
    for (const item of result.tasks?.[0]?.result || []) {
      difficulties.set(item.keyword, item.keyword_difficulty || 50);
    }
    return difficulties;
  }

  /**
   * Full keyword research combining multiple endpoints
   */
  async researchKeyword(keyword: string): Promise<KeywordData> {
    // Parallel requests for efficiency
    const [volumeData, serpData, difficultyData, relatedKeywords] = await Promise.all([
      this.getKeywordVolume([keyword]),
      this.getSerpData(keyword),
      this.getKeywordDifficulty([keyword]),
      this.getKeywordIdeas(keyword, 20)
    ]);

    const volume = volumeData.get(keyword) || {};
    
    return {
      keyword,
      searchVolume: volume.searchVolume || 0,
      cpc: volume.cpc || 0,
      competition: volume.competition || 0,
      keywordDifficulty: difficultyData.get(keyword) || 50,
      searchIntent: serpData.searchIntent,
      serpFeatures: serpData.serpFeatures,
      relatedKeywords,
      competitorUrls: serpData.competitorUrls
    };
  }

  private inferSearchIntent(serpData: any, keyword: string): string {
    // Simple heuristic-based intent detection
    const keywordLower = keyword.toLowerCase();
    
    // Transactional indicators
    if (/buy|purchase|pricing|cost|cheap|deal|order|shop/.test(keywordLower)) {
      return 'Transactional';
    }
    
    // Commercial indicators
    if (/best|top|review|compare|vs|alternative|tool|software|platform/.test(keywordLower)) {
      return 'Commercial';
    }
    
    // Navigational indicators
    if (/login|sign in|official|website/.test(keywordLower)) {
      return 'Navigational';
    }
    
    // Check SERP features for additional signals
    const itemTypes = serpData.item_types || [];
    if (itemTypes.includes('shopping')) return 'Transactional';
    if (itemTypes.includes('featured_snippet') || itemTypes.includes('people_also_ask')) {
      return 'Informational';
    }
    
    return 'Informational'; // Default
  }
}

export const dataForSEO = new DataForSEOClient({
  login: process.env.DATAFORSEO_LOGIN!,
  password: process.env.DATAFORSEO_PASSWORD!
});
```

---

## Part 3: Inngest Functions

### Function 1: Manual Keyword Research

Triggered by seeding topics manually.

```typescript
// src/inngest/functions/keyword-research.ts

import { inngest } from '../client';
import { dataForSEO } from '../../lib/dataforseo';
import { airtable, updateRecord, createRecord } from '../../lib/airtable';
import { generateWithClaude } from '../../lib/claude';

interface KeywordResearchEvent {
  name: 'keyword/research.start';
  data: {
    seedTopics: string[];        // e.g., ["pseo for saas", "abm content strategy"]
    industryId?: string;         // Optional entity graph mapping
    personaId?: string;
    problemId?: string;
    expandKeywords?: boolean;    // Whether to fetch related keywords
    limit?: number;              // Max ideas to generate per seed
  };
}

export const keywordResearch = inngest.createFunction(
  { 
    id: 'keyword-research',
    retries: 3,
    concurrency: { limit: 5 }  // Respect API rate limits
  },
  { event: 'keyword/research.start' },
  async ({ event, step }) => {
    const { 
      seedTopics, 
      industryId, 
      personaId, 
      problemId,
      expandKeywords = true,
      limit = 10 
    } = event.data;

    const results: string[] = [];

    for (const seed of seedTopics) {
      // Step 1: Expand seed into related keywords (optional)
      let keywords = [seed];
      
      if (expandKeywords) {
        const relatedKeywords = await step.run(`expand-${seed}`, async () => {
          return await dataForSEO.getKeywordIdeas(seed, limit);
        });
        keywords = [seed, ...relatedKeywords.slice(0, limit - 1)];
      }

      // Step 2: Research each keyword
      for (const keyword of keywords) {
        const keywordData = await step.run(`research-${keyword}`, async () => {
          return await dataForSEO.researchKeyword(keyword);
        });

        // Step 3: Calculate SEO opportunity score
        const seoScore = calculateSEOScore(keywordData);

        // Step 4: Skip low-opportunity keywords
        if (seoScore < 20) {
          continue;  // Not worth pursuing
        }

        // Step 5: Create idea record in Airtable
        const recordId = await step.run(`create-idea-${keyword}`, async () => {
          return await createRecord('Content Ideas', {
            'Keyword': keyword,
            'Search Volume': keywordData.searchVolume,
            'Keyword Difficulty': keywordData.keywordDifficulty,
            'CPC': keywordData.cpc,
            'Search Intent': keywordData.searchIntent,
            'SERP Features': keywordData.serpFeatures,
            'Related Keywords': JSON.stringify(keywordData.relatedKeywords),
            'Competitor URLs': JSON.stringify(keywordData.competitorUrls),
            'Industry': industryId ? [industryId] : undefined,
            'Persona': personaId ? [personaId] : undefined,
            'Problem': problemId ? [problemId] : undefined,
            'SEO Score': seoScore,
            'Status': 'Review',
            'Source': 'Manual',
            'Seed Topic': seed,
            'Research Date': new Date().toISOString().split('T')[0]
          });
        });

        results.push(recordId);
      }
    }

    return { 
      status: 'complete', 
      ideasCreated: results.length,
      recordIds: results 
    };
  }
);

function calculateSEOScore(data: KeywordData): number {
  // Higher volume + lower difficulty = higher score
  // Score from 0-100
  
  const volumeScore = Math.min(data.searchVolume / 100, 50);  // Max 50 points
  const difficultyScore = 50 - (data.keywordDifficulty / 2);  // Max 50 points
  
  // Bonus for SERP features we can target
  let featureBonus = 0;
  if (data.serpFeatures.includes('Featured Snippet')) featureBonus += 5;
  if (data.serpFeatures.includes('PAA')) featureBonus += 3;
  
  return Math.round(volumeScore + difficultyScore + featureBonus);
}
```

### Function 2: Automated Gap Analysis

Scans your entity graph for content gaps.

```typescript
// src/inngest/functions/gap-analysis.ts

import { inngest } from '../client';
import { dataForSEO } from '../../lib/dataforseo';
import { airtable, getRecords, createRecord } from '../../lib/airtable';

interface GapAnalysisEvent {
  name: 'keyword/gap-analysis.start';
  data: {
    scope?: 'all' | 'industries' | 'personas' | 'problems';
  };
}

export const gapAnalysis = inngest.createFunction(
  { 
    id: 'gap-analysis',
    retries: 2
  },
  { event: 'keyword/gap-analysis.start' },
  async ({ event, step }) => {
    const scope = event.data.scope || 'all';

    // Step 1: Load entity graph data
    const [industries, personas, problems, existingIdeas, existingContent] = await step.run(
      'load-entities',
      async () => {
        return await Promise.all([
          getRecords('Industries'),
          getRecords('Personas'),
          getRecords('Problems'),
          getRecords('Content Ideas', { filterByFormula: `{Status} != 'Rejected'` }),
          getRecords('Content Pipeline')
        ]);
      }
    );

    // Step 2: Generate keyword candidates from entity combinations
    const candidates = await step.run('generate-candidates', async () => {
      return generateKeywordCandidates(industries, personas, problems, scope);
    });

    // Step 3: Filter out already-researched keywords
    const existingKeywords = new Set([
      ...existingIdeas.map(r => r.fields['Keyword']?.toLowerCase()),
      ...existingContent.map(r => r.fields['Target Keywords']?.toLowerCase())
    ].filter(Boolean));

    const newCandidates = candidates.filter(
      c => !existingKeywords.has(c.keyword.toLowerCase())
    );

    // Step 4: Research new candidates (batch to manage API costs)
    const batchSize = 20;
    const results: string[] = [];

    for (let i = 0; i < Math.min(newCandidates.length, 100); i += batchSize) {
      const batch = newCandidates.slice(i, i + batchSize);
      
      const batchResults = await step.run(`research-batch-${i}`, async () => {
        const researched = await Promise.all(
          batch.map(async (candidate) => {
            const data = await dataForSEO.researchKeyword(candidate.keyword);
            return { ...candidate, ...data };
          })
        );
        return researched;
      });

      // Create records for promising keywords
      for (const result of batchResults) {
        const seoScore = calculateSEOScore(result);
        if (seoScore < 25) continue;

        const recordId = await step.run(`create-${result.keyword}`, async () => {
          return await createRecord('Content Ideas', {
            'Keyword': result.keyword,
            'Search Volume': result.searchVolume,
            'Keyword Difficulty': result.keywordDifficulty,
            'CPC': result.cpc,
            'Search Intent': result.searchIntent,
            'SERP Features': result.serpFeatures,
            'Related Keywords': JSON.stringify(result.relatedKeywords),
            'Competitor URLs': JSON.stringify(result.competitorUrls),
            'Industry': result.industryId ? [result.industryId] : undefined,
            'Persona': result.personaId ? [result.personaId] : undefined,
            'Problem': result.problemId ? [result.problemId] : undefined,
            'Content Type Suggestion': result.contentType,
            'SEO Score': seoScore,
            'Status': 'Review',
            'Source': 'Gap Scan',
            'Seed Topic': result.seedTopic,
            'Research Date': new Date().toISOString().split('T')[0]
          });
        });
        
        results.push(recordId);
      }
    }

    return {
      status: 'complete',
      candidatesFound: newCandidates.length,
      ideasCreated: results.length
    };
  }
);

interface KeywordCandidate {
  keyword: string;
  industryId?: string;
  personaId?: string;
  problemId?: string;
  contentType: string;
  seedTopic: string;
}

function generateKeywordCandidates(
  industries: any[],
  personas: any[],
  problems: any[],
  scope: string
): KeywordCandidate[] {
  const candidates: KeywordCandidate[] = [];

  // Pattern: "[problem] for [industry]"
  if (scope === 'all' || scope === 'industries') {
    for (const industry of industries) {
      for (const problem of problems) {
        candidates.push({
          keyword: `${problem.fields['Problem Name']} ${industry.fields['Name']}`.toLowerCase(),
          industryId: industry.id,
          problemId: problem.id,
          contentType: 'industry_page',
          seedTopic: `${problem.fields['Problem Name']} × ${industry.fields['Name']}`
        });
      }
    }
  }

  // Pattern: "[solution] for [persona]"
  if (scope === 'all' || scope === 'personas') {
    for (const persona of personas) {
      const solutionKeywords = ['content systems', 'pseo tools', 'landing page automation', 'abm platform'];
      for (const solution of solutionKeywords) {
        candidates.push({
          keyword: `${solution} for ${persona.fields['Role/Title']}`.toLowerCase(),
          personaId: persona.id,
          contentType: 'persona_page',
          seedTopic: `${solution} × ${persona.fields['Persona Name']}`
        });
      }
    }
  }

  // Pattern: "how to [problem/use case]"
  if (scope === 'all' || scope === 'problems') {
    for (const problem of problems) {
      candidates.push({
        keyword: `how to ${problem.fields['Problem Name']}`.toLowerCase().replace('can\'t', ''),
        problemId: problem.id,
        contentType: 'how-to',
        seedTopic: problem.fields['Problem Name']
      });
    }
  }

  // Pattern: "[thing] vs [thing]" comparisons
  const comparisonPairs = [
    ['pseo', 'traditional seo'],
    ['pseo', 'content marketing'],
    ['abm', 'demand gen'],
    ['modular content', 'custom content']
  ];
  
  for (const [a, b] of comparisonPairs) {
    candidates.push({
      keyword: `${a} vs ${b}`,
      contentType: 'comparison',
      seedTopic: `${a} vs ${b}`
    });
  }

  return candidates;
}
```

### Function 3: Generate Titles

Creates SEO-optimized title suggestions.

```typescript
// src/inngest/functions/generate-titles.ts

import { inngest } from '../client';
import { generateWithClaude } from '../../lib/claude';
import { getRecord, updateRecord, getRecords } from '../../lib/airtable';

interface GenerateTitlesEvent {
  name: 'keyword/generate-titles';
  data: {
    recordId: string;
  };
}

export const generateTitles = inngest.createFunction(
  { 
    id: 'generate-titles',
    retries: 2
  },
  { event: 'keyword/generate-titles' },
  async ({ event, step }) => {
    const { recordId } = event.data;

    // Get the idea record
    const idea = await step.run('get-idea', async () => {
      return await getRecord('Content Ideas', recordId);
    });

    const keyword = idea.fields['Keyword'];
    const searchIntent = idea.fields['Search Intent'];
    const searchVolume = idea.fields['Search Volume'];
    const contentType = idea.fields['Content Type Suggestion'];
    const serpFeatures = idea.fields['SERP Features'] || [];
    const competitorUrls = idea.fields['Competitor URLs'];

    // Get entity context if linked
    const [industry, persona, problem] = await step.run('get-context', async () => {
      return await Promise.all([
        idea.fields['Industry']?.[0] ? getRecord('Industries', idea.fields['Industry'][0]) : null,
        idea.fields['Persona']?.[0] ? getRecord('Personas', idea.fields['Persona'][0]) : null,
        idea.fields['Problem']?.[0] ? getRecord('Problems', idea.fields['Problem'][0]) : null
      ]);
    });

    // Update status
    await step.run('status-generating', async () => {
      await updateRecord('Content Ideas', recordId, { 'Status': 'Generating' });
    });

    // Generate titles with Claude
    const titlePrompt = buildTitlePrompt({
      keyword,
      searchIntent,
      searchVolume,
      contentType,
      serpFeatures,
      competitorUrls,
      industry: industry?.fields,
      persona: persona?.fields,
      problem: problem?.fields
    });

    const titleResponse = await step.run('generate-titles', async () => {
      return await generateWithClaude({
        prompt: titlePrompt,
        maxTokens: 1000
      });
    });

    // Parse titles from response
    const { titles, contentAngles } = parseTitleResponse(titleResponse);

    // Update record with generated content
    await step.run('save-titles', async () => {
      await updateRecord('Content Ideas', recordId, {
        'Title Ideas': JSON.stringify(titles),
        'Content Angles': contentAngles,
        'Status': 'Ready'
      });
    });

    return {
      status: 'complete',
      recordId,
      titlesGenerated: titles.length
    };
  }
);

interface TitlePromptContext {
  keyword: string;
  searchIntent: string;
  searchVolume: number;
  contentType: string;
  serpFeatures: string[];
  competitorUrls: string;
  industry?: any;
  persona?: any;
  problem?: any;
}

function buildTitlePrompt(ctx: TitlePromptContext): string {
  return `You are an SEO content strategist. Generate title ideas and content angles for a piece targeting this keyword.

## Keyword Data
- Primary Keyword: ${ctx.keyword}
- Search Intent: ${ctx.searchIntent}
- Monthly Volume: ${ctx.searchVolume}
- Suggested Content Type: ${ctx.contentType}
- SERP Features Present: ${ctx.serpFeatures.join(', ') || 'None'}

## Competitor URLs (Top 5)
${ctx.competitorUrls || 'Not available'}

${ctx.industry ? `## Industry Context
Name: ${ctx.industry['Name']}
Description: ${ctx.industry['Description']}
Pain Points: ${ctx.industry['Pain Points']}
` : ''}

${ctx.persona ? `## Target Persona
Name: ${ctx.persona['Persona Name']}
Role: ${ctx.persona['Role/Title']}
Goals: ${ctx.persona['Goals']}
Pain Points: ${ctx.persona['Pain Points']}
` : ''}

${ctx.problem ? `## Problem Being Addressed
Name: ${ctx.problem['Problem Name']}
Description: ${ctx.problem['Description']}
` : ''}

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

function parseTitleResponse(response: string): { titles: any[], contentAngles: string } {
  try {
    // Extract JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }
    
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      titles: parsed.titles || [],
      contentAngles: JSON.stringify(parsed.contentAngles || [], null, 2)
    };
  } catch (e) {
    console.error('Failed to parse title response:', e);
    return {
      titles: [],
      contentAngles: response  // Return raw response as fallback
    };
  }
}
```

### Function 4: Promote to Pipeline

Moves approved ideas to Content Pipeline.

```typescript
// src/inngest/functions/promote-to-pipeline.ts

import { inngest } from '../client';
import { getRecord, updateRecord, createRecord } from '../../lib/airtable';

interface PromoteEvent {
  name: 'keyword/promote';
  data: {
    recordId: string;
    selectedTitleIndex?: number;  // Which title to use (default: first)
  };
}

export const promoteToPipeline = inngest.createFunction(
  { id: 'promote-to-pipeline' },
  { event: 'keyword/promote' },
  async ({ event, step }) => {
    const { recordId, selectedTitleIndex = 0 } = event.data;

    // Get the idea record
    const idea = await step.run('get-idea', async () => {
      return await getRecord('Content Ideas', recordId);
    });

    // Parse title selection
    const titles = JSON.parse(idea.fields['Title Ideas'] || '[]');
    const selectedTitle = titles[selectedTitleIndex]?.title || idea.fields['Keyword'];

    // Create Content Pipeline record
    const pipelineRecordId = await step.run('create-pipeline-record', async () => {
      return await createRecord('Content Pipeline', {
        'Title': selectedTitle,
        'Industry': idea.fields['Industry'],
        'Persona': idea.fields['Persona'],
        'Content Type': idea.fields['Content Type Suggestion'] || 'blog',
        'Target Keywords': idea.fields['Keyword'],
        'Status': 'Draft',  // Ready to be set to "Ready" for generation
        // Additional context for generation
        'Notes': `SEO Score: ${idea.fields['SEO Score']}\n` +
                 `Search Volume: ${idea.fields['Search Volume']}\n` +
                 `Keyword Difficulty: ${idea.fields['Keyword Difficulty']}\n` +
                 `Search Intent: ${idea.fields['Search Intent']}\n` +
                 `Content Angles: ${idea.fields['Content Angles']}`
      });
    });

    // Update idea status
    await step.run('update-idea-status', async () => {
      await updateRecord('Content Ideas', recordId, {
        'Status': 'Promoted',
        'Promoted Record ID': pipelineRecordId
      });
    });

    return {
      status: 'complete',
      ideaRecordId: recordId,
      pipelineRecordId
    };
  }
);
```

---

## Part 4: Webhook Routes

```typescript
// src/routes/keyword.ts

import { Router } from 'express';
import { inngest } from '../inngest/client';
import { verifyWebhookSecret } from '../lib/auth';

const router = Router();

/**
 * Manual keyword research
 * POST /api/keyword/research
 */
router.post('/research', verifyWebhookSecret, async (req, res) => {
  const { seedTopics, industryId, personaId, problemId, expandKeywords, limit } = req.body;

  if (!seedTopics || !Array.isArray(seedTopics) || seedTopics.length === 0) {
    return res.status(400).json({ error: 'seedTopics array required' });
  }

  await inngest.send({
    name: 'keyword/research.start',
    data: {
      seedTopics,
      industryId,
      personaId,
      problemId,
      expandKeywords: expandKeywords !== false,
      limit: limit || 10
    }
  });

  res.json({ 
    status: 'started',
    message: `Researching ${seedTopics.length} seed topic(s)`
  });
});

/**
 * Automated gap analysis
 * POST /api/keyword/gap-scan
 */
router.post('/gap-scan', verifyWebhookSecret, async (req, res) => {
  const { scope } = req.body;

  await inngest.send({
    name: 'keyword/gap-analysis.start',
    data: { scope: scope || 'all' }
  });

  res.json({ 
    status: 'started',
    message: 'Gap analysis started'
  });
});

/**
 * Generate titles for approved idea
 * POST /api/keyword/generate-titles
 */
router.post('/generate-titles', verifyWebhookSecret, async (req, res) => {
  const { recordId } = req.body;

  if (!recordId) {
    return res.status(400).json({ error: 'recordId required' });
  }

  await inngest.send({
    name: 'keyword/generate-titles',
    data: { recordId }
  });

  res.json({ 
    status: 'started',
    message: 'Title generation started'
  });
});

/**
 * Promote idea to Content Pipeline
 * POST /api/keyword/promote
 */
router.post('/promote', verifyWebhookSecret, async (req, res) => {
  const { recordId, selectedTitleIndex } = req.body;

  if (!recordId) {
    return res.status(400).json({ error: 'recordId required' });
  }

  await inngest.send({
    name: 'keyword/promote',
    data: { 
      recordId,
      selectedTitleIndex: selectedTitleIndex || 0
    }
  });

  res.json({ 
    status: 'started',
    message: 'Promoting to Content Pipeline'
  });
});

export default router;
```

---

## Part 5: Airtable Automations

### Automation 1: Generate Titles on Approval

**Trigger:** When record matches conditions
- Field: Status
- Condition: equals "Approved"

**Action:** Send webhook
```json
{
  "method": "POST",
  "url": "https://your-app.railway.app/api/keyword/generate-titles",
  "headers": {
    "Content-Type": "application/json",
    "X-Webhook-Secret": "your-secret-here"
  },
  "body": {
    "recordId": "{Record ID}"
  }
}
```

### Automation 2: Promote on Status Change

**Trigger:** When record matches conditions
- Field: Status
- Condition: equals "Promoted"

**Action:** Send webhook
```json
{
  "method": "POST",
  "url": "https://your-app.railway.app/api/keyword/promote",
  "headers": {
    "Content-Type": "application/json",
    "X-Webhook-Secret": "your-secret-here"
  },
  "body": {
    "recordId": "{Record ID}",
    "selectedTitleIndex": 0
  }
}
```

### Automation 3: Weekly Gap Scan (Cron via Inngest)

Instead of Airtable automation, use Inngest cron:

```typescript
// src/inngest/functions/scheduled-gap-scan.ts

export const scheduledGapScan = inngest.createFunction(
  { id: 'scheduled-gap-scan' },
  { cron: '0 8 * * 1' },  // Every Monday at 8am
  async ({ step }) => {
    await inngest.send({
      name: 'keyword/gap-analysis.start',
      data: { scope: 'all' }
    });

    return { status: 'triggered' };
  }
);
```

---

## Part 6: Manual Additions

### Quick Add via Airtable

Just add a row manually:

| Keyword | Status | Industry | Persona |
|---------|--------|----------|---------|
| my custom topic | Queued | [link] | [link] |

Then use this Airtable Scripting App button to trigger research:

```javascript
// Airtable Scripting App - "Research Selected"
const table = base.getTable("Content Ideas");
const record = await input.recordAsync("Select record to research", table);

if (record && record.getCellValueAsString("Status") === "Queued") {
  const keyword = record.getCellValueAsString("Keyword");
  
  await fetch("https://your-app.railway.app/api/keyword/research", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Webhook-Secret": "your-secret"
    },
    body: JSON.stringify({
      seedTopics: [keyword],
      industryId: record.getCellValue("Industry")?.[0]?.id,
      personaId: record.getCellValue("Persona")?.[0]?.id,
      expandKeywords: false  // Just research this one keyword
    })
  });
  
  output.text(`Research started for: ${keyword}`);
}
```

### Bulk Import

Create an import view in Airtable with just the essentials:

| Keyword | Industry | Persona | Status |
|---------|----------|---------|--------|
| topic 1 | SaaS | CMO | Queued |
| topic 2 | Fintech | | Queued |

Then select all and bulk trigger:

```javascript
// Airtable Scripting App - "Research All Queued"
const table = base.getTable("Content Ideas");
const view = table.getView("Queued for Research");
const query = await view.selectRecordsAsync();

const queuedRecords = query.records.filter(
  r => r.getCellValueAsString("Status") === "Queued"
);

if (queuedRecords.length === 0) {
  output.text("No queued records found");
  return;
}

const seedTopics = queuedRecords.map(r => r.getCellValueAsString("Keyword"));

await fetch("https://your-app.railway.app/api/keyword/research", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-Webhook-Secret": "your-secret"
  },
  body: JSON.stringify({
    seedTopics,
    expandKeywords: true,
    limit: 5
  })
});

output.text(`Research started for ${seedTopics.length} topics`);
```

---

## Part 7: Environment Variables

Add to your existing `.env`:

```bash
# DataForSEO
DATAFORSEO_LOGIN=your_login
DATAFORSEO_PASSWORD=your_password

# Optional: Location targeting
DATAFORSEO_LOCATION=2840  # 2840 = United States, 2124 = Canada
```

---

## Part 8: Cost Estimation

### DataForSEO API Costs

| Operation | Cost | Per Seed Topic (10 keywords) |
|-----------|------|------------------------------|
| Search Volume | $0.05/100 keywords | $0.005 |
| Keyword Ideas | $0.05/task | $0.05 |
| SERP Data | $0.003/task | $0.03 |
| Keyword Difficulty | $0.02/100 keywords | $0.002 |
| **Total per seed** | | **~$0.09** |

### Budget Examples

| Usage | Monthly Cost |
|-------|--------------|
| 100 seed topics/month | ~$9 |
| Weekly gap scan (50 candidates) | ~$18 |
| Heavy research (500 topics) | ~$45 |

---

## Part 9: Workflow Summary

### Manual Research Flow

```
1. Add seed topic to Content Ideas (Status: Queued)
2. Click "Research Selected" button
3. DataForSEO fetches data
4. Record updated (Status: Review)
5. Human reviews SEO Score, Volume, Difficulty
6. Set Status → Approved (triggers title generation)
7. Review generated titles
8. Set Status → Promoted (creates Content Pipeline record)
9. Content Pipeline takes over (your existing system)
```

### Automated Gap Scan Flow

```
1. Weekly cron triggers gap analysis
2. Entity graph combinations generate keyword candidates
3. Filter out existing keywords
4. DataForSEO researches candidates
5. High-scoring ideas created (Status: Review)
6. Human reviews weekly batch
7. Approve good ones → Titles generated
8. Promote best → Content Pipeline
```

### The Full Picture

```
┌─────────────────────┐     ┌─────────────────────┐     ┌─────────────────────┐
│   IDEATION SYSTEM   │────►│   CONTENT IDEAS     │────►│  CONTENT PIPELINE   │
│                     │     │     (Airtable)      │     │   (Your Existing)   │
│ • DataForSEO        │     │                     │     │                     │
│ • Gap Analysis      │     │ • Keyword Data      │     │ • Outline           │
│ • Manual Seeds      │     │ • Title Ideas       │     │ • Draft             │
│                     │     │ • Human Review      │     │ • Review            │
└─────────────────────┘     └─────────────────────┘     └─────────────────────┘
```

---

## Quick Reference

### Start Manual Research

```bash
curl -X POST https://your-app.railway.app/api/keyword/research \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Secret: your-secret" \
  -d '{
    "seedTopics": ["pseo for saas", "abm content strategy"],
    "expandKeywords": true,
    "limit": 10
  }'
```

### Trigger Gap Scan

```bash
curl -X POST https://your-app.railway.app/api/keyword/gap-scan \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Secret: your-secret" \
  -d '{"scope": "all"}'
```

### Approve Idea → Generate Titles

```
Airtable: Status → "Approved"
```

### Promote to Pipeline

```
Airtable: Status → "Promoted"
```
