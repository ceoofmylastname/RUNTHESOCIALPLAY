/**
 * KIE.ai REST adapter — Nano Banana Pro image generation.
 *
 * Locked: KIE.ai handles all image rendering (single images, carousel
 * slides, ad scenes). Endpoint accepts `image_input` URL for reference
 * media — used for character-lock and carousel cover-anchoring.
 *
 * Same hard rules as Higgsfield adapter: explicit model_id required,
 * non-2xx triggers an alarm log.
 */

import type {
  ImageRenderClient,
  ImageRenderRequest,
  ImageRenderResult,
} from './index';
import { assertExplicitModelId } from './index';

const KIE_BASE_URL = 'https://api.kie.ai';
const KIE_API_VERSION = '2026-04-01';            // pin explicitly; bump deliberately

export class KieRenderClient implements ImageRenderClient {
  constructor(private readonly apiKey: string = process.env.KIE_AI_API_KEY ?? '') {
    if (!this.apiKey) {
      throw new Error('KIE_AI_API_KEY is required for KieRenderClient');
    }
  }

  async generateImage(req: ImageRenderRequest): Promise<ImageRenderResult> {
    assertExplicitModelId(req.model_id);
    throw new Error('KieRenderClient.generateImage — not implemented (Phase 4)');
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
