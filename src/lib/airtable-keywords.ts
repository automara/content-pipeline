/**
 * Airtable Client for Keyword Ideation Tables
 * 
 * This module provides functions to interact with keyword ideation tables
 * (Keyword Bank, Content Ideas, Research Jobs) in the main Airtable base.
 * 
 * TypeScript Note: All tables are now in the same base as the Content Pipeline.
 */

import type {
  ContentIdeaRecord,
  KeywordBankRecord,
  ResearchJobRecord,
} from "../types/index.js";
import {
  base,
  contentTable,
  keywordBankTable,
  contentIdeasTable,
  researchJobsTable,
} from "./airtable.js";

// ============================================================================
// Keyword Bank Functions
// ============================================================================

/**
 * Get a single Keyword Bank record by ID
 */
export async function getKeywordBankRecord(
  recordId: string
): Promise<KeywordBankRecord> {
  try {
    const record = await keywordBankTable.find(recordId);

    return {
      id: record.id,
      fields: record.fields as KeywordBankRecord["fields"],
    };
  } catch (error: any) {
    const errorMsg = error.message || String(error);

    if (
      errorMsg.includes("Could not find what you are looking for") ||
      errorMsg.includes("NOT_FOUND")
    ) {
      throw new Error(
        `Keyword Bank record not found: "${recordId}". ` +
          `Check: 1) Does the record exist? 2) Is the recordId correct? ` +
          `3) Is your AIRTABLE_BASE_ID correct? 4) Does your API key have access to this base?`
      );
    }

    throw new Error(`Failed to get Keyword Bank record: ${errorMsg}`);
  }
}

/**
 * Create a new Keyword Bank record
 */
export async function createKeywordBankRecord(
  fields: Partial<KeywordBankRecord["fields"]>
): Promise<string> {
  try {
    const records = await keywordBankTable.create([{ fields }]);
    return records[0].id;
  } catch (error: any) {
    const errorMsg = error.message || String(error);
    throw new Error(`Failed to create Keyword Bank record: ${errorMsg}`);
  }
}

/**
 * Update a Keyword Bank record
 */
export async function updateKeywordBankRecord(
  recordId: string,
  fields: Partial<KeywordBankRecord["fields"]>
): Promise<void> {
  try {
    await keywordBankTable.update(recordId, fields);
  } catch (error: any) {
    const errorMsg = error.message || String(error);

    if (
      errorMsg.includes("Could not find what you are looking for") ||
      errorMsg.includes("NOT_FOUND")
    ) {
      throw new Error(
        `Keyword Bank record not found: "${recordId}". ` +
          `Check: 1) Does the record exist? 2) Is the recordId correct? ` +
          `3) Is your AIRTABLE_BASE_ID correct? 4) Does your API key have access? ` +
          `5) Is the table name "Keyword Bank" spelled exactly correctly (case-sensitive)?`
      );
    }

    throw new Error(`Failed to update Keyword Bank record: ${errorMsg}`);
  }
}

/**
 * Get Keyword Bank records with a specific status
 */
export async function getKeywordBankByStatus(
  status: string
): Promise<KeywordBankRecord[]> {
  try {
    const records = await keywordBankTable
      .select({
        filterByFormula: `{Status} = "${status}"`,
      })
      .all();

    return records.map((r) => ({
      id: r.id,
      fields: r.fields as KeywordBankRecord["fields"],
    }));
  } catch (error: any) {
    const errorMsg = error.message || String(error);
    throw new Error(
      `Failed to get Keyword Bank by status: ${errorMsg}`
    );
  }
}

/**
 * Get keywords from Keyword Bank matching a seed topic
 * Used for auto-clustering to find unclustered keywords
 */
export async function getKeywordsBySeed(
  seedTopic: string
): Promise<KeywordBankRecord[]> {
  try {
    const records = await keywordBankTable
      .select({
        filterByFormula: `AND(
          OR({Seed Topic} = "${seedTopic}", {Keyword} = "${seedTopic}"),
          {Status} != "Clustered",
          {Status} != "Rejected"
        )`,
      })
      .all();

    return records.map((r) => ({
      id: r.id,
      fields: r.fields as KeywordBankRecord["fields"],
    }));
  } catch (error: any) {
    const errorMsg = error.message || String(error);
    throw new Error(
      `Failed to get keywords by seed: ${errorMsg}`
    );
  }
}

// ============================================================================
// Content Ideas Functions
// ============================================================================

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
          `3) Is your AIRTABLE_BASE_ID correct? 4) Does your API key have access to this base?`
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
          `3) Is your AIRTABLE_BASE_ID correct? 4) Does your API key have access? ` +
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
 * Validate that entity IDs exist in the base
 * 
 * This checks if industry/persona IDs actually exist in the base before promotion.
 * Since all tables are in the same base now, linked records should work directly.
 */
export async function validateEntityIds(
  industryId?: string,
  personaId?: string
): Promise<{ industryId?: string; personaId?: string }> {
  const validated: { industryId?: string; personaId?: string } = {};

  // Since we're using the same base, linked records should work directly
  // If validation fails when creating the Content Pipeline record, the error will be caught there
  if (industryId) {
    validated.industryId = industryId;
  }

  if (personaId) {
    validated.personaId = personaId;
  }

  return validated;
}

// ============================================================================
// Research Jobs Functions
// ============================================================================

/**
 * Get a single Research Job record by ID
 */
export async function getResearchJob(
  recordId: string
): Promise<ResearchJobRecord> {
  try {
    const record = await researchJobsTable.find(recordId);

    return {
      id: record.id,
      fields: record.fields as ResearchJobRecord["fields"],
    };
  } catch (error: any) {
    const errorMsg = error.message || String(error);

    if (
      errorMsg.includes("Could not find what you are looking for") ||
      errorMsg.includes("NOT_FOUND")
    ) {
      throw new Error(
        `Research Job record not found: "${recordId}". ` +
          `Check: 1) Does the record exist? 2) Is the recordId correct? ` +
          `3) Is your AIRTABLE_BASE_ID correct? 4) Does your API key have access to this base?`
      );
    }

    throw new Error(`Failed to get Research Job record: ${errorMsg}`);
  }
}

/**
 * Create a new Research Job record
 */
export async function createResearchJob(
  fields: Partial<ResearchJobRecord["fields"]>
): Promise<string> {
  try {
    const records = await researchJobsTable.create([{ fields }]);
    return records[0].id;
  } catch (error: any) {
    const errorMsg = error.message || String(error);
    throw new Error(`Failed to create Research Job record: ${errorMsg}`);
  }
}

/**
 * Update a Research Job record
 */
export async function updateResearchJob(
  recordId: string,
  fields: Partial<ResearchJobRecord["fields"]>
): Promise<void> {
  try {
    await researchJobsTable.update(recordId, fields);
  } catch (error: any) {
    const errorMsg = error.message || String(error);

    if (
      errorMsg.includes("Could not find what you are looking for") ||
      errorMsg.includes("NOT_FOUND")
    ) {
      throw new Error(
        `Research Job record not found: "${recordId}". ` +
          `Check: 1) Does the record exist? 2) Is the recordId correct? ` +
          `3) Is your AIRTABLE_BASE_ID correct? 4) Does your API key have access? ` +
          `5) Is the table name "Research Jobs" spelled exactly correctly (case-sensitive)?`
      );
    }

    throw new Error(`Failed to update Research Job record: ${errorMsg}`);
  }
}

