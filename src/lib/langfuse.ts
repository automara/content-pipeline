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

// Lazy initialization of Langfuse client to ensure environment variables are loaded
let langfuseInstance: Langfuse | null = null;

/**
 * Get or create the Langfuse client instance
 * This ensures the client is initialized with valid values
 */
function getLangfuseClient(): Langfuse {
  if (langfuseInstance) {
    return langfuseInstance;
  }

  const publicKey = process.env.LANGFUSE_PUBLIC_KEY;
  const secretKey = process.env.LANGFUSE_SECRET_KEY;
  const host = process.env.LANGFUSE_HOST || "https://cloud.langfuse.com";

  if (!publicKey || !secretKey) {
    throw new Error(
      "Langfuse credentials are missing. Please set LANGFUSE_PUBLIC_KEY and LANGFUSE_SECRET_KEY environment variables."
    );
  }

  // Ensure baseUrl is always a valid string (never undefined or empty)
  const baseUrl = host.trim() || "https://cloud.langfuse.com";

  langfuseInstance = new Langfuse({
    publicKey,
    secretKey,
    baseUrl,
  });

  return langfuseInstance;
}

// Export a getter that ensures the client is properly initialized
export const langfuse = new Proxy({} as Langfuse, {
  get(_target, prop) {
    const client = getLangfuseClient();
    const value = (client as any)[prop];
    // If it's a function, bind it to the client instance
    if (typeof value === "function") {
      return value.bind(client);
    }
    return value;
  },
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
  // Check if credentials are set before attempting connection
  const publicKey = process.env.LANGFUSE_PUBLIC_KEY;
  const secretKey = process.env.LANGFUSE_SECRET_KEY;
  
  if (!publicKey || !secretKey) {
    throw new Error(
      `Langfuse credentials are missing. Please set LANGFUSE_PUBLIC_KEY and LANGFUSE_SECRET_KEY environment variables. ` +
      `Visit /api/diagnostics/langfuse to test your connection.`
    );
  }

  try {
    // Get the Langfuse client (ensures it's properly initialized)
    const client = getLangfuseClient();
    
    // Get prompt from Langfuse with 5 minute cache
    // TypeScript Note: The SDK returns a prompt object with a compile() method
    const prompt = await client.getPrompt(name, undefined, {
      cacheTtlSeconds: 300, // Cache for 5 minutes
    });

    // Compile replaces {{variables}} with actual values
    return prompt.compile(variables);
  } catch (error: any) {
    const errorMsg = error.message || String(error);

    // Check for authentication/credential errors
    if (
      errorMsg.includes("Invalid credentials") ||
      errorMsg.includes("Confirm that you've configured the correct host") ||
      errorMsg.includes("Unauthorized") ||
      errorMsg.includes("401")
    ) {
      throw new Error(
        `Langfuse authentication failed for prompt "${name}". ` +
        `Check that your LANGFUSE_PUBLIC_KEY and LANGFUSE_SECRET_KEY are correct. ` +
        `Also verify LANGFUSE_HOST is set correctly (default: https://cloud.langfuse.com). ` +
        `Visit /api/diagnostics/langfuse to test your connection. ` +
        `Original error: ${errorMsg}`
      );
    }

    // Check for host/connection errors
    if (
      errorMsg.includes("host") ||
      errorMsg.includes("ECONNREFUSED") ||
      errorMsg.includes("ENOTFOUND") ||
      errorMsg.includes("Invalid URL")
    ) {
      throw new Error(
        `Cannot connect to Langfuse host for prompt "${name}". ` +
        `Check that LANGFUSE_HOST is correct (default: https://cloud.langfuse.com). ` +
        `Visit /api/diagnostics/langfuse to test your connection. ` +
        `Original error: ${errorMsg}`
      );
    }

    // Check for prompt not found errors
    if (
      errorMsg.includes("not found") ||
      errorMsg.includes("404") ||
      errorMsg.includes("Could not find")
    ) {
      throw new Error(
        `Prompt "${name}" not found in Langfuse. ` +
        `Make sure the prompt exists in your Langfuse project. ` +
        `Visit /api/diagnostics/langfuse?promptName=${encodeURIComponent(name)} to test. ` +
        `Original error: ${errorMsg}`
      );
    }

    // Generic error - include helpful hint
    throw new Error(
      `Failed to get prompt "${name}" from Langfuse: ${errorMsg}. ` +
      `Visit /api/diagnostics/langfuse to troubleshoot your Langfuse configuration.`
    );
  }
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
  const client = getLangfuseClient();
  return client.trace({
    name: options.name,
    metadata: {
      recordId: options.recordId,
      ...options.metadata, // Spread operator includes any extra metadata
    },
  });
}

