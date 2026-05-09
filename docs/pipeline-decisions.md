# Pipeline decisions log

Locked decisions for the RTAIP SOCIAL generation pipeline. New entries go at the top with a date. **Don't relitigate** — if a decision is wrong in retrospect, add a new entry that supersedes the old one with explicit reasoning.

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
