# Troubleshooting Fixes Applied

## What Was Done

I've added better error handling and diagnostic tools to help you troubleshoot the "Could not find what you are looking for" error.

### 1. Better Error Messages ✅

**File:** `src/lib/airtable.ts`

Added try/catch blocks with helpful error messages for all Airtable functions:
- `getRecord()` - Now tells you exactly what to check if a record isn't found
- `updateRecord()` - Explains possible causes (wrong base ID, wrong table name, etc.)
- `getIndustry()` - Specific error for industry lookup failures
- `getPersona()` - Specific error for persona lookup failures

**Before:** Generic error message
**After:** Clear explanation of what to check

### 2. Diagnostic Endpoint ✅

**File:** `src/lib/airtable-diagnostics.ts` (new)
**File:** `src/index.ts` (added endpoint)

Added a diagnostic endpoint you can use to test your Airtable connection:

```
GET /api/diagnostics/airtable
GET /api/diagnostics/airtable?recordId=recXXXXXXXXXXXXX
```

This checks:
- ✅ Are environment variables set correctly?
- ✅ Can we connect to Airtable?
- ✅ Does the "Content Pipeline" table exist?
- ✅ Can we access a specific record?

### 3. Startup Validation ✅

**File:** `src/index.ts`

Added startup checks that warn you if:
- Required environment variables are missing
- API key format looks wrong (should start with `pat...`)
- Base ID format looks wrong (should start with `app...`)

### 4. Troubleshooting Guide ✅

**File:** `TROUBLESHOOTING.md` (new)

Created a comprehensive troubleshooting guide with:
- Step-by-step checklist
- Common issues and solutions
- How to verify your configuration
- Quick test scripts

---

## What You Should Do Next

### Step 1: Verify Environment Variables on Railway

1. Go to your Railway project dashboard
2. Click on your service
3. Go to the "Variables" tab
4. Check these two are set:

   ```
   AIRTABLE_API_KEY=pat_xxxxxxxxxxxxx
   AIRTABLE_BASE_ID=appXXXXXXXXXXXXXX
   ```

**Important:** 
- `AIRTABLE_API_KEY` must start with `pat...` (Personal Access Token)
- `AIRTABLE_BASE_ID` must start with `app...` (from your Airtable base URL)

### Step 2: Check Table Name

In your Airtable base, make sure you have a table named exactly:
```
Content Pipeline
```

**Must match exactly:**
- ✅ Capital "C" in Content
- ✅ Capital "P" in Pipeline
- ✅ Space between "Content" and "Pipeline"
- ❌ Not "content pipeline" (lowercase)
- ❌ Not "ContentPipeline" (no space)

### Step 3: Run Diagnostics

After deploying these changes, visit:
```
https://your-app.railway.app/api/diagnostics/airtable
```

This will tell you exactly what's wrong.

### Step 4: Check the Record ID

From your Inngest error, find the `recordId` that's being used. Then:

1. Open your Airtable base
2. Find that record ID in the "Content Pipeline" table
3. Make sure:
   - The record exists
   - The record is in the correct base
   - Your API key has access to that base

### Step 5: Verify Webhook Payload

Check what Airtable is sending in the webhook:

1. Go to your Airtable automation
2. Test it (run once)
3. Check the webhook execution
4. Verify the `recordId` field matches a real record

---

## Quick Reference

**Find your Base ID:**
- Open Airtable base URL: `https://airtable.com/appXXXXXXXXXXXXXX/...`
- The `appXXXXXXXXXXXXXX` part is your Base ID

**Create API Key:**
- Go to: https://airtable.com/create/tokens
- Create token with read/write permissions
- Give it access to your base
- Copy the token (starts with `pat...`)

**Test connection:**
```
https://your-app.railway.app/api/diagnostics/airtable
```

**Common fixes:**
- Wrong Base ID → Update `AIRTABLE_BASE_ID` in Railway
- Wrong table name → Rename table to exactly "Content Pipeline"
- API key wrong → Create new token and update `AIRTABLE_API_KEY`
- Record doesn't exist → Check the record ID in Airtable

---

## Next Steps

1. ✅ Deploy these changes to Railway
2. ✅ Verify environment variables in Railway dashboard
3. ✅ Run the diagnostic endpoint
4. ✅ Fix any issues it finds
5. ✅ Try triggering the pipeline again

If you're still stuck after following the troubleshooting guide, share:
- The diagnostic endpoint output
- Your environment variable prefixes (first 6 chars, not full values)
- The exact error message from Inngest

---

## Langfuse Credentials Error Fixes

### Problem

The error "Invalid credentials. Confirm that you've configured the correct host" occurs when Langfuse tries to fetch prompts. This happens because:
- Missing or incorrect environment variables
- No validation or diagnostic tools to help debug

### Solution Applied

I've added comprehensive Langfuse diagnostics and validation, following the same pattern as the Airtable diagnostics.

### 1. Better Error Messages ✅

**File:** `src/lib/langfuse.ts`

Added comprehensive error handling in `getPrompt()` function:
- Checks if credentials are set before attempting connection
- Specific error messages for:
  - Missing credentials
  - Authentication failures
  - Host/connection errors
  - Prompt not found errors
- Includes helpful troubleshooting hints with links to diagnostic endpoint

**Before:** Generic "Invalid credentials" error
**After:** Clear explanation of what's wrong and how to fix it

### 2. Diagnostic Module ✅

**File:** `src/lib/langfuse-diagnostics.ts` (new)

Created a comprehensive diagnostic module that:
- Checks if environment variables are set
- Validates credential formats (keys should start with `pk-lf-` and `sk-lf-`)
- Validates host URL format
- Tests connection to Langfuse
- Tests fetching specific prompts
- Provides detailed error messages

### 3. Diagnostic Endpoint ✅

**File:** `src/index.ts` (added endpoint)

Added a diagnostic endpoint you can use to test your Langfuse connection:

```
GET /api/diagnostics/langfuse
GET /api/diagnostics/langfuse?promptName=outline-blog
```

This checks:
- ✅ Are environment variables set correctly?
- ✅ Do credentials have the correct format?
- ✅ Can we connect to Langfuse?
- ✅ Can we authenticate successfully?
- ✅ Can we fetch a specific prompt? (if promptName provided)

### 4. Startup Validation ✅

**File:** `src/index.ts`

Extended startup validation to include Langfuse credentials:
- Checks if `LANGFUSE_PUBLIC_KEY`, `LANGFUSE_SECRET_KEY`, and `LANGFUSE_HOST` are set
- Validates key formats (should start with `pk-lf-` and `sk-lf-`)
- Validates host URL format (should be valid URL)
- Adds warnings similar to Airtable validation

### 5. Troubleshooting Guide ✅

**File:** `TROUBLESHOOTING.md`

Added comprehensive Langfuse troubleshooting section with:
- Step-by-step guide to verify Langfuse credentials
- How to get API keys from Langfuse
- Common issues and solutions
- How to verify the host URL
- Link to diagnostic endpoint
- Added Langfuse to the troubleshooting checklist

---

## What You Should Do Next (Langfuse)

### Step 1: Verify Environment Variables on Railway

1. Go to your Railway project dashboard
2. Click on your service
3. Go to the "Variables" tab
4. Check these are set:

   ```
   LANGFUSE_PUBLIC_KEY=pk-lf-xxxxxxxxxxxxx
   LANGFUSE_SECRET_KEY=sk-lf-xxxxxxxxxxxxx
   LANGFUSE_HOST=https://cloud.langfuse.com
   ```

**Important:** 
- `LANGFUSE_PUBLIC_KEY` must start with `pk-lf-`
- `LANGFUSE_SECRET_KEY` must start with `sk-lf-`
- `LANGFUSE_HOST` should be `https://cloud.langfuse.com` (default) or your custom URL

### Step 2: Get Your Langfuse API Keys

1. Go to https://cloud.langfuse.com
2. Log in to your account
3. Select your project (or create one if you haven't)
4. Go to **Settings** → **API Keys**
5. Copy the **Public Key** (starts with `pk-lf-...`)
6. Copy the **Secret Key** (starts with `sk-lf-...`)

### Step 3: Run Diagnostics

After deploying these changes, visit:
```
https://your-app.railway.app/api/diagnostics/langfuse
```

This will tell you exactly what's wrong with your Langfuse configuration.

### Step 4: Verify Your Prompts Exist

1. Go to Langfuse dashboard → **Prompts**
2. Make sure your prompts exist with the correct names:
   - `outline-blog`
   - `draft-blog`
   - `outline-industry_page`
   - etc.
3. Prompt names must match exactly (case-sensitive)

### Step 5: Test with a Specific Prompt

You can test if a specific prompt is accessible:
```
https://your-app.railway.app/api/diagnostics/langfuse?promptName=outline-blog
```

---

## Quick Reference (Langfuse)

**Get API Keys:**
- Go to: https://cloud.langfuse.com
- Navigate to: Settings → API Keys
- Copy Public Key (starts with `pk-lf-...`)
- Copy Secret Key (starts with `sk-lf-...`)

**Test connection:**
```
https://your-app.railway.app/api/diagnostics/langfuse
```

**Common fixes:**
- Missing keys → Add `LANGFUSE_PUBLIC_KEY` and `LANGFUSE_SECRET_KEY` to Railway
- Wrong key format → Make sure keys start with `pk-lf-` and `sk-lf-`
- Wrong host → Set `LANGFUSE_HOST` to `https://cloud.langfuse.com`
- Prompt not found → Create the prompt in Langfuse dashboard
- Keys from different project → Use keys from the same Langfuse project

---

## Next Steps (Langfuse)

1. ✅ Deploy these changes to Railway
2. ✅ Verify environment variables in Railway dashboard
3. ✅ Run the diagnostic endpoint: `/api/diagnostics/langfuse`
4. ✅ Fix any issues it finds
5. ✅ Verify your prompts exist in Langfuse
6. ✅ Try triggering the pipeline again

If you're still stuck after following the troubleshooting guide, share:
- The diagnostic endpoint output from `/api/diagnostics/langfuse`
- Your environment variable prefixes (first 6 chars, not full values)
- The exact error message from Inngest
