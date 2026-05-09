/**
 * Post pipeline schemas — Brief, Copy, Visual Prompts, Bundle.
 *
 * Each stage's output validates against the next stage's input.
 * Used by apps/jobs (Trigger.dev tasks) for boundary validation.
 */

import { z } from 'zod';
import { Hashtag, Iso8601 } from './brand-skill.schema';

// ---------------------------------------------------------------------------
// Post kinds
// ---------------------------------------------------------------------------

export const PostKind = z.enum(['single_image', 'carousel', 'reel', 'ad']);
export type PostKind = z.infer<typeof PostKind>;

export const PostStatus = z.enum(['queued', 'running', 'complete', 'partial', 'failed']);
export type PostStatus = z.infer<typeof PostStatus>;

export const PipelineStage = z.enum([
  'brief',
  'copy',
  'visual_prompt',
  'render',
  'composite',
  'bundle',
]);
export type PipelineStage = z.infer<typeof PipelineStage>;

// ---------------------------------------------------------------------------
// Render targets — one per (platform, format) the user picked
// ---------------------------------------------------------------------------

export const RenderTarget = z.object({
  platform: z.string(),                        // validated against PLATFORM_SPECS keys at boundary
  format: z.string(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  ratio: z.string(),
  asset_kind: z.enum(['image', 'video', 'pdf-carousel']),
  duration_s: z.number().positive().optional(),
  is_priority: z.boolean().default(false),
});
export type RenderTarget = z.infer<typeof RenderTarget>;

// ---------------------------------------------------------------------------
// Stage 1 — Brief
// ---------------------------------------------------------------------------

export const PostBrief = z.object({
  job_id: z.string().uuid(),
  user_id: z.string().uuid(),
  brand_skill_version_id: z.string().uuid(),   // snapshot pointer for reproducibility
  topic: z.string().min(3).max(500),
  post_kind: PostKind,
  platforms: z.array(z.object({
    platform: z.string(),
    format: z.string(),
    is_priority: z.boolean().default(false),
  })).min(1),
  character_id: z.string().uuid().optional(),  // resolved or omitted
  render_plan: z.array(RenderTarget).min(1),
  estimated_credits: z.number().int().nonnegative(),
  created_at: Iso8601,
});
export type PostBrief = z.infer<typeof PostBrief>;

// ---------------------------------------------------------------------------
// Stage 2 — Copy artifacts (Claude Sonnet 4.6 output)
// ---------------------------------------------------------------------------

export const ScriptAct = z.object({
  start_s: z.number().nonnegative(),
  end_s: z.number().positive(),
  text: z.string().min(1),
  on_camera_direction: z.string().optional(),
});
export type ScriptAct = z.infer<typeof ScriptAct>;

export const VoiceMatchSelfCheck = z.object({
  matches_sample: z.boolean(),
  mimicked_traits: z.array(
    z.enum(['sentence_rhythm', 'punctuation', 'vocabulary', 'cadence', 'tone']),
  ),
  confidence: z.number().min(0).max(1),
});
export type VoiceMatchSelfCheck = z.infer<typeof VoiceMatchSelfCheck>;

export const CopyArtifacts = z.object({
  job_id: z.string().uuid(),
  hook: z.string().min(1),
  body: z.string().min(1),
  cta: z.string().min(1),
  hashtags: z.array(Hashtag).min(8).max(12),
  on_screen_text: z.array(z.string()).default([]),
  caption: z.string().min(1),
  alt_text: z.string().min(1),
  // present for reel + ad post_kinds
  script_acts: z.array(ScriptAct).optional(),
  // self-check; if confidence < 0.75 the orchestrator retries once
  voice_match_self_check: VoiceMatchSelfCheck,
  quality_warning: z.string().optional(),
});
export type CopyArtifacts = z.infer<typeof CopyArtifacts>;

// ---------------------------------------------------------------------------
// Stage 3 — Visual prompts
// ---------------------------------------------------------------------------

export const VisualPrompt = z.object({
  target: RenderTarget,
  prompt: z.string().min(20),
  negative_prompt: z.string().optional(),
  reference_media_urls: z.array(z.string().url()).default([]),
  reference_kind: z.enum(['none', 'character', 'cover', 'product']).default('none'),
  aspect_ratio: z.string(),
  resolution: z.literal('2k').default('2k'),
});
export type VisualPrompt = z.infer<typeof VisualPrompt>;

export const VisualPromptSet = z.object({
  job_id: z.string().uuid(),
  // for carousel: cover MUST be index 0; slides 2-N reference cover_asset_url after render
  cover_index: z.number().int().nonnegative().optional(),
  prompts: z.array(VisualPrompt).min(1),
});
export type VisualPromptSet = z.infer<typeof VisualPromptSet>;

// ---------------------------------------------------------------------------
// Stage 4 — Render results
// ---------------------------------------------------------------------------

export const RenderResult = z.object({
  target: RenderTarget,
  // Supabase Storage signed URL (long-lived). Source CloudFront URLs from
  // KIE.ai / Higgsfield are pulled into Storage to avoid mid-job expiry.
  asset_url: z.string().url(),
  storage_path: z.string(),
  provider: z.enum(['kie', 'higgsfield']),
  provider_job_id: z.string(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  duration_s: z.number().positive().optional(),
  file_size_bytes: z.number().int().nonnegative(),
  created_at: Iso8601,
});
export type RenderResult = z.infer<typeof RenderResult>;

// ---------------------------------------------------------------------------
// Stage 5 — Composite quality gate results
// ---------------------------------------------------------------------------

export const QualityGateResult = z.object({
  dimension_match: z.boolean(),
  brand_color_match: z.boolean(),
  brand_color_delta_e: z.number().nonnegative(),     // ΔE < 25 passes
  logo_composite_success: z.boolean(),
  on_screen_text_rendered: z.boolean(),
  retried: z.boolean().default(false),
});
export type QualityGateResult = z.infer<typeof QualityGateResult>;

export const CompositedAsset = z.object({
  target: RenderTarget,
  asset_url: z.string().url(),
  storage_path: z.string(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  duration_s: z.number().positive().optional(),
  file_size_bytes: z.number().int().nonnegative(),
  quality_gate: QualityGateResult,
});
export type CompositedAsset = z.infer<typeof CompositedAsset>;

// ---------------------------------------------------------------------------
// Stage 6 — Final bundle (the user-facing deliverable)
// ---------------------------------------------------------------------------

export const PostBundleVisual = z.object({
  platform: z.string(),
  format: z.string(),
  asset_url: z.string().url(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  duration_s: z.number().positive().optional(),
  status: z.enum(['rendered', 'failed']),
});
export type PostBundleVisual = z.infer<typeof PostBundleVisual>;

export const PostBundleFailure = z.object({
  target: z.string(),                          // "instagram.reel"
  stage: PipelineStage,
  reason: z.string(),
});
export type PostBundleFailure = z.infer<typeof PostBundleFailure>;

export const PostBundle = z.object({
  job_id: z.string().uuid(),
  brand_skill_version_id: z.string().uuid(),
  status: z.enum(['complete', 'partial', 'failed']),
  copy: z.object({
    hook: z.string(),
    body: z.string(),
    cta: z.string(),
    caption: z.string(),
    alt_text: z.string(),
  }),
  hashtags: z.array(Hashtag),
  on_screen_text: z.array(z.string()),
  visuals: z.array(PostBundleVisual),
  recommended_platforms: z.array(z.string()),  // priority platforms first
  notes: z.string().default(''),
  failures: z.array(PostBundleFailure).default([]),
  quality_warning: z.string().optional(),
  created_at: Iso8601,
});
export type PostBundle = z.infer<typeof PostBundle>;
