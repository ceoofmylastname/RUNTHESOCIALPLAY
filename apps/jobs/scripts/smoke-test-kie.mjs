#!/usr/bin/env node
/**
 * KIE.ai smoke test.
 *
 * Required gate before locking the pivot to KIE.ai (see
 * docs/pipeline-decisions.md, 2026-05-09 final entry).
 *
 * Verifies end-to-end:
 *   1. Nano Banana Pro at 9:16 / 2K — submits, polls, gets a valid URL
 *   2. Seedance 2 at 9:16 / 1080p / 5s — submits, polls, gets a valid URL
 *
 * Loads KIE_AI_API_KEY from `.env.local` at the repo root (no dotenv
 * dependency — we read the file directly).
 *
 * Run:   node apps/jobs/scripts/smoke-test-kie.mjs
 */

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '../../..');
const ENV_PATH = resolve(REPO_ROOT, '.env.local');

function loadEnv() {
  try {
    const raw = readFileSync(ENV_PATH, 'utf8');
    for (const line of raw.split('\n')) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m) process.env[m[1]] = m[2];
    }
  } catch (e) {
    console.error(`Could not read ${ENV_PATH}: ${e.message}`);
    process.exit(2);
  }
}

loadEnv();
const API_KEY = process.env.KIE_AI_API_KEY;
if (!API_KEY) {
  console.error('KIE_AI_API_KEY is missing from .env.local');
  process.exit(2);
}

const BASE = 'https://api.kie.ai';

async function createTask(model, input) {
  const res = await fetch(`${BASE}/api/v1/jobs/createTask`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      'X-KIE-API-Version': '2026-04-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model, input }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`createTask ${res.status}: ${text}`);
  const j = JSON.parse(text);
  if (j.code !== 200 || !j.data?.taskId) {
    throw new Error(`createTask non-success envelope: ${text}`);
  }
  return j.data.taskId;
}

async function poll(taskId, kind) {
  const interval = kind === 'image' ? 4_000 : 10_000;
  const maxMs = kind === 'image' ? 120_000 : 540_000;
  const start = Date.now();
  let lastState = '';
  while (true) {
    const res = await fetch(
      `${BASE}/api/v1/jobs/recordInfo?taskId=${encodeURIComponent(taskId)}`,
      {
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          'X-KIE-API-Version': '2026-04-01',
        },
      },
    );
    const text = await res.text();
    if (!res.ok) throw new Error(`recordInfo ${res.status}: ${text}`);
    const j = JSON.parse(text);
    const data = j.data;
    if (!data) throw new Error(`recordInfo empty data: ${text}`);
    if (data.state !== lastState) {
      console.log(`  [${kind}] state=${data.state} (${Math.round((Date.now() - start) / 1000)}s)`);
      lastState = data.state;
    }
    if (data.state === 'success') {
      const parsed = JSON.parse(data.resultJson);
      const url = parsed?.resultUrls?.[0];
      if (!url) throw new Error(`success but no resultUrls: ${data.resultJson}`);
      return url;
    }
    if (data.state === 'fail') {
      throw new Error(`task failed: code=${data.failCode} msg=${data.failMsg}`);
    }
    if (Date.now() - start > maxMs) {
      throw new Error(`timeout in state=${data.state} after ${maxMs}ms`);
    }
    await new Promise((r) => setTimeout(r, interval));
  }
}

function isValidUrl(u) {
  try {
    const parsed = new URL(u);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

async function main() {
  const which = process.argv[2] ?? 'all';

  if (which === 'image' || which === 'all') {
    console.log('--- Nano Banana Pro (9:16, 2K) ---');
    const t0 = Date.now();
    const taskId = await createTask('nano-banana-pro', {
      prompt:
        'A minimalist editorial product photo of a ceramic coffee mug on a sunlit linen surface, soft natural light, shallow depth of field, no text or words.',
      aspect_ratio: '9:16',
      resolution: '2K',
      output_format: 'png',
    });
    console.log(`  taskId=${taskId}`);
    const url = await poll(taskId, 'image');
    if (!isValidUrl(url)) {
      console.error(`FAIL: returned invalid URL: ${url}`);
      process.exit(1);
    }
    console.log(`  PASS  url=${url}`);
    console.log(`  total=${Math.round((Date.now() - t0) / 1000)}s`);
  }

  if (which === 'video' || which === 'all') {
    console.log('--- Seedance 2 (9:16, 1080p, 5s) ---');
    const t0 = Date.now();
    const taskId = await createTask('bytedance/seedance-2', {
      prompt:
        'A minimalist editorial scene of a ceramic coffee mug on a sunlit linen surface, gentle steam rising, slow subtle camera push-in, soft natural light, no text or words.',
      aspect_ratio: '9:16',
      resolution: '1080p',
      duration: 5,
      generate_audio: true,
    });
    console.log(`  taskId=${taskId}`);
    const url = await poll(taskId, 'video');
    if (!isValidUrl(url)) {
      console.error(`FAIL: returned invalid URL: ${url}`);
      process.exit(1);
    }
    console.log(`  PASS  url=${url}`);
    console.log(`  total=${Math.round((Date.now() - t0) / 1000)}s`);
  }

  console.log('--- ALL SMOKE TESTS PASSED ---');
}

main().catch((e) => {
  console.error('FAIL:', e.message);
  process.exit(1);
});
