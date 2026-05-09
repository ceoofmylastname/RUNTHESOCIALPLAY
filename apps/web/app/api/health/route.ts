import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Phase 0 gate. Must return { ok: true, db: true, queue: true } before
 * any Brand Skill UI work begins.
 *
 * - db: SELECT 1 against a known table to verify the Supabase connection
 *       is reachable. Returns 0 rows because the anon role + RLS hide
 *       data without a session, but a connection error throws.
 * - queue: confirms Trigger.dev env vars are set. Real round-trip ping
 *          can be added once the project is provisioned.
 */
export async function GET() {
  const checks = {
    ok: true,
    db: false,
    queue: false,
    timestamp: new Date().toISOString(),
    errors: [] as string[],
  };

  try {
    const supabase = createClient();
    const { error } = await supabase.from('brand_skills').select('id').limit(0);
    if (error) throw error;
    checks.db = true;
  } catch (e) {
    checks.errors.push(`db: ${e instanceof Error ? e.message : String(e)}`);
  }

  try {
    const hasKey = !!process.env.TRIGGER_SECRET_KEY;
    const hasProject = !!process.env.TRIGGER_PROJECT_REF;
    if (!hasKey || !hasProject) {
      throw new Error(
        `Trigger.dev env not set (${hasKey ? '' : 'TRIGGER_SECRET_KEY '}${hasProject ? '' : 'TRIGGER_PROJECT_REF'})`,
      );
    }
    checks.queue = true;
  } catch (e) {
    checks.errors.push(`queue: ${e instanceof Error ? e.message : String(e)}`);
  }

  checks.ok = checks.db && checks.queue;

  return NextResponse.json(checks, { status: checks.ok ? 200 : 503 });
}
