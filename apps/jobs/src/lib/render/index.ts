/**
 * Render-provider adapter interfaces.
 *
 * Single provider as of 2026-05-09: Higgsfield REST. Higgsfield's own
 * REST API exposes Nano Banana Pro alongside Video and SOUL identity-
 * lock, so KIE.ai was redundant — consolidated all image + video + SOUL
 * onto Higgsfield. KIE adapter preserved at `_deferred/kie.ts.bak` as a
 * v1.5 failover (see docs/roadmap.md).
 *
 * Adapters are thin — they own request shaping, retries, and provider-
 * specific quirks. The pipeline never imports a provider directly; it
 * goes through these interfaces.
 *
 * Hard rules enforced at every adapter entry point:
 *   - `model_id` is required; never `'auto'`. Reproducibility depends on
 *     deterministic model selection (see feedback memory:
 *     `Render adapters must always pass explicit model_id`).
 *   - Non-2xx responses log at `alarm` severity so we know within minutes
 *     if a provider's REST surface changes. The locked Stage-4 design
 *     stays on REST; the alarm is the early-warning system.
 */

export type AspectRatio =
  | '1:1' | '4:5' | '9:16' | '16:9' | '1.91:1' | '2:3' | '3:2' | '21:9' | '~2.63:1';

export interface ImageRenderRequest {
  /** Model ID — REQUIRED. Throws if missing or `'auto'`. */
  model_id: string;
  prompt: string;
  negative_prompt?: string;
  /** Reference media URLs (Supabase signed URLs only — never CloudFront). */
  reference_image_urls?: string[];
  aspect_ratio: AspectRatio;
  resolution: '2k';
  /** Idempotency key — typically `${job_id}:${target_index}`. */
  idempotency_key: string;
}

export interface ImageRenderResult {
  provider: 'higgsfield';
  provider_job_id: string;
  asset_url: string;             // CloudFront-style URL from provider; the pipeline copies to Supabase Storage before any downstream reference
  width: number;
  height: number;
  file_size_bytes: number;
}

export interface VideoRenderRequest {
  model_id: string;
  prompt: string;
  /** Start frame URL (Supabase signed URL). */
  start_frame_url?: string;
  /** Optional reference character (SOUL identity-lock). */
  soul_reference_id?: string;
  aspect_ratio: AspectRatio;
  duration_s: number;
  idempotency_key: string;
}

export interface VideoRenderResult {
  provider: 'higgsfield';
  provider_job_id: string;
  asset_url: string;
  width: number;
  height: number;
  duration_s: number;
  file_size_bytes: number;
}

export interface SoulTrainRequest {
  model_id: string;              // e.g. 'soul_cast'
  prompt: string;
  aspect_ratio: AspectRatio;
  resolution: '2k';
  idempotency_key: string;
}

export interface SoulTrainResult {
  provider: 'higgsfield';
  reference_id: string;          // returned by Higgsfield SOUL; used as `soul_reference_id` downstream
  portrait_url: string;
  width: number;
  height: number;
}

export interface ImageRenderClient {
  generateImage(req: ImageRenderRequest): Promise<ImageRenderResult>;
}

export interface VideoRenderClient {
  generateVideo(req: VideoRenderRequest): Promise<VideoRenderResult>;
}

export interface IdentityRenderClient {
  trainCharacter(req: SoulTrainRequest): Promise<SoulTrainResult>;
}

/**
 * Throws if model_id is missing, empty, or `'auto'`.
 * Adapters call this at the very top of every public method.
 */
export function assertExplicitModelId(model_id: string | undefined | null): asserts model_id is string {
  if (!model_id || model_id.trim() === '' || model_id === 'auto') {
    throw new Error(
      `Render adapter requires an explicit model_id; received "${model_id ?? '<missing>'}". ` +
      `Auto-selection is non-deterministic and breaks brand_skill_version_id reproducibility.`,
    );
  }
}
