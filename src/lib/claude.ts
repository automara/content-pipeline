/**
 * Claude API Wrapper with Langfuse Tracing
 * 
 * This module wraps Anthropic's Claude API and automatically creates
 * traces in Langfuse so you can see every LLM call with inputs/outputs.
 * 
 * TypeScript Note: We define an interface for the options parameter.
 * Interfaces are like contracts - they define what properties an object must have.
 */

import Anthropic from "@anthropic-ai/sdk";
import { langfuse, createTrace } from "./langfuse.js";

// Initialize Anthropic client (uses ANTHROPIC_API_KEY from environment)
const anthropic = new Anthropic();

/**
 * Interface defines the shape of options we accept
 * TypeScript Note: The "?" means maxTokens is optional
 */
interface GenerateOptions {
  prompt: string;
  recordId: string;
  step: string;
  maxTokens?: number; // Optional - defaults to 4096 if not provided
}

/**
 * Generate text using Claude and automatically log to Langfuse
 */
export async function generate(options: GenerateOptions) {
  const { prompt, recordId, step, maxTokens = 4096 } = options;

  // Create Langfuse trace for this generation
  // This creates a "breadcrumb trail" you can follow in Langfuse dashboard
  const trace = createTrace({
    name: `generate-${step}`,
    recordId,
  });

  // Start tracking this specific generation within the trace
  const generation = trace.generation({
    name: step,
    model: "claude-sonnet-4-20250514",
    input: prompt,
  });

  try {
    // Call Claude API
    // TypeScript Note: await means "wait for this async operation to complete"
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: maxTokens,
      messages: [{ role: "user", content: prompt }],
    });

    // Extract text from response
    // TypeScript Note: We check the type because response.content is an array
    // and we need to make sure the first item is text, not an image or other type
    const text =
      response.content[0].type === "text" ? response.content[0].text : "";

    // Log successful generation to Langfuse
    generation.end({
      output: text,
      usage: {
        input: response.usage.input_tokens,
        output: response.usage.output_tokens,
      },
    });

    // Flush to ensure trace is sent immediately (don't wait for batch)
    await langfuse.flushAsync();

    return {
      text,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        totalTokens:
          response.usage.input_tokens + response.usage.output_tokens,
      },
    };
  } catch (error) {
    // Log error to Langfuse
    generation.end({
      level: "ERROR",
      statusMessage: String(error),
    });
    await langfuse.flushAsync();
    
    // Re-throw error so calling code knows something went wrong
    throw error;
  }
}

