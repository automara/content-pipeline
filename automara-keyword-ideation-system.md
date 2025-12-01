# Automara Keyword & Content Ideation System

## DataForSEO + Airtable + Inngest + Claude

> Upstream ideation system that discovers keywords, clusters them, and generates content ideas before they hit your production pipeline.

---

## The Flow

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   RESEARCH   │────►│   CLUSTER    │────►│   IDEATE     │────►│   PROMOTE    │
│              │     │              │     │              │     │              │
│ Seed topic   │     │ Group related│     │ Generate     │     │ Push to      │
│ → 20 keywords│     │ keywords     │     │ title + angle│     │ pipeline     │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘

       ▼                    ▼                    ▼                    ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ Keyword Bank │     │ Content Ideas│     │ Content Ideas│     │Content Pipeline
│ (raw data)   │     │ (clusters)   │     │ (with title) │     │ (your system)│
│              │     │              │     │              │     │              │
│ 1 row =      │     │ 1 row =      │     │ 1 row =      │     │ 1 row =      │
│ 1 keyword    │     │ 1 cluster    │     │ 1 cluster    │     │ 1 content    │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
```

---

## Status-Driven Triggers

Everything runs on status changes. Bulk select rows → bulk update status → all process in parallel.

### Keyword Bank Statuses

| Status | What Happens |
|--------|--------------|
| **Research** | Triggers DataForSEO lookup, expands into related keywords |
| Researching | System is fetching data |
| **New** | Data fetched, ready for review |
| Reviewed | You've looked at it, not yet clustered |
| Clustered | Linked to a Content Idea |
| Rejected | Not worth pursuing |

### Content Ideas Statuses

| Status | What Happens |
|--------|--------------|
| Draft | Cluster being built (manual linking) |
| **Auto-Cluster** | Triggers Claude to suggest keyword groupings |
| Clustering | System is grouping keywords |
| **Generate Title** | Triggers Claude to create title + angles |
| Generating | System is creating title |
| Review | Title ready for your review |
| **Approved** | Triggers promotion to Content Pipeline |
| Promoted | Now exists in Content Pipeline |
| Rejected | Not pursuing |

**Bold = triggers automation**

---

## How to Use

### Research Keywords

1. Add row(s) to Keyword Bank with just the seed keyword
2. Set Status → **"Research"**
3. System fetches data + related keywords
4. New rows appear with Status = "New"

```
YOU DO:
┌─────────────────────────────────────────┐
│ Keyword Bank                            │
├─────────────────────────────────────────┤
│ landing page automation │ Research      │
│ pseo for saas           │ Research      │
│ abm content strategy    │ Research      │
└─────────────────────────────────────────┘

SYSTEM CREATES:
┌─────────────────────────────────────────────────────────┐
│ Keyword Bank                                            │
├─────────────────────────────────────────────────────────┤
│ landing page automation │ 890  │ KD 38 │ New            │
│ scale landing pages     │ 590  │ KD 35 │ New            │
│ automated landing pages │ 320  │ KD 28 │ New            │
│ pseo landing pages      │ 180  │ KD 22 │ New            │
│ pseo for saas           │ 720  │ KD 32 │ New            │
│ programmatic seo b2b    │ 480  │ KD 28 │ New            │
│ ... more                                                │
└─────────────────────────────────────────────────────────┘
```

### Cluster Keywords

**Option A: Auto-cluster**

1. Create row in Content Ideas with Cluster Name + Seed Topic
2. Set Status → **"Auto-Cluster"**
3. Claude groups related keywords from that seed
4. Keywords get linked automatically

```
YOU DO:
┌─────────────────────────────────────────────────────┐
│ Content Ideas                                       │
├─────────────────────────────────────────────────────┤
│ Cluster Name: Landing Page Automation               │
│ Seed Topic: landing page automation                 │
│ Status: Auto-Cluster                                │
└─────────────────────────────────────────────────────┘

SYSTEM DOES:
- Finds keywords from Keyword Bank with that seed
- Groups semantically related ones
- Links them to this Content Idea
- Sets Status → "Review" when done
```

**Option B: Manual cluster**

1. Create row in Content Ideas with Cluster Name
2. Go to Keyword Bank, link keywords to the cluster
3. Set Primary Keyword field
4. Set Status → **"Generate Title"** when ready

### Generate Title

1. Review your cluster (manual or auto)
2. Set Status → **"Generate Title"**
3. Claude creates SEO title + content angles
4. Status changes to "Review"

```
BEFORE:
┌─────────────────────────────────────────────────────┐
│ Cluster: Landing Page Automation                    │
│ Keywords: [4 linked]                                │
│ Status: Generate Title                              │
└─────────────────────────────────────────────────────┘

AFTER:
┌─────────────────────────────────────────────────────┐
│ Cluster: Landing Page Automation                    │
│ Keywords: [4 linked]                                │
│ Title: "How to Automate Landing Pages at Scale"     │
│ Angles: [JSON with hooks + sections]                │
│ Status: Review                                      │
└─────────────────────────────────────────────────────┘
```

### Promote to Pipeline

1. Review title, edit if needed
2. Set Status → **"Approved"**
3. System creates Content Pipeline record with all keywords
4. Status changes to "Promoted"

```
CONTENT PIPELINE (your existing system):
┌─────────────────────────────────────────────────────┐
│ Title: "How to Automate Landing Pages at Scale"     │
│ Target Keywords: "landing page automation,          │
│                   scale landing pages,              │
│                   automated landing pages,          │
│                   pseo landing pages"               │
│ Content Type: how-to                                │
│ Status: Draft                                       │
└─────────────────────────────────────────────────────┘
```

---

## Bulk Processing

Select multiple rows → bulk update status → all process in parallel.

```
Example: Research 10 seed topics at once

1. Add 10 rows to Keyword Bank with seed keywords
2. Select all 10
3. Set Status → "Research"
4. All 10 research in parallel
5. ~100 keywords appear in Keyword Bank
```

```
Example: Generate titles for 5 clusters at once

1. Select 5 Content Ideas rows
2. Set Status → "Generate Title"
3. All 5 generate in parallel
4. Review all 5 when done
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              AIRTABLE                                            │
│                                                                                  │
│  ┌────────────────────────────────────────────────────────────────────────────┐ │
│  │  KEYWORD BANK                                                               │ │
│  │  ──────────────────────────────────────────────────────────────────────     │ │
│  │  │ Keyword              │ Volume │ KD │ Cluster      │ Status        │      │ │
│  │  ├──────────────────────┼────────┼────┼──────────────┼───────────────┤      │ │
│  │  │ landing page auto... │ 890    │ 38 │ [linked]     │ Clustered     │      │ │
│  │  │ scale landing pages  │ 590    │ 35 │ [linked]     │ Clustered     │      │ │
│  │  │ pseo for saas        │        │    │              │ Research ⚡   │      │ │
│  └────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                  │
│  ┌────────────────────────────────────────────────────────────────────────────┐ │
│  │  CONTENT IDEAS                                                              │ │
│  │  ──────────────────────────────────────────────────────────────────────     │ │
│  │  │ Cluster Name         │ Keywords     │ Title           │ Status      │    │ │
│  │  ├──────────────────────┼──────────────┼─────────────────┼─────────────┤    │ │
│  │  │ Landing Page Auto    │ [4 linked]   │ How to Auto...  │ Review      │    │ │
│  │  │ PSEO Strategy        │ [3 linked]   │                 │ Gen Title ⚡│    │ │
│  └────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                  │
│  AUTOMATIONS (Status-Triggered)                                                  │
│  • Keyword Bank: Status = "Research" ─────────► Webhook: /keyword/research      │
│  • Content Ideas: Status = "Auto-Cluster" ────► Webhook: /keyword/cluster       │
│  • Content Ideas: Status = "Generate Title" ──► Webhook: /keyword/generate-title│
│  • Content Ideas: Status = "Approved" ────────► Webhook: /keyword/promote       │
│  • Cron: Weekly ──────────────────────────────► Webhook: /keyword/gap-scan      │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌───────────────────────────────────────────────────────────────────────────────────┐
│                         RAILWAY (Your API)                                        │
│                                                                                   │
│   Inngest Functions:                                                              │
│   • keyword-research      - DataForSEO lookup + expansion                         │
│   • auto-cluster          - Claude groups keywords                                │
│   • generate-title        - Claude creates title + angles                         │
│   • promote-to-pipeline   - Creates Content Pipeline record                       │
│   • gap-scan              - Weekly entity graph scan                              │
└───────────────────────────────────────────────────────────────────────────────────┘
```

---

## Part 1: Airtable Structure

### All Tables Overview

| Table | Purpose | Rows |
|-------|---------|------|
| **Industries** | Entity graph | 1 row = 1 industry |
| **Personas** | Entity graph | 1 row = 1 persona |
| **Problems** | Entity graph | 1 row = 1 problem |
| **Keyword Bank** | Raw SEO keywords | 1 row = 1 keyword |
| **Research Jobs** | Tracks research runs | 1 row = 1 research job |
| **Content Ideas** | Keyword clusters | 1 row = 1 cluster |
| **Content Pipeline** | Production content | 1 row = 1 content piece |
| **Context Artifacts** | Company profile, voice | 1 row = 1 artifact |

---

### Table 1: Keyword Bank

| Field Name | Field Type | Purpose |
|------------|------------|---------|
| **Keyword** | Single line text | The keyword (also used as seed for research) |
| **Search Volume** | Number | Monthly searches |
| **Keyword Difficulty** | Number | 0-100 score |
| **CPC** | Currency | Cost per click |
| **Search Intent** | Single select | `Informational`, `Commercial`, `Transactional`, `Navigational` |
| **SERP Features** | Multiple select | `Featured Snippet`, `PAA`, `Video`, etc. |
| **Trend** | Single select | `Rising`, `Stable`, `Declining` |
| **Competitor URLs** | Long text | Top 5 ranking URLs (JSON) |
| **Cluster** | Link to Content Ideas | Which cluster this belongs to |
| **Status** | Single select | Workflow state (see below) |
| **Seed Topic** | Single line text | Original seed that spawned this |
| **Source** | Single select | `Manual`, `Gap Scan`, `Competitor Analysis` |
| **Research Date** | Date | When data was fetched |

**Status Options (in order):**
```
1. 🟡 Research      - TRIGGER: Start DataForSEO lookup (yellow)
2. 🔵 Researching   - System is fetching data (blue)
3. ⚪ New           - Data ready, needs review (gray)
4. 🟡 Reviewed      - Looked at, ready to cluster (yellow)
5. 🟢 Clustered     - Linked to a Content Idea (green)
6. 🔴 Rejected      - Not worth pursuing (red)
```

---

### Table 2: Research Jobs

Tracks research runs for observability and debugging.

| Field Name | Field Type | Purpose |
|------------|------------|---------|
| **Job ID** | Single line text | Inngest run ID |
| **Seed Keywords** | Long text | Keywords that triggered this job |
| **Keywords Created** | Number | Count of keywords added to Keyword Bank |
| **Status** | Single select | `Running`, `Complete`, `Failed` |
| **Started** | Date time | When job started |
| **Completed** | Date time | When job finished |
| **Duration (sec)** | Formula | `DATETIME_DIFF({Completed}, {Started}, 'seconds')` |
| **Error** | Long text | Error message if failed |
| **Source** | Single select | `Manual`, `Gap Scan`, `Bulk Import` |

**Status Options:**
```
1. 🔵 Running   - Job in progress (blue)
2. 🟢 Complete  - Job finished successfully (green)
3. 🔴 Failed    - Job encountered error (red)
```

---

### Table 3: Content Ideas

| Field Name | Field Type | Purpose |
|------------|------------|---------|
| **Cluster Name** | Single line text | Descriptive name |
| **Seed Topic** | Single line text | For auto-clustering: which seed to pull from |
| **Keywords** | Link to Keyword Bank | All keywords in this cluster |
| **Primary Keyword** | Single line text | Main keyword (highest volume/relevance) |
| **Total Volume** | Rollup | Sum of linked keywords' volume |
| **Avg Difficulty** | Rollup | Average KD of linked keywords |
| **Search Intent** | Single select | Dominant intent |
| **Content Type** | Single select | `blog`, `industry_page`, `persona_page`, `comparison`, `how-to` |
| **Industry** | Link to Industries | Entity graph |
| **Persona** | Link to Personas | Entity graph |
| **Problem** | Link to Problems | Entity graph |
| **Title** | Single line text | Generated title |
| **Content Angles** | Long text | Generated angles (JSON) |
| **Competitor Analysis** | Long text | What competitors are doing |
| **SEO Score** | Formula | `{Total Volume} / ({Avg Difficulty} + 1)` |
| **Status** | Single select | Workflow state |
| **Promoted Record ID** | Single line text | Link to Content Pipeline |

**Status Options (in order):**
```
1. ⚪ Draft           - Building cluster manually (gray)
2. 🟡 Auto-Cluster    - TRIGGER: Claude groups keywords (yellow)
3. 🔵 Clustering      - System is grouping (blue)
4. 🟡 Generate Title  - TRIGGER: Claude creates title (yellow)
5. 🔵 Generating      - System is creating title (blue)
6. 🟠 Review          - Title ready for review (orange)
7. 🟡 Approved        - TRIGGER: Push to pipeline (yellow)
8. 🟢 Promoted        - In Content Pipeline (green)
9. 🔴 Rejected        - Not pursuing (red)
```

---

## Part 2: Airtable Automations

### Automation 1: Research Keywords

**Trigger:** When record in Keyword Bank matches
- Field: Status
- Condition: equals "Research"

**Action:** Send webhook
```json
{
  "url": "https://your-app.railway.app/api/keyword/research",
  "method": "POST",
  "headers": {
    "Content-Type": "application/json",
    "X-Webhook-Secret": "your-secret"
  },
  "body": {
    "recordId": "{Record ID}",
    "keyword": "{Keyword}"
  }
}
```

### Automation 2: Auto-Cluster

**Trigger:** When record in Content Ideas matches
- Field: Status
- Condition: equals "Auto-Cluster"

**Action:** Send webhook
```json
{
  "url": "https://your-app.railway.app/api/keyword/cluster",
  "method": "POST",
  "headers": {
    "Content-Type": "application/json",
    "X-Webhook-Secret": "your-secret"
  },
  "body": {
    "recordId": "{Record ID}",
    "seedTopic": "{Seed Topic}"
  }
}
```

### Automation 3: Generate Title

**Trigger:** When record in Content Ideas matches
- Field: Status
- Condition: equals "Generate Title"

**Action:** Send webhook
```json
{
  "url": "https://your-app.railway.app/api/keyword/generate-title",
  "method": "POST",
  "headers": {
    "Content-Type": "application/json",
    "X-Webhook-Secret": "your-secret"
  },
  "body": {
    "recordId": "{Record ID}"
  }
}
```

### Automation 4: Promote to Pipeline

**Trigger:** When record in Content Ideas matches
- Field: Status
- Condition: equals "Approved"

**Action:** Send webhook
```json
{
  "url": "https://your-app.railway.app/api/keyword/promote",
  "method": "POST",
  "headers": {
    "Content-Type": "application/json",
    "X-Webhook-Secret": "your-secret"
  },
  "body": {
    "recordId": "{Record ID}"
  }
}
```

---

## Part 3: DataForSEO Client

```typescript
// src/lib/dataforseo.ts

interface DataForSEOConfig {
  login: string;
  password: string;
}

interface KeywordData {
  keyword: string;
  searchVolume: number;
  cpc: number;
  keywordDifficulty: number;
  searchIntent: string;
  serpFeatures: string[];
  trend: string;
  competitorUrls: string[];
}

export class DataForSEOClient {
  private auth: string;
  private baseUrl = 'https://api.dataforseo.com/v3';
  
  constructor(config: DataForSEOConfig) {
    this.auth = Buffer.from(`${config.login}:${config.password}`).toString('base64');
  }

  private async request(endpoint: string, data: any[]): Promise<any> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${this.auth}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    const result = await response.json();
    if (result.status_code !== 20000) {
      throw new Error(`DataForSEO: ${result.status_message}`);
    }
    return result;
  }

  async getKeywordIdeas(seed: string, limit: number = 30): Promise<string[]> {
    const result = await this.request('/dataforseo_labs/google/keyword_suggestions/live', [{
      keyword: seed,
      location_code: 2840,
      language_code: 'en',
      limit
    }]);
    return result.tasks?.[0]?.result?.[0]?.items?.map((item: any) => item.keyword) || [];
  }

  async getKeywordMetrics(keywords: string[]): Promise<Map<string, any>> {
    const result = await this.request('/keywords_data/google/search_volume/live', [{
      keywords,
      location_code: 2840,
      language_code: 'en'
    }]);

    const metrics = new Map();
    for (const item of result.tasks?.[0]?.result || []) {
      metrics.set(item.keyword, {
        searchVolume: item.search_volume || 0,
        cpc: item.cpc || 0,
        monthlySearches: item.monthly_searches || []
      });
    }
    return metrics;
  }

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

  async getSerpData(keyword: string): Promise<{
    serpFeatures: string[];
    competitorUrls: string[];
    searchIntent: string;
  }> {
    const result = await this.request('/serp/google/organic/live/regular', [{
      keyword,
      location_code: 2840,
      language_code: 'en',
      depth: 10
    }]);

    const serpData = result.tasks?.[0]?.result?.[0] || {};
    
    const serpFeatures: string[] = [];
    const itemTypes = serpData.item_types || [];
    if (itemTypes.includes('featured_snippet')) serpFeatures.push('Featured Snippet');
    if (itemTypes.includes('people_also_ask')) serpFeatures.push('PAA');
    if (itemTypes.includes('video')) serpFeatures.push('Video');
    if (itemTypes.includes('local_pack')) serpFeatures.push('Local Pack');

    const competitorUrls = serpData.items
      ?.filter((item: any) => item.type === 'organic')
      ?.slice(0, 5)
      ?.map((item: any) => item.url) || [];

    return { 
      serpFeatures, 
      competitorUrls, 
      searchIntent: this.inferIntent(keyword, itemTypes) 
    };
  }

  async researchSeed(seed: string, limit: number = 30): Promise<KeywordData[]> {
    const keywords = [seed, ...await this.getKeywordIdeas(seed, limit - 1)];
    
    const [metrics, difficulties] = await Promise.all([
      this.getKeywordMetrics(keywords),
      this.getKeywordDifficulty(keywords)
    ]);

    // SERP data only for top 5 (expensive)
    const serpDataMap = new Map();
    for (const kw of keywords.slice(0, 5)) {
      serpDataMap.set(kw, await this.getSerpData(kw));
    }

    return keywords.map(keyword => {
      const m = metrics.get(keyword) || {};
      const serp = serpDataMap.get(keyword) || { serpFeatures: [], competitorUrls: [], searchIntent: 'Informational' };
      
      return {
        keyword,
        searchVolume: m.searchVolume || 0,
        cpc: m.cpc || 0,
        keywordDifficulty: difficulties.get(keyword) || 50,
        searchIntent: serp.searchIntent,
        serpFeatures: serp.serpFeatures,
        trend: this.calculateTrend(m.monthlySearches),
        competitorUrls: serp.competitorUrls
      };
    });
  }

  private inferIntent(keyword: string, itemTypes: string[]): string {
    const kw = keyword.toLowerCase();
    if (/buy|pricing|cost|purchase/.test(kw)) return 'Transactional';
    if (/best|top|review|compare|vs|alternative/.test(kw)) return 'Commercial';
    if (/login|sign in|official/.test(kw)) return 'Navigational';
    return 'Informational';
  }

  private calculateTrend(monthlySearches: any[]): string {
    if (!monthlySearches || monthlySearches.length < 6) return 'Stable';
    const recent = monthlySearches.slice(0, 3).reduce((a, b) => a + (b.search_volume || 0), 0) / 3;
    const older = monthlySearches.slice(3, 6).reduce((a, b) => a + (b.search_volume || 0), 0) / 3;
    if (recent > older * 1.2) return 'Rising';
    if (recent < older * 0.8) return 'Declining';
    return 'Stable';
  }
}

export const dataForSEO = new DataForSEOClient({
  login: process.env.DATAFORSEO_LOGIN!,
  password: process.env.DATAFORSEO_PASSWORD!
});
```

---

## Part 4: Inngest Functions

### Function 1: Keyword Research

```typescript
// src/inngest/functions/keyword-research.ts

import { inngest } from '../client';
import { dataForSEO } from '../../lib/dataforseo';
import { createRecord, updateRecord } from '../../lib/airtable';

export const keywordResearch = inngest.createFunction(
  { 
    id: 'keyword-research',
    retries: 3,
    concurrency: { limit: 5 }
  },
  { event: 'keyword/research.start' },
  async ({ event, step }) => {
    const { recordId, keyword } = event.data;
    const startTime = new Date().toISOString();

    // Create Research Job record
    const jobId = await step.run('create-job', async () => {
      return await createRecord('Research Jobs', {
        'Job ID': event.id,
        'Seed Keywords': keyword,
        'Status': 'Running',
        'Started': startTime,
        'Source': 'Manual'
      });
    });

    // Update keyword status to Researching
    await step.run('status-researching', async () => {
      await updateRecord('Keyword Bank', recordId, { 'Status': 'Researching' });
    });

    try {
      // Research the seed
      const keywords = await step.run('research', async () => {
        return await dataForSEO.researchSeed(keyword, 30);
      });

      // Update original record with data
      const seedData = keywords.find(k => k.keyword.toLowerCase() === keyword.toLowerCase());
      if (seedData) {
        await step.run('update-seed', async () => {
          await updateRecord('Keyword Bank', recordId, {
            'Search Volume': seedData.searchVolume,
            'Keyword Difficulty': seedData.keywordDifficulty,
            'CPC': seedData.cpc,
            'Search Intent': seedData.searchIntent,
            'SERP Features': seedData.serpFeatures,
            'Trend': seedData.trend,
            'Competitor URLs': JSON.stringify(seedData.competitorUrls),
            'Status': 'New',
            'Research Date': new Date().toISOString().split('T')[0]
          });
        });
      }

      // Create records for related keywords (skip low volume)
      const related = keywords.filter(k => 
        k.keyword.toLowerCase() !== keyword.toLowerCase() && 
        k.searchVolume >= 50
      );

      for (const kw of related) {
        await step.run(`create-${kw.keyword.slice(0, 20)}`, async () => {
          await createRecord('Keyword Bank', {
            'Keyword': kw.keyword,
            'Search Volume': kw.searchVolume,
            'Keyword Difficulty': kw.keywordDifficulty,
            'CPC': kw.cpc,
            'Search Intent': kw.searchIntent,
            'SERP Features': kw.serpFeatures,
            'Trend': kw.trend,
            'Competitor URLs': JSON.stringify(kw.competitorUrls),
            'Status': 'New',
            'Seed Topic': keyword,
            'Source': 'Manual',
            'Research Date': new Date().toISOString().split('T')[0]
          });
        });
      }

      // Update Research Job as complete
      await step.run('job-complete', async () => {
        await updateRecord('Research Jobs', jobId, {
          'Status': 'Complete',
          'Completed': new Date().toISOString(),
          'Keywords Created': related.length + 1
        });
      });

      return { 
        status: 'complete',
        jobId,
        keywordsCreated: related.length + 1
      };

    } catch (error) {
      // Update Research Job as failed
      await step.run('job-failed', async () => {
        await updateRecord('Research Jobs', jobId, {
          'Status': 'Failed',
          'Completed': new Date().toISOString(),
          'Error': error instanceof Error ? error.message : 'Unknown error'
        });
      });
      throw error;
    }
  }
);
```

### Function 2: Auto-Cluster

```typescript
// src/inngest/functions/auto-cluster.ts

import { inngest } from '../client';
import { getRecords, updateRecord } from '../../lib/airtable';
import { generateWithClaude } from '../../lib/claude';

export const autoCluster = inngest.createFunction(
  { id: 'auto-cluster' },
  { event: 'keyword/cluster.auto' },
  async ({ event, step }) => {
    const { recordId, seedTopic } = event.data;

    // Update status
    await step.run('status-clustering', async () => {
      await updateRecord('Content Ideas', recordId, { 'Status': 'Clustering' });
    });

    // Get unclustered keywords from this seed
    const keywords = await step.run('get-keywords', async () => {
      return await getRecords('Keyword Bank', {
        filterByFormula: `AND(
          OR({Seed Topic} = '${seedTopic}', {Keyword} = '${seedTopic}'),
          {Status} != 'Clustered',
          {Status} != 'Rejected'
        )`
      });
    });

    if (keywords.length === 0) {
      await step.run('no-keywords', async () => {
        await updateRecord('Content Ideas', recordId, { 'Status': 'Draft' });
      });
      return { status: 'no-keywords' };
    }

    // Ask Claude to pick best keywords for this cluster
    const keywordList = keywords.map(kw => ({
      id: kw.id,
      keyword: kw.fields['Keyword'],
      volume: kw.fields['Search Volume'],
      difficulty: kw.fields['Keyword Difficulty'],
      intent: kw.fields['Search Intent']
    }));

    const clusterResult = await step.run('claude-cluster', async () => {
      const response = await generateWithClaude({
        prompt: `You are an SEO strategist. Select the best keywords for a content cluster.

## Available Keywords
${keywordList.map(kw => `- ID: ${kw.id} | "${kw.keyword}" (${kw.volume}/mo, KD ${kw.difficulty}, ${kw.intent})`).join('\n')}

## Instructions
1. Select 3-6 keywords that belong together (can be covered by ONE content piece)
2. Pick the primary keyword (best balance of volume + relevance)
3. Suggest a content type

## Output JSON only:
{
  "selectedIds": ["id1", "id2", "id3"],
  "primaryKeyword": "the main keyword",
  "contentType": "blog|how-to|comparison|industry_page|persona_page",
  "intent": "Informational|Commercial"
}`,
        maxTokens: 500
      });
      
      const match = response.match(/\{[\s\S]*\}/);
      return match ? JSON.parse(match[0]) : null;
    });

    if (!clusterResult) {
      await step.run('parse-failed', async () => {
        await updateRecord('Content Ideas', recordId, { 'Status': 'Draft' });
      });
      return { status: 'parse-failed' };
    }

    // Link selected keywords to this Content Idea
    for (const kwId of clusterResult.selectedIds) {
      await step.run(`link-${kwId}`, async () => {
        await updateRecord('Keyword Bank', kwId, {
          'Cluster': [recordId],
          'Status': 'Clustered'
        });
      });
    }

    // Update Content Idea
    await step.run('update-idea', async () => {
      await updateRecord('Content Ideas', recordId, {
        'Primary Keyword': clusterResult.primaryKeyword,
        'Content Type': clusterResult.contentType,
        'Search Intent': clusterResult.intent,
        'Status': 'Review'
      });
    });

    return { 
      status: 'complete',
      keywordsClustered: clusterResult.selectedIds.length
    };
  }
);
```

### Function 3: Generate Title

```typescript
// src/inngest/functions/generate-title.ts

import { inngest } from '../client';
import { getRecord, updateRecord } from '../../lib/airtable';
import { generateWithClaude } from '../../lib/claude';

export const generateTitle = inngest.createFunction(
  { id: 'generate-title' },
  { event: 'keyword/generate-title' },
  async ({ event, step }) => {
    const { recordId } = event.data;

    // Update status
    await step.run('status-generating', async () => {
      await updateRecord('Content Ideas', recordId, { 'Status': 'Generating' });
    });

    // Get Content Idea and linked keywords
    const idea = await step.run('get-idea', async () => {
      return await getRecord('Content Ideas', recordId);
    });

    const keywordIds = idea.fields['Keywords'] || [];
    const keywords = await step.run('get-keywords', async () => {
      return await Promise.all(
        keywordIds.map((id: string) => getRecord('Keyword Bank', id))
      );
    });

    // Get entity context if linked
    const [industry, persona, problem] = await step.run('get-context', async () => {
      return await Promise.all([
        idea.fields['Industry']?.[0] ? getRecord('Industries', idea.fields['Industry'][0]) : null,
        idea.fields['Persona']?.[0] ? getRecord('Personas', idea.fields['Persona'][0]) : null,
        idea.fields['Problem']?.[0] ? getRecord('Problems', idea.fields['Problem'][0]) : null
      ]);
    });

    // Generate with Claude
    const response = await step.run('generate', async () => {
      return await generateWithClaude({
        prompt: buildTitlePrompt({
          clusterName: idea.fields['Cluster Name'],
          primaryKeyword: idea.fields['Primary Keyword'],
          keywords: keywords.map(kw => ({
            keyword: kw.fields['Keyword'],
            volume: kw.fields['Search Volume'],
            difficulty: kw.fields['Keyword Difficulty']
          })),
          contentType: idea.fields['Content Type'],
          intent: idea.fields['Search Intent'],
          industry: industry?.fields,
          persona: persona?.fields,
          problem: problem?.fields
        }),
        maxTokens: 1500
      });
    });

    const parsed = parseTitleResponse(response);

    // Update record
    await step.run('save', async () => {
      await updateRecord('Content Ideas', recordId, {
        'Title': parsed.title,
        'Content Angles': parsed.angles,
        'Competitor Analysis': parsed.competitorAnalysis,
        'Status': 'Review'
      });
    });

    return { status: 'complete', title: parsed.title };
  }
);

function buildTitlePrompt(ctx: any): string {
  return `Generate an SEO title and content angles.

## Cluster: ${ctx.clusterName}
Primary Keyword: ${ctx.primaryKeyword}
Content Type: ${ctx.contentType}
Intent: ${ctx.intent}

## Keywords
${ctx.keywords.map((kw: any) => `- "${kw.keyword}" (${kw.volume}/mo, KD ${kw.difficulty})`).join('\n')}

${ctx.industry ? `## Industry: ${ctx.industry['Name']}\n${ctx.industry['Pain Points']}\n` : ''}
${ctx.persona ? `## Persona: ${ctx.persona['Persona Name']}\n${ctx.persona['Goals']}\n` : ''}
${ctx.problem ? `## Problem: ${ctx.problem['Problem Name']}\n${ctx.problem['Description']}\n` : ''}

## Output JSON:
{
  "title": "SEO title under 60 chars with primary keyword",
  "angles": [
    {"hook": "Opening premise", "sections": ["Section 1", "Section 2"]}
  ],
  "competitorAnalysis": "What competitors do, how to differentiate"
}`;
}

function parseTitleResponse(response: string) {
  try {
    const match = response.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('No JSON');
    const parsed = JSON.parse(match[0]);
    return {
      title: parsed.title || '',
      angles: JSON.stringify(parsed.angles, null, 2),
      competitorAnalysis: parsed.competitorAnalysis || ''
    };
  } catch {
    return { title: '', angles: response, competitorAnalysis: '' };
  }
}
```

### Function 4: Promote to Pipeline

```typescript
// src/inngest/functions/promote-to-pipeline.ts

import { inngest } from '../client';
import { getRecord, updateRecord, createRecord } from '../../lib/airtable';

export const promoteToPipeline = inngest.createFunction(
  { id: 'promote-to-pipeline' },
  { event: 'keyword/promote' },
  async ({ event, step }) => {
    const { recordId } = event.data;

    const idea = await step.run('get-idea', async () => {
      return await getRecord('Content Ideas', recordId);
    });

    // Get all linked keywords
    const keywordIds = idea.fields['Keywords'] || [];
    const keywords = await step.run('get-keywords', async () => {
      return await Promise.all(
        keywordIds.map((id: string) => getRecord('Keyword Bank', id))
      );
    });

    // Build comma-separated keyword list
    const targetKeywords = keywords
      .map(kw => kw.fields['Keyword'])
      .join(', ');

    // Create Content Pipeline record
    const pipelineId = await step.run('create-pipeline', async () => {
      return await createRecord('Content Pipeline', {
        'Title': idea.fields['Title'],
        'Industry': idea.fields['Industry'],
        'Persona': idea.fields['Persona'],
        'Content Type': idea.fields['Content Type'] || 'blog',
        'Target Keywords': targetKeywords,
        'Status': 'Draft',
        'Notes': `Cluster: ${idea.fields['Cluster Name']}\n` +
                 `Total Volume: ${idea.fields['Total Volume']}\n` +
                 `Avg Difficulty: ${Math.round(idea.fields['Avg Difficulty'] || 0)}\n\n` +
                 `Content Angles:\n${idea.fields['Content Angles'] || ''}`
      });
    });

    // Update idea status
    await step.run('update-status', async () => {
      await updateRecord('Content Ideas', recordId, {
        'Status': 'Promoted',
        'Promoted Record ID': pipelineId
      });
    });

    return { status: 'complete', pipelineId };
  }
);
```

### Function 5: Weekly Gap Scan

```typescript
// src/inngest/functions/gap-scan.ts

import { inngest } from '../client';
import { getRecords, createRecord, updateRecord } from '../../lib/airtable';

export const gapScan = inngest.createFunction(
  { id: 'gap-scan' },
  { cron: '0 8 * * 1' },  // Monday 8am
  async ({ step }) => {
    const startTime = new Date().toISOString();

    // Create Research Job record for this gap scan
    const jobId = await step.run('create-job', async () => {
      return await createRecord('Research Jobs', {
        'Job ID': `gap-scan-${Date.now()}`,
        'Seed Keywords': 'Entity Graph Gap Scan',
        'Status': 'Running',
        'Started': startTime,
        'Source': 'Gap Scan'
      });
    });

    const [industries, personas, problems, existingKeywords] = await step.run('load', async () => {
      return await Promise.all([
        getRecords('Industries'),
        getRecords('Personas'),
        getRecords('Problems'),
        getRecords('Keyword Bank')
      ]);
    });

    const existingSet = new Set(
      existingKeywords.map(k => k.fields['Keyword']?.toLowerCase())
    );

    // Generate candidates from entity combos
    const candidates = generateCandidates(industries, personas, problems)
      .filter(c => !existingSet.has(c.toLowerCase()))
      .slice(0, 20);

    if (candidates.length === 0) {
      await step.run('job-complete-empty', async () => {
        await updateRecord('Research Jobs', jobId, {
          'Status': 'Complete',
          'Completed': new Date().toISOString(),
          'Keywords Created': 0
        });
      });
      return { status: 'no-gaps', candidatesFound: 0 };
    }

    // Create seed records with Status = "Research"
    for (const keyword of candidates) {
      await step.run(`create-${keyword.slice(0, 20)}`, async () => {
        await createRecord('Keyword Bank', {
          'Keyword': keyword,
          'Status': 'Research',
          'Source': 'Gap Scan'
        });
      });
    }

    // Update Research Job
    await step.run('job-complete', async () => {
      await updateRecord('Research Jobs', jobId, {
        'Status': 'Complete',
        'Completed': new Date().toISOString(),
        'Keywords Created': candidates.length,
        'Seed Keywords': candidates.join(', ')
      });
    });

    return { status: 'complete', jobId, seedsCreated: candidates.length };
  }
);

function generateCandidates(industries: any[], personas: any[], problems: any[]): string[] {
  const candidates: string[] = [];

  for (const industry of industries) {
    for (const problem of problems) {
      const name = industry.fields['Name']?.toLowerCase() || '';
      const prob = problem.fields['Problem Name']?.toLowerCase()
        .replace("can't ", '').replace('no ', '').replace('not ', '') || '';
      candidates.push(`${prob} ${name}`);
    }
  }

  for (const persona of personas) {
    const role = persona.fields['Role/Title']?.toLowerCase() || '';
    candidates.push(`content systems for ${role}`);
    candidates.push(`pseo tools for ${role}`);
  }

  return [...new Set(candidates)];
}
```

---

## Part 5: Webhook Routes

```typescript
// src/routes/keyword.ts

import { Router } from 'express';
import { inngest } from '../inngest/client';
import { verifyWebhookSecret } from '../lib/auth';

const router = Router();

router.post('/research', verifyWebhookSecret, async (req, res) => {
  const { recordId, keyword } = req.body;
  await inngest.send({
    name: 'keyword/research.start',
    data: { recordId, keyword }
  });
  res.json({ status: 'started' });
});

router.post('/cluster', verifyWebhookSecret, async (req, res) => {
  const { recordId, seedTopic } = req.body;
  await inngest.send({
    name: 'keyword/cluster.auto',
    data: { recordId, seedTopic }
  });
  res.json({ status: 'started' });
});

router.post('/generate-title', verifyWebhookSecret, async (req, res) => {
  const { recordId } = req.body;
  await inngest.send({
    name: 'keyword/generate-title',
    data: { recordId }
  });
  res.json({ status: 'started' });
});

router.post('/promote', verifyWebhookSecret, async (req, res) => {
  const { recordId } = req.body;
  await inngest.send({
    name: 'keyword/promote',
    data: { recordId }
  });
  res.json({ status: 'started' });
});

router.post('/gap-scan', verifyWebhookSecret, async (req, res) => {
  await inngest.send({ name: 'keyword/gap-analysis.start', data: {} });
  res.json({ status: 'started' });
});

export default router;
```

---

## Quick Reference

| Goal | Action |
|------|--------|
| Research a topic | Add to Keyword Bank → Status = **"Research"** |
| Research 10 topics | Add 10 rows → Select all → Status = **"Research"** |
| Auto-cluster | Create Content Idea with Seed Topic → Status = **"Auto-Cluster"** |
| Manual cluster | Create Content Idea → Link keywords in Keyword Bank |
| Generate title | Content Idea → Status = **"Generate Title"** |
| Promote to pipeline | Content Idea → Status = **"Approved"** |
| Check job status | Research Jobs table → filter by Status |
| Debug failed job | Research Jobs → check Error field + Inngest dashboard |

---

## Environment Variables

```bash
# DataForSEO
DATAFORSEO_LOGIN=your_login
DATAFORSEO_PASSWORD=your_password

# Existing
AIRTABLE_API_KEY=...
AIRTABLE_BASE_ID=...
ANTHROPIC_API_KEY=...
INNGEST_EVENT_KEY=...
INNGEST_SIGNING_KEY=...
```