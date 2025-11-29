# Troubleshooting Guide

This document helps you debug common issues with the Automara Engine.

---

## Architecture: Separate Stage Functions

The content generation workflow uses **separate stage functions** instead of one monolithic pipeline:

1. **Generate Outline** - Triggered by `content/pipeline.start`, completes when outline is saved
2. **Generate Draft** - Triggered by `content/outline.approved` (with full context), completes when draft is saved
3. **Finalize Content** - Triggered by `content/draft.approved`, completes immediately

**Why separate stages?**
- Each function completes in seconds/minutes instead of staying "Running" for days
- Better error isolation (outline errors don't affect draft generation)
- Clearer observability in Inngest dashboard (each stage is a separate run)
- No long-running function states blocking resources

**Note:** The old monolithic `content-pipeline.ts` is kept for comparison/testing but is deprecated. Both approaches can run in parallel temporarily.

---

## Error: Webhook validation errors for outline/draft approval

**Error Message:**
```json
{
  "error": "[{ \"code\": \"invalid_type\", \"expected\": \"string\", \"received\": \"undefined\", \"path\": [\"title\"], \"message\": \"Required\" }]"
}
```

**What this means:**
The outline-approved or draft-approved webhook tried to send an event, but the event schema expected more data than was provided (like `title` and `contentType`).

**Solution:**
This was fixed by enhancing the webhook handlers to fetch the full record from Airtable and send enriched events with all needed context. The webhooks now:

1. Accept minimal payload from Airtable (recordId, outline/draft, feedback)
2. Fetch full record to get all context (title, contentType, industryId, personaId, keywords)
3. Send enriched event with all context needed for the next stage

**If you still see this error:**
- Check that the webhook is calling the correct endpoint (`/api/webhook/outline-approved` or `/api/webhook/draft-approved`)
- Verify the record exists in Airtable and has all required fields (Title, Content Type, etc.)
- Check server logs to see what data the webhook received

---

## Error: "Could not find what you are looking for"

This error means Airtable can't find something you're asking for. It could be:
- A record that doesn't exist
- The wrong Base ID
- A table name that doesn't match
- An API key that doesn't have access

### Step 1: Check Environment Variables

**On Railway:**
1. Go to your Railway project
2. Click on your service
3. Go to the "Variables" tab
4. Verify these are set:
   - `AIRTABLE_API_KEY` - Should start with `pat...`
   - `AIRTABLE_BASE_ID` - Should start with `app...`

**To find your Base ID:**
1. Open your Airtable base in a browser
2. Look at the URL: `https://airtable.com/appXXXXXXXXXXXXXX/...`
3. The part that says `appXXXXXXXXXXXXXX` is your Base ID

**To create/get your API Key:**
1. Go to https://airtable.com/create/tokens
2. Click "Create new token"
3. Give it a name (e.g., "Automara Engine")
4. Set scope to "data.records:read" and "data.records:write"
5. Select your base(s) that it should have access to
6. Copy the token (it starts with `pat...`)

### Step 2: Check Table Names

Your Airtable table names must match **exactly** (case-sensitive, including spaces):

- ✅ `Content Pipeline` (space between words)
- ❌ `content pipeline` (lowercase)
- ❌ `ContentPipeline` (no space)
- ❌ `Content Pipeline ` (trailing space)

**In your code:** `src/lib/airtable.ts` line 22:
```typescript
export const contentTable = base("Content Pipeline");
```

**In Airtable:** The table name must be exactly "Content Pipeline"

### Step 3: Run Diagnostics

You can test your connection using the diagnostic endpoint:

```bash
# Test connection (no record ID)
curl https://your-app.railway.app/api/diagnostics/airtable

# Test with a specific record ID
curl "https://your-app.railway.app/api/diagnostics/airtable?recordId=recXXXXXXXXXXXXX"
```

Or visit in your browser:
```
https://your-app.railway.app/api/diagnostics/airtable
```

The diagnostic will check:
- ✅ Are environment variables set?
- ✅ Can we connect to Airtable?
- ✅ Does the "Content Pipeline" table exist?
- ✅ Can we access a specific record? (if recordId provided)

### Step 4: Verify the Record ID

The record ID that Airtable sends in webhooks looks like: `recXXXXXXXXXXXXX`

**Common issues:**
1. **Wrong format:** Record IDs start with `rec`, not `app` or `pat`
2. **Record doesn't exist:** The record was deleted or never created
3. **Wrong base:** The record ID is from a different Airtable base

**To check if a record exists:**
1. Open your Airtable base
2. Find the record in the "Content Pipeline" table
3. Copy the Record ID (click on the record → copy ID)
4. Compare it to what's being sent in the webhook

### Step 5: Check Webhook Payload

Your Airtable automation should send a webhook with this format:

```json
{
  "recordId": "recXXXXXXXXXXXXX",
  "title": "My Content Title",
  "industryId": "recYYYYYYYYYYYYY",  // optional
  "personaId": "recZZZZZZZZZZZZZ",   // optional
  "contentType": "blog",
  "keywords": "keyword1, keyword2"   // optional
}
```

**To check what Airtable is sending:**
1. Go to your Airtable automation
2. Click "Run once" to test
3. Check the webhook execution logs
4. Verify the `recordId` field matches a real record

---

## Error: "Invalid credentials. Confirm that you've configured the correct host"

This error means Langfuse can't authenticate or connect. It could be:
- Missing or incorrect API keys
- Wrong host URL
- Credentials don't match your Langfuse project

### Step 1: Check Environment Variables

**On Railway:**
1. Go to your Railway project
2. Click on your service
3. Go to the "Variables" tab
4. Verify these are set:
   - `LANGFUSE_PUBLIC_KEY` - Should start with `pk-lf-...`
   - `LANGFUSE_SECRET_KEY` - Should start with `sk-lf-...`
   - `LANGFUSE_HOST` - Should be `https://cloud.langfuse.com` (default)

**To get your API keys from Langfuse:**
1. Go to https://cloud.langfuse.com
2. Log in to your account
3. Select your project (or create one if you haven't)
4. Go to **Settings** → **API Keys**
5. Copy the **Public Key** (starts with `pk-lf-...`)
6. Copy the **Secret Key** (starts with `sk-lf-...`)

**To verify your host URL:**
- If using Langfuse Cloud: `https://cloud.langfuse.com`
- If using self-hosted Langfuse: your custom URL
- If not set, it defaults to `https://cloud.langfuse.com`

### Step 2: Validate Credential Formats

Check that your keys have the correct format:

- ✅ `LANGFUSE_PUBLIC_KEY` should start with `pk-lf-`
- ✅ `LANGFUSE_SECRET_KEY` should start with `sk-lf-`
- ✅ `LANGFUSE_HOST` should be a valid URL starting with `http://` or `https://`

**Common mistakes:**
- ❌ Using the wrong keys (public/secret swapped)
- ❌ Missing the `-lf-` part in the key
- ❌ Using keys from a different project
- ❌ Wrong host URL format

### Step 3: Run Diagnostics

You can test your connection using the diagnostic endpoint:

```bash
# Test connection (general test)
curl https://your-app.railway.app/api/diagnostics/langfuse

# Test with a specific prompt name
curl "https://your-app.railway.app/api/diagnostics/langfuse?promptName=outline-blog"
```

Or visit in your browser:
```
https://your-app.railway.app/api/diagnostics/langfuse
```

The diagnostic will check:
- ✅ Are environment variables set?
- ✅ Do credentials have the correct format?
- ✅ Can we connect to Langfuse?
- ✅ Can we authenticate successfully?
- ✅ Can we fetch a specific prompt? (if promptName provided)

### Step 4: Verify Your Prompts Exist

Make sure the prompts you're trying to use actually exist in Langfuse:

1. Go to https://cloud.langfuse.com
2. Navigate to **Prompts** in the sidebar
3. Look for prompts like:
   - `outline-blog`
   - `draft-blog`
   - `outline-industry_page`
   - etc.

**Common prompt naming:**
- Prompts are named like `outline-{contentType}` or `draft-{contentType}`
- The `contentType` comes from your Airtable row (e.g., "blog", "industry_page")
- Make sure the prompt name matches exactly (case-sensitive)

### Step 5: Check Project Settings

Ensure you're using the correct Langfuse project:

1. Go to Langfuse dashboard
2. Verify you're in the correct project
3. Check that your API keys are from this project
4. If you have multiple projects, make sure all keys are from the same project

---

## Step-by-Step Troubleshooting Checklist

Print this out and check each item:

- [ ] **Environment Variables:**
  - [ ] `AIRTABLE_API_KEY` is set and starts with `pat...`
  - [ ] `AIRTABLE_BASE_ID` is set and starts with `app...`
  - [ ] Both are set in Railway (not just in `.env` locally)

- [ ] **Table Names:**
  - [ ] Table is named exactly "Content Pipeline" (capital C, capital P, space between)
  - [ ] Table exists in the base specified by `AIRTABLE_BASE_ID`

- [ ] **API Key Permissions:**
  - [ ] API key has "data.records:read" scope
  - [ ] API key has "data.records:write" scope
  - [ ] API key has access to the correct base

- [ ] **Record ID:**
  - [ ] Record ID starts with `rec...`
  - [ ] Record exists in the "Content Pipeline" table
  - [ ] Record is in the base specified by `AIRTABLE_BASE_ID`

- [ ] **Webhook Configuration:**
  - [ ] Airtable automation is sending the webhook
  - [ ] Webhook URL is correct: `https://your-app.railway.app/api/webhook/start`
  - [ ] Webhook includes `X-Webhook-Secret` header
  - [ ] `WEBHOOK_SECRET` in Railway matches the header value

- [ ] **Langfuse Configuration:**
  - [ ] `LANGFUSE_PUBLIC_KEY` is set and starts with `pk-lf-...`
  - [ ] `LANGFUSE_SECRET_KEY` is set and starts with `sk-lf-...`
  - [ ] `LANGFUSE_HOST` is set (or defaults to `https://cloud.langfuse.com`)
  - [ ] All keys are from the same Langfuse project
  - [ ] Required prompts exist in Langfuse (e.g., `outline-blog`, `draft-blog`)
  - [ ] All are set in Railway (not just in `.env` locally)

---

## Common Issues & Solutions

### Issue: "Table 'Content Pipeline' not found"

**Solution:**
- Check the table name in Airtable matches exactly (case-sensitive)
- Make sure the table is in the base specified by `AIRTABLE_BASE_ID`

### Issue: "Record not found" even though record exists

**Possible causes:**
1. Record ID is from a different base
2. API key doesn't have access to that base
3. Record was deleted

**Solution:**
- Copy the record ID directly from Airtable (right-click → copy ID)
- Verify the API key has access to the base
- Check the Base ID matches where the record actually exists

### Issue: "Unauthorized" or "Forbidden"

**Solution:**
- Verify your API key is correct
- Check that your API key has read/write permissions
- Make sure your API key hasn't expired or been revoked

### Issue: Environment variables work locally but not on Railway

**Solution:**
- Environment variables must be set in Railway, not just locally
- Railway doesn't read your `.env` file - you must set them in the Railway dashboard
- After setting variables in Railway, you may need to redeploy

### Issue: "Invalid credentials. Confirm that you've configured the correct host"

**Possible causes:**
1. Missing or incorrect API keys
2. Wrong host URL
3. Keys from different project
4. Host URL format is wrong

**Solution:**
- Verify `LANGFUSE_PUBLIC_KEY` starts with `pk-lf-`
- Verify `LANGFUSE_SECRET_KEY` starts with `sk-lf-`
- Check that `LANGFUSE_HOST` is a valid URL (default: `https://cloud.langfuse.com`)
- Make sure both keys are from the same Langfuse project
- Visit `/api/diagnostics/langfuse` to test your connection

### Issue: "Prompt not found" error

**Possible causes:**
1. Prompt doesn't exist in Langfuse
2. Prompt name doesn't match (case-sensitive)
3. Prompt is in a different project

**Solution:**
- Go to Langfuse dashboard → Prompts
- Verify the prompt exists with the exact name being used
- Check that prompt name matches `outline-{contentType}` or `draft-{contentType}` format
- Make sure you're using API keys from the project where the prompt exists

---

## Getting More Help

If you're still stuck:

1. **Run the diagnostic endpoints:**
   - Airtable: `/api/diagnostics/airtable`
   - Langfuse: `/api/diagnostics/langfuse`
   - Share the output when asking for help
2. **Check the Inngest logs** - they show the exact error message
3. **Check Railway logs** - they show server errors
4. **Verify your webhook** - test the webhook manually with a tool like Postman

---

## Quick Test Script

Here's a simple test you can run locally to verify your Airtable setup:

```bash
# Create a test file: test-airtable.js
node -e "
const Airtable = require('airtable');
require('dotenv/config');

const base = new Airtable({ 
  apiKey: process.env.AIRTABLE_API_KEY 
}).base(process.env.AIRTABLE_BASE_ID);

base('Content Pipeline').select({ maxRecords: 1 }).all()
  .then(records => {
    console.log('✅ Success! Found', records.length, 'record(s)');
    if (records.length > 0) {
      console.log('First record ID:', records[0].id);
    }
  })
  .catch(err => {
    console.error('❌ Error:', err.message);
    process.exit(1);
  });
"
```

Run it: `node test-airtable.js`

If this works, your Airtable config is correct. If not, fix the error it shows.
