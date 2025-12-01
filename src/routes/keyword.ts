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
 * Zod schema for manual keyword research
 */
const researchSchema = z.object({
  seedTopics: z.array(z.string()).min(1),
  industryId: z.string().optional(),
  personaId: z.string().optional(),
  problemId: z.string().optional(),
  expandKeywords: z.boolean().optional(),
  limit: z.number().optional(),
});

/**
 * Manual keyword research endpoint
 * 
 * POST /api/keyword/research
 * 
 * Triggered when user wants to research specific seed topics
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
      message: `Researching ${data.seedTopics.length} seed topic(s)`,
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
 * Zod schema for title generation
 */
const generateTitlesSchema = z.object({
  recordId: z.string(),
});

/**
 * Generate titles endpoint
 * 
 * POST /api/keyword/generate-titles
 * 
 * Triggered when a keyword idea is approved and needs title generation
 */
router.post("/generate-titles", async (req: Request, res: Response) => {
  try {
    const data = generateTitlesSchema.parse(req.body);

    await inngest.send({
      name: "keyword/generate-titles",
      data,
    });

    res.json({
      success: true,
      message: "Title generation started",
    });
  } catch (error) {
    console.error("Generate titles webhook error:", error);

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
  selectedTitleIndex: z.number().optional(),
});

/**
 * Promote to pipeline endpoint
 * 
 * POST /api/keyword/promote
 * 
 * Triggered when a keyword idea is promoted to the Content Pipeline
 */
router.post("/promote", async (req: Request, res: Response) => {
  try {
    const data = promoteSchema.parse(req.body);

    await inngest.send({
      name: "keyword/promote",
      data: {
        recordId: data.recordId,
        selectedTitleIndex: data.selectedTitleIndex || 0,
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

