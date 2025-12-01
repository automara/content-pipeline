# Airtable Automation Scripts

This file contains the scripts used in Airtable automations for both:
- **Content Pipeline System** - Scripts to trigger outline generation, draft generation, and finalization
- **Keyword Ideation System** - Scripts to trigger keyword research and title generation

## Setup Instructions

1. **Create Airtable Secrets:**
   - Go to your Airtable base → Extensions → Scripting
   - Click "Manage secrets" (or similar)
   - Add these secrets:
     - `WEBHOOK_URL`: Your full Railway URL (e.g., `https://your-app.railway.app/api/webhook/start`)
     - `WEBHOOK_SECRET`: The same secret value you set in Railway's `WEBHOOK_SECRET` environment variable

2. **Create Three Automations:**
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

// Your Railway API URL - should be: https://your-app.railway.app/api/webhook/start
const WEBHOOK_URL = input.secret('WEBHOOK_URL');
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

**Note:** Make sure `WEBHOOK_URL` secret is set to the full URL including `/api/webhook/start`

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

// Your Railway API URL - MUST be: https://your-app.railway.app/api/webhook/outline-approved
// This is DIFFERENT from the start webhook URL!
const WEBHOOK_URL = input.secret('WEBHOOK_URL');
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

**Important Notes:**
1. **Webhook URL:** Make sure `WEBHOOK_URL` secret is set to the full URL including `/api/webhook/outline-approved` (NOT `/api/webhook/start`)
2. **Input Variables:** Only include `recordId`, `outline`, and `feedback` - do NOT add `title` or `contentType` as input variables. The webhook handler fetches these from Airtable automatically.
3. **Why:** The outline-approved webhook handler fetches the full record from Airtable to get `title`, `contentType`, and other fields needed for draft generation. You only need to send the minimal payload (`recordId`, `outline`, `feedback`).

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

// Your Railway API URL - should be: https://your-app.railway.app/api/webhook/draft-approved
const WEBHOOK_URL = input.secret('WEBHOOK_URL');
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

**Note:** Make sure `WEBHOOK_URL` secret is set to the full URL including `/api/webhook/draft-approved`

---

## Troubleshooting

### Script fails with "Unauthorized" error
- Check that `WEBHOOK_SECRET` in Airtable matches `WEBHOOK_SECRET` in Railway
- Verify the secret is set correctly in both places

### Script fails with "Webhook failed" error
- Check that `WEBHOOK_URL` includes the full path (e.g., `/api/webhook/start`)
- Verify your Railway app is running and accessible
- Check Railway logs for more details

### Record ID not found
- Make sure you're using `{Record ID}` (with curly braces) in Airtable automation input configuration
- Verify the record actually exists in your Airtable base

### Missing field values
- Ensure all required fields (Title, Content Type, etc.) are filled in the Airtable record
- Check that linked record fields (Industry, Persona) have at least one linked record

---

## Part 2: Keyword Ideation System Automations

These automations work with two tables:
- **Keyword Bank**: Stores raw keyword data
- **Content Ideas**: Stores clustered keywords ready for content creation

### Setup for Keyword Automations

You can reuse the same secrets from the content pipeline scripts:
- `WEBHOOK_URL`: Your full Railway URL (e.g., `https://your-app.railway.app/api/keyword/research`)
- `WEBHOOK_SECRET`: The same secret value you set in Railway's `WEBHOOK_SECRET` environment variable

**Note:** These use status-based automations (like the content pipeline). Change status → automation fires → webhook triggered.

---

## Automation 4: Research Keywords (Keyword Bank)

**Trigger:** When record matches conditions
- Table: **Keyword Bank**
- Field: Status
- Condition: equals "Research"

**Action:** Send webhook
- Method: POST
- URL: `https://your-app.railway.app/api/keyword/research`
- Headers:
  - `Content-Type: application/json`
  - `X-Webhook-Secret: your-secret-here`
- Body:
```json
{
  "recordId": "{Record ID}",
  "keyword": "{Keyword}"
}
```

**What Happens:**
1. System researches the seed keyword via DataForSEO
2. Updates the original record with research data
3. Creates new Keyword Bank records for related keywords
4. Sets status to "New" when complete

**Bulk Processing:**
Select multiple Keyword Bank records → bulk change Status to "Research" → all process in parallel.

---

## Automation 5: Auto-Cluster Keywords (Content Ideas)

**Trigger:** When record matches conditions
- Table: **Content Ideas**
- Field: Status
- Condition: equals "Auto-Cluster"

**Action:** Send webhook
- Method: POST
- URL: `https://your-app.railway.app/api/keyword/cluster`
- Headers:
  - `Content-Type: application/json`
  - `X-Webhook-Secret: your-secret-here`
- Body:
```json
{
  "recordId": "{Record ID}",
  "seedTopic": "{Seed Topic}"
}
```

**What Happens:**
1. System finds unclustered keywords from Keyword Bank matching the seed topic
2. Uses Claude to select best keywords for the cluster (3-6 keywords)
3. Links selected keywords to Content Ideas record
4. Sets Primary Keyword, Content Type, Search Intent
5. Updates Content Ideas status to "Review"

**Required Fields:**
- **Seed Topic**: Must match a keyword in Keyword Bank (either as Keyword or Seed Topic field)
- **Cluster Name**: Descriptive name for the cluster

---

## Automation 6: Generate Title (Content Ideas)

**Trigger:** When record matches conditions
- Table: **Content Ideas**
- Field: Status
- Condition: equals "Generate Title"

**Action:** Send webhook
- Method: POST
- URL: `https://your-app.railway.app/api/keyword/generate-title`
- Headers:
  - `Content-Type: application/json`
  - `X-Webhook-Secret: your-secret-here`
- Body:
```json
{
  "recordId": "{Record ID}"
}
```

**What Happens:**
1. System generates SEO title using Claude
2. Creates content angles and competitor analysis
3. Updates Content Ideas record with title and angles
4. Sets status to "Review"

**Required Fields:**
- **Keywords**: Must have at least one keyword linked from Keyword Bank
- **Cluster Name**: Used in title generation
- **Primary Keyword**: Used in title generation

---

## Automation 7: Promote to Pipeline (Content Ideas)

**Trigger:** When record matches conditions
- Table: **Content Ideas**
- Field: Status
- Condition: equals "Approved"

**Action:** Send webhook
- Method: POST
- URL: `https://your-app.railway.app/api/keyword/promote`
- Headers:
  - `Content-Type: application/json`
  - `X-Webhook-Secret: your-secret-here`
- Body:
```json
{
  "recordId": "{Record ID}"
}
```

**What Happens:**
1. System creates Content Pipeline record with all linked keywords
2. Uses generated title or cluster name as title
3. Includes all cluster context in Notes field
4. Updates Content Ideas status to "Promoted"
5. Stores Content Pipeline record ID for reference

**Required Fields:**
- **Title**: Generated title (from Generate Title step)
- **Keywords**: Must have at least one keyword linked
- **Content Type**: Used for Content Pipeline record

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