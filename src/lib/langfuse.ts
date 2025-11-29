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
 * Get Langfuse base URL from environment variables
 * Supports both LANGFUSE_HOST and LANGFUSE_BASE_URL for compatibility
 */
function getLangfuseBaseUrl(): string {
  // Check both environment variable names for compatibility
  const host = process.env.LANGFUSE_HOST || process.env.LANGFUSE_BASE_URL;
  const baseUrl = host?.trim() || "https://cloud.langfuse.com";
  return baseUrl;
}

/**
 * Mask sensitive values for logging (shows first 6 chars and last 4 chars)
 */
function maskValue(value: string | undefined, minLength: number = 10): string {
  if (!value) return "(not set)";
  if (value.length < minLength) return "***";
  return `${value.substring(0, 6)}...${value.substring(value.length - 4)}`;
}

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
  const baseUrl = getLangfuseBaseUrl();

  // Log configuration (masked for security)
  const hasHostEnv = !!process.env.LANGFUSE_HOST;
  const hasBaseUrlEnv = !!process.env.LANGFUSE_BASE_URL;
  const envVarName = hasHostEnv ? "LANGFUSE_HOST" : hasBaseUrlEnv ? "LANGFUSE_BASE_URL" : "(using default)";
  
  console.log("[Langfuse] Initializing client with configuration:");
  console.log(`[Langfuse]   Public Key: ${maskValue(publicKey)}`);
  console.log(`[Langfuse]   Secret Key: ${maskValue(secretKey)}`);
  console.log(`[Langfuse]   Base URL: ${baseUrl} (from ${envVarName})`);

  if (!publicKey || !secretKey) {
    const missing = [];
    if (!publicKey) missing.push("LANGFUSE_PUBLIC_KEY");
    if (!secretKey) missing.push("LANGFUSE_SECRET_KEY");
    
    throw new Error(
      `Langfuse credentials are missing. Please set the following environment variables: ${missing.join(", ")}. ` +
      `Visit /api/diagnostics/langfuse to test your connection.`
    );
  }

  // Validate key formats
  const errors: string[] = [];
  if (!publicKey.startsWith("pk-lf-")) {
    errors.push(`LANGFUSE_PUBLIC_KEY should start with "pk-lf-". Got: ${maskValue(publicKey)}`);
  }
  if (!secretKey.startsWith("sk-lf-")) {
    errors.push(`LANGFUSE_SECRET_KEY should start with "sk-lf-". Got: ${maskValue(secretKey)}`);
  }
  
  if (errors.length > 0) {
    throw new Error(
      `Langfuse credential format errors: ${errors.join("; ")}. ` +
      `Visit /api/diagnostics/langfuse to test your connection.`
    );
  }

  try {
    langfuseInstance = new Langfuse({
      publicKey,
      secretKey,
      baseUrl,
    });
    
    console.log("[Langfuse] Client initialized successfully");
    return langfuseInstance;
  } catch (error: any) {
    console.error("[Langfuse] Failed to initialize client:", error.message);
    throw new Error(
      `Failed to initialize Langfuse client: ${error.message}. ` +
      `Check your credentials and base URL. Visit /api/diagnostics/langfuse to test your connection.`
    );
  }
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
    const baseUrl = getLangfuseBaseUrl();
    
    console.log(`[Langfuse] Fetching prompt "${name}" from ${baseUrl}`);
    
    // Get prompt from Langfuse with 5 minute cache
    // TypeScript Note: The SDK returns a prompt object with a compile() method
    const prompt = await client.getPrompt(name, undefined, {
      cacheTtlSeconds: 300, // Cache for 5 minutes
    });

    console.log(`[Langfuse] Successfully fetched prompt "${name}"`);
    
    // Compile replaces {{variables}} with actual values
    return prompt.compile(variables);
  } catch (error: any) {
    const errorMsg = error.message || String(error);
    const publicKey = process.env.LANGFUSE_PUBLIC_KEY;
    const secretKey = process.env.LANGFUSE_SECRET_KEY;
    const baseUrl = getLangfuseBaseUrl();
    const hasHostEnv = !!process.env.LANGFUSE_HOST;
    const hasBaseUrlEnv = !!process.env.LANGFUSE_BASE_URL;

    console.error(`[Langfuse] Error fetching prompt "${name}":`, errorMsg);
    console.error(`[Langfuse] Configuration: baseUrl=${baseUrl}, hasPublicKey=${!!publicKey}, hasSecretKey=${!!secretKey}`);

    // Check for authentication/credential errors
    if (
      errorMsg.includes("Invalid credentials") ||
      errorMsg.includes("Confirm that you've configured the correct host") ||
      errorMsg.includes("Unauthorized") ||
      errorMsg.includes("401")
    ) {
      const envVarInfo = hasHostEnv 
        ? "LANGFUSE_HOST" 
        : hasBaseUrlEnv 
        ? "LANGFUSE_BASE_URL" 
        : "neither (using default)";
      
      throw new Error(
        `Langfuse authentication failed for prompt "${name}". ` +
        `Configuration: baseUrl=${baseUrl} (from ${envVarInfo}), ` +
        `publicKey=${maskValue(publicKey)}, secretKey=${maskValue(secretKey)}. ` +
        `Check that your LANGFUSE_PUBLIC_KEY and LANGFUSE_SECRET_KEY are correct and match your Langfuse project. ` +
        `Also verify ${hasHostEnv ? "LANGFUSE_HOST" : "LANGFUSE_BASE_URL"} is set correctly (default: https://cloud.langfuse.com). ` +
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
        `Current baseUrl: ${baseUrl}. ` +
        `Check that ${hasHostEnv ? "LANGFUSE_HOST" : hasBaseUrlEnv ? "LANGFUSE_BASE_URL" : "LANGFUSE_HOST or LANGFUSE_BASE_URL"} is correct (default: https://cloud.langfuse.com). ` +
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

