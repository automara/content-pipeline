/**
 * Finalize Content - Standalone Function
 * 
 * This function finalizes content after draft approval. It's triggered by the
 * "content/draft.approved" event and simply updates Airtable with the final content
 * and sets status to "Complete".
 * 
 * This is a minimal function with no generation - it just copies the approved draft
 * to the "Final Content" field and marks the workflow as complete.
 */

import { inngest } from "../client.js";
import { updateRecord } from "../../lib/airtable.js";

/**
 * Finalize content function
 * 
 * Triggered by "content/draft.approved" event. Copies the approved draft to
 * "Final Content" field and sets status to "Complete".
 */
export const finalizeContent = inngest.createFunction(
  {
    id: "finalize-content",
    retries: 3,
  },
  { event: "content/draft.approved" },
  async ({ event, step }) => {
    const { recordId, draft, feedback } = event.data;

    // Finalize: save draft as final content and mark complete
    await step.run("finalize", async () => {
      await updateRecord(recordId, {
        "Final Content": draft,
        Status: "Complete",
      });
    });

    return {
      status: "complete",
      recordId,
    };
  }
);

