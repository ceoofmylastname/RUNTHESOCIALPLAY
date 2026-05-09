# RTAIP SOCIAL

Subscription SaaS that delivers fully-produced social posts (copy + visual + platform-correct dimensions + delivery bundle). Brand-skill-driven: users configure their brand once, every generation auto-reads from it.

## Status

**Phase 0 — scaffolding.** Phase 0 gate must pass before any Brand Skill UI work.

- [x] Monorepo created (npm workspaces)
- [ ] apps/web (Next.js 14 + TS + Tailwind + shadcn) initialized
- [ ] packages/shared (Zod schemas + PLATFORM_SPECS) populated
- [ ] apps/jobs (Trigger.dev v3) initialized
- [ ] Supabase project provisioned + RLS migrations applied
- [ ] Trigger.dev project linked
- [ ] Stripe / Resend / PostHog accounts wired
- [ ] `/api/health` returning `{ ok: true, db: true, queue: true }`
- [ ] Vercel deploy live

## Stack (locked)

- **Frontend:** Next.js 14 App Router + TypeScript + Tailwind + shadcn/ui
- **Backend:** Next.js API routes + tRPC
- **DB + Auth + Storage:** Supabase (Postgres, RLS-locked)
- **Job queue:** Trigger.dev v3
- **Payments:** Stripe (subscriptions + metered)
- **AI:**
  - Copy → Claude Sonnet 4.6 (`@anthropic-ai/sdk`)
  - Image → Nano Banana Pro via KIE.ai REST
  - Video → Higgsfield Video REST (`api.higgsfield.ai`)
  - Identity-lock → Higgsfield SOUL REST
- **Email:** Resend
- **Analytics:** PostHog

## Repo layout

```
RTAIP SOCIAL/
├── apps/
│   ├── web/          Next.js 14 app (UI + tRPC API routes)
│   └── jobs/         Trigger.dev v3 workers (orchestration + render + composite)
├── packages/
│   └── shared/       Zod schemas (BrandSkill v0.2), PLATFORM_SPECS, post types
├── supabase/         Migrations + seed
└── docs/             Design docs (schema, pipeline)
```

`packages/shared` is the single source of truth for the BrandSkill schema and platform dimensions. Both `apps/web` and `apps/jobs` import from it. Never duplicate.

## External services to provision (Phase 0 manual steps)

These need real accounts/API keys. Get the test/dev tier of each, populate `.env.local`:

1. **Supabase** — create a new project at supabase.com. Get URL, anon key, service-role key, db connection string.
2. **Trigger.dev v3** — create a project at trigger.dev. Get secret key + project ref.
3. **Anthropic** — get API key at console.anthropic.com. Claude Sonnet 4.6 access.
4. **KIE.ai** — get API key at kie.ai for Nano Banana Pro endpoint.
5. **Higgsfield** — get API key for Higgsfield Video + SOUL at api.higgsfield.ai.
6. **Stripe** — create a test-mode account, get test keys, set up webhook signing secret.
7. **Resend** — verify a sending domain, get API key.
8. **PostHog** — create a project, get the public key + host.
9. **Vercel** — connect this repo, add all env vars, deploy.

See `.env.example` for the full variable list.

## Local development

```bash
npm install
cp .env.example .env.local      # populate with real keys
npm run dev                     # apps/web on :3000
npm run dev:jobs                # apps/jobs Trigger.dev workers (separate terminal)
```

## Hard product principles (never violate)

1. User fills out brand once. Never make them repeat it.
2. Every post comes back as a complete bundle, never just an asset.
3. Every visual must match platform-correct dimensions.
4. Visual aesthetic must be design-heavy, modern, premium — no template feel.
5. Identity (face, logo, colors, fonts) must stay locked across posts.
6. Logos are never AI-rendered. Always composited server-side after.
7. AI API keys never touch the browser. All generation goes through the backend.
