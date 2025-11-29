/**
 * Main Server Entry Point
 * 
 * This is where the Express server starts. It sets up:
 * - Health check endpoint
 * - Webhook routes (receives events from Airtable)
 * - Inngest serve endpoint (Inngest calls this to trigger functions)
 * 
 * TypeScript Note: This file uses ES modules (import/export) which is why
 * we have ".js" extensions in the imports (even though files are .ts).
 * TypeScript compiles .ts to .js, so we reference the compiled output.
 */

import "dotenv/config"; // Load environment variables from .env file
import express from "express";
import { serve } from "inngest/express";
import { inngest } from "./inngest/client.js";
import { contentPipeline } from "./inngest/functions/content-pipeline.js";
import { generateOutline } from "./inngest/functions/generate-outline.js";
import { generateDraft } from "./inngest/functions/generate-draft.js";
import { batchTrigger } from "./inngest/functions/batch-trigger.js";
import webhookRouter from "./routes/webhook.js";

// Create Express app
const app = express();
const port = process.env.PORT || 3000;

// Middleware
// TypeScript Note: express.json() automatically parses JSON request bodies
app.use(express.json());

/**
 * Health check endpoint
 * 
 * Railway and other services use this to check if the server is running
 */
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Webhook routes - receives events from Airtable automations
app.use("/api/webhook", webhookRouter);

// Inngest serve endpoint - Inngest calls this to trigger functions
// TypeScript Note: serve() sets up the endpoint that Inngest uses to
// communicate with our functions. We pass it our client and all functions.
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

// Start the server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

