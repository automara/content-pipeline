/**
 * Context File Loader
 * 
 * This module loads company context information from markdown files in the /context directory.
 * Context files contain stable company information (like voice guidelines, company profile)
 * that gets injected into prompts.
 * 
 * TypeScript Note: We use Map<string, string> - Map is like an object but has better
 * performance for frequent lookups. The <string, string> means keys are strings
 * and values are strings (this is called a "generic type").
 */

import { readFileSync, existsSync, readdirSync } from "fs";
import { join } from "path";

// Directory where context files are stored
const contextDir = join(process.cwd(), "context");

// Cache stores loaded files in memory so we don't read from disk every time
// TypeScript Note: Map is a built-in JavaScript/TypeScript data structure
const contextCache: Map<string, string> = new Map();

/**
 * Load a context file by name (without .md extension)
 * Returns empty string if file doesn't exist
 * 
 * TypeScript Note: The ": string" after the function name means this function
 * returns a string. This helps catch errors if we try to return the wrong type.
 */
export function getContext(name: string): string {
  // Check cache first - if we've already loaded this file, return cached version
  if (contextCache.has(name)) {
    // TypeScript Note: The "!" tells TypeScript "I know this value exists, trust me"
    // This is safe here because we just checked with .has()
    return contextCache.get(name)!;
  }

  // Build the file path by joining directory path with filename
  const filePath = join(contextDir, `${name}.md`);
  
  // Check if file exists before trying to read it
  if (!existsSync(filePath)) {
    console.warn(`Context file not found: ${filePath}`);
    return "";
  }

  // Read file from disk (UTF-8 encoding means regular text)
  const content = readFileSync(filePath, "utf-8");
  
  // Store in cache for next time
  contextCache.set(name, content);
  
  return content;
}

/**
 * Load multiple context files at once
 * 
 * TypeScript Note: Record<string, string> means an object where:
 * - Keys are strings (the file names)
 * - Values are strings (the file contents)
 */
export function getContextBundle(names: string[]): Record<string, string> {
  // Start with empty object
  const bundle: Record<string, string> = {};
  
  // Loop through each name and load the corresponding file
  for (const name of names) {
    bundle[name] = getContext(name);
  }
  
  return bundle;
}

/**
 * Clear the context cache (useful for development when files change)
 * 
 * TypeScript Note: ": void" means this function doesn't return anything
 */
export function clearContextCache(): void {
  contextCache.clear();
}

/**
 * Get all available context file names from the context directory
 * 
 * Returns an array of file names (without .md extension)
 */
export function listContextFiles(): string[] {
  try {
    // Read all files in the context directory
    const files = readdirSync(contextDir);
    
    // Filter to only .md files and remove the .md extension
    return files
      .filter((f: string) => f.endsWith(".md"))
      .map((f: string) => f.replace(".md", ""));
  } catch {
    // If directory doesn't exist or can't be read, return empty array
    return [];
  }
}

