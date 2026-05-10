/**
 * KIE.ai REST adapter — sole render provider for image + video.
 *
 * Locked decision (2026-05-09c, supersedes 09b): pivoted to KIE.ai as
 * the sole production render vendor. Higgsfield doesn't expose
 * self-serve REST API keys (their REST is gated to enterprise
 * contracts); MCP and CLI are interactive/session-based, incompatible
 * with a multi-tenant backend. Identity Lock (Phase 7) is deferred to
 * v1.5 — KIE.ai has no SOUL equivalent; will use Replicate Flux LoRA
 * training when built. See `docs/pipeline-decisions.md`.
 *
 * Endpoint coverage handled here:
 *   - Image: Nano Banana Pro       (model `nano-banana-pro`)
 *   - Video: Bytedance Seedance 2  (model `bytedance/seedance-2`)
 *
 * Hard rules (same as the deferred Higgsfield adapter):
 *   - Explicit `model_id`; throws on missing or `'auto'`
 *   - Pinned API version header (`X-KIE-API-Version`)
 *   - Alarm-severity log on any non-2xx
 *   - Reference URLs MUST be Supabase signed URLs (NOT raw provider
 *     CloudFront URLs, which can expire mid-job)
 *
 * KIE.ai is async — `createTask` returns a `taskId`; we poll
 * `recordInfo` until `state === 'success'` or `'fail'`.
 */

import type {
  ImageRenderClient,
  ImageRenderRequest,
  ImageRenderResult,
  VideoRenderClient,
  VideoRenderRequest,
  VideoRenderResult,
} from './index';
import { assertExplicitModelId } from './index';

const KIE_BASE_URL = 'https://api.kie.ai';
const KIE_API_VERSION = '2026-04-01';            // pin explicitly; bump deliberately

/** Canonical model IDs — pin centrally so the pipeline never invents one. */
export const KIE_MODELS = {
  IMAGE_NANO_BANANA_PRO: 'nano-banana-pro',
  VIDEO_SEEDANCE_2: 'bytedance/seedance-2',
} as const;

/** Resolution buckets KIE accepts. */
type ImageResolution = '1K' | '2K' | '4K';
type VideoResolution = '480p' | '720p' | '1080p';

interface CreateTaskResponse {
  code: number;
  msg: string;
  data: { taskId: string };
}

interface RecordInfoResponse {
  code: number;
  msg: string;
  data: {
    taskId: string;
    model: string;
    state: 'waiting' | 'queuing' | 'generating' | 'success' | 'fail';
    param: string;
    resultJson: string;                         // STRINGIFIED — must JSON.parse
    failCode?: string;
    failMsg?: string;
    costTime?: number;
    completeTime?: number;
    createTime?: number;
    updateTime?: number;
    creditsConsumed?: number;
  } | null;
}

interface ResultJson {
  resultUrls?: string[];
  firstFrameUrl?: string[];
  lastFrameUrl?: string[];
  resultObject?: unknown;
}

const DEFAULT_POLL_INTERVAL_MS = {
  image: 4_000,
  video: 10_000,
} as const;

const DEFAULT_MAX_WAIT_MS = {
  image: 120_000,                               // 2 min — Nano Banana usually <30s
  video: 540_000,                               // 9 min — Seedance 2 averages ~5min
} as const;

export class KieRenderClient implements ImageRenderClient, VideoRenderClient {
  constructor(private readonly apiKey: string = process.env.KIE_AI_API_KEY ?? '') {
    if (!this.apiKey) {
      throw new Error('KIE_AI_API_KEY is required for KieRenderClient');
    }
  }

  // -------------------------------------------------------------------------
  // Image — Nano Banana Pro
  // -------------------------------------------------------------------------

  async generateImage(req: ImageRenderRequest): Promise<ImageRenderResult> {
    assertExplicitModelId(req.model_id);

    const input: Record<string, unknown> = {
      prompt: req.prompt,
      aspect_ratio: req.aspect_ratio,
      resolution: this.mapImageResolution(req.resolution),
      output_format: 'png',
    };
    if (req.reference_image_urls?.length) {
      // Nano Banana Pro accepts up to 8 reference images via image_input.
      // Cap at 8 — anything over is a caller bug.
      if (req.reference_image_urls.length > 8) {
        throw new Error(
          `Nano Banana Pro accepts at most 8 reference images; received ${req.reference_image_urls.length}`,
        );
      }
      input.image_input = req.reference_image_urls;
    }

    const taskId = await this.createTask(req.model_id, input, req.idempotency_key);
    const finalUrl = await this.pollUntilDone(taskId, 'image');

    return {
      provider: 'kie',
      provider_job_id: taskId,
      asset_url: finalUrl,
      // Pixel dims aren't returned by KIE in the result envelope; the
      // pipeline measures them via sharp/ffmpeg in Stage 5 composite.
      // We surface the requested aspect ratio via the RenderTarget
      // upstream — these fields default to 0 here and are filled in by
      // the composite stage.
      width: 0,
      height: 0,
      file_size_bytes: 0,
    };
  }

  private mapImageResolution(r: ImageRenderRequest['resolution']): ImageResolution {
    // RTAIP SOCIAL only ships '2k'; KIE's API enum is '2K'.
    if (r === '2k') return '2K';
    return '2K';
  }

  // -------------------------------------------------------------------------
  // Video — Bytedance Seedance 2
  // -------------------------------------------------------------------------

  async generateVideo(req: VideoRenderRequest): Promise<VideoRenderResult> {
    assertExplicitModelId(req.model_id);

    if (req.duration_s < 4 || req.duration_s > 15) {
      throw new Error(
        `Seedance 2 supports 4-15 second durations; received ${req.duration_s}`,
      );
    }

    const input: Record<string, unknown> = {
      prompt: req.prompt,
      aspect_ratio: req.aspect_ratio,
      resolution: this.mapVideoResolution(req.aspect_ratio),
      duration: Math.round(req.duration_s),
      generate_audio: true,
    };
    if (req.start_frame_url) {
      input.first_frame_url = req.start_frame_url;
    }
    // SOUL identity-lock is unavailable on KIE.ai — Identity Lock is
    // deferred to v1.5. If `soul_reference_id` is passed, we ignore it
    // for now and log so the caller knows it's a no-op in v1.
    if (req.soul_reference_id) {
      console.warn(
        JSON.stringify({
          severity: 'warn',
          source: 'kie-rest-adapter',
          message: 'soul_reference_id ignored — Identity Lock deferred to v1.5',
          model_id: req.model_id,
        }),
      );
    }

    const taskId = await this.createTask(req.model_id, input, req.idempotency_key);
    const finalUrl = await this.pollUntilDone(taskId, 'video');

    return {
      provider: 'kie',
      provider_job_id: taskId,
      asset_url: finalUrl,
      width: 0,
      height: 0,
      duration_s: req.duration_s,
      file_size_bytes: 0,
    };
  }

  private mapVideoResolution(_aspect: string): VideoResolution {
    // RTAIP SOCIAL targets 1080p video uniformly. Aspect ratio
    // determines orientation, not resolution bucket.
    return '1080p';
  }

  // -------------------------------------------------------------------------
  // Shared: createTask + recordInfo polling
  // -------------------------------------------------------------------------

  private async createTask(
    model: string,
    input: Record<string, unknown>,
    _idempotencyKey: string,
  ): Promise<string> {
    const body = JSON.stringify({ model, input });
    const res = await this.request<CreateTaskResponse>('/api/v1/jobs/createTask', {
      method: 'POST',
      body,
    });
    if (res.code !== 200 || !res.data?.taskId) {
      throw new Error(`KIE createTask returned non-success envelope: ${JSON.stringify(res)}`);
    }
    return res.data.taskId;
  }

  private async pollUntilDone(taskId: string, kind: 'image' | 'video'): Promise<string> {
    const interval = DEFAULT_POLL_INTERVAL_MS[kind];
    const maxWait = DEFAULT_MAX_WAIT_MS[kind];
    const start = Date.now();

    while (true) {
      const res = await this.request<RecordInfoResponse>(
        `/api/v1/jobs/recordInfo?taskId=${encodeURIComponent(taskId)}`,
        { method: 'GET' },
      );
      const data = res.data;
      if (!data) {
        throw new Error(`KIE recordInfo returned empty data for taskId=${taskId}`);
      }
      if (data.state === 'success') {
        const parsed = JSON.parse(data.resultJson) as ResultJson;
        const url = parsed.resultUrls?.[0];
        if (!url) {
          throw new Error(
            `KIE recordInfo state=success but no resultUrls for taskId=${taskId}: ${data.resultJson}`,
          );
        }
        return url;
      }
      if (data.state === 'fail') {
        throw new Error(
          `KIE task failed: taskId=${taskId} code=${data.failCode ?? '?'} msg=${data.failMsg ?? '?'}`,
        );
      }
      // waiting | queuing | generating — keep polling
      if (Date.now() - start > maxWait) {
        throw new Error(
          `KIE task timed out after ${maxWait}ms in state=${data.state} taskId=${taskId}`,
        );
      }
      await sleep(interval);
    }
  }

  protected async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const url = `${KIE_BASE_URL}${path}`;
    const headers = new Headers(init.headers);
    headers.set('Authorization', `Bearer ${this.apiKey}`);
    headers.set('X-KIE-API-Version', KIE_API_VERSION);
    headers.set('Content-Type', 'application/json');

    const res = await fetch(url, { ...init, headers });
    if (!res.ok) {
      const body = await res.text().catch(() => '<unreadable>');
      // ALARM: non-2xx from KIE REST. The pipeline's locked decision
      // accepts REST risk in exchange for prompt provenance — this log
      // is the early-warning system for endpoint drift.
      console.error(
        JSON.stringify({
          severity: 'alarm',
          source: 'kie-rest-adapter',
          status: res.status,
          path,
          api_version: KIE_API_VERSION,
          body_excerpt: body.slice(0, 500),
        }),
      );
      throw new Error(`KIE REST ${res.status} on ${path}: ${body.slice(0, 200)}`);
    }
    return res.json() as Promise<T>;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
