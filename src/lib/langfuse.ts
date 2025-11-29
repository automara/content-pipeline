/**
 * Langfuse Client and Prompt Utilities
 * 
 * Langfuse is used for prompt management and observability. This module:
 * - Loads prompts from Langfuse (with caching)
 * - Creates traces to track LLM calls
 * - Compiles prompts with variables replaced
 * 
 * TypeScript Note: Langfuse SDK provides its own types, so we mostly
 * let TypeScript infer the types from the SDK methods.
 */

import { Langfuse } from "langfuse";

// Initialize Langfuse client with credentials from environment variables
export const langfuse = new Langfuse({
  publicKey: process.env.LANGFUSE_PUBLIC_KEY!,
  secretKey: process.env.LANGFUSE_SECRET_KEY!,
  baseUrl: process.env.LANGFUSE_HOST,
});

/**
 * Get a prompt from Langfuse and compile it with variables
 * 
 * TypeScript Note: Record<string, string> means an object with string keys
 * and string values - perfect for prompt variables like {title} = "My Title"
 * 
 * @param name - The name of the prompt in Langfuse (e.g., "outline-blog")
 * @param variables - Object with variable names and values to inject into prompt
 */
export async function getPrompt(
  name: string,
  variables: Record<string, string>
): Promise<string> {
  // Get prompt from Langfuse with 5 minute cache
  // TypeScript Note: The SDK returns a prompt object with a compile() method
  const prompt = await langfuse.getPrompt(name, undefined, {
    cacheTtlSeconds: 300, // Cache for 5 minutes
  });

  // Compile replaces {{variables}} with actual values
  return prompt.compile(variables);
}

/**
 * Create a trace for tracking a content generation step
 * 
 * Traces help you see all the steps in Langfuse dashboard - like a log
 * of what happened during content generation
 * 
 * TypeScript Note: The options parameter uses a type called an "object literal"
 * with specific properties. This gives us type safety when calling the function.
 */
export function createTrace(options: {
  name: string;
  recordId: string;
  metadata?: Record<string, unknown>; // unknown means "any type, but we need to check it"
}): ReturnType<Langfuse["trace"]> {
  return langfuse.trace({
    name: options.name,
    metadata: {
      recordId: options.recordId,
      ...options.metadata, // Spread operator includes any extra metadata
    },
  });
}

