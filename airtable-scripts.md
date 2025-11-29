# Airtable Automation Scripts

This file contains the scripts used in Airtable automations to trigger the content generation pipeline.

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

**Script:**
```javascript
// Trigger: When Status changes to "Outline Approved"
// Action: Run this script
//
// This script sends a webhook to continue the pipeline after outline approval.
// It triggers the generate-draft function in Inngest.

let inputConfig = input.config();

let recordId = inputConfig.recordId;
let outline = inputConfig.outline || '';
let feedback = inputConfig.feedback || '';

// Your Railway API URL - should be: https://your-app.railway.app/api/webhook/outline-approved
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

**Note:** Make sure `WEBHOOK_URL` secret is set to the full URL including `/api/webhook/outline-approved`

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