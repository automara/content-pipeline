/**
 * Inngest Client and Event Type Definitions
 * 
 * Inngest is a workflow engine that handles retries, timeouts, and event coordination.
 * This file sets up the Inngest client and defines all the event types we'll use.
 * 
 * TypeScript Note: We define our event structure using TypeScript types.
 * This ensures we can't accidentally send events with wrong data structure.
 */

import { Inngest, EventSchemas } from "inngest";

/**
 * Define all event types for type safety
 * 
 * TypeScript Note: This is a type definition - it doesn't create any code at runtime,
 * but TypeScript uses it to check our code. Each event has a name (the key) and
 * a data structure (the value).
 */
type Events = {
  "content/pipeline.start": {
    data: {
      recordId: string;
      title: string;
      industryId?: string; // "?" means optional
      personaId?: string;
      contentType: string;
      keywords?: string;
    };
  };
  "content/outline.approved": {
    data: {
      recordId: string;
      outline: string;
      feedback?: string;
      // Full context needed for draft generation
      title: string;
      contentType: string;
      industryId?: string;
      personaId?: string;
      keywords?: string;
    };
  };
  "content/draft.approved": {
    data: {
      recordId: string;
      draft: string;
      feedback?: string;
    };
  };
  "content/batch.trigger": {
    data: {
      recordIds: string[];
      action: "start" | "continue"; // Union type - must be one of these strings
    };
  };
  "content/outline.generate": {
    data: {
      recordId: string;
    };
  };
  "content/draft.generate": {
    data: {
      recordId: string;
    };
  };
};

/**
 * Create and export the Inngest client
 * 
 * TypeScript Note: The schemas.fromRecord<Events>() tells Inngest about
 * our event types so it can provide type checking when we send events.
 */
export const inngest = new Inngest({
  id: "automara-engine",
  schemas: new EventSchemas().fromRecord<Events>(),
});

// Re-export the Events type so other files can use it
export type { Events };

