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
 * Content Ideas record from the keyword ideation Airtable base
 * 
 * TypeScript Note: This matches the structure of the Content Ideas table
 * in the separate keyword ideation base.
 */
export interface ContentIdeaRecord {
  id: string;
  fields: {
    Keyword: string;
    "Search Volume"?: number;
    "Keyword Difficulty"?: number;
    CPC?: number;
    "Search Intent"?: string;
    "SERP Features"?: string[];
    "Related Keywords"?: string; // JSON string
    "Competitor URLs"?: string; // JSON string
    Industry?: string[]; // Linked records or text IDs
    Persona?: string[]; // Linked records or text IDs
    Problem?: string[]; // Linked records or text IDs
    "Content Type Suggestion"?: string;
    "Title Ideas"?: string; // JSON string
    "Content Angles"?: string;
    "SEO Score"?: number;
    Status: string;
    Source?: string;
    "Seed Topic"?: string;
    "Promoted Record ID"?: string;
    "Research Date"?: string;
  };
}

/**
 * Research job record (optional table for tracking batch jobs)
 */
export interface ResearchJobRecord {
  id: string;
  fields: {
    "Job ID"?: string;
    "Job Type"?: string;
    "Seed Topics"?: string;
    "Ideas Generated"?: number;
    Status?: string;
    Started?: string;
    Completed?: string;
    Error?: string;
  };
}

