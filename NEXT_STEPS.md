# Next Steps Guide

A quick checklist to get your Automara Engine up and running.

---

## Step 1: Configure Environment Variables

Edit the `.env` file with your actual credentials:

### Airtable
1. Go to https://airtable.com/create/tokens
2. Create a new personal access token
3. Copy it to `AIRTABLE_API_KEY=pat_...`
4. Get your Base ID from your Airtable base URL (it's the part after `/base/`)
5. Copy it to `AIRTABLE_BASE_ID=app...`

### Anthropic (Claude API)
1. Go to https://console.anthropic.com/
2. Create an API key
3. Copy it to `ANTHROPIC_API_KEY=sk-ant-...`

### Inngest
1. Go to https://app.inngest.com and create an account
2. Create a new app called "Automara Engine"
3. Copy the Event Key to `INNGEST_EVENT_KEY=...`
4. Copy the Signing Key to `INNGEST_SIGNING_KEY=...`

### Langfuse
1. Go to https://cloud.langfuse.com and create an account
2. Create a new project called "Automara"
3. Go to Settings → API Keys
4. Copy the Public Key to `LANGFUSE_PUBLIC_KEY=pk-lf-...`
5. Copy the Secret Key to `LANGFUSE_SECRET_KEY=sk-lf-...`
6. Keep `LANGFUSE_HOST=https://cloud.langfuse.com` (default)

### Webhook Secret
1. Generate a random secret string (e.g., use a password generator)
2. Copy it to `WEBHOOK_SECRET=your-random-secret-here`

**Port is already set to 3000 - leave it as is.**

---

## Step 2: Customize Context Files

Edit the markdown files in the `/context` directory with your company information:

- **`company-profile.md`** - Who you are, what you do, your mission
- **`voice-guidelines.md`** - How you want content to sound (tone, style, do's/don'ts)
- **`product-overview.md`** - What your product/service does, key features
- **`differentiators.md`** - What makes you unique vs competitors
- **`customer-quotes.md`** - Testimonials you can reference in content
- **`glossary.md`** - Important terms and definitions for consistency

**Tip:** These files are loaded and injected into all prompts, so be thorough!

---

## Step 3: Create Airtable Base Structure

### Create Tables

1. **Content Pipeline** table with these fields:
   - `Title` (Single line text)
   - `Industry` (Link to Industries table)
   - `Persona` (Link to Personas table)
   - `Content Type` (Single select: `blog`, `industry_page`, `persona_page`, `comparison`)
   - `Target Keywords` (Long text)
   - `Status` (Single select - see status values below)
   - `Outline` (Long text - markdown)
   - `Outline Feedback` (Long text)
   - `Draft` (Long text - markdown)
   - `Draft Feedback` (Long text)
   - `Final Content` (Long text - markdown)
   - `Published URL` (URL)
   - `Inngest Run ID` (Single line text)

2. **Industries** table:
   - `Name` (Single line text)
   - `Description` (Long text)
   - `Pain Points` (Long text)
   - `Terminology` (Long text)

3. **Personas** table:
   - `Name` (Single line text)
   - `Title` (Single line text)
   - `Goals` (Long text)
   - `Pain Points` (Long text)
   - `Objections` (Long text)

4. **Context Artifacts** table:
   - `Name` (Single line text)
   - `Type` (Single select: `company_profile`, `voice_guidelines`, `brand_kit`)
   - `Content` (Long text)
   - `Active` (Checkbox)

### Status Values (for Content Pipeline table)

Create these single select options in order:
1. ⚪ Draft
2. 🟡 Ready
3. 🔵 Generating
4. 🟠 Outline Review
5. 🟡 Outline Approved
6. 🔵 Drafting
7. 🟠 Draft Review
8. 🟡 Draft Approved
9. 🟢 Complete
10. 🔴 Error

---

## Step 4: Create Langfuse Prompts

Go to https://cloud.langfuse.com → Prompts → New Prompt

### Prompt 1: `outline-blog`

**Name:** `outline-blog`  
**Type:** Text

Paste the prompt template from `automara-batch-processing-guide.md` (Part 6, around line 1236)

### Prompt 2: `draft-blog`

**Name:** `draft-blog`  
**Type:** Text

Paste the prompt template from `automara-batch-processing-guide.md` (Part 6, around line 1284)

**Important:** Ensure the `{{feedback}}` variable is placed prominently at the top of the prompt (after the initial instructions) so the LLM prioritizes incorporating outline feedback.

### Prompt 3: `finalize-blog`

**Name:** `finalize-blog`  
**Type:** Text

This prompt is used when draft feedback exists to refine the draft into final content.

```
You are refining a draft blog post based on feedback.

## CRITICAL: Feedback to Incorporate
{{feedback}}

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

## Current Draft
{{draft}}

## Target Keywords
{{keywords}}

## Task
Refine the draft above based on the feedback provided. Make all requested changes while maintaining:
- The voice and tone guidelines
- Natural keyword integration
- The overall structure and flow
- Professional quality

## Output
Provide the complete refined blog post in markdown format. Include a compelling title as H1.
```

**Tip:** Create additional prompts for other content types (`outline-industry_page`, `draft-industry_page`, `finalize-industry_page`, etc.) as needed.

**Important:** Use `{{variableName}}` syntax for variables that will be replaced at runtime. The feedback section should be at the top to ensure it's prioritized.

---

## Step 5: Set Up Airtable Automations

In your Airtable base, create 3 automations:

### Automation 1: Start Pipeline

**Trigger:** When record matches conditions
- Field: `Status`
- Condition: equals `Ready`

**Action:** Send webhook
- Method: `POST`
- URL: `https://your-app.railway.app/api/webhook/start` (update after deployment)
- Headers:
  - `Content-Type: application/json`
  - `X-Webhook-Secret: [your-webhook-secret]`
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
- Field: `Status`
- Condition: equals `Outline Approved`

**Action:** Send webhook
- Method: `POST`
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
- Field: `Status`
- Condition: equals `Draft Approved`

**Action:** Send webhook
- Method: `POST`
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

**Note:** You'll need to update the webhook URLs after you deploy to Railway (Step 7).

---

## Step 6: Test Locally

1. **Start the development server:**
   ```bash
   npm run dev
   ```

2. **Test the health endpoint:**
   - Open: http://localhost:3000/health
   - Should see: `{"status":"ok","timestamp":"..."}`

3. **Start Inngest dev server (in a separate terminal):**
   ```bash
   npm run inngest-dev
   ```

4. **Test a webhook manually:**
   ```bash
   curl -X POST http://localhost:3000/api/webhook/start \
     -H "Content-Type: application/json" \
     -H "X-Webhook-Secret: your-webhook-secret-here" \
     -d '{
       "recordId": "test-record-id",
       "title": "Test Content",
       "contentType": "blog",
       "keywords": "test, keywords"
     }'
   ```

If everything works locally, you're ready to deploy!

---

## Step 7: Deploy to Railway

### Option A: GitHub + Railway

1. **Initialize Git and push to GitHub:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit: Automara Engine"
   # Create repo on GitHub, then:
   git remote add origin https://github.com/yourusername/automara-engine.git
   git push -u origin main
   ```

2. **Deploy on Railway:**
   - Go to https://railway.app
   - New Project → Deploy from GitHub repo
   - Select your `automara-engine` repository
   - Railway will auto-detect the `railway.toml` configuration

3. **Add Environment Variables:**
   - In Railway dashboard → Variables tab
   - Add all variables from your `.env` file
   - Railway will automatically redeploy

4. **Get your Railway URL:**
   - Railway provides a URL like: `https://automara-engine-production.up.railway.app`
   - Copy this URL

5. **Update Airtable Automations:**
   - Go back to your Airtable automations
   - Replace `https://your-app.railway.app` with your actual Railway URL
   - Update all three webhook URLs

### Option B: Railway CLI

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Initialize and deploy
railway init
railway up
```

---

## Step 8: Connect Inngest

1. Go to https://app.inngest.com
2. Select your "Automara Engine" app
3. Go to Apps → Add App URL
4. Enter: `https://your-railway-url.railway.app/api/inngest`
5. Inngest will automatically discover and register all your functions

**Test it:** Create a test event in Inngest dashboard to verify the connection.

---

## Step 9: First Test Run

1. **Create a test record in Airtable:**
   - In "Content Pipeline" table
   - Fill in: Title, Industry (link to one), Persona (link to one), Content Type, Keywords
   - Set Status to "Ready"

2. **The automation should trigger:**
   - Status should change to "Generating"
   - Check Inngest dashboard to see the workflow running
   - Check Langfuse dashboard to see LLM traces

3. **Review the outline:**
   - Once Status changes to "Outline Review"
   - Check the Outline field in Airtable
   - Edit if needed, then set Status to "Outline Approved"

4. **Review the draft:**
   - Once Status changes to "Draft Review"
   - Check the Draft field in Airtable
   - Edit if needed, then set Status to "Draft Approved"

5. **Finalize:**
   - Status should change to "Complete"
   - Final Content should be populated

---

## Troubleshooting

### Webhook not triggering?
- Check Airtable automation is enabled and active
- Verify webhook URL is correct in Railway
- Check Railway logs for errors
- Verify `WEBHOOK_SECRET` matches in both places

### Inngest function not running?
- Check Inngest dashboard → Functions tab
- Verify app URL is correct in Inngest settings
- Check Railway logs for connection errors

### LLM errors?
- Verify Anthropic API key is correct and has credits
- Check Langfuse dashboard for trace details
- Look at Railway logs for error messages

### Context not loading?
- Verify context files exist in `/context` directory
- Check file names match what's in the code
- Look for console warnings about missing files

---

## Quick Reference

- **Airtable Base:** Your grid UI for managing content
- **Railway URL:** Your deployed API (e.g., `https://automara-engine.railway.app`)
- **Inngest Dashboard:** https://app.inngest.com
- **Langfuse Dashboard:** https://cloud.langfuse.com
- **Health Check:** `https://your-url.railway.app/health`

---

## Need Help?

Refer to the complete guide: `automara-batch-processing-guide.md`

All the detailed code examples and explanations are in there!

