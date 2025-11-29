/**
 * Webhook Routes
 * 
 * These routes receive webhooks from Airtable automations and trigger
 * Inngest events to start the content generation pipeline.
 * 
 * TypeScript Note: We use Zod for validation - it checks that incoming
 * data matches the expected structure before we try to use it.
 */

import { Router, Request, Response, NextFunction } from "express";
import { inngest } from "../inngest/client.js";
import { z } from "zod";

const router = Router();

/**
 * Webhook authentication middleware
 * 
 * TypeScript Note: Express middleware functions have a specific signature.
 * They receive req, res, and next, and either call next() to continue
 * or send a response to stop the request.
 */
const authenticateWebhook = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const secret = req.headers["x-webhook-secret"];
  if (secret !== process.env.WEBHOOK_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
};

// Apply authentication to all webhook routes
router.use(authenticateWebhook);

/**
 * Zod schema for validating start webhook data
 * 
 * TypeScript Note: Zod schemas both validate data at runtime AND provide
 * TypeScript types. If validation passes, we know the data is correct.
 */
const startSchema = z.object({
  recordId: z.string(),
  title: z.string(),
  industryId: z.string().optional(),
  personaId: z.string().optional(),
  contentType: z.string(),
  keywords: z.string().optional(),
});

/**
 * Start pipeline webhook
 * 
 * This is triggered by Airtable when Status changes to "Ready"
 */
router.post("/start", async (req: Request, res: Response) => {
  try {
    // Validate incoming data using Zod schema
    const data = startSchema.parse(req.body);

    // Send event to Inngest to start the pipeline
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

/**
 * Zod schema for outline approved webhook
 */
const outlineApprovedSchema = z.object({
  recordId: z.string(),
  outline: z.string(),
  feedback: z.string().optional(),
});

/**
 * Outline approved webhook - continue to draft
 * 
 * This is triggered by Airtable when Status changes to "Outline Approved"
 */
router.post("/outline-approved", async (req: Request, res: Response) => {
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

/**
 * Zod schema for draft approved webhook
 */
const draftApprovedSchema = z.object({
  recordId: z.string(),
  draft: z.string(),
  feedback: z.string().optional(),
});

/**
 * Draft approved webhook - finalize
 * 
 * This is triggered by Airtable when Status changes to "Draft Approved"
 */
router.post("/draft-approved", async (req: Request, res: Response) => {
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

/**
 * Batch trigger endpoint (for manual batch runs)
 * 
 * This allows triggering batch processing via API call
 */
router.post("/batch", async (req: Request, res: Response) => {
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

