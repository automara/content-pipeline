/**
 * Airtable Client and Helper Functions
 * 
 * This module provides functions to interact with Airtable - reading records,
 * updating records, and fetching related data like industries and personas.
 * 
 * TypeScript Note: We're using the Airtable SDK which provides type-safe
 * access to our base and tables.
 */

import Airtable from "airtable";
import type { ContentRecord, Industry, Persona } from "../types/index.js";

// Initialize Airtable client with API key from environment variables
// TypeScript Note: process.env values are strings or undefined, so we use
// the "!" operator to tell TypeScript we're sure this value exists
const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(
  process.env.AIRTABLE_BASE_ID!
);

// Table references - these point to specific tables in our Airtable base
export const contentTable = base("Content Pipeline");
export const industriesTable = base("Industries");
export const personasTable = base("Personas");
export const artifactsTable = base("Context Artifacts");

/**
 * Get a single content record by its ID
 * 
 * TypeScript Note: Promise<ContentRecord> means this function returns a Promise
 * (an async operation) that will eventually resolve to a ContentRecord
 */
export async function getRecord(recordId: string): Promise<ContentRecord> {
  try {
    const record = await contentTable.find(recordId);
    
    return {
      id: record.id,
      // TypeScript Note: "as" is a type assertion - we're telling TypeScript
      // to treat record.fields as ContentRecord["fields"] type
      fields: record.fields as ContentRecord["fields"],
    };
  } catch (error: any) {
    const errorMsg = error.message || String(error);
    
    // Provide helpful error messages
    if (errorMsg.includes("Could not find what you are looking for") || 
        errorMsg.includes("NOT_FOUND")) {
      throw new Error(
        `Airtable record not found: "${recordId}". ` +
        `Check: 1) Does the record exist? 2) Is the recordId correct? ` +
        `3) Is your AIRTABLE_BASE_ID correct? 4) Does your API key have access to this base?`
      );
    }
    
    // Re-throw with more context
    throw new Error(`Failed to get Airtable record: ${errorMsg}`);
  }
}

/**
 * Update a content record with new field values
 * 
 * TypeScript Note: Partial<ContentRecord["fields"]> means we can provide
 * only some of the fields, not all of them. Partial makes all properties optional.
 */
export async function updateRecord(
  recordId: string,
  fields: Partial<ContentRecord["fields"]>
): Promise<void> {
  try {
    await contentTable.update(recordId, fields);
  } catch (error: any) {
    const errorMsg = error.message || String(error);
    
    // Provide helpful error messages
    if (errorMsg.includes("Could not find what you are looking for") || 
        errorMsg.includes("NOT_FOUND")) {
      throw new Error(
        `Airtable record not found: "${recordId}". ` +
        `Check: 1) Does the record exist? 2) Is the recordId correct? ` +
        `3) Is your AIRTABLE_BASE_ID correct? 4) Does your API key have access? ` +
        `5) Is the table name "Content Pipeline" spelled exactly correctly (case-sensitive)?`
      );
    }
    
    // Re-throw with more context
    throw new Error(`Failed to update Airtable record: ${errorMsg}`);
  }
}

/**
 * Get industry details by ID
 */
export async function getIndustry(industryId: string): Promise<Industry> {
  try {
    const record = await industriesTable.find(industryId);
    
    return {
      name: record.get("Name") as string,
      description: record.get("Description") as string,
      painPoints: record.get("Pain Points") as string,
      terminology: record.get("Terminology") as string,
    };
  } catch (error: any) {
    const errorMsg = error.message || String(error);
    
    if (errorMsg.includes("Could not find what you are looking for") || 
        errorMsg.includes("NOT_FOUND")) {
      throw new Error(
        `Industry record not found: "${industryId}". ` +
        `Check: 1) Does the industry record exist? 2) Is the table name "Industries" correct?`
      );
    }
    
    throw new Error(`Failed to get industry: ${errorMsg}`);
  }
}

/**
 * Get persona details by ID
 */
export async function getPersona(personaId: string): Promise<Persona> {
  try {
    const record = await personasTable.find(personaId);
    
    return {
      name: record.get("Name") as string,
      title: record.get("Title") as string,
      goals: record.get("Goals") as string,
      painPoints: record.get("Pain Points") as string,
      objections: record.get("Objections") as string,
    };
  } catch (error: any) {
    const errorMsg = error.message || String(error);
    
    if (errorMsg.includes("Could not find what you are looking for") || 
        errorMsg.includes("NOT_FOUND")) {
      throw new Error(
        `Persona record not found: "${personaId}". ` +
        `Check: 1) Does the persona record exist? 2) Is the table name "Personas" correct?`
      );
    }
    
    throw new Error(`Failed to get persona: ${errorMsg}`);
  }
}

/**
 * Get all active context artifacts from Airtable
 * 
 * Returns an object where keys are artifact types and values are their content
 */
export async function getActiveArtifacts(): Promise<Record<string, string>> {
  // Query only records where Active checkbox is checked
  const records = await artifactsTable
    .select({
      filterByFormula: "{Active} = 1",
    })
    .all();

  // Transform array of records into an object
  // TypeScript Note: reduce() takes an array and builds up a single value
  return records.reduce(
    (acc, record) => {
      const type = record.get("Type") as string;
      acc[type] = record.get("Content") as string;
      return acc;
    },
    {} as Record<string, string> // Start with empty object
  );
}

/**
 * Get all content records that have a specific status
 * Useful for batch processing
 */
export async function getRecordsByStatus(status: string): Promise<ContentRecord[]> {
  const records = await contentTable
    .select({
      filterByFormula: `{Status} = "${status}"`,
    })
    .all();

  // Map transforms each record into our ContentRecord format
  return records.map((r) => ({
    id: r.id,
    fields: r.fields as ContentRecord["fields"],
  }));
}

/**
 * Update status for multiple records at once
 * Airtable allows max 10 records per batch update, so we split into chunks
 */
export async function batchUpdateStatus(
  recordIds: string[],
  status: string
): Promise<void> {
  // Split into batches of 10 (Airtable's limit)
  const batches = [];
  for (let i = 0; i < recordIds.length; i += 10) {
    batches.push(recordIds.slice(i, i + 10));
  }

  // Process each batch
  for (const batch of batches) {
    await contentTable.update(
      batch.map((id) => ({
        id,
        fields: { Status: status },
      }))
    );
  }
}

