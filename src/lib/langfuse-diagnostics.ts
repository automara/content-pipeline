/**
 * Langfuse Diagnostics Tool
 * 
 * This script helps troubleshoot Langfuse connection issues.
 * Run it to check if your configuration is correct.
 * 
 * TypeScript Note: This file exports functions that can be used
 * to test the Langfuse connection and configuration.
 */

import { Langfuse } from "langfuse";

/**
 * Check if environment variables are set
 */
export function checkEnvironmentVariables(): {
  hasPublicKey: boolean;
  hasSecretKey: boolean;
  hasHost: boolean;
  publicKeyPrefix: string | null;
  secretKeyPrefix: string | null;
  host: string | null;
} {
  const publicKey = process.env.LANGFUSE_PUBLIC_KEY;
  const secretKey = process.env.LANGFUSE_SECRET_KEY;
  const host = process.env.LANGFUSE_HOST;

  return {
    hasPublicKey: !!publicKey,
    hasSecretKey: !!secretKey,
    hasHost: !!host,
    publicKeyPrefix: publicKey ? publicKey.substring(0, 6) : null,
    secretKeyPrefix: secretKey ? secretKey.substring(0, 6) : null,
    host: host || null,
  };
}

/**
 * Validate credential formats
 */
export function validateCredentialFormats(): {
  publicKeyValid: boolean;
  secretKeyValid: boolean;
  hostValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  const publicKey = process.env.LANGFUSE_PUBLIC_KEY;
  const secretKey = process.env.LANGFUSE_SECRET_KEY;
  const host = process.env.LANGFUSE_HOST || "https://cloud.langfuse.com";

  let publicKeyValid = true;
  let secretKeyValid = true;
  let hostValid = true;

  // Check public key format (should start with pk-lf-)
  if (publicKey && !publicKey.startsWith("pk-lf-")) {
    publicKeyValid = false;
    errors.push(
      `LANGFUSE_PUBLIC_KEY should start with "pk-lf-". Got: ${publicKey.substring(0, 10)}...`
    );
  }

  // Check secret key format (should start with sk-lf-)
  if (secretKey && !secretKey.startsWith("sk-lf-")) {
    secretKeyValid = false;
    errors.push(
      `LANGFUSE_SECRET_KEY should start with "sk-lf-". Got: ${secretKey.substring(0, 10)}...`
    );
  }

  // Check host URL format
  try {
    if (host) {
      const url = new URL(host);
      if (!["http:", "https:"].includes(url.protocol)) {
        hostValid = false;
        errors.push(`LANGFUSE_HOST must use http:// or https:// protocol. Got: ${host}`);
      }
    }
  } catch {
    hostValid = false;
    errors.push(`LANGFUSE_HOST must be a valid URL. Got: ${host}`);
  }

  return {
    publicKeyValid,
    secretKeyValid,
    hostValid,
    errors,
  };
}

/**
 * Test if we can connect to Langfuse and authenticate
 */
export async function testConnection(): Promise<{
  success: boolean;
  error?: string;
  message?: string;
}> {
  try {
    const publicKey = process.env.LANGFUSE_PUBLIC_KEY;
    const secretKey = process.env.LANGFUSE_SECRET_KEY;
    const host = process.env.LANGFUSE_HOST;

    if (!publicKey || !secretKey) {
      return {
        success: false,
        error: "Missing credentials. LANGFUSE_PUBLIC_KEY and LANGFUSE_SECRET_KEY must be set.",
      };
    }

    // Create a test Langfuse client
    const testClient = new Langfuse({
      publicKey,
      secretKey,
      baseUrl: host,
    });

    // Try to list prompts - this is a simple operation that requires authentication
    // We'll catch the error to see what happened
    try {
      // Note: Langfuse SDK doesn't have a direct "list prompts" method,
      // so we'll try to get a non-existent prompt to test authentication
      // If auth works but prompt doesn't exist, we get a different error than auth failure
      await testClient.getPrompt("__diagnostic_test__", undefined, {
        cacheTtlSeconds: 0,
      });

      // If we get here, the prompt exists (unlikely), but auth worked
      return {
        success: true,
        message: "Connection successful - authentication works",
      };
    } catch (promptError: any) {
      const errorMsg = promptError.message || String(promptError);

      // Check for authentication errors
      if (
        errorMsg.includes("Invalid credentials") ||
        errorMsg.includes("Unauthorized") ||
        errorMsg.includes("401") ||
        errorMsg.includes("Authentication")
      ) {
        return {
          success: false,
          error: `Authentication failed: ${errorMsg}. Check that your LANGFUSE_PUBLIC_KEY and LANGFUSE_SECRET_KEY are correct.`,
        };
      }

      // Check for host/connection errors
      if (
        errorMsg.includes("host") ||
        errorMsg.includes("ECONNREFUSED") ||
        errorMsg.includes("ENOTFOUND") ||
        errorMsg.includes("Invalid URL")
      ) {
        return {
          success: false,
          error: `Connection error: ${errorMsg}. Check that LANGFUSE_HOST is correct. Default is https://cloud.langfuse.com`,
        };
      }

      // If prompt doesn't exist, that's actually fine - it means auth worked!
      // The error would be about the prompt not being found, not about auth
      if (errorMsg.includes("not found") || errorMsg.includes("404")) {
        return {
          success: true,
          message:
            "Authentication successful (prompt not found, but that's expected for a test prompt)",
        };
      }

      // Some other error - still might be auth related
      if (errorMsg.includes("Invalid credentials") || errorMsg.includes("Confirm that")) {
        return {
          success: false,
          error: `Authentication failed: ${errorMsg}. Verify your credentials and host URL.`,
        };
      }

      // Unknown error - report it
      return {
        success: false,
        error: `Unexpected error: ${errorMsg}. This might indicate an authentication or connection issue.`,
      };
    }
  } catch (error: any) {
    const errorMsg = error.message || String(error);

    // Check for specific connection errors
    if (errorMsg.includes("Invalid credentials") || errorMsg.includes("Confirm that")) {
      return {
        success: false,
        error: `Invalid credentials. Check that: 1) LANGFUSE_PUBLIC_KEY starts with "pk-lf-", 2) LANGFUSE_SECRET_KEY starts with "sk-lf-", 3) LANGFUSE_HOST is correct (default: https://cloud.langfuse.com)`,
      };
    }

    return {
      success: false,
      error: errorMsg,
    };
  }
}

/**
 * Test if we can fetch a specific prompt
 */
export async function testPromptAccess(promptName: string): Promise<{
  success: boolean;
  error?: string;
  promptName?: string;
  hasVariables?: boolean;
}> {
  try {
    const publicKey = process.env.LANGFUSE_PUBLIC_KEY;
    const secretKey = process.env.LANGFUSE_SECRET_KEY;
    const host = process.env.LANGFUSE_HOST;

    if (!publicKey || !secretKey) {
      return {
        success: false,
        error: "Missing credentials. LANGFUSE_PUBLIC_KEY and LANGFUSE_SECRET_KEY must be set.",
      };
    }

    const testClient = new Langfuse({
      publicKey,
      secretKey,
      baseUrl: host,
    });

    const prompt = await testClient.getPrompt(promptName, undefined, {
      cacheTtlSeconds: 0,
    });

    // Check if prompt has variables (by looking at the compiled version)
    const testVars: Record<string, string> = {};
    let compiledPrompt: string;
    try {
      compiledPrompt = prompt.compile(testVars);
      const hasVariables = compiledPrompt.includes("{{") || Object.keys(prompt.variables || {}).length > 0;

      return {
        success: true,
        promptName,
        hasVariables,
      };
    } catch {
      return {
        success: true,
        promptName,
        hasVariables: false,
      };
    }
  } catch (error: any) {
    const errorMsg = error.message || String(error);

    if (
      errorMsg.includes("not found") ||
      errorMsg.includes("404") ||
      errorMsg.includes("Could not find")
    ) {
      return {
        success: false,
        error: `Prompt "${promptName}" not found in Langfuse. Make sure the prompt exists in your Langfuse project.`,
      };
    }

    if (errorMsg.includes("Invalid credentials") || errorMsg.includes("Confirm that")) {
      return {
        success: false,
        error: `Authentication failed: ${errorMsg}. Check your credentials.`,
      };
    }

    return {
      success: false,
      error: errorMsg,
    };
  }
}

/**
 * Run full diagnostics
 */
export async function runFullDiagnostics(promptName?: string): Promise<{
  env: ReturnType<typeof checkEnvironmentVariables>;
  formatValidation: ReturnType<typeof validateCredentialFormats>;
  connection: Awaited<ReturnType<typeof testConnection>>;
  promptAccess?: Awaited<ReturnType<typeof testPromptAccess>>;
}> {
  const env = checkEnvironmentVariables();
  const formatValidation = validateCredentialFormats();
  const connection = await testConnection();

  let promptAccess;
  if (promptName) {
    promptAccess = await testPromptAccess(promptName);
  }

  return {
    env,
    formatValidation,
    connection,
    promptAccess,
  };
}

