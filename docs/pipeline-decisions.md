# Pipeline decisions log

Locked decisions for the RTAIP SOCIAL generation pipeline. New entries go at the top with a date. **Don't relitigate** — if a decision is wrong in retrospect, add a new entry that supersedes the old one with explicit reasoning.

---

## 2026-05-09 (final) — pivot to KIE.ai sole vendor; defer Identity Lock to v1.5

**Reverses the earlier-same-day Higgsfield consolidation.** Higgsfield doesn't expose self-serve REST API keys — their REST surface is gated to enterprise contracts. MCP and CLI are interactive/session-based, incompatible with a multi-tenant SaaS backend. KIE.ai is now the sole production render vendor.

### Why the reversal

The earlier consolidation (commit `453394c`) assumed Higgsfield REST was available with a self-serve developer key. That assumption was wrong. Higgsfield offers:
- **MCP** — desktop-Cowork or Antigravity, session-authed. Not viable for a server backend.
- **CLI** — interactive auth, also session-based. Same blocker.
- **REST** — exists, but enterprise-gated. Not available without a contract conversation.

KIE.ai aggregates Nano Banana Pro and Bytedance Seedance 2 with self-serve keys, REST endpoints, async job polling, and rate limits we can budget against.

### What's locked

- **Image gen:** KIE.ai REST → `nano-banana-pro` (2K, supports `image_input` array for carousel cover-anchoring)
- **Video gen:** KIE.ai REST → `bytedance/seedance-2` (1080p, supports `first_frame_url` for image-to-video and `aspect_ratio` enums covering our `PLATFORM_SPECS`)
- **Identity Lock:** REMOVED from v1. Phase 7 deferred to v1.5 — will use Replicate Flux LoRA training. KIE.ai has no SOUL equivalent.
- **Higgsfield:** preserved at `apps/jobs/src/lib/render/_deferred/higgsfield.ts.bak` — adapter shape ready to resurrect when Higgsfield opens self-serve REST or we sign enterprise.

### What this changes in code

- `apps/jobs/src/lib/render/kie.ts`: real implementation (not a stub) — `createTask` + polling at `recordInfo`, `JSON.parse(resultJson).resultUrls[0]` extraction. Handles 4-15s duration validation, max-8 reference-image cap, and ignores `soul_reference_id` with a warn-level log (Identity Lock deferred).
- `apps/jobs/src/lib/render/_deferred/higgsfield.ts.bak`: file moved, deferred banner added, excluded from build.
- `apps/jobs/src/lib/render/index.ts`: `IdentityRenderClient` interface DROPPED from v1 union. `ImageRenderResult.provider` and `VideoRenderResult.provider` narrowed to `'kie'`. `SoulTrainRequest` / `SoulTrainResult` types removed.
- `packages/shared/src/post.schema.ts`: `RenderResult.provider` → `z.literal('kie')`.
- `packages/shared/src/brand-skill.schema.ts`: `IdentityLock` block annotated as scaffolded-for-v1.5; default `use_character_by_default: false`. Schema unchanged so v1.5 is purely additive.
- `.env.example`: `KIE_AI_API_KEY` restored; `HIGGSFIELD_API_KEY` removed.
- `README.md`: AI stack section reflects KIE.ai-only; external-services round updated.

### Hard rules unchanged

- Explicit `model_id` on every adapter call; throws on `'auto'`. (`assertExplicitModelId`)
- Pinned API version header (`X-KIE-API-Version`).
- Alarm-severity log on any non-2xx from KIE REST.
- Reference URLs MUST be Supabase signed URLs — never raw KIE CDN URLs (which can expire mid-job).

### Smoke-test gate (passed before this commit)

Both Nano Banana Pro at 9:16 / 2K and Seedance 2 at 9:16 / 1080p / 5s were exercised end-to-end against KIE.ai with the production API key. Both returned valid asset URLs. Adapter shape matches reality.

### Trade-offs accepted

- **No identity-lock in v1.** Users get on-screen text in their brand fonts, brand colors composited correctly, and consistent voice — but characters in posts will not be face-locked across runs. v1.5 closes this with Replicate Flux LoRA. The buyer persona (solo creator generating text+image posts) doesn't need identity lock to ship; ad/UGC users will need it and they're the v1.5 cohort.
- **Single-vendor risk.** If KIE.ai goes down, we're down. Roadmap entry for v1.5+ is multi-vendor failover (KIE → Replicate → Higgsfield). The Higgsfield adapter is already 80% scaffolded for that work.

---

## 2026-05-09 (later) — drop KIE.ai, consolidate all rendering on Higgsfield (REVERSED — see entry above)

Higgsfield's REST API exposes Nano Banana Pro alongside Video and SOUL identity-lock. KIE.ai was a redundant middleman. Single provider going forward.

**Why:** Two providers for one logical concern (rendering) is a maintenance and reliability liability. Two API surfaces to monitor for drift, two sets of credentials to rotate, two retry/idempotency stories, two billing dashboards. Higgsfield consolidates the surface without losing any model coverage we need.

**Changes applied:**
- `apps/jobs/src/lib/render/kie.ts` moved to `apps/jobs/src/lib/render/_deferred/kie.ts.bak` — preserved as a v1.5 failover only; excluded from the build via `tsconfig.json` (`"src/**/_deferred/**"` exclude).
- `apps/jobs/src/lib/render/index.ts` — `ImageRenderResult.provider` narrowed from `'kie' | 'higgsfield'` to `'higgsfield'`.
- `apps/jobs/src/lib/render/higgsfield.ts` — file-level docstring rewritten as sole provider for image + video + SOUL. Same hard rules apply on the new image endpoint: explicit `model_id`, pinned API version header, alarm-severity log on non-2xx.
- `packages/shared/src/post.schema.ts` — `RenderResult.provider` narrowed to `z.literal('higgsfield')`.
- `.env.example` — `KIE_AI_API_KEY` removed; `HIGGSFIELD_API_KEY` comment now reads "image (Nano Banana Pro) + video + SOUL".
- `README.md` — KIE.ai section removed from external-services round.

**What this does NOT change:**
- The carousel cover-anchoring pattern (`image_input` URL reference) still works — it's a Higgsfield REST primitive, not a KIE-specific feature.
- The two-Claude-call structure (Stage 2 + Stage 3) is unchanged.
- The Stage 5 composite quality gates (color fidelity, logo region tone, dimension crop) are unchanged.

**Failover position:** If Higgsfield reliability ever becomes a real problem, the deferred KIE adapter is a 1-2 day rebuild — interface is identical, just resurrect the file. See `roadmap.md` v1.5 entry.

---

## 2026-05-09 — four decisions after Higgsfield official-skills v0.3.0 review

### 1. CLI vs REST → REST (locked)

Workers call `api.higgsfield.ai` directly via REST. Not the `higgsfield` CLI binary.

**Why:** The CLI's backend prompt-enhancer would silently mutate prompts before they hit the model, breaking `brand_skill_version_id` snapshot reproducibility and our debugging story. We already use Claude Stages 2+3 as our prompt enhancer; a second enhancer creates ambiguity about which one caused which output drift.

**Mitigations applied:**
- API version pinned in `apps/jobs/src/lib/render/higgsfield.ts` (`HIGGSFIELD_API_VERSION` constant). Bump deliberately.
- Non-2xx responses log at `severity: 'alarm'` with status code, path, and API version. Wire to PagerDuty / Sentry once observability lands.
- Adapter shape stays clean — if REST is ever truly deprecated, swap to CLI without touching the pipeline.

**Note on the official pack guidance ("Do not call api.higgsfield.ai directly"):** That's general user guidance, not a technical block. Keeping eyes on it via the alarm.

### 2. Image model for typography → Nano Banana Pro stays (no swap to GPT Image 2)

Stage 4 image renders stay on Nano Banana Pro (`nano_banana_2`) via KIE.ai. No swap to GPT Image 2 for typography-heavy posts.

**Why:** Moot for our design. Stage 5 composites all on-screen text as actual fonts via SVG/Resvg server-side. The AI plate is purely visual. Nano Banana Pro is required because we need its `image_input` reference for the carousel cover-anchoring pattern.

**Action taken:** `packages/shared/src/visual-prompt-rules.ts` exports `VISUAL_PROMPT_HARD_NEGATIVES` which bans `text, words, letters, captions, watermarks, signs with words, headlines, typography` — appended to every Stage 3 visual prompt. Sidesteps Nano Banana's text-rendering weakness entirely.

### 3. Marketing Studio as `ad` render path → deferred

Marketing Studio is **not** wired as the default `ad` render path in v1.

**Why:** Marketing Studio is a black box with its own opinions about avatars, settings, hooks. Our entire build invests in OUR opinions (BrandSkill, voice_sample, locked character, extracted_style_notes). Marketing Studio overrides them, and it always wins because it owns the final render. Brand-identity guarantees evaporate.

**Roadmap:** v1.5 "Quick Ad" mode for users who explicitly opt out of BrandSkill identity locks. See `roadmap.md`.

### 4. Virality Predictor (`brain_activity`) → deferred

`brain_activity` is **not** wired as a Stage 5.5 quality gate in v1.

**Why:** No validated threshold yet. Gating on an unknown model creates false rejections that frustrate users. Adds latency + cost to every video without proven value.

**Roadmap:** v1.5 Pro-tier feature with auto-rerun if score drops below user-set threshold. Set thresholds based on real engagement data once we have ~100+ shipped videos. See `roadmap.md`.

---

## Hard rules (encoded in code, not just text)

- **`assertExplicitModelId`** in `apps/jobs/src/lib/render/index.ts` — every render adapter call throws if `model_id` is missing or `'auto'`. Reproducibility depends on deterministic model selection.
- **Pinned API version headers** on every Higgsfield + KIE adapter request.
- **Alarm log** on any non-2xx from a render provider.

## Aspect ratios out-of-scope for v1

SOUL supports `21:9`, `2:3`, `3:2`. Of these, only `2:3` is in v1 `PLATFORM_SPECS` (Pinterest standard pin). `21:9` and `3:2` deferred to v2.
