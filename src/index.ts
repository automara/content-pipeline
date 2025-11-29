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

/**
 * Diagnostic endpoint for troubleshooting Airtable connection
 * 
 * This helps debug Airtable configuration issues
 * Usage: GET /api/diagnostics/airtable?recordId=recXXXXXXXXXXXXX (optional)
 */
app.get("/api/diagnostics/airtable", async (req, res) => {
  try {
    // Dynamically import diagnostics (only load when needed)
    const diagnostics = await import("./lib/airtable-diagnostics.js");
    const recordId = req.query.recordId as string | undefined;
    
    const results = await diagnostics.runFullDiagnostics(recordId);
    
    res.json({
      success: true,
      diagnostics: results,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || String(error),
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * Diagnostic endpoint for troubleshooting Langfuse connection
 * 
 * This helps debug Langfuse configuration issues
 * Usage: GET /api/diagnostics/langfuse?promptName=outline-blog (optional)
 */
app.get("/api/diagnostics/langfuse", async (req, res) => {
  try {
    // Dynamically import diagnostics (only load when needed)
    const diagnostics = await import("./lib/langfuse-diagnostics.js");
    const promptName = req.query.promptName as string | undefined;
    
    const results = await diagnostics.runFullDiagnostics(promptName);
    
    res.json({
      success: true,
      diagnostics: results,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || String(error),
      timestamp: new Date().toISOString(),
    });
  }
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
  
  // Validate environment variables at startup
  const requiredEnvVars = [
    "AIRTABLE_API_KEY",
    "AIRTABLE_BASE_ID",
    "WEBHOOK_SECRET",
    "INNGEST_EVENT_KEY",
    "INNGEST_SIGNING_KEY",
    "LANGFUSE_PUBLIC_KEY",
    "LANGFUSE_SECRET_KEY",
    "ANTHROPIC_API_KEY",
  ];
  
  const missing = requiredEnvVars.filter((key) => !process.env[key]);
  
  if (missing.length > 0) {
    console.warn("⚠️  Warning: Missing environment variables:");
    missing.forEach((key) => console.warn(`   - ${key}`));
    console.warn("   Visit /api/diagnostics/airtable to test Airtable connection");
    console.warn("   Visit /api/diagnostics/langfuse to test Langfuse connection");
  } else {
    console.log("✅ All required environment variables are set");
  }
  
  // Quick Airtable config check
  const apiKey = process.env.AIRTABLE_API_KEY;
  const baseId = process.env.AIRTABLE_BASE_ID;
  
  if (apiKey && !apiKey.startsWith("pat")) {
    console.warn("⚠️  Warning: AIRTABLE_API_KEY should start with 'pat...'");
  }
  
  if (baseId && !baseId.startsWith("app")) {
    console.warn("⚠️  Warning: AIRTABLE_BASE_ID should start with 'app...'");
  }
  
  // Quick Langfuse config check
  const langfusePublicKey = process.env.LANGFUSE_PUBLIC_KEY;
  const langfuseSecretKey = process.env.LANGFUSE_SECRET_KEY;
  const langfuseHost = process.env.LANGFUSE_HOST;
  
  if (langfusePublicKey && !langfusePublicKey.startsWith("pk-lf-")) {
    console.warn("⚠️  Warning: LANGFUSE_PUBLIC_KEY should start with 'pk-lf-...'");
  }
  
  if (langfuseSecretKey && !langfuseSecretKey.startsWith("sk-lf-")) {
    console.warn("⚠️  Warning: LANGFUSE_SECRET_KEY should start with 'sk-lf-...'");
  }
  
  if (!langfuseHost) {
    console.warn("⚠️  Warning: LANGFUSE_HOST is not set. Defaulting to https://cloud.langfuse.com");
  } else {
    try {
      const url = new URL(langfuseHost);
      if (!["http:", "https:"].includes(url.protocol)) {
        console.warn(`⚠️  Warning: LANGFUSE_HOST should use http:// or https://. Got: ${langfuseHost}`);
      }
    } catch {
      console.warn(`⚠️  Warning: LANGFUSE_HOST is not a valid URL. Got: ${langfuseHost}`);
    }
  }
});

