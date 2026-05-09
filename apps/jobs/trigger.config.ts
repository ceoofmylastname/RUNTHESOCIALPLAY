import { defineConfig } from '@trigger.dev/sdk/v3';

/**
 * Trigger.dev v3 config.
 *
 * Workers run with the Supabase service-role key (bypasses RLS).
 * Web app routes only enqueue tasks via the SDK; they don't invoke
 * worker logic directly.
 */
export default defineConfig({
  project: process.env.TRIGGER_PROJECT_REF ?? 'proj_replace_me',
  runtime: 'node',
  logLevel: 'info',
  maxDuration: 600,                            // 10 min cap; video gen is the long pole
  retries: {
    enabledInDev: true,
    default: {
      maxAttempts: 2,
      factor: 2,
      minTimeoutInMs: 1_000,
      maxTimeoutInMs: 30_000,
      randomize: true,
    },
  },
  dirs: ['./src/trigger'],
});
