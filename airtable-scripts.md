# Airtable Automation Scripts

This file contains the scripts used in Airtable automations for both:
- **Content Pipeline System** - Scripts to trigger outline generation, draft generation, and finalization
- **Keyword Ideation System** - Scripts to trigger keyword research and title generation

## Railway Deployment

**Production URL:** `https://content-pipeline-production-e930.up.railway.app`

### Available Webhook Endpoints

**Content Pipeline:**
- `POST /api/webhook/start` - Start content generation pipeline
- `POST /api/webhook/outline-approved` - Continue after outline approval
- `POST /api/webhook/draft-approved` - Finalize after draft approval

**Keyword Ideation:**
- `POST /api/keyword/research` - Research keywords
- `POST /api/keyword/cluster` - Auto-cluster keywords
- `POST /api/keyword/generate-title` - Generate SEO title
- `POST /api/keyword/promote` - Promote to content pipeline

## Setup Instructions

1. **Create Airtable Secrets:**
   - Go to your Airtable base → Extensions → Scripting
   - Click "Manage secrets" (or similar)
   - Add these secrets (each script uses its own URL secret):
     - `WEBHOOK_URL_START`: `https://content-pipeline-production-e930.up.railway.app/api/webhook/start`
     - `WEBHOOK_URL_OUTLINE`: `https://content-pipeline-production-e930.up.railway.app/api/webhook/outline-approved`
     - `WEBHOOK_URL_DRAFT`: `https://content-pipeline-production-e930.up.railway.app/api/webhook/draft-approved`
     - `WEBHOOK_URL_RESEARCH`: `https://content-pipeline-production-e930.up.railway.app/api/keyword/research`
     - `WEBHOOK_URL_CLUSTER`: `https://content-pipeline-production-e930.up.railway.app/api/keyword/cluster`
     - `WEBHOOK_URL_GENERATE_TITLE`: `https://content-pipeline-production-e930.up.railway.app/api/keyword/generate-title`
     - `WEBHOOK_URL_PROMOTE`: `https://content-pipeline-production-e930.up.railway.app/api/keyword/promote`
     - `WEBHOOK_SECRET`: The same secret value you set in Railway's `WEBHOOK_SECRET` environment variable (shared by all scripts)

2. **Create Automations:**
   - Content Pipeline: 3 automations (Scripts 1-3)
   - Keyword Ideation: 4 automations (Scripts 4-7)
   - Each automation should trigger on a specific Status change
   - Each automation should run the corresponding script below

3. **Configure Input Variables:**
   - Each script expects specific input variables from the Airtable record
   - Make sure your automation passes the correct field values

---

## Script 1: Start Pipeline (Status → "Ready")

**Automation Setup:**
- **Trigger:** When record matches conditions
  - Field: `Status`
  - Condition: equals `"Ready"`
- **Action:** Run script

**Input Variables (from Airtable record):**
- `recordId` - The Record ID field (use `{Record ID}` in Airtable)
- `title` - The Title field (use `{Title}` in Airtable)
- `industryId` - The Industry field (use `{Industry}` in Airtable - first linked record ID)
- `personaId` - The Persona field (use `{Persona}` in Airtable - first linked record ID)
- `contentType` - The Content Type field (use `{Content Type}` in Airtable)
- `keywords` - The Target Keywords field (use `{Target Keywords}` in Airtable)

**Script:**
```javascript
// Trigger: When Status changes to "Ready"
// Action: Run this script
// 
// This script sends a webhook to start the content generation pipeline.
// It triggers the generate-outline function in Inngest.

let inputConfig = input.config();

// Get the record that triggered this automation
let recordId = inputConfig.recordId;
let title = inputConfig.title;
let industryId = inputConfig.industryId;
let personaId = inputConfig.personaId;
let contentType = inputConfig.contentType;
let keywords = inputConfig.keywords;

const WEBHOOK_URL = input.secret('WEBHOOK_URL_START');
const WEBHOOK_SECRET = input.secret('WEBHOOK_SECRET');

let response = await fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Secret': WEBHOOK_SECRET
    },
    body: JSON.stringify({
        recordId,
        title,
        industryId,
        personaId,
        contentType,
        keywords
    })
});

let result = await response.json();
console.log('Webhook response:', result);

// Optional: Check if the request was successful
if (!response.ok) {
    throw new Error(`Webhook failed: ${result.error || response.statusText}`);
}
```

**Airtable Secrets Required:**
- `WEBHOOK_URL_START`: `https://content-pipeline-production-e930.up.railway.app/api/webhook/start`
- `WEBHOOK_SECRET`: (shared secret for all scripts)

**Important - Required Fields:**
The following fields **must be filled** in the Airtable record and passed to the script, or the webhook will fail with a clear error message:

- **Title** - Required. Must be a non-empty string. Use `{Title}` in Airtable automation input configuration.
- **Content Type** - Required. Must be a non-empty string (e.g., "blog", "industry_page"). Use `{Content Type}` in Airtable automation input configuration.

If either of these fields is missing or empty, the webhook will return a 400 error indicating which field is missing. Make sure to fill these fields in your Airtable record before changing the Status to "Ready".

**Troubleshooting:**
- If you see "Missing required field: title" error, check that the Title field has a value in Airtable
- If you see "Missing required field: contentType" error, check that the Content Type field has a value in Airtable
- Verify that your automation input configuration is using `{Title}` and `{Content Type}` (with curly braces) to pass these values to the script

---

## Script 2: Continue After Outline Approval (Status → "Outline Approved")

**Automation Setup:**
- **Trigger:** When record matches conditions
  - Field: `Status`
  - Condition: equals `"Outline Approved"`
- **Action:** Run script

**Input Variables (from Airtable record):**
- `recordId` - The Record ID field (use `{Record ID}` in Airtable)
- `outline` - The Outline field (use `{Outline}` in Airtable)
- `feedback` - The Outline Feedback field (use `{Outline Feedback}` in Airtable, optional)

**Note:** You do NOT need to include `title` or `contentType` as input variables. The webhook handler will fetch the full record from Airtable to get these fields automatically.

**Script:**
```javascript
// Trigger: When Status changes to "Outline Approved"
// Action: Run this script
//
// This script sends a webhook to continue the pipeline after outline approval.
// It triggers the generate-draft function in Inngest.
//
// IMPORTANT: The webhook URL must be /api/webhook/outline-approved
// (NOT /api/webhook/start - that's for the first workflow step)

let inputConfig = input.config();

let recordId = inputConfig.recordId;
let outline = inputConfig.outline || '';
let feedback = inputConfig.feedback || '';

const WEBHOOK_URL = input.secret('WEBHOOK_URL_OUTLINE');
const WEBHOOK_SECRET = input.secret('WEBHOOK_SECRET');

let response = await fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Secret': WEBHOOK_SECRET
    },
    body: JSON.stringify({
        recordId,
        outline,
        feedback
    })
});

let result = await response.json();
console.log('Webhook response:', result);

// Optional: Check if the request was successful
if (!response.ok) {
    throw new Error(`Webhook failed: ${result.error || response.statusText}`);
}
```

**Airtable Secrets Required:**
- `WEBHOOK_URL_OUTLINE`: `https://content-pipeline-production-e930.up.railway.app/api/webhook/outline-approved`
- `WEBHOOK_SECRET`: (shared secret for all scripts)

**Important Notes:**
1. **Input Variables:** Only include `recordId`, `outline`, and `feedback` - do NOT add `title` or `contentType` as input variables. The webhook handler fetches these from Airtable automatically.
2. **Why:** The outline-approved webhook handler fetches the full record from Airtable to get `title`, `contentType`, and other fields needed for draft generation. You only need to send the minimal payload (`recordId`, `outline`, `feedback`).

**Important - Required Fields:**
The webhook handler will fetch the full record from Airtable to get additional context needed for draft generation. The following fields **must be filled** in the Airtable record, or the webhook will fail with a clear error message:

- **Title** - Required. Must be a non-empty string.
- **Content Type** - Required. Must be a non-empty string (e.g., "blog", "industry_page").

If either of these fields is missing or empty, the webhook will return a 400 error indicating which field is missing. Make sure to fill these fields in your Airtable record before changing the Status to "Outline Approved".

---

## Script 3: Finalize After Draft Approval (Status → "Draft Approved")

**Automation Setup:**
- **Trigger:** When record matches conditions
  - Field: `Status`
  - Condition: equals `"Draft Approved"`
- **Action:** Run script

**Input Variables (from Airtable record):**
- `recordId` - The Record ID field (use `{Record ID}` in Airtable)
- `draft` - The Draft field (use `{Draft}` in Airtable)
- `feedback` - The Draft Feedback field (use `{Draft Feedback}` in Airtable, optional)

**Script:**
```javascript
// Trigger: When Status changes to "Draft Approved"
// Action: Run this script
//
// This script sends a webhook to finalize the content after draft approval.
// It triggers the finalize-content function in Inngest.

let inputConfig = input.config();

let recordId = inputConfig.recordId;
let draft = inputConfig.draft || '';
let feedback = inputConfig.feedback || '';

const WEBHOOK_URL = input.secret('WEBHOOK_URL_DRAFT');
const WEBHOOK_SECRET = input.secret('WEBHOOK_SECRET');

let response = await fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Secret': WEBHOOK_SECRET
    },
    body: JSON.stringify({
        recordId,
        draft,
        feedback
    })
});

let result = await response.json();
console.log('Webhook response:', result);

// Optional: Check if the request was successful
if (!response.ok) {
    throw new Error(`Webhook failed: ${result.error || response.statusText}`);
}
```

**Airtable Secrets Required:**
- `WEBHOOK_URL_DRAFT`: `https://content-pipeline-production-e930.up.railway.app/api/webhook/draft-approved`
- `WEBHOOK_SECRET`: (shared secret for all scripts)

---

## Troubleshooting

### Script fails with "Unauthorized" error
- Check that `WEBHOOK_SECRET` in Airtable matches `WEBHOOK_SECRET` in Railway
- Verify the secret is set correctly in both places

### Script fails with "Webhook failed" error
- Check that `WEBHOOK_URL` includes the full path (e.g., `https://content-pipeline-production-e930.up.railway.app/api/webhook/start`)
- Verify your Railway app is running and accessible at: `https://content-pipeline-production-e930.up.railway.app`
- Check Railway logs for more details

### Record ID not found
- Make sure you're using `{Record ID}` (with curly braces) in Airtable automation input configuration
- Verify the record actually exists in your Airtable base

### Missing field values
- Ensure all required fields (Title, Content Type, etc.) are filled in the Airtable record
- Check that linked record fields (Industry, Persona) have at least one linked record

---

## Part 2: Keyword Ideation System Scripts

These scripts work with two tables:
- **Keyword Bank**: Stores raw keyword data
- **Content Ideas**: Stores clustered keywords ready for content creation

### Setup for Keyword Scripts

Each script uses its own unique URL secret (see "Airtable Secrets Required" section at the bottom of each script):
- `WEBHOOK_URL_RESEARCH`: For Script 4
- `WEBHOOK_URL_CLUSTER`: For Script 5
- `WEBHOOK_URL_GENERATE_TITLE`: For Script 6
- `WEBHOOK_URL_PROMOTE`: For Script 7
- `WEBHOOK_SECRET`: Shared secret for all scripts

**Base URL:** `https://content-pipeline-production-e930.up.railway.app`

**Note:** These use status-based automations (like the content pipeline). Change status → automation fires → script runs.

---

## Script 4: Research Keywords (Status → "Research")

**Automation Setup:**
- **Trigger:** When record matches conditions
  - Table: **Keyword Bank**
  - Field: `Status`
  - Condition: equals `"Research"`
- **Action:** Run script

**Input Variables (from Airtable record):**
- `recordId` - The Record ID field (use `{Record ID}` in Airtable)
- `keyword` - The Keyword field (use `{Keyword}` in Airtable)

**Script:**
```javascript
// Trigger: When Status changes to "Research"
// Action: Run this script
//
// This script sends a webhook to research keywords via DataForSEO.
// It triggers the keyword-research function in Inngest.

let inputConfig = input.config();

// Get the record that triggered this automation
let recordId = inputConfig.recordId;
let keyword = inputConfig.keyword;

const WEBHOOK_URL = input.secret('WEBHOOK_URL_RESEARCH');
const WEBHOOK_SECRET = input.secret('WEBHOOK_SECRET');

let response = await fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Secret': WEBHOOK_SECRET
    },
    body: JSON.stringify({
        recordId,
        keyword
    })
});

let result = await response.json();
console.log('Webhook response:', result);

// Optional: Check if the request was successful
if (!response.ok) {
    throw new Error(`Webhook failed: ${result.error || response.statusText}`);
}
```

**Airtable Secrets Required:**
- `WEBHOOK_URL_RESEARCH`: `https://content-pipeline-production-e930.up.railway.app/api/keyword/research`
- `WEBHOOK_SECRET`: (shared secret for all scripts)

**What Happens:**
1. System researches the seed keyword via DataForSEO
2. Updates the original record with research data
3. Creates new Keyword Bank records for related keywords
4. Sets status to "New" when complete

**Important - Required Fields:**
The following field **must be filled** in the Airtable record and passed to the script, or the webhook will fail:
- **Keyword** - Required. Must be a non-empty string. Use `{Keyword}` in Airtable automation input configuration.

**Bulk Processing:**
Select multiple Keyword Bank records → bulk change Status to "Research" → all process in parallel.

---

## Script 5: Auto-Cluster Keywords (Status → "Auto-Cluster")

**Automation Setup:**
- **Trigger:** When record matches conditions
  - Table: **Content Ideas**
  - Field: `Status`
  - Condition: equals `"Auto-Cluster"`
- **Action:** Run script

**Input Variables (from Airtable record):**
- `recordId` - The Record ID field (use `{Record ID}` in Airtable)
- `seedTopic` - The Seed Topic field (use `{Seed Topic}` in Airtable)

**Script:**
```javascript
// Trigger: When Status changes to "Auto-Cluster"
// Action: Run this script
//
// This script sends a webhook to auto-cluster keywords.
// It triggers the auto-cluster function in Inngest.

let inputConfig = input.config();

// Get the record that triggered this automation
let recordId = inputConfig.recordId;
let seedTopic = inputConfig.seedTopic;

const WEBHOOK_URL = input.secret('WEBHOOK_URL_CLUSTER');
const WEBHOOK_SECRET = input.secret('WEBHOOK_SECRET');

let response = await fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Secret': WEBHOOK_SECRET
    },
    body: JSON.stringify({
        recordId,
        seedTopic
    })
});

let result = await response.json();
console.log('Webhook response:', result);

// Optional: Check if the request was successful
if (!response.ok) {
    throw new Error(`Webhook failed: ${result.error || response.statusText}`);
}
```

**Airtable Secrets Required:**
- `WEBHOOK_URL_CLUSTER`: `https://content-pipeline-production-e930.up.railway.app/api/keyword/cluster`
- `WEBHOOK_SECRET`: (shared secret for all scripts)

**What Happens:**
1. System finds unclustered keywords from Keyword Bank matching the seed topic
2. Uses Claude to select best keywords for the cluster (3-6 keywords)
3. Links selected keywords to Content Ideas record
4. Sets Primary Keyword, Content Type, Search Intent
5. Updates Content Ideas status to "Review"

**Important - Required Fields:**
The following field **must be filled** in the Airtable record and passed to the script, or the webhook will fail:
- **Seed Topic** - Required. Must match a keyword in Keyword Bank (either as Keyword or Seed Topic field). Use `{Seed Topic}` in Airtable automation input configuration.

---

## Script 6: Generate Title (Status → "Generate Title")

**Automation Setup:**
- **Trigger:** When record matches conditions
  - Table: **Content Ideas**
  - Field: `Status`
  - Condition: equals `"Generate Title"`
- **Action:** Run script

**Input Variables (from Airtable record):**
- `recordId` - The Record ID field (use `{Record ID}` in Airtable)

**Note:** The webhook handler will fetch the full record from Airtable to get keywords, cluster name, and primary keyword automatically.

**Script:**
```javascript
// Trigger: When Status changes to "Generate Title"
// Action: Run this script
//
// This script sends a webhook to generate an SEO title.
// It triggers the generate-titles function in Inngest.

let inputConfig = input.config();

// Get the record that triggered this automation
let recordId = inputConfig.recordId;

const WEBHOOK_URL = input.secret('WEBHOOK_URL_GENERATE_TITLE');
const WEBHOOK_SECRET = input.secret('WEBHOOK_SECRET');

let response = await fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Secret': WEBHOOK_SECRET
    },
    body: JSON.stringify({
        recordId
    })
});

let result = await response.json();
console.log('Webhook response:', result);

// Optional: Check if the request was successful
if (!response.ok) {
    throw new Error(`Webhook failed: ${result.error || response.statusText}`);
}
```

**Airtable Secrets Required:**
- `WEBHOOK_URL_GENERATE_TITLE`: `https://content-pipeline-production-e930.up.railway.app/api/keyword/generate-title`
- `WEBHOOK_SECRET`: (shared secret for all scripts)

**What Happens:**
1. System generates SEO title using Claude
2. Creates content angles and competitor analysis
3. Updates Content Ideas record with title and angles
4. Sets status to "Review"

**Important - Required Fields:**
The webhook handler will fetch the full record from Airtable to get additional context needed for title generation. The following fields **must be filled** in the Airtable record, or the webhook will fail:
- **Keywords** - Must have at least one keyword linked from Keyword Bank
- **Cluster Name** - Used in title generation
- **Primary Keyword** - Used in title generation

---

## Script 7: Promote to Pipeline (Status → "Approved")

**Automation Setup:**
- **Trigger:** When record matches conditions
  - Table: **Content Ideas**
  - Field: `Status`
  - Condition: equals `"Approved"`
- **Action:** Run script

**Input Variables (from Airtable record):**
- `recordId` - The Record ID field (use `{Record ID}` in Airtable)

**Note:** The webhook handler will fetch the full record from Airtable to get title, keywords, and content type automatically.

**Script:**
```javascript
// Trigger: When Status changes to "Approved"
// Action: Run this script
//
// This script sends a webhook to promote the content idea to the content pipeline.
// It triggers the promote-to-pipeline function in Inngest.

let inputConfig = input.config();

// Get the record that triggered this automation
let recordId = inputConfig.recordId;

const WEBHOOK_URL = input.secret('WEBHOOK_URL_PROMOTE');
const WEBHOOK_SECRET = input.secret('WEBHOOK_SECRET');

let response = await fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Secret': WEBHOOK_SECRET
    },
    body: JSON.stringify({
        recordId
    })
});

let result = await response.json();
console.log('Webhook response:', result);

// Optional: Check if the request was successful
if (!response.ok) {
    throw new Error(`Webhook failed: ${result.error || response.statusText}`);
}
```

**Airtable Secrets Required:**
- `WEBHOOK_URL_PROMOTE`: `https://content-pipeline-production-e930.up.railway.app/api/keyword/promote`
- `WEBHOOK_SECRET`: (shared secret for all scripts)

**What Happens:**
1. System creates Content Pipeline record with all linked keywords
2. Uses generated title or cluster name as title
3. Includes all cluster context in Notes field
4. Updates Content Ideas status to "Promoted"
5. Stores Content Pipeline record ID for reference

**Important - Required Fields:**
The webhook handler will fetch the full record from Airtable to get additional context needed for promotion. The following fields **must be filled** in the Airtable record, or the webhook will fail:
- **Title** - Generated title (from Generate Title step)
- **Keywords** - Must have at least one keyword linked
- **Content Type** - Used for Content Pipeline record

**Bulk Processing:**
Select multiple Content Ideas records → bulk change Status to "Approved" → all promote in parallel.

---

## Keyword Ideation Troubleshooting

### Research not starting
- Check that Keyword Bank record has Status = "Research"
- Verify the Keyword field has a value
- Check Railway logs for webhook errors

### Auto-cluster not finding keywords
- Verify Seed Topic matches a keyword in Keyword Bank (exact match in Keyword or Seed Topic field)
- Check that keywords in Keyword Bank are not already "Clustered" or "Rejected"

### Title generation fails
- Ensure Content Ideas record has at least one keyword linked
- Check that Primary Keyword field is set

### Promotion fails
- Ensure Title field is filled (run Generate Title step first)
- Verify Keywords are linked to Content Ideas record

### Status not updating
- The webhook triggers Inngest, which then updates Airtable
- Check Inngest dashboard to see if the function is running
- There may be a delay of a few seconds between webhook and status update