# RTAIP SOCIAL — roadmap

Living doc for items deliberately deferred. Each item lists what got cut, why, and what would unblock shipping it.

## v1.5 (post-launch, before Pro tier)

### Identity Lock via Replicate Flux LoRA training
- **What:** Phase 7 — character-locked image generation across posts. Train a per-user LoRA on a small set of reference photos via Replicate's LoRA training endpoints; generate with the trained LoRA passed as a reference. Replaces the v0.2 schema's SOUL placeholder.
- **Why deferred from v1:** KIE.ai (our v1 sole vendor) has no SOUL equivalent. Building Identity Lock against KIE was not possible; building against Higgsfield SOUL was blocked because Higgsfield doesn't offer self-serve REST keys (enterprise-gated).
- **What unblocks:** Replicate developer account + adapter implementation against their LoRA train + inference endpoints. The `BrandSkill.identity_lock` schema and `brand_characters` table are already shaped to fit; v1.5 is purely additive (no migration). Onboarding step 5 already shows "Coming in v1.5" — flip that to a real flow when the adapter ships.

### Higgsfield REST adapter — reactivate
- **What:** Resurrect `apps/jobs/src/lib/render/_deferred/higgsfield.ts.bak` to an active adapter. Same hard rules apply (explicit `model_id`, pinned API version, alarm log).
- **Why deferred from v1:** Higgsfield REST is enterprise-gated. Self-serve keys don't exist as of 2026-05-09. The adapter shape is already 80% scaffolded so reactivation is ~1-2 days when access opens.
- **What unblocks:** EITHER Higgsfield opens public self-serve REST, OR we sign an enterprise contract worth the cost, OR we choose to fund a dev-only enterprise tier for QA workflows.

### Multi-vendor render failover
- **What:** Circuit-breaker layer in front of `RenderClient` calls. On N consecutive failures or sustained latency above threshold for a primary vendor, automatically fail over to the next configured vendor for that asset kind (image / video / identity-lock).
- **Why deferred from v1:** Single-vendor (KIE.ai) is acceptable for v1 launch. Adding two vendors before we have any reliability data is premature complexity. Failover logic, vendor-specific retry quirks, and cross-vendor asset-format normalization are real engineering — pay for it when the reliability data demands it.
- **What unblocks:** Real production data from KIE.ai showing failure rates or latency outliers that hurt user experience (e.g., >2% image-gen failure over a 7-day window, or repeated >5min Seedance timeouts). Configured order would likely be KIE → Replicate (image) → Higgsfield (video, if enterprise lands).

### Marketing Studio "Quick Ad" mode
- **What:** Surface Higgsfield Marketing Studio as an alternative `ad` post_kind path. Users who haven't built a full BrandSkill (no character, no mood-board, no logos) can drop a URL or product description and get a finished ad fast.
- **Why deferred from v1:** Marketing Studio owns the final render and overrides BrandSkill / voice_sample / locked character / extracted_style_notes. Adopting it as the default `ad` path would evaporate our brand-identity guarantees. Reasonable for users who don't want them; not reasonable as the default.
- **What unblocks:** Phase 1 onboarding + Phase 6 ad pipeline shipped on the locked design. Then add Quick Ad as a parallel track with clear UI labeling that this mode does NOT honor BrandSkill identity locks.

### Virality Score quality gate (Pro tier)
- **What:** Run Higgsfield's `brain_activity` (Virality Predictor) on every video post after composite, surface the score (hook / attention / retention / sustain) in the bundle, and allow the user to set a threshold below which the system auto-reruns.
- **Why deferred from v1:** No validated threshold yet. Gating on an unknown model creates false rejections that frustrate users. Adds latency + cost to every video without proven value.
- **What unblocks:** Real engagement data on shipped posts. Once we have ~100+ published videos with platform engagement metrics, correlate `brain_activity` scores against actual performance to set evidence-based thresholds. Ship as a Pro-tier toggle: "Virality Score with auto-rerun if score drops below user-set threshold."

## v2

### Aspect ratios `21:9` and `3:2`
- **What:** Add cinematic ultrawide (`21:9`) and classic photo (`3:2`) ratios to `PLATFORM_SPECS` where target platforms support them.
- **Why deferred from v1:** No v1 platform specs in the matrix use these ratios. Higgsfield SOUL supports them but we have nowhere to deliver them.
- **What unblocks:** A v1 user request for a platform we don't currently target (e.g., LinkedIn cover art at 21:9, or a photography niche on Instagram needing 3:2).

### Workspaces / teams
- **What:** Promote the BrandSkill schema's implicit `workspace_of_one` to actual multi-user workspaces. Add `workspace_members` join, billing per workspace, role-based RLS.
- **Why deferred from v1:** Solo creator is the v1 buyer persona; teams add ~30% of schema and auth complexity. The current schema is designed so adding `workspace_id` later is a column-add, not a refactor.
- **What unblocks:** A paying customer asking for it, OR a deal-size argument (one team-tier sub > many solo subs).

### Self-hosted fonts
- **What:** Allow users to upload `.woff2` files for headings/body fonts instead of picking from Google Fonts.
- **Why deferred from v1:** 2x complexity hit (storage, MIME validation, font-face injection at composite time). Google Fonts covers ~95% of brand-font needs.
- **What unblocks:** A paying customer asking for it.
