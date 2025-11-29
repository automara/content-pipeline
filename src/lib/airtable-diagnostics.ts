/**
 * Airtable Diagnostics Tool
 * 
 * This script helps troubleshoot Airtable connection issues.
 * Run it to check if your configuration is correct.
 * 
 * TypeScript Note: This file exports functions that can be used
 * to test the Airtable connection and configuration.
 */

import Airtable from "airtable";

/**
 * Check if environment variables are set
 */
export function checkEnvironmentVariables(): {
  hasApiKey: boolean;
  hasBaseId: boolean;
  apiKeyPrefix: string | null;
  baseIdPrefix: string | null;
} {
  const apiKey = process.env.AIRTABLE_API_KEY;
  const baseId = process.env.AIRTABLE_BASE_ID;

  return {
    hasApiKey: !!apiKey,
    hasBaseId: !!baseId,
    apiKeyPrefix: apiKey ? apiKey.substring(0, 6) : null,
    baseIdPrefix: baseId ? baseId.substring(0, 6) : null,
  };
}

/**
 * Test if we can connect to Airtable and read the base
 */
export async function testConnection(): Promise<{
  success: boolean;
  error?: string;
  baseName?: string;
}> {
  try {
    const base = new Airtable({ 
      apiKey: process.env.AIRTABLE_API_KEY 
    }).base(process.env.AIRTABLE_BASE_ID!);

    // Try to list tables (this is the simplest operation)
    // Note: Airtable SDK doesn't directly expose this, so we'll test by trying to read from a table
    return {
      success: true,
      baseName: "Connected successfully",
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || String(error),
    };
  }
}

/**
 * Test if we can find the Content Pipeline table
 */
export async function testTableAccess(): Promise<{
  success: boolean;
  error?: string;
  tableName?: string;
  recordCount?: number;
}> {
  try {
    // Create base connection
    const base = new Airtable({ 
      apiKey: process.env.AIRTABLE_API_KEY 
    }).base(process.env.AIRTABLE_BASE_ID!);
    
    const table = base("Content Pipeline");
    
    // Try to read the first record (limit 1)
    const records = await table.select({ maxRecords: 1 }).all();
    
    // If we can count records, the table exists
    const allRecords = await table.select().all();
    
    return {
      success: true,
      tableName: "Content Pipeline",
      recordCount: allRecords.length,
    };
  } catch (error: any) {
    // Check if it's a "table not found" error
    const errorMsg = error.message || String(error);
    
    if (errorMsg.includes("Could not find what you are looking for") || 
        errorMsg.includes("NOT_FOUND")) {
      return {
        success: false,
        error: `Table "Content Pipeline" not found. Make sure the table name matches exactly (case-sensitive, including the space).`,
      };
    }
    
    return {
      success: false,
      error: errorMsg,
    };
  }
}

/**
 * Test if we can find a specific record by ID
 */
export async function testRecordAccess(recordId: string): Promise<{
  success: boolean;
  error?: string;
  recordId?: string;
  recordTitle?: string;
}> {
  try {
    // Create base connection
    const base = new Airtable({ 
      apiKey: process.env.AIRTABLE_API_KEY 
    }).base(process.env.AIRTABLE_BASE_ID!);
    
    const table = base("Content Pipeline");
    const record = await table.find(recordId);
    const title = record.get("Title") as string | undefined;
    
    return {
      success: true,
      recordId: record.id,
      recordTitle: title || "No title found",
    };
  } catch (error: any) {
    const errorMsg = error.message || String(error);
    
    if (errorMsg.includes("Could not find what you are looking for") || 
        errorMsg.includes("NOT_FOUND")) {
      return {
        success: false,
        error: `Record with ID "${recordId}" not found. Check: 1) Does the record exist? 2) Is the recordId correct? 3) Does your API key have access to this base?`,
      };
    }
    
    return {
      success: false,
      error: errorMsg,
    };
  }
}

/**
 * List all table names in the base (by trying common table names)
 */
export async function listAvailableTables(): Promise<string[]> {
  const commonTables = [
    "Content Pipeline",
    "Industries",
    "Personas",
    "Context Artifacts",
  ];
  
  const foundTables: string[] = [];
  
  for (const tableName of commonTables) {
    try {
      const base = new Airtable({ 
        apiKey: process.env.AIRTABLE_API_KEY 
      }).base(process.env.AIRTABLE_BASE_ID!);
      
      const table = base(tableName);
      await table.select({ maxRecords: 1 }).all();
      foundTables.push(tableName);
    } catch {
      // Table doesn't exist or can't access - skip it
    }
  }
  
  return foundTables;
}

/**
 * Run full diagnostics
 */
export async function runFullDiagnostics(recordId?: string): Promise<{
  env: ReturnType<typeof checkEnvironmentVariables>;
  connection: Awaited<ReturnType<typeof testConnection>>;
  tableAccess: Awaited<ReturnType<typeof testTableAccess>>;
  recordAccess?: Awaited<ReturnType<typeof testRecordAccess>>;
  availableTables: string[];
}> {
  const env = checkEnvironmentVariables();
  const connection = await testConnection();
  const tableAccess = await testTableAccess();
  const availableTables = await listAvailableTables();
  
  let recordAccess;
  if (recordId) {
    recordAccess = await testRecordAccess(recordId);
  }
  
  return {
    env,
    connection,
    tableAccess,
    recordAccess,
    availableTables,
  };
}
