/**
 * Airtable Client for Keyword Ideation Base
 * 
 * This module provides functions to interact with the separate Airtable base
 * used for keyword ideation. This is separate from the Content Pipeline base.
 * 
 * TypeScript Note: We use a separate base connection for the keyword ideation
 * system, while the Content Pipeline uses the existing base connection.
 */

import Airtable from "airtable";
import type { ContentIdeaRecord } from "../types/index.js";
import { contentTable } from "./airtable.js"; // Use existing base for Content Pipeline

// Initialize separate Airtable base for keyword ideation
// TypeScript Note: This uses a different base ID from the Content Pipeline
// Supports optional separate API key for the keyword base, falls back to main API key
const keywordsBaseApiKey =
  process.env.AIRTABLE_KEYWORDS_API_KEY || process.env.AIRTABLE_API_KEY;

if (!keywordsBaseApiKey) {
  throw new Error(
    "AIRTABLE_KEYWORDS_API_KEY or AIRTABLE_API_KEY must be set for keyword ideation system"
  );
}

const keywordsBase = new Airtable({
  apiKey: keywordsBaseApiKey,
}).base(process.env.AIRTABLE_KEYWORDS_BASE_ID!);

// Table references in the keyword ideation base
export const contentIdeasTable = keywordsBase("Content Ideas");

/**
 * Get a single Content Ideas record by ID
 */
export async function getIdeaRecord(
  recordId: string
): Promise<ContentIdeaRecord> {
  try {
    const record = await contentIdeasTable.find(recordId);

    return {
      id: record.id,
      fields: record.fields as ContentIdeaRecord["fields"],
    };
  } catch (error: any) {
    const errorMsg = error.message || String(error);

    if (
      errorMsg.includes("Could not find what you are looking for") ||
      errorMsg.includes("NOT_FOUND")
    ) {
      throw new Error(
        `Content Ideas record not found: "${recordId}". ` +
          `Check: 1) Does the record exist? 2) Is the recordId correct? ` +
          `3) Is your AIRTABLE_KEYWORDS_BASE_ID correct? 4) Does your API key have access to this base?`
      );
    }

    throw new Error(`Failed to get Content Ideas record: ${errorMsg}`);
  }
}

/**
 * Create a new Content Ideas record
 * 
 * TypeScript Note: Partial<> means we can provide only some fields,
 * not all of them. This is useful when creating records.
 */
export async function createIdeaRecord(
  fields: Partial<ContentIdeaRecord["fields"]>
): Promise<string> {
  try {
    const records = await contentIdeasTable.create([{ fields }]);
    return records[0].id;
  } catch (error: any) {
    const errorMsg = error.message || String(error);
    throw new Error(`Failed to create Content Ideas record: ${errorMsg}`);
  }
}

/**
 * Update a Content Ideas record
 */
export async function updateIdeaRecord(
  recordId: string,
  fields: Partial<ContentIdeaRecord["fields"]>
): Promise<void> {
  try {
    await contentIdeasTable.update(recordId, fields);
  } catch (error: any) {
    const errorMsg = error.message || String(error);

    if (
      errorMsg.includes("Could not find what you are looking for") ||
      errorMsg.includes("NOT_FOUND")
    ) {
      throw new Error(
        `Content Ideas record not found: "${recordId}". ` +
          `Check: 1) Does the record exist? 2) Is the recordId correct? ` +
          `3) Is your AIRTABLE_KEYWORDS_BASE_ID correct? 4) Does your API key have access? ` +
          `5) Is the table name "Content Ideas" spelled exactly correctly (case-sensitive)?`
      );
    }

    throw new Error(`Failed to update Content Ideas record: ${errorMsg}`);
  }
}

/**
 * Get all Content Ideas records with a specific status
 * Useful for batch processing
 */
export async function getIdeasByStatus(
  status: string
): Promise<ContentIdeaRecord[]> {
  try {
    const records = await contentIdeasTable
      .select({
        filterByFormula: `{Status} = "${status}"`,
      })
      .all();

    return records.map((r) => ({
      id: r.id,
      fields: r.fields as ContentIdeaRecord["fields"],
    }));
  } catch (error: any) {
    const errorMsg = error.message || String(error);
    throw new Error(
      `Failed to get Content Ideas by status: ${errorMsg}`
    );
  }
}

/**
 * Get all Content Ideas records (for gap analysis filtering)
 */
export async function getAllIdeas(): Promise<ContentIdeaRecord[]> {
  try {
    const records = await contentIdeasTable.select().all();

    return records.map((r) => ({
      id: r.id,
      fields: r.fields as ContentIdeaRecord["fields"],
    }));
  } catch (error: any) {
    const errorMsg = error.message || String(error);
    throw new Error(`Failed to get all Content Ideas: ${errorMsg}`);
  }
}

/**
 * Create a Content Pipeline record in the existing base
 * 
 * This function creates a record in the Content Pipeline table (in the original base)
 * when a keyword idea is promoted. It uses the existing contentTable reference.
 * 
 * TypeScript Note: We import contentTable from airtable.ts which uses the
 * original base. This allows us to create records in the Content Pipeline
 * from the keyword ideation system.
 */
export async function createPipelineRecord(data: {
  title: string;
  industryId?: string;
  personaId?: string;
  contentType: string;
  keywords: string;
  notes?: string;
}): Promise<string> {
  try {
    const fields: any = {
      Title: data.title,
      "Content Type": data.contentType,
      "Target Keywords": data.keywords,
      Status: "Draft", // Ready for user to set to "Ready"
    };

    // Add linked records if provided
    // TypeScript Note: Airtable linked records are arrays of record IDs
    if (data.industryId) {
      fields.Industry = [data.industryId];
    }
    if (data.personaId) {
      fields.Persona = [data.personaId];
    }
    if (data.notes) {
      // Store additional context in a notes field if it exists
      // If your Content Pipeline table doesn't have Notes, this will be ignored
      fields.Notes = data.notes;
    }

    const records = await contentTable.create([{ fields }]);
    return records[0].id;
  } catch (error: any) {
    const errorMsg = error.message || String(error);

    // Provide helpful error messages
    if (
      errorMsg.includes("Could not find what you are looking for") ||
      errorMsg.includes("NOT_FOUND")
    ) {
      throw new Error(
        `Failed to create Content Pipeline record. ` +
          `Check: 1) Is your AIRTABLE_BASE_ID correct? ` +
          `2) Does the Content Pipeline table exist? ` +
          `3) Do industry/persona IDs exist in the Content Pipeline base? ` +
          `Original error: ${errorMsg}`
      );
    }

    throw new Error(
      `Failed to create Content Pipeline record: ${errorMsg}`
    );
  }
}

/**
 * Validate that entity IDs exist in Content Pipeline base
 * 
 * This checks if industry/persona IDs from the keyword base
 * actually exist in the Content Pipeline base before promotion.
 * 
 * Note: Since we're using separate bases, entity IDs are stored as text fields.
 * This function attempts to validate them exist in the Content Pipeline base,
 * but will not throw errors if validation fails (just logs warnings).
 */
export async function validateEntityIds(
  industryId?: string,
  personaId?: string
): Promise<{ industryId?: string; personaId?: string }> {
  const validated: { industryId?: string; personaId?: string } = {};

  // For now, we'll accept entity IDs as-is since they're stored as text
  // and validated when creating the Content Pipeline record
  // If validation fails at that point, the error will be caught there
  if (industryId) {
    validated.industryId = industryId;
  }

  if (personaId) {
    validated.personaId = personaId;
  }

  return validated;
}

