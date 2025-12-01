/**
 * Keyword Webhook Routes
 * 
 * These routes receive webhooks from Airtable automations for the keyword
 * ideation system and trigger Inngest events to start processing.
 * 
 * TypeScript Note: We use Zod for validation to ensure incoming data
 * matches the expected structure before sending to Inngest.
 */

import { Router, Request, Response, NextFunction } from "express";
import { inngest } from "../inngest/client.js";
import { z } from "zod";

const router = Router();

/**
 * Webhook authentication middleware
 * 
 * TypeScript Note: This is the same middleware pattern as the main webhook routes.
 * It checks for the X-Webhook-Secret header to ensure requests are authorized.
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

// Apply authentication to all keyword webhook routes
router.use(authenticateWebhook);

/**
 * Zod schema for keyword research (single record)
 */
const researchSchema = z.object({
  recordId: z.string(),
  keyword: z.string(),
});

/**
 * Keyword research endpoint
 * 
 * POST /api/keyword/research
 * 
 * Triggered when a Keyword Bank record's status is set to "Research"
 */
router.post("/research", async (req: Request, res: Response) => {
  try {
    const data = researchSchema.parse(req.body);

    await inngest.send({
      name: "keyword/research.start",
      data,
    });

    res.json({
      success: true,
      message: `Researching keyword: ${data.keyword}`,
    });
  } catch (error) {
    console.error("Keyword research webhook error:", error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: "Invalid request data",
        details: error.errors,
      });
    }

    res.status(400).json({ error: String(error) });
  }
});

/**
 * Zod schema for gap analysis
 */
const gapScanSchema = z.object({
  scope: z.enum(["all", "industries", "personas", "problems"]).optional(),
});

/**
 * Automated gap analysis endpoint
 * 
 * POST /api/keyword/gap-scan
 * 
 * Triggered for automated gap scanning (e.g., weekly cron)
 */
router.post("/gap-scan", async (req: Request, res: Response) => {
  try {
    const data = gapScanSchema.parse(req.body);

    await inngest.send({
      name: "keyword/gap-analysis.start",
      data: { scope: data.scope || "all" },
    });

    res.json({
      success: true,
      message: "Gap analysis started",
    });
  } catch (error) {
    console.error("Gap scan webhook error:", error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: "Invalid request data",
        details: error.errors,
      });
    }

    res.status(400).json({ error: String(error) });
  }
});

/**
 * Zod schema for auto-clustering
 */
const clusterSchema = z.object({
  recordId: z.string(),
  seedTopic: z.string(),
});

/**
 * Auto-cluster endpoint
 * 
 * POST /api/keyword/cluster
 * 
 * Triggered when a Content Ideas record's status is set to "Auto-Cluster"
 */
router.post("/cluster", async (req: Request, res: Response) => {
  try {
    const data = clusterSchema.parse(req.body);

    await inngest.send({
      name: "keyword/cluster.auto",
      data,
    });

    res.json({
      success: true,
      message: "Auto-clustering started",
    });
  } catch (error) {
    console.error("Auto-cluster webhook error:", error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: "Invalid request data",
        details: error.errors,
      });
    }

    res.status(400).json({ error: String(error) });
  }
});

/**
 * Zod schema for title generation
 */
const generateTitleSchema = z.object({
  recordId: z.string(),
});

/**
 * Generate title endpoint
 * 
 * POST /api/keyword/generate-title
 * 
 * Triggered when a Content Ideas record's status is set to "Generate Title"
 */
router.post("/generate-title", async (req: Request, res: Response) => {
  try {
    const data = generateTitleSchema.parse(req.body);

    await inngest.send({
      name: "keyword/generate-title",
      data,
    });

    res.json({
      success: true,
      message: "Title generation started",
    });
  } catch (error) {
    console.error("Generate title webhook error:", error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: "Invalid request data",
        details: error.errors,
      });
    }

    res.status(400).json({ error: String(error) });
  }
});

/**
 * Zod schema for promotion
 */
const promoteSchema = z.object({
  recordId: z.string(),
});

/**
 * Promote to pipeline endpoint
 * 
 * POST /api/keyword/promote
 * 
 * Triggered when a Content Ideas record's status is set to "Approved"
 */
router.post("/promote", async (req: Request, res: Response) => {
  try {
    const data = promoteSchema.parse(req.body);

    await inngest.send({
      name: "keyword/promote",
      data: {
        recordId: data.recordId,
      },
    });

    res.json({
      success: true,
      message: "Promoting to Content Pipeline",
    });
  } catch (error) {
    console.error("Promote webhook error:", error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: "Invalid request data",
        details: error.errors,
      });
    }

    res.status(400).json({ error: String(error) });
  }
});

export default router;


