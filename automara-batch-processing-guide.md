# Automara Batch Processing System

## Airtable + Inngest + Langfuse + Railway

> A simplified, no-dashboard approach to batch content processing with granular control and full observability.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              AIRTABLE                                        │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │  GRID VIEW                                                              │ │
│  │  ─────────────────────────────────────────────────────────────────────  │ │
│  │  │ Row │ Industry │ Persona │ Keywords │ Status      │ Outline │ Draft │ │
│  │  ├─────┼──────────┼─────────┼──────────┼─────────────┼─────────┼───────┤ │
│  │  │  1  │ Fintech  │ CTO     │ API, ... │ ▶ Ready     │         │       │ │
│  │  │  2  │ Health   │ CMO     │ HIPAA,...│ Outline Rev │ [text]  │       │ │
│  │  │  3  │ SaaS     │ Founder │ Scale,...│ Draft Rev   │ [text]  │[text] │ │
│  │  │  4  │ E-comm   │ VP Ops  │ Auto,... │ ✓ Complete  │ [text]  │[text] │ │
│  │  └─────────────────────────────────────────────────────────────────────┘ │
│  │                                                                          │ │
│  │  AUTOMATIONS                                                             │ │
│  │  • When Status → "Ready" ──────────► Webhook: Start Pipeline             │ │
│  │  • When Status → "Outline Approved" ► Webhook: Continue to Draft         │ │
│  │  • When Status → "Draft Approved" ──► Webhook: Finalize                  │ │
│  └──────────────────────────────────────────────────────────────────────────┘ │
└───────────────────────────────────────┬─────────────────────────────────────┘
                                        │
                                        ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│                         RAILWAY (Your API)                                    │
│                                                                               │
│   ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────────────┐  │
│   │  Webhook Routes │    │ Inngest Client  │    │   Inngest Functions     │  │
│   │                 │    │                 │    │                         │  │
│   │ POST /webhook/  │───►│ inngest.send()  │───►│ • content-pipeline      │  │
│   │   start         │    │                 │    │ • generate-outline      │  │
│   │ POST /webhook/  │    │                 │    │ • generate-draft        │  │
│   │   continue      │    │                 │    │ • finalize-content      │  │
│   └─────────────────┘    └─────────────────┘    └───────────┬─────────────┘  │
│                                                              │               │
└──────────────────────────────────────────────────────────────┼───────────────┘
                                                               │
                    ┌──────────────────────────────────────────┼────────────┐
                    │                                          │            │
                    ▼                                          ▼            ▼
          ┌─────────────────┐                      ┌─────────────────┐  ┌───────────┐
          │   LANGFUSE      │                      │  INNGEST CLOUD  │  │ AIRTABLE  │
          │                 │                      │                 │  │   API     │
          │ • Prompt Store  │◄─── Get Prompts ────│ • Event Queue   │  │           │
          │ • Traces        │                      │ • Retries       │  │ Write     │
          │ • Metrics       │                      │ • Cron (batch)  │  │ Results   │
          │ • A/B Tests     │                      │ • Dashboard     │  │ Back      │
          └─────────────────┘                      └─────────────────┘  └───────────┘
```

---

## Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Grid UI | Airtable | No frontend to build, familiar interface, built-in views/filters |
| Workflow Engine | Inngest | Handles retries, timeouts, event coordination natively |
| Prompt Management | Langfuse | Version control, A/B testing, full trace observability |
| Hosting | Railway | Simple deploys from GitHub, good for long-running processes |
| Dashboard | None | Airtable + Langfuse + Inngest dashboards cover all needs |

---

## Part 1: Airtable Base Structure

### Table: Content Pipeline

| Field Name | Field Type | Purpose |
|------------|------------|---------|
| **Title** | Single line text | Content piece identifier |
| **Industry** | Link to Industries | Which industry this targets |
| **Persona** | Link to Personas | Which persona this targets |
| **Content Type** | Single select | `blog`, `industry_page`, `persona_page`, `comparison` |
| **Target Keywords** | Long text | Comma-separated keywords |
| **Status** | Single select | Workflow state (see below) |
| **Outline** | Long text (markdown) | Generated outline - editable |
| **Outline Feedback** | Long text | Your notes for refinement |
| **Draft** | Long text (markdown) | Generated draft - editable |
| **Draft Feedback** | Long text | Your notes for refinement |
| **Final Content** | Long text (markdown) | Approved final version |
| **Published URL** | URL | Where it was published |
| **Inngest Run ID** | Single line text | For debugging |
| **Created** | Created time | Auto |
| **Last Modified** | Last modified time | Auto |

### Status Values (Single Select Options)

Configure these in order with colors:

```
1. ⚪ Draft          - Row is being set up (gray)
2. 🟡 Ready          - Ready to start generation (yellow)
3. 🔵 Generating     - Outline being generated (blue)
4. 🟠 Outline Review - Outline ready for your review (orange)
5. 🟡 Outline Approved - You approved, continue to draft (yellow)
6. 🔵 Drafting       - Draft being generated (blue)
7. 🟠 Draft Review   - Draft ready for your review (orange)
8. 🟡 Draft Approved - You approved, ready to finalize (yellow)
9. 🟢 Complete       - All done (green)
10. 🔴 Error         - Something failed (red)
```

### Table: Industries

| Field Name | Field Type | Purpose |
|------------|------------|---------|
| **Name** | Single line text | e.g., "Fintech", "Healthcare" |
| **Description** | Long text | Industry context for prompts |
| **Pain Points** | Long text | Common problems in this industry |
| **Terminology** | Long text | Industry-specific terms |
| **Content** | Link to Content Pipeline | Linked records |

### Table: Personas

| Field Name | Field Type | Purpose |
|------------|------------|---------|
| **Name** | Single line text | e.g., "CTO", "Marketing Director" |
| **Title** | Single line text | Job title |
| **Goals** | Long text | What they're trying to achieve |
| **Pain Points** | Long text | Their specific challenges |
| **Objections** | Long text | Common objections they have |
| **Content** | Link to Content Pipeline | Linked records |

### Table: Context Artifacts

| Field Name | Field Type | Purpose |
|------------|------------|---------|
| **Name** | Single line text | e.g., "Company Profile", "Voice Guidelines" |
| **Type** | Single select | `company_profile`, `voice_guidelines`, `brand_kit` |
| **Content** | Long text | The actual content |
| **Active** | Checkbox | Whether to include in prompts |

---

## Part 2: Airtable Automations

You'll create 3 automations that fire webhooks when status changes.

### Automation 1: Start Pipeline

**Trigger:** When record matches conditions
- Field: Status
- Condition: equals "Ready"

**Action:** Send webhook
- Method: POST
- URL: `https://your-app.railway.app/api/webhook/start`
- Headers: 
  - `Content-Type: application/json`
  - `X-Webhook-Secret: your-secret-here`
- Body:
```json
{
  "recordId": "{Record ID}",
  "title": "{Title}",
  "industryId": "{Industry}",
  "personaId": "{Persona}",
  "contentType": "{Content Type}",
  "keywords": "{Target Keywords}"
}
```

### Automation 2: Continue After Outline Approval

**Trigger:** When record matches conditions
- Field: Status
- Condition: equals "Outline Approved"

**Action:** Send webhook
- Method: POST
- URL: `https://your-app.railway.app/api/webhook/outline-approved`
- Headers: (same as above)
- Body:
```json
{
  "recordId": "{Record ID}",
  "outline": "{Outline}",
  "feedback": "{Outline Feedback}"
}
```

### Automation 3: Continue After Draft Approval

**Trigger:** When record matches conditions
- Field: Status
- Condition: equals "Draft Approved"

**Action:** Send webhook
- Method: POST
- URL: `https://your-app.railway.app/api/webhook/draft-approved`
- Headers: (same as above)
- Body:
```json
{
  "recordId": "{Record ID}",
  "draft": "{Draft}",
  "feedback": "{Draft Feedback}"
}
```

---

## Part 3: Project Setup

### Repository Structure

```
automara-engine/
├── src/
│   ├── index.ts                    # Express server entry
│   ├── routes/
│   │   └── webhook.ts              # Webhook handlers
│   ├── inngest/
│   │   ├── client.ts               # Inngest client
│   │   └── functions/
│   │       ├── content-pipeline.ts # Main orchestration
│   │       ├── generate-outline.ts # Outline generation
│   │       ├── generate-draft.ts   # Draft generation
│   │       └── batch-trigger.ts    # Batch processing
│   ├── lib/
│   │   ├── airtable.ts             # Airtable client
│   │   ├── langfuse.ts             # Langfuse client
│   │   ├── claude.ts               # Claude API wrapper
│   │   └── context.ts              # Context file loader
│   └── types/
│       └── index.ts                # TypeScript types
├── context/                        # Company context markdown files
│   ├── company-profile.md
│   ├── voice-guidelines.md
│   ├── product-overview.md
│   ├── differentiators.md
│   ├── customer-quotes.md
│   └── glossary.md
├── .env.example
├── package.json
├── tsconfig.json
├── railway.toml
└── README.md
```

### Initial Setup Commands

```bash
# Create directory and initialize
mkdir automara-engine && cd automara-engine
npm init -y

# Install dependencies
npm install express inngest @anthropic-ai/sdk langfuse airtable dotenv zod

# Install dev dependencies
npm install -D typescript @types/express @types/node tsx nodemon

# Initialize TypeScript
npx tsc --init
```

### package.json

```json
{
  "name": "automara-engine",
  "version": "1.0.0",
  "main": "dist/index.js",
  "scripts": {
    "dev": "nodemon --exec tsx src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "inngest-dev": "npx inngest-cli@latest dev"
  },
  "dependencies": {
    "@anthropic-ai/sdk": "^0.27.0",
    "airtable": "^0.12.2",
    "dotenv": "^16.4.5",
    "express": "^4.19.2",
    "inngest": "^3.19.0",
    "langfuse": "^3.11.0",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/node": "^20.14.0",
    "nodemon": "^3.1.0",
    "tsx": "^4.15.0",
    "typescript": "^5.4.5"
  }
}
```

### tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### .env.example

```bash
# Server
PORT=3000
WEBHOOK_SECRET=your-webhook-secret-here

# Airtable
AIRTABLE_API_KEY=pat_xxxxxxxxxxxxx
AIRTABLE_BASE_ID=appXXXXXXXXXXXXXX

# Inngest
INNGEST_EVENT_KEY=your-inngest-event-key
INNGEST_SIGNING_KEY=your-inngest-signing-key

# Langfuse
LANGFUSE_PUBLIC_KEY=pk-lf-xxxxx
LANGFUSE_SECRET_KEY=sk-lf-xxxxx
LANGFUSE_HOST=https://cloud.langfuse.com

# Anthropic
ANTHROPIC_API_KEY=sk-ant-xxxxx
```

### railway.toml

```toml
[build]
builder = "nixpacks"
buildCommand = "npm run build"

[deploy]
startCommand = "npm start"
healthcheckPath = "/health"
healthcheckTimeout = 100
restartPolicyType = "on_failure"
restartPolicyMaxRetries = 3

[service]
internalPort = 3000
```

---

## Part 4: Core Implementation

### src/index.ts

```typescript
import "dotenv/config";
import express from "express";
import { serve } from "inngest/express";
import { inngest } from "./inngest/client.js";
import { contentPipeline } from "./inngest/functions/content-pipeline.js";
import { generateOutline } from "./inngest/functions/generate-outline.js";
import { generateDraft } from "./inngest/functions/generate-draft.js";
import { batchTrigger } from "./inngest/functions/batch-trigger.js";
import webhookRouter from "./routes/webhook.js";

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Webhook routes
app.use("/api/webhook", webhookRouter);

// Inngest serve endpoint
app.use(
  "/api/inngest",
  serve({
    client: inngest,
    functions: [
      contentPipeline,
      generateOutline,
      generateDraft,
      batchTrigger,
    ],
  })
);

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
```

### src/inngest/client.ts

```typescript
import { Inngest } from "inngest";

// Define event types for type safety
type Events = {
  "content/pipeline.start": {
    data: {
      recordId: string;
      title: string;
      industryId?: string;
      personaId?: string;
      contentType: string;
      keywords?: string;
    };
  };
  "content/outline.approved": {
    data: {
      recordId: string;
      outline: string;
      feedback?: string;
    };
  };
  "content/draft.approved": {
    data: {
      recordId: string;
      draft: string;
      feedback?: string;
    };
  };
  "content/batch.trigger": {
    data: {
      recordIds: string[];
      action: "start" | "continue";
    };
  };
};

export const inngest = new Inngest({
  id: "automara-engine",
  schemas: new EventSchemas().fromRecord<Events>(),
});

// Re-export types
import { EventSchemas } from "inngest";
export type { Events };
```

### src/lib/airtable.ts

```typescript
import Airtable from "airtable";

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(
  process.env.AIRTABLE_BASE_ID!
);

// Table references
export const contentTable = base("Content Pipeline");
export const industriesTable = base("Industries");
export const personasTable = base("Personas");
export const artifactsTable = base("Context Artifacts");

// Types
export interface ContentRecord {
  id: string;
  fields: {
    Title: string;
    Industry?: string[];
    Persona?: string[];
    "Content Type": string;
    "Target Keywords"?: string;
    Status: string;
    Outline?: string;
    "Outline Feedback"?: string;
    Draft?: string;
    "Draft Feedback"?: string;
    "Final Content"?: string;
    "Published URL"?: string;
    "Inngest Run ID"?: string;
  };
}

// Helper functions
export async function getRecord(recordId: string): Promise<ContentRecord> {
  const record = await contentTable.find(recordId);
  return {
    id: record.id,
    fields: record.fields as ContentRecord["fields"],
  };
}

export async function updateRecord(
  recordId: string,
  fields: Partial<ContentRecord["fields"]>
): Promise<void> {
  await contentTable.update(recordId, fields);
}

export async function getIndustry(industryId: string) {
  const record = await industriesTable.find(industryId);
  return {
    name: record.get("Name") as string,
    description: record.get("Description") as string,
    painPoints: record.get("Pain Points") as string,
    terminology: record.get("Terminology") as string,
  };
}

export async function getPersona(personaId: string) {
  const record = await personasTable.find(personaId);
  return {
    name: record.get("Name") as string,
    title: record.get("Title") as string,
    goals: record.get("Goals") as string,
    painPoints: record.get("Pain Points") as string,
    objections: record.get("Objections") as string,
  };
}

export async function getActiveArtifacts() {
  const records = await artifactsTable
    .select({
      filterByFormula: "{Active} = 1",
    })
    .all();

  return records.reduce(
    (acc, record) => {
      const type = record.get("Type") as string;
      acc[type] = record.get("Content") as string;
      return acc;
    },
    {} as Record<string, string>
  );
}

// Batch helpers
export async function getRecordsByStatus(status: string): Promise<ContentRecord[]> {
  const records = await contentTable
    .select({
      filterByFormula: `{Status} = "${status}"`,
    })
    .all();

  return records.map((r) => ({
    id: r.id,
    fields: r.fields as ContentRecord["fields"],
  }));
}

export async function batchUpdateStatus(
  recordIds: string[],
  status: string
): Promise<void> {
  // Airtable allows max 10 records per batch update
  const batches = [];
  for (let i = 0; i < recordIds.length; i += 10) {
    batches.push(recordIds.slice(i, i + 10));
  }

  for (const batch of batches) {
    await contentTable.update(
      batch.map((id) => ({
        id,
        fields: { Status: status },
      }))
    );
  }
}
```

### src/lib/langfuse.ts

```typescript
import { Langfuse } from "langfuse";

export const langfuse = new Langfuse({
  publicKey: process.env.LANGFUSE_PUBLIC_KEY!,
  secretKey: process.env.LANGFUSE_SECRET_KEY!,
  baseUrl: process.env.LANGFUSE_HOST,
});

// Get prompt with caching
export async function getPrompt(name: string, variables: Record<string, string>) {
  const prompt = await langfuse.getPrompt(name, undefined, {
    cacheTtlSeconds: 300, // 5 minute cache
  });

  return prompt.compile(variables);
}

// Create a trace for a content generation
export function createTrace(options: {
  name: string;
  recordId: string;
  metadata?: Record<string, unknown>;
}) {
  return langfuse.trace({
    name: options.name,
    metadata: {
      recordId: options.recordId,
      ...options.metadata,
    },
  });
}
```

### src/lib/claude.ts

```typescript
import Anthropic from "@anthropic-ai/sdk";
import { langfuse, createTrace } from "./langfuse.js";

const anthropic = new Anthropic();

interface GenerateOptions {
  prompt: string;
  recordId: string;
  step: string;
  maxTokens?: number;
}

export async function generate(options: GenerateOptions) {
  const { prompt, recordId, step, maxTokens = 4096 } = options;

  // Create Langfuse trace
  const trace = createTrace({
    name: `generate-${step}`,
    recordId,
  });

  const generation = trace.generation({
    name: step,
    model: "claude-sonnet-4-20250514",
    input: prompt,
  });

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: maxTokens,
      messages: [{ role: "user", content: prompt }],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";

    generation.end({
      output: text,
      usage: {
        input: response.usage.input_tokens,
        output: response.usage.output_tokens,
      },
    });

    // Flush to ensure trace is sent
    await langfuse.flushAsync();

    return {
      text,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        totalTokens:
          response.usage.input_tokens + response.usage.output_tokens,
      },
    };
  } catch (error) {
    generation.end({
      level: "ERROR",
      statusMessage: String(error),
    });
    await langfuse.flushAsync();
    throw error;
  }
}
```

### src/routes/webhook.ts

```typescript
import { Router } from "express";
import { inngest } from "../inngest/client.js";
import { z } from "zod";

const router = Router();

// Webhook authentication middleware
const authenticateWebhook = (req: any, res: any, next: any) => {
  const secret = req.headers["x-webhook-secret"];
  if (secret !== process.env.WEBHOOK_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
};

router.use(authenticateWebhook);

// Schema for start webhook
const startSchema = z.object({
  recordId: z.string(),
  title: z.string(),
  industryId: z.string().optional(),
  personaId: z.string().optional(),
  contentType: z.string(),
  keywords: z.string().optional(),
});

// Start pipeline
router.post("/start", async (req, res) => {
  try {
    const data = startSchema.parse(req.body);

    await inngest.send({
      name: "content/pipeline.start",
      data,
    });

    res.json({ success: true, message: "Pipeline started" });
  } catch (error) {
    console.error("Start webhook error:", error);
    res.status(400).json({ error: String(error) });
  }
});

// Schema for outline approved webhook
const outlineApprovedSchema = z.object({
  recordId: z.string(),
  outline: z.string(),
  feedback: z.string().optional(),
});

// Outline approved - continue to draft
router.post("/outline-approved", async (req, res) => {
  try {
    const data = outlineApprovedSchema.parse(req.body);

    await inngest.send({
      name: "content/outline.approved",
      data,
    });

    res.json({ success: true, message: "Continuing to draft" });
  } catch (error) {
    console.error("Outline approved webhook error:", error);
    res.status(400).json({ error: String(error) });
  }
});

// Schema for draft approved webhook
const draftApprovedSchema = z.object({
  recordId: z.string(),
  draft: z.string(),
  feedback: z.string().optional(),
});

// Draft approved - finalize
router.post("/draft-approved", async (req, res) => {
  try {
    const data = draftApprovedSchema.parse(req.body);

    await inngest.send({
      name: "content/draft.approved",
      data,
    });

    res.json({ success: true, message: "Finalizing content" });
  } catch (error) {
    console.error("Draft approved webhook error:", error);
    res.status(400).json({ error: String(error) });
  }
});

// Batch trigger endpoint (for manual batch runs)
router.post("/batch", async (req, res) => {
  try {
    const { recordIds, action } = req.body;

    if (!Array.isArray(recordIds) || recordIds.length === 0) {
      return res.status(400).json({ error: "recordIds must be a non-empty array" });
    }

    if (recordIds.length > 100) {
      return res.status(400).json({ error: "Maximum 100 records per batch" });
    }

    await inngest.send({
      name: "content/batch.trigger",
      data: { recordIds, action },
    });

    res.json({
      success: true,
      message: `Batch ${action} triggered for ${recordIds.length} records`,
    });
  } catch (error) {
    console.error("Batch webhook error:", error);
    res.status(400).json({ error: String(error) });
  }
});

export default router;
```

---

## Part 5: Inngest Functions

### src/inngest/functions/content-pipeline.ts

```typescript
import { inngest } from "../client.js";
import {
  getRecord,
  updateRecord,
  getIndustry,
  getPersona,
  getActiveArtifacts,
} from "../../lib/airtable.js";
import { getPrompt } from "../../lib/langfuse.js";
import { generate } from "../../lib/claude.js";
import { getContextBundle } from "../../lib/context.js";

export const contentPipeline = inngest.createFunction(
  {
    id: "content-pipeline",
    retries: 3,
  },
  { event: "content/pipeline.start" },
  async ({ event, step, runId }) => {
    const { recordId, title, industryId, personaId, contentType, keywords } =
      event.data;

    // Store run ID for debugging
    await step.run("store-run-id", async () => {
      await updateRecord(recordId, {
        "Inngest Run ID": runId,
        Status: "Generating",
      });
    });

    // =========================================
    // STEP 1: Assemble Context
    // =========================================
    const context = await step.run("assemble-context", async () => {
      // Load static context from markdown files in /context folder
      const staticContext = getContextBundle([
        "company-profile",
        "voice-guidelines",
        "product-overview",
        "differentiators",
      ]);

      // Load dynamic context from Airtable (optional, for things that change often)
      const artifacts = await getActiveArtifacts();
      
      // Load industry/persona from Airtable
      const industry = industryId ? await getIndustry(industryId) : null;
      const persona = personaId ? await getPersona(personaId) : null;

      return {
        // From markdown files (stable, version-controlled)
        companyProfile: staticContext["company-profile"],
        voiceGuidelines: staticContext["voice-guidelines"],
        productOverview: staticContext["product-overview"],
        differentiators: staticContext["differentiators"],
        
        // From Airtable Context Artifacts table (optional override)
        ...artifacts,
        
        // From Airtable linked records
        industry,
        persona,
        keywords: keywords || "",
      };
    });

    // =========================================
    // STEP 2: Generate Outline
    // =========================================
    const outline = await step.run("generate-outline", async () => {
      const promptTemplate = await getPrompt(`outline-${contentType}`, {
        title,
        // From context files
        companyProfile: context.companyProfile,
        voiceGuidelines: context.voiceGuidelines,
        productOverview: context.productOverview,
        differentiators: context.differentiators,
        // From Airtable industry/persona
        industryName: context.industry?.name || "General",
        industryDescription: context.industry?.description || "",
        industryPainPoints: context.industry?.painPoints || "",
        personaName: context.persona?.name || "General audience",
        personaTitle: context.persona?.title || "",
        personaGoals: context.persona?.goals || "",
        personaPainPoints: context.persona?.painPoints || "",
        // From Airtable row
        keywords: context.keywords,
      });

      const result = await generate({
        prompt: promptTemplate,
        recordId,
        step: "outline",
      });

      return result.text;
    });

    // =========================================
    // STEP 3: Update Airtable & Wait for Approval
    // =========================================
    await step.run("update-outline", async () => {
      await updateRecord(recordId, {
        Outline: outline,
        Status: "Outline Review",
      });
    });

    // Wait for outline approval (up to 30 days)
    const outlineApproval = await step.waitForEvent("wait-outline-approval", {
      event: "content/outline.approved",
      timeout: "30d",
      match: "data.recordId",
    });

    if (!outlineApproval) {
      await updateRecord(recordId, { Status: "Error" });
      return { status: "timeout", stage: "outline" };
    }

    // =========================================
    // STEP 4: Generate Draft
    // =========================================
    const finalOutline = outlineApproval.data.outline;
    const outlineFeedback = outlineApproval.data.feedback;

    await step.run("update-drafting-status", async () => {
      await updateRecord(recordId, { Status: "Drafting" });
    });

    const draft = await step.run("generate-draft", async () => {
      const promptTemplate = await getPrompt(`draft-${contentType}`, {
        title,
        // From context files
        companyProfile: context.companyProfile,
        voiceGuidelines: context.voiceGuidelines,
        productOverview: context.productOverview,
        differentiators: context.differentiators,
        // From Airtable industry/persona
        industryName: context.industry?.name || "General",
        personaName: context.persona?.name || "General audience",
        // From previous step
        outline: finalOutline,
        feedback: outlineFeedback || "",
        // From Airtable row
        keywords: context.keywords,
      });

      const result = await generate({
        prompt: promptTemplate,
        recordId,
        step: "draft",
        maxTokens: 8192,
      });

      return result.text;
    });

    // =========================================
    // STEP 5: Update Airtable & Wait for Draft Approval
    // =========================================
    await step.run("update-draft", async () => {
      await updateRecord(recordId, {
        Draft: draft,
        Status: "Draft Review",
      });
    });

    // Wait for draft approval
    const draftApproval = await step.waitForEvent("wait-draft-approval", {
      event: "content/draft.approved",
      timeout: "30d",
      match: "data.recordId",
    });

    if (!draftApproval) {
      await updateRecord(recordId, { Status: "Error" });
      return { status: "timeout", stage: "draft" };
    }

    // =========================================
    // STEP 6: Finalize
    // =========================================
    const finalDraft = draftApproval.data.draft;

    await step.run("finalize", async () => {
      await updateRecord(recordId, {
        "Final Content": finalDraft,
        Status: "Complete",
      });
    });

    return {
      status: "complete",
      recordId,
    };
  }
);
```

### src/inngest/functions/batch-trigger.ts

```typescript
import { inngest } from "../client.js";
import { getRecord, batchUpdateStatus } from "../../lib/airtable.js";

export const batchTrigger = inngest.createFunction(
  {
    id: "batch-trigger",
    retries: 2,
  },
  { event: "content/batch.trigger" },
  async ({ event, step }) => {
    const { recordIds, action } = event.data;

    if (action === "start") {
      // Batch start: set all to "Ready" which triggers Airtable automation
      // OR directly send events for each record

      const events = await step.run("prepare-batch-events", async () => {
        const eventList = [];

        for (const recordId of recordIds) {
          const record = await getRecord(recordId);
          eventList.push({
            name: "content/pipeline.start" as const,
            data: {
              recordId,
              title: record.fields.Title,
              industryId: record.fields.Industry?.[0],
              personaId: record.fields.Persona?.[0],
              contentType: record.fields["Content Type"],
              keywords: record.fields["Target Keywords"],
            },
          });
        }

        return eventList;
      });

      // Send all events (Inngest will fan out)
      await step.run("send-batch-events", async () => {
        await inngest.send(events);
      });

      // Update statuses
      await step.run("update-statuses", async () => {
        await batchUpdateStatus(recordIds, "Generating");
      });

      return {
        status: "batch-started",
        count: recordIds.length,
      };
    }

    return { status: "unknown-action" };
  }
);
```

### src/inngest/functions/generate-outline.ts (standalone)

```typescript
// This is an alternative approach - standalone functions instead of one big pipeline
// Useful if you want more granular control per step

import { inngest } from "../client.js";
import {
  getRecord,
  updateRecord,
  getIndustry,
  getPersona,
  getActiveArtifacts,
} from "../../lib/airtable.js";
import { getPrompt } from "../../lib/langfuse.js";
import { generate } from "../../lib/claude.js";

export const generateOutline = inngest.createFunction(
  {
    id: "generate-outline-standalone",
    retries: 3,
  },
  { event: "content/outline.generate" },
  async ({ event, step }) => {
    const { recordId } = event.data;

    // Get record data
    const record = await step.run("get-record", async () => {
      return await getRecord(recordId);
    });

    // Assemble context
    const context = await step.run("assemble-context", async () => {
      const artifacts = await getActiveArtifacts();
      const industryId = record.fields.Industry?.[0];
      const personaId = record.fields.Persona?.[0];

      return {
        companyProfile: artifacts["company_profile"] || "",
        voiceGuidelines: artifacts["voice_guidelines"] || "",
        industry: industryId ? await getIndustry(industryId) : null,
        persona: personaId ? await getPersona(personaId) : null,
      };
    });

    // Generate
    const outline = await step.run("generate", async () => {
      const contentType = record.fields["Content Type"];
      const prompt = await getPrompt(`outline-${contentType}`, {
        title: record.fields.Title,
        companyProfile: context.companyProfile,
        voiceGuidelines: context.voiceGuidelines,
        industryName: context.industry?.name || "General",
        industryDescription: context.industry?.description || "",
        personaName: context.persona?.name || "General audience",
        keywords: record.fields["Target Keywords"] || "",
      });

      return (await generate({ prompt, recordId, step: "outline" })).text;
    });

    // Update Airtable
    await step.run("update-record", async () => {
      await updateRecord(recordId, {
        Outline: outline,
        Status: "Outline Review",
      });
    });

    return { recordId, status: "outline-ready" };
  }
);
```

### src/inngest/functions/generate-draft.ts (standalone)

```typescript
import { inngest } from "../client.js";
import {
  getRecord,
  updateRecord,
  getIndustry,
  getPersona,
  getActiveArtifacts,
} from "../../lib/airtable.js";
import { getPrompt } from "../../lib/langfuse.js";
import { generate } from "../../lib/claude.js";

export const generateDraft = inngest.createFunction(
  {
    id: "generate-draft-standalone",
    retries: 3,
  },
  { event: "content/draft.generate" },
  async ({ event, step }) => {
    const { recordId } = event.data;

    const record = await step.run("get-record", async () => {
      return await getRecord(recordId);
    });

    const context = await step.run("assemble-context", async () => {
      const artifacts = await getActiveArtifacts();
      const industryId = record.fields.Industry?.[0];
      const personaId = record.fields.Persona?.[0];

      return {
        companyProfile: artifacts["company_profile"] || "",
        voiceGuidelines: artifacts["voice_guidelines"] || "",
        industry: industryId ? await getIndustry(industryId) : null,
        persona: personaId ? await getPersona(personaId) : null,
      };
    });

    const draft = await step.run("generate", async () => {
      const contentType = record.fields["Content Type"];
      const prompt = await getPrompt(`draft-${contentType}`, {
        title: record.fields.Title,
        companyProfile: context.companyProfile,
        voiceGuidelines: context.voiceGuidelines,
        outline: record.fields.Outline || "",
        feedback: record.fields["Outline Feedback"] || "",
        keywords: record.fields["Target Keywords"] || "",
      });

      return (
        await generate({ prompt, recordId, step: "draft", maxTokens: 8192 })
      ).text;
    });

    await step.run("update-record", async () => {
      await updateRecord(recordId, {
        Draft: draft,
        Status: "Draft Review",
      });
    });

    return { recordId, status: "draft-ready" };
  }
);
```

---

## Part 6: Langfuse Prompt Templates

Create these prompts in Langfuse UI (Prompts → New Prompt):

### Prompt: `outline-blog`

**Name:** `outline-blog`  
**Type:** Text

```
You are a B2B content strategist creating an outline for a blog post.

## Company Context
{{companyProfile}}

## Voice Guidelines
{{voiceGuidelines}}

## Product Overview
{{productOverview}}

## Key Differentiators
{{differentiators}}

## Target Industry
Name: {{industryName}}
Description: {{industryDescription}}
Pain Points: {{industryPainPoints}}

## Target Persona
Name: {{personaName}}
Title: {{personaTitle}}
Goals: {{personaGoals}}
Pain Points: {{personaPainPoints}}

## Content Details
Title: {{title}}
Target Keywords: {{keywords}}

## Task
Create a detailed outline for this blog post. Include:

1. **Hook/Introduction** - How to grab attention
2. **Problem Statement** - Pain points to address
3. **Main Sections** (3-5 sections with subpoints)
4. **Solution Positioning** - How to naturally introduce our approach
5. **Call to Action** - What reader should do next

## Output Format
Use markdown with clear H2s and bullet points for each section.
```

### Prompt: `draft-blog`

**Name:** `draft-blog`  
**Type:** Text

```
You are a B2B content writer creating a blog post.

## Company Context
{{companyProfile}}

## Voice Guidelines
{{voiceGuidelines}}

## Product Overview
{{productOverview}}

## Key Differentiators
{{differentiators}}

## Target Audience
Industry: {{industryName}}
Persona: {{personaName}}

## Approved Outline
{{outline}}

## Feedback to Incorporate
{{feedback}}

## Target Keywords
{{keywords}}

## Writing Requirements
- Follow the voice guidelines exactly
- Naturally incorporate target keywords (don't stuff)
- Use short paragraphs (2-3 sentences max)
- Include subheadings every 200-300 words
- Write at an 8th grade reading level
- Total length: 1200-1800 words

## Output
Write the complete blog post in markdown format. Include a compelling title as H1.
```

### Prompt: `outline-industry_page`

**Name:** `outline-industry_page`  
**Type:** Text

```
You are creating an outline for an industry landing page.

## Company Context
{{companyProfile}}

## Voice Guidelines
{{voiceGuidelines}}

## Target Industry
Name: {{industryName}}
Description: {{industryDescription}}
Pain Points: {{industryPainPoints}}
Terminology: {{industryTerminology}}

## Target Keywords
{{keywords}}

## Task
Create a conversion-focused outline for an industry page. Include:

1. **Hero Section** - Headline + subheadline that speaks to this industry
2. **Problem Section** - Industry-specific challenges (2-3 key problems)
3. **Solution Section** - How we address each problem
4. **Social Proof** - What testimonials/case studies to feature
5. **Features/Benefits** - Key capabilities for this industry
6. **FAQ Section** - 3-5 industry-specific questions
7. **CTA Section** - Primary and secondary calls to action

## Output Format
Detailed outline with specific copy suggestions for each section.
```

---

## Part 6.5: Company Context Files

Store your company information as markdown files in the repo. These are loaded at runtime and injected into Langfuse prompts.

### How It Works

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  LANGFUSE       │     │  CONTEXT FILES  │     │  AIRTABLE ROW   │
│  (prompt        │     │  (company       │     │  (dynamic       │
│   structure)    │     │   info)         │     │   inputs)       │
│                 │     │                 │     │                 │
│  {{voice...}}   │  +  │  voice.md       │  +  │  title, persona │
│  {{company...}} │     │  company.md     │     │  industry, etc  │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                                 ▼
                      ┌─────────────────────┐
                      │  prompt.compile()   │
                      │                     │
                      │  Full prompt with   │
                      │  all values merged  │
                      └─────────────────────┘
```

### Context Files Structure

```
context/
├── company-profile.md      # Who you are, what you do
├── voice-guidelines.md     # Tone, style, dos and don'ts
├── product-overview.md     # What you offer
├── differentiators.md      # Why you vs competitors
├── customer-quotes.md      # Testimonials to reference
└── glossary.md             # Terms and definitions
```

### Example: company-profile.md

```markdown
# Automara

Automara helps creative professionals and agencies build AI-ready websites 
and automate their business operations.

## Core Offering
- AI-ready website development
- Business process automation
- Integration with modern AI tools

## Target Market
- Creative agencies
- Freelance designers and developers
- Small marketing teams

## Positioning
We believe in augmenting human creativity, not replacing it. Our approach 
combines technical excellence with an understanding of creative workflows.
```

### Example: voice-guidelines.md

```markdown
# Voice Guidelines

## Tone
- Professional but approachable
- Confident without being arrogant
- Clear and direct, not salesy

## Style
- Use active voice
- Keep sentences short (max 20 words)
- Avoid jargon unless speaking to technical audience
- Use "you" to address the reader directly

## Do
- Lead with benefits, not features
- Use concrete examples
- Include specific numbers when possible

## Don't
- Use buzzwords like "synergy" or "leverage"
- Make claims without evidence
- Use exclamation points excessively
```

### src/lib/context.ts

```typescript
import { readFileSync, existsSync } from "fs";
import { join } from "path";

const contextDir = join(process.cwd(), "context");

// Cache for loaded context files
const contextCache: Map<string, string> = new Map();

/**
 * Load a context file by name (without .md extension)
 * Returns empty string if file doesn't exist
 */
export function getContext(name: string): string {
  // Check cache first
  if (contextCache.has(name)) {
    return contextCache.get(name)!;
  }

  const filePath = join(contextDir, `${name}.md`);
  
  if (!existsSync(filePath)) {
    console.warn(`Context file not found: ${filePath}`);
    return "";
  }

  const content = readFileSync(filePath, "utf-8");
  contextCache.set(name, content);
  
  return content;
}

/**
 * Load multiple context files at once
 */
export function getContextBundle(names: string[]): Record<string, string> {
  const bundle: Record<string, string> = {};
  
  for (const name of names) {
    bundle[name] = getContext(name);
  }
  
  return bundle;
}

/**
 * Clear the context cache (useful for development)
 */
export function clearContextCache(): void {
  contextCache.clear();
}

/**
 * Get all available context file names
 */
export function listContextFiles(): string[] {
  const { readdirSync } = require("fs");
  
  try {
    const files = readdirSync(contextDir);
    return files
      .filter((f: string) => f.endsWith(".md"))
      .map((f: string) => f.replace(".md", ""));
  } catch {
    return [];
  }
}
```

### Updated content-pipeline.ts (context assembly step)

```typescript
import { getContext, getContextBundle } from "../../lib/context.js";

// In your pipeline function...

const context = await step.run("assemble-context", async () => {
  // Load static context from markdown files
  const staticContext = getContextBundle([
    "company-profile",
    "voice-guidelines",
    "product-overview",
    "differentiators",
  ]);

  // Load dynamic context from Airtable
  const industry = industryId ? await getIndustry(industryId) : null;
  const persona = personaId ? await getPersona(personaId) : null;

  return {
    // From markdown files (stable, version-controlled)
    companyProfile: staticContext["company-profile"],
    voiceGuidelines: staticContext["voice-guidelines"],
    productOverview: staticContext["product-overview"],
    differentiators: staticContext["differentiators"],
    
    // From Airtable (dynamic per-row)
    industry,
    persona,
    keywords: keywords || "",
  };
});
```

### Using Context in Langfuse Prompts

Your Langfuse prompt template uses `{{placeholders}}`:

```
You are a B2B content writer.

## Company Context
{{companyProfile}}

## Voice Guidelines
{{voiceGuidelines}}

## Product Info
{{productOverview}}

## Task
Write a blog post about {{title}} targeting {{personaName}}.
```

When you call `prompt.compile()`, all placeholders are replaced:

```typescript
const prompt = await langfuse.getPrompt("draft-blog");

const compiled = prompt.compile({
  // From context files
  companyProfile: context.companyProfile,
  voiceGuidelines: context.voiceGuidelines,
  productOverview: context.productOverview,
  
  // From Airtable row
  title: "API Security Best Practices",
  personaName: "CTO",
});

// compiled = full prompt string with all values injected
```

### When to Use Which

| Source | What to Store | When it Changes |
|--------|---------------|-----------------|
| **Context files (repo)** | Company profile, voice guidelines, product info | Rarely (requires deploy) |
| **Airtable Context table** | Campaign-specific messaging, seasonal CTAs | Frequently (no deploy) |
| **Airtable row fields** | Title, keywords, industry, persona | Per content piece |

### Debugging Context Injection

In Langfuse, every trace shows the **fully compiled prompt** - you can see exactly what was sent to Claude with all context injected. This is invaluable for debugging:

1. Go to Langfuse → Traces
2. Find the generation you want to inspect
3. Click into it → see "Input" field
4. Full prompt with all `{{variables}}` replaced with actual content

If output isn't matching expectations, check:
- Is the context file content what you expected?
- Did all variables get replaced (no `{{leftover}}` placeholders)?
- Is the context being truncated due to token limits?

---

## Part 7: Deployment

### GitHub Setup

```bash
# Initialize git
git init
git add .
git commit -m "Initial commit: Automara batch processing engine"

# Create GitHub repo (using gh CLI)
gh repo create automara-engine --private --source=. --push
```

### Railway Deployment

1. Go to [railway.app](https://railway.app)
2. New Project → Deploy from GitHub repo
3. Select `automara-engine`
4. Add environment variables from `.env.example`
5. Railway auto-detects `railway.toml` and deploys

### Inngest Setup

1. Go to [inngest.com](https://inngest.com) → Create account
2. Create new app: "Automara Engine"
3. Get signing key and event key
4. Add to Railway environment variables
5. In Inngest dashboard: Apps → Add app URL
   - URL: `https://your-app.railway.app/api/inngest`

### Langfuse Setup

1. Go to [cloud.langfuse.com](https://cloud.langfuse.com)
2. Create project: "Automara"
3. Settings → API Keys → Create new
4. Add keys to Railway environment variables
5. Create prompts (see Part 6)

### Airtable Automation Setup

1. Open your Airtable base
2. Automations → Create automation
3. Create 3 automations as described in Part 2
4. Update webhook URLs to your Railway URL
5. Test each automation

---

## Part 8: Usage Workflow

### Single Item Processing

1. **Create row in Airtable**
   - Fill in: Title, Industry, Persona, Content Type, Keywords
   - Status: "Draft"

2. **Start processing**
   - Change Status to "Ready"
   - Automation fires → Inngest starts → Status becomes "Generating"

3. **Review outline**
   - Status changes to "Outline Review"
   - Outline appears in Outline column
   - Edit the outline directly in Airtable
   - Add notes in "Outline Feedback" if needed

4. **Approve outline**
   - Change Status to "Outline Approved"
   - Automation fires → Draft generation starts

5. **Review draft**
   - Status changes to "Draft Review"
   - Edit draft in Airtable
   - Add notes in "Draft Feedback" if needed

6. **Approve draft**
   - Change Status to "Draft Approved"
   - Final Content is saved
   - Status becomes "Complete"

### Batch Processing

**Option A: Using Airtable Views**

1. Create a view filtered to Status = "Draft"
2. Select multiple rows
3. Bulk edit Status to "Ready"
4. All rows start processing

**Option B: Using the batch endpoint**

```bash
curl -X POST https://your-app.railway.app/api/webhook/batch \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Secret: your-secret" \
  -d '{
    "recordIds": ["rec123", "rec456", "rec789"],
    "action": "start"
  }'
```

**Option C: Airtable Button Field**

Add a button field that calls a script:

```javascript
// Airtable Scripting App
let table = base.getTable("Content Pipeline");
let view = table.getView("Ready to Process");
let records = await view.selectRecordsAsync();

for (let record of records.records) {
    await table.updateRecordAsync(record, {
        "Status": "Ready"
    });
    // Small delay to not overwhelm webhooks
    await new Promise(r => setTimeout(r, 500));
}
```

---

## Part 9: Observability

### Where to Look

| Need | Where |
|------|-------|
| Content status | Airtable - Status column |
| Workflow progress | Inngest Dashboard - see each run |
| Prompt performance | Langfuse - Traces view |
| Token usage | Langfuse - Metrics/Usage |
| Errors | Inngest Dashboard - failed runs |
| A/B test results | Langfuse - Experiments |

### Inngest Dashboard Views

- **Runs**: See all workflow executions
- **Functions**: See function-level metrics
- **Events**: See all events sent/received
- **Errors**: Filter to failed runs

### Langfuse Dashboard Views

- **Traces**: Every LLM call with inputs/outputs
- **Prompts**: Version history, which version is in use
- **Metrics**: Token usage, latency, cost
- **Scores**: If you add feedback scoring

### Debugging a Stuck Row

1. Get the Inngest Run ID from Airtable
2. Go to Inngest Dashboard → Runs → Search by ID
3. See exact step that's waiting/failed
4. Check Langfuse for the corresponding trace

---

## Part 10: Advanced Patterns

### Adding More Steps

To add a step (e.g., "Refined Outline" between Outline and Draft):

1. **Airtable**: Add columns
   - "Refined Outline" (long text)
   - Add status: "Refining Outline"

2. **Langfuse**: Add prompt
   - `refine-outline-{contentType}`

3. **Code**: Add step in `content-pipeline.ts`
   ```typescript
   // After outline approval, before draft
   const refinedOutline = await step.run("refine-outline", async () => {
     const prompt = await getPrompt(`refine-outline-${contentType}`, {
       outline: finalOutline,
       feedback: outlineFeedback,
       // ... other variables
     });
     return (await generate({ prompt, recordId, step: "refine" })).text;
   });
   ```

### Custom Workflows per Content Type

Create separate Inngest functions:

```typescript
// content-pipeline-blog.ts
export const blogPipeline = inngest.createFunction(
  { id: "blog-pipeline" },
  { 
    event: "content/pipeline.start",
    if: "event.data.contentType == 'blog'" 
  },
  async ({ event, step }) => {
    // Blog-specific steps
  }
);

// content-pipeline-industry.ts  
export const industryPipeline = inngest.createFunction(
  { id: "industry-pipeline" },
  { 
    event: "content/pipeline.start",
    if: "event.data.contentType == 'industry_page'" 
  },
  async ({ event, step }) => {
    // Industry page-specific steps
  }
);
```

### Scheduled Batch Processing

Use Inngest cron:

```typescript
export const scheduledBatch = inngest.createFunction(
  { id: "scheduled-batch" },
  { cron: "0 9 * * 1" }, // Every Monday at 9am
  async ({ step }) => {
    const readyRecords = await step.run("get-ready", async () => {
      return await getRecordsByStatus("Ready");
    });

    if (readyRecords.length === 0) return { status: "no-records" };

    await step.run("trigger-batch", async () => {
      await inngest.send({
        name: "content/batch.trigger",
        data: {
          recordIds: readyRecords.map(r => r.id),
          action: "start"
        }
      });
    });

    return { triggered: readyRecords.length };
  }
);
```

---

## Implementation Timeline

### Week 1: Foundation

- [ ] Set up Airtable base with all tables
- [ ] Create GitHub repo
- [ ] Set up Railway project
- [ ] Implement basic Express server
- [ ] Configure Inngest
- [ ] Create Langfuse account and first prompts

### Week 2: Core Pipeline

- [ ] Implement webhook routes
- [ ] Build content-pipeline function
- [ ] Set up Airtable automations
- [ ] Test single item flow end-to-end

### Week 3: Batch + Polish

- [ ] Implement batch trigger
- [ ] Add all prompt templates
- [ ] Error handling improvements
- [ ] Test with 10+ items

### Week 4: Production Ready

- [ ] Add monitoring/alerting
- [ ] Document for your use
- [ ] Create Airtable views for different workflows
- [ ] Test full 100-item batch

---

## Quick Reference

### Start Processing

```
Airtable: Status → "Ready"
```

### Approve Outline

```
1. Edit Outline column
2. Add Outline Feedback (optional)
3. Status → "Outline Approved"
```

### Approve Draft

```
1. Edit Draft column
2. Add Draft Feedback (optional)
3. Status → "Draft Approved"
```

### Check Progress

```
Inngest Dashboard: https://app.inngest.com
Langfuse Dashboard: https://cloud.langfuse.com
```

### Trigger Batch

```bash
curl -X POST https://your-app.railway.app/api/webhook/batch \
  -H "X-Webhook-Secret: your-secret" \
  -d '{"recordIds": ["rec1","rec2"], "action": "start"}'
```
