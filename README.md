# Automara Engine

A batch content processing system that orchestrates AI-powered content generation using Airtable, Inngest, Langfuse, and Railway.

## Overview

This project automates the content generation workflow from outline to final draft, with human-in-the-loop approvals at each stage. The system uses:

- **Airtable** - Grid-based UI for managing content pipeline and status tracking
- **Inngest** - Workflow engine for orchestrating the generation process with retries and timeouts
- **Langfuse** - Prompt management and observability for all LLM calls
- **Railway** - Simple hosting and deployment
- **Claude (Anthropic)** - LLM for content generation

## Architecture

```
Airtable (UI) → Webhook → Railway API → Inngest → Claude + Langfuse
```

Content flows through these stages:
1. **Ready** - Row is ready to start generation
2. **Generating** - Outline is being generated
3. **Outline Review** - Human reviews and edits outline
4. **Drafting** - Draft is being generated
5. **Draft Review** - Human reviews and edits draft
6. **Complete** - Final content is ready

## Quick Start

### Prerequisites

- Node.js 18+ installed
- Accounts for:
  - Airtable
  - Inngest
  - Langfuse
  - Railway (or your preferred hosting)
  - Anthropic (for Claude API)

### Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   - Copy `.env.example` to `.env`
   - Fill in all required values (see guide for details)

3. **Set up context files:**
   - Edit files in `/context` directory with your company information
   - These will be injected into all prompts

4. **Build the project:**
   ```bash
   npm run build
   ```

### Development

Run the development server with hot reload:

```bash
npm run dev
```

Run Inngest dev server (for testing Inngest functions locally):

```bash
npm run inngest-dev
```

## Project Structure

```
├── src/
│   ├── index.ts                    # Express server entry point
│   ├── routes/
│   │   └── webhook.ts              # Webhook handlers from Airtable
│   ├── inngest/
│   │   ├── client.ts               # Inngest client configuration
│   │   └── functions/
│   │       ├── content-pipeline.ts # Main orchestration workflow
│   │       ├── generate-outline.ts # Standalone outline generation
│   │       ├── generate-draft.ts   # Standalone draft generation
│   │       └── batch-trigger.ts    # Batch processing handler
│   ├── lib/
│   │   ├── airtable.ts             # Airtable API client
│   │   ├── langfuse.ts             # Langfuse client and prompts
│   │   ├── claude.ts               # Claude API wrapper
│   │   └── context.ts              # Context file loader
│   └── types/
│       └── index.ts                # TypeScript type definitions
├── context/                        # Company context markdown files
│   ├── company-profile.md
│   ├── voice-guidelines.md
│   ├── product-overview.md
│   ├── differentiators.md
│   ├── customer-quotes.md
│   └── glossary.md
└── automara-batch-processing-guide.md  # Complete implementation guide
```

## Configuration

### Environment Variables

See `.env.example` for all required environment variables:

- Server configuration (PORT, WEBHOOK_SECRET)
- Airtable credentials (API_KEY, BASE_ID)
- Inngest credentials (EVENT_KEY, SIGNING_KEY)
- Langfuse credentials (PUBLIC_KEY, SECRET_KEY, HOST)
- Anthropic API key (ANTHROPIC_API_KEY)

### Airtable Setup

1. Create the base structure as described in the guide
2. Set up automations that trigger webhooks on status changes
3. Configure webhook URLs to point to your Railway deployment

### Langfuse Setup

1. Create prompts in Langfuse UI (see guide for prompt templates)
2. Prompts should use `{{variables}}` that match the variables passed from code

## Deployment

### Railway

1. Connect your GitHub repository to Railway
2. Railway will auto-detect `railway.toml` configuration
3. Add all environment variables in Railway dashboard
4. Railway will build and deploy automatically

### Inngest Configuration

1. In Inngest dashboard, add your app URL: `https://your-app.railway.app/api/inngest`
2. Inngest will discover and register all functions automatically

## Usage

### Single Item Processing

1. Create a row in Airtable with Title, Industry, Persona, Content Type, Keywords
2. Set Status to "Ready"
3. Airtable automation triggers webhook → pipeline starts
4. Review outline in Airtable, edit if needed
5. Set Status to "Outline Approved" → draft generation starts
6. Review draft in Airtable, edit if needed
7. Set Status to "Draft Approved" → content is finalized

### Batch Processing

Use the batch endpoint to process multiple records:

```bash
curl -X POST https://your-app.railway.app/api/webhook/batch \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Secret: your-secret" \
  -d '{
    "recordIds": ["rec123", "rec456"],
    "action": "start"
  }'
```

## Observability

- **Airtable** - See current status of all content pieces
- **Inngest Dashboard** - See workflow executions, retries, errors
- **Langfuse Dashboard** - See all LLM calls, prompts used, token usage

## TypeScript Learning Notes

This project is written in TypeScript with extensive comments explaining concepts:

- **Type definitions** - How we define data structures
- **Interfaces** - Contracts for object shapes
- **Async/await** - Handling asynchronous operations
- **Modules** - How code is organized and imported
- **Type safety** - How TypeScript prevents errors

Look through the code files for detailed explanations!

## Documentation

For complete implementation details, see:
- `automara-batch-processing-guide.md` - Full guide with all setup steps

## License

Private project - not for distribution

