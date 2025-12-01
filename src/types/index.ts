/**
 * TypeScript Type Definitions
 * 
 * This file contains shared type definitions used throughout the application.
 * Types help TypeScript understand what data structures we're working with,
 * which provides better autocomplete and catches errors before runtime.
 */

// Export types for Airtable records
export interface ContentRecord {
  id: string;
  fields: {
    Title: string;
    Industry?: string[];
    Persona?: string[];
    "Content Type": string;
    "Target Keywords"?: string;
    Status: string;
    Outline?: string;
    "Outline Feedback"?: string;
    Draft?: string;
    "Draft Feedback"?: string;
    "Final Content"?: string;
    "Published URL"?: string;
    "Inngest Run ID"?: string;
  };
}

export interface Industry {
  name: string;
  description: string;
  painPoints: string;
  terminology: string;
}

export interface Persona {
  name: string;
  title: string;
  goals: string;
  painPoints: string;
  objections: string;
}

// Re-export KeywordData from DataForSEO client
export type { KeywordData } from "../lib/dataforseo.js";

/**
 * Keyword Bank record from the keyword ideation Airtable base
 * 
 * TypeScript Note: This matches the structure of the Keyword Bank table
 * which stores raw keyword data before clustering.
 */
export interface KeywordBankRecord {
  id: string;
  fields: {
    Keyword: string;
    "Search Volume"?: number;
    "Keyword Difficulty"?: number;
    CPC?: number;
    "Search Intent"?: string;
    "SERP Features"?: string[]; // Multiple select field
    Trend?: string; // Single select: "Rising", "Stable", "Declining"
    "Competitor URLs"?: string; // JSON string
    Cluster?: string[]; // Link to Content Ideas (which cluster this belongs to)
    Status: string;
    "Seed Topic"?: string;
    Source?: string; // Single select: "Manual", "Gap Scan", "Competitor Analysis"
    "Research Date"?: string; // Date field
  };
}

/**
 * Content Ideas record from the keyword ideation Airtable base
 * 
 * TypeScript Note: This matches the structure of the Content Ideas table
 * which stores clustered keywords ready for content creation.
 */
export interface ContentIdeaRecord {
  id: string;
  fields: {
    "Cluster Name": string; // Descriptive name for the cluster
    "Seed Topic"?: string; // For auto-clustering: which seed to pull from
    Keywords?: string[]; // Link to Keyword Bank (all keywords in this cluster)
    "Primary Keyword"?: string; // Main keyword (highest volume/relevance)
    "Total Volume"?: number; // Rollup: Sum of linked keywords' volume
    "Avg Difficulty"?: number; // Rollup: Average KD of linked keywords
    "Search Intent"?: string; // Single select: Dominant intent
    "Content Type"?: string; // Single select: blog, industry_page, persona_page, comparison, how-to
    Industry?: string[]; // Link to Industries (entity graph)
    Persona?: string[]; // Link to Personas (entity graph)
    Problem?: string[]; // Link to Problems (entity graph)
    Title?: string; // Generated title
    "Content Angles"?: string; // Generated angles (JSON string)
    "Competitor Analysis"?: string; // What competitors are doing
    "SEO Score"?: number; // Formula: Total Volume / (Avg Difficulty + 1)
    Status: string;
    "Promoted Record ID"?: string; // Link to Content Pipeline
  };
}

/**
 * Research Job record for tracking keyword research runs
 * 
 * TypeScript Note: This matches the Research Jobs table structure used to
 * track research operations, including manual research, gap scans, and batch imports.
 */
export interface ResearchJobRecord {
  id: string;
  fields: {
    "Job ID"?: string; // Inngest run ID or gap-scan timestamp
    "Seed Keywords"?: string; // Comma-separated keywords that triggered this job
    "Keywords Created"?: number; // Count of keywords added to Keyword Bank
    Status?: string; // Single select: Running, Complete, Failed
    Started?: string; // Date time when job started
    Completed?: string; // Date time when job finished (optional)
    Error?: string; // Error message if failed (optional)
    Source?: string; // Single select: Manual, Gap Scan, Bulk Import
  };
}

