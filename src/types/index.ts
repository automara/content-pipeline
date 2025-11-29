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

