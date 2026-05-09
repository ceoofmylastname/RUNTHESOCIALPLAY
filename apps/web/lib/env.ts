/**
 * Server-side env validation.
 *
 * Throws at module load if required vars are missing — fail fast in CI,
 * never let a deploy ship with a broken config.
 *
 * Public (NEXT_PUBLIC_*) vars are safe to read in any context.
 */

import { z } from 'zod';

const ServerEnv = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20),
  TRIGGER_SECRET_KEY: z.string().min(8).optional(),
  TRIGGER_PROJECT_REF: z.string().min(4).optional(),
  STRIPE_SECRET_KEY: z.string().min(8).optional(),
  STRIPE_WEBHOOK_SECRET: z.string().min(8).optional(),
  RESEND_API_KEY: z.string().min(8).optional(),
  RESEND_FROM_EMAIL: z.string().email().optional(),
  NEXT_PUBLIC_APP_URL: z.string().url(),
});

export const env = ServerEnv.parse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  TRIGGER_SECRET_KEY: process.env.TRIGGER_SECRET_KEY,
  TRIGGER_PROJECT_REF: process.env.TRIGGER_PROJECT_REF,
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
});

export const PublicEnv = {
  SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
  POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com',
  STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
} as const;
