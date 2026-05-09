import { task } from '@trigger.dev/sdk/v3';
import { z } from 'zod';

/**
 * health-check — invoked by /api/health on the web app to verify the queue
 * is reachable end-to-end. Returns immediately with a timestamp.
 *
 * Replaced/extended once real generation tasks land. This is the canary.
 */
export const healthCheckTask = task({
  id: 'health-check',
  maxDuration: 10,
  run: async (payload: { caller?: string }) => {
    return {
      ok: true,
      checked_at: new Date().toISOString(),
      caller: payload.caller ?? 'unknown',
    };
  },
});

export const HealthCheckPayload = z.object({
  caller: z.string().optional(),
});
export type HealthCheckPayload = z.infer<typeof HealthCheckPayload>;
