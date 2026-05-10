# RTAIP SOCIAL

Subscription SaaS that delivers fully-produced social posts (copy + visual + platform-correct dimensions + delivery bundle). Brand-skill-driven: users configure their brand once, every generation auto-reads from it.

## Status

**Phase 0 — scaffolding.** Phase 0 gate must pass before any Brand Skill UI work.

- [x] Monorepo created (npm workspaces)
- [x] `apps/web` (Next.js 14 + TS + Tailwind + shadcn) initialized
- [x] `packages/shared` (Zod schemas + `PLATFORM_SPECS`) populated with Brand Skill v0.2 + post pipeline types
- [x] `apps/jobs` (Trigger.dev v3) scaffolded with health-check task + 6 pipeline-stage stubs
- [x] Supabase migrations written (schema + RLS + storage buckets); web/worker clients wired
- [x] Stripe / Resend / PostHog env scaffolding
- [x] `/api/health` returning `{ ok, db, queue }`
- [ ] **YOU:** populate `.env.local` with real keys (see "External services" below)
- [ ] **YOU:** apply migrations to your Supabase project
- [ ] **YOU:** verify `/api/health` returns 200 with `db: true, queue: true` locally
- [ ] **YOU:** Vercel deploy live

## Stack (locked)

- **Frontend:** Next.js 14 App Router + TypeScript + Tailwind + shadcn/ui (manually configured; run `npx shadcn@latest add <component>` to add specific components later)
- **Backend:** Next.js API routes + tRPC (tRPC lands in Phase 1)
- **DB + Auth + Storage:** Supabase (Postgres, RLS-locked)
- **Job queue:** Trigger.dev v3
- **Payments:** Stripe (subscriptions + metered)
- **AI:** all rendering on KIE.ai REST as of 2026-05-09 (Higgsfield deferred — see docs/pipeline-decisions.md)
  - Copy → Claude Sonnet 4.6 (`@anthropic-ai/sdk`, workers only)
  - Image → Nano Banana Pro via KIE.ai REST (model `nano-banana-pro`)
  - Video → Bytedance Seedance 2 via KIE.ai REST (model `bytedance/seedance-2`)
  - Identity-lock → DEFERRED to v1.5 (Replicate Flux LoRA training; Phase 7 deferred)
- **Email:** Resend (workers only)
- **Analytics:** PostHog

## Repo layout

```
RTAIP SOCIAL/
├── apps/
│   ├── web/              Next.js 14 — UI + tRPC API routes
│   │   ├── app/
│   │   │   ├── api/health/route.ts   Phase 0 health check
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx              Phase 0 status page
│   │   │   └── globals.css
│   │   ├── lib/
│   │   │   ├── env.ts                Server env validation (zod)
│   │   │   ├── utils.ts              shadcn cn() helper
│   │   │   └── supabase/
│   │   │       ├── client.ts         Browser client (anon)
│   │   │       └── server.ts         Server-component client (anon + cookies)
│   │   ├── components.json           shadcn config
│   │   ├── tailwind.config.ts        shadcn-compatible tailwind
│   │   └── tsconfig.json             extends base + @rtaip/shared paths
│   │
│   └── jobs/             Trigger.dev v3 workers
│       ├── trigger.config.ts
│       └── src/
│           ├── lib/supabase.ts       Service-role client (bypasses RLS)
│           └── trigger/
│               ├── health.ts         Canary task
│               └── _pipeline-stubs.ts  Six stage placeholders
│
├── packages/
│   └── shared/           Zod schemas — single source of truth
│       └── src/
│           ├── index.ts
│           ├── brand-skill.schema.ts BrandSkill v0.2
│           ├── platform-specs.ts    PLATFORM_SPECS matrix
│           ├── post.schema.ts       Pipeline boundary schemas
│           └── voice-archetypes.ts  4 archetypes + hard rules
│
├── supabase/
│   └── migrations/
│       ├── 0001_initial_schema.sql  Tables + indexes + RLS
│       └── 0002_storage_buckets.sql brand-assets + post-assets buckets
│
├── tsconfig.base.json    Strict TS, shared by all workspaces
├── package.json          Root, npm workspaces
└── .env.example          Full env template
```

`packages/shared` is the single source of truth for the BrandSkill schema and platform dimensions. Both `apps/web` and `apps/jobs` import from it. **Never duplicate.**

## External services to provision (Phase 0 manual steps)

These need real accounts/API keys. Get the test/dev tier of each, populate `.env.local`:

### 1. Supabase
- Create a new project at supabase.com
- Copy URL, anon key, service-role key into `.env.local`
- Apply migrations: `supabase db push` (after `supabase link`) or paste each `.sql` into the SQL editor in order
- Verify both buckets exist: Storage → `brand-assets`, `post-assets`

### 2. Trigger.dev v3
- Create a project at trigger.dev
- Copy `TRIGGER_SECRET_KEY` and `TRIGGER_PROJECT_REF` into `.env.local`
- Update `apps/jobs/trigger.config.ts` `project` field with the project ref
- From `apps/jobs/`, run `npx trigger.dev@latest login` then `npm run dev` to start the worker

### 3. Anthropic
- Get API key at console.anthropic.com
- Confirm Claude Sonnet 4.6 access — model id `claude-sonnet-4-6`

### 4. KIE.ai (Image + Video)
- Get API key at https://kie.ai → Settings → API
- Single REST surface covers Nano Banana Pro (image, model `nano-banana-pro`) and Seedance 2 (video, model `bytedance/seedance-2`)
- Endpoint: `POST https://api.kie.ai/api/v1/jobs/createTask` + poll `GET /api/v1/jobs/recordInfo?taskId=...`

### 5. Stripe
- Create test-mode account
- Set up products + prices for the subscription tiers (one-time setup, usually via dashboard)
- Configure webhook → `<APP_URL>/api/stripe/webhook` (route lands in Phase 2)

### 6. Resend
- Verify a sending domain
- Get API key

### 7. PostHog
- Create a project
- Copy public key + host

### 8. Vercel
- Connect this repo
- Add all env vars from `.env.local`
- Deploy

## Local development

```bash
# 1. Install deps at the root (npm workspaces hoists everything)
npm install

# 2. Copy env template, populate with real keys
cp .env.example .env.local
# Note: Next.js looks for .env.local in apps/web/ — symlink or copy:
ln -sf "$(pwd)/.env.local" apps/web/.env.local

# 3. Run the web app
npm run dev                        # apps/web on :3000

# 4. Run the workers (separate terminal)
npm run dev:jobs                   # apps/jobs Trigger.dev workers
```

## Phase 0 verification

The gate to Phase 1:

```bash
curl http://localhost:3000/api/health
```

Should return:

```json
{
  "ok": true,
  "db": true,
  "queue": true,
  "timestamp": "2026-05-09T...",
  "errors": []
}
```

If `db: false`, check Supabase env vars + migrations applied.
If `queue: false`, check `TRIGGER_SECRET_KEY` and `TRIGGER_PROJECT_REF` are set.

Once green locally, deploy to Vercel, hit the same endpoint on the deployed URL. Both must pass before Phase 1.

## Hard product principles (never violate)

1. User fills out brand once. Never make them repeat it.
2. Every post comes back as a complete bundle, never just an asset.
3. Every visual must match platform-correct dimensions.
4. Visual aesthetic must be design-heavy, modern, premium — no template feel.
5. Identity (face, logo, colors, fonts) must stay locked across posts.
6. Logos are never AI-rendered. Always composited server-side after.
7. AI API keys never touch the browser. All generation goes through the backend.

## Reference material

- Higgsfield Cowork Pack lives at `/Users/johnmelvin/Downloads/Johns higgsfield-cowork-pack/` — adapt patterns from there for prompts and pipelines.
- Run `npx skills add higgsfield-ai/skills` inside this repo to pull official Higgsfield-published skills as additional reference.
