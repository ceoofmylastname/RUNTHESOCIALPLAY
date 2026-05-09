/**
 * Higgsfield REST adapter — Video + SOUL identity-lock.
 *
 * Locked decision (2026-05-09): we use direct REST against
 * `api.higgsfield.ai`, NOT the higgsfield CLI. The CLI's backend
 * prompt-enhancer would silently mutate prompts before they hit the
 * model, breaking `brand_skill_version_id` snapshot reproducibility.
 * See `project_pipeline_v01_locked.md` for full reasoning.
 *
 * Mitigations against REST surface drift:
 *   - Explicit API version pinned in headers (HIGGSFIELD_API_VERSION).
 *   - Non-2xx responses logged at `alarm` severity so we know within
 *     minutes if endpoints change.
 *   - Adapter shape clean so we could swap to CLI without pipeline
 *     changes if REST is ever truly deprecated.
 */

import type {
  ImageRenderClient,
  ImageRenderRequest,
  ImageRenderResult,
  VideoRenderClient,
  VideoRenderRequest,
  VideoRenderResult,
  IdentityRenderClient,
  SoulTrainRequest,
  SoulTrainResult,
} from './index';
import { assertExplicitModelId } from './index';

const HIGGSFIELD_BASE_URL = 'https://api.higgsfield.ai';
const HIGGSFIELD_API_VERSION = '2026-04-01';     // pin explicitly; bump deliberately

export class HiggsfieldRenderClient
  implements VideoRenderClient, IdentityRenderClient, ImageRenderClient
{
  constructor(private readonly apiKey: string = process.env.HIGGSFIELD_API_KEY ?? '') {
    if (!this.apiKey) {
      throw new Error('HIGGSFIELD_API_KEY is required for HiggsfieldRenderClient');
    }
  }

  async generateImage(req: ImageRenderRequest): Promise<ImageRenderResult> {
    assertExplicitModelId(req.model_id);
    throw new Error('HiggsfieldRenderClient.generateImage — not implemented (Phase 4)');
  }

  async generateVideo(req: VideoRenderRequest): Promise<VideoRenderResult> {
    assertExplicitModelId(req.model_id);
    throw new Error('HiggsfieldRenderClient.generateVideo — not implemented (Phase 4)');
  }

  async trainCharacter(req: SoulTrainRequest): Promise<SoulTrainResult> {
    assertExplicitModelId(req.model_id);
    throw new Error('HiggsfieldRenderClient.trainCharacter — not implemented (Phase 4/7)');
  }

  /**
   * Internal fetch wrapper — pins API version, attaches auth, raises an
   * alarm on any non-2xx so we catch REST drift early.
   *
   * Phase 4 implementations should use this rather than calling fetch
   * directly, so the alarm coverage is uniform.
   */
  protected async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const url = `${HIGGSFIELD_BASE_URL}${path}`;
    const headers = new Headers(init.headers);
    headers.set('Authorization', `Bearer ${this.apiKey}`);
    headers.set('X-Higgsfield-API-Version', HIGGSFIELD_API_VERSION);
    headers.set('Content-Type', 'application/json');

    const res = await fetch(url, { ...init, headers });
    if (!res.ok) {
      const body = await res.text().catch(() => '<unreadable>');
      // ALARM: non-2xx from Higgsfield REST. The pipeline's locked decision
      // accepts REST risk in exchange for prompt provenance — this log is
      // the mitigation. Wire to PagerDuty / Sentry once observability lands.
      console.error(
        JSON.stringify({
          severity: 'alarm',
          source: 'higgsfield-rest-adapter',
          status: res.status,
          path,
          api_version: HIGGSFIELD_API_VERSION,
          body_excerpt: body.slice(0, 500),
        }),
      );
      throw new Error(`Higgsfield REST ${res.status} on ${path}: ${body.slice(0, 200)}`);
    }
    return res.json() as Promise<T>;
  }
}
