/**
 * Batch Trigger Function
 * 
 * This function handles batch processing - starting multiple content pipelines at once.
 * It's useful when you want to process many records together.
 * 
 * TypeScript Note: This function processes multiple records in a batch,
 * which is more efficient than triggering them one by one.
 */

import { inngest } from "../client.js";
import { getRecord, batchUpdateStatus } from "../../lib/airtable.js";

/**
 * Batch processing function
 * 
 * This function is triggered by the "content/batch.trigger" event.
 * It can start multiple content pipelines at once.
 */
export const batchTrigger = inngest.createFunction(
  {
    id: "batch-trigger",
    retries: 2,
  },
  { event: "content/batch.trigger" },
  async ({ event, step }) => {
    const { recordIds, action } = event.data;

    if (action === "start") {
      // Batch start: prepare events for each record
      const events = await step.run("prepare-batch-events", async () => {
        const eventList = [];

        // Loop through each record ID and prepare an event
        for (const recordId of recordIds) {
          const record = await getRecord(recordId);
          eventList.push({
            name: "content/pipeline.start" as const,
            data: {
              recordId,
              title: record.fields.Title,
              industryId: record.fields.Industry?.[0],
              personaId: record.fields.Persona?.[0],
              contentType: record.fields["Content Type"],
              keywords: record.fields["Target Keywords"],
            },
          });
        }

        return eventList;
      });

      // Send all events (Inngest will fan out and process them in parallel)
      await step.run("send-batch-events", async () => {
        await inngest.send(events);
      });

      // Update statuses to "Generating"
      await step.run("update-statuses", async () => {
        await batchUpdateStatus(recordIds, "Generating");
      });

      return {
        status: "batch-started",
        count: recordIds.length,
      };
    }

    return { status: "unknown-action" };
  }
);

