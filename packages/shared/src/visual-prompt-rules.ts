/**
 * Hard rules for Stage 3 (Visual Prompt) construction.
 *
 * These are pipeline-level constants — NOT user-overridable BrandSkill state.
 * Every visual prompt the pipeline emits MUST include these negatives.
 *
 * Rationale: Stage 5 (Composite) renders all on-screen text as actual fonts
 * via SVG/Resvg server-side. The AI plate is purely visual. Banning text
 * generation in the prompt sidesteps the AI's text-rendering weakness
 * entirely and avoids garbled letterforms in the underlying plate.
 */

/**
 * Hard negatives — appended to every Stage 3 visual prompt regardless of
 * post_kind, platform, or BrandSkill `forbidden_visuals`.
 *
 * Order matters less than presence; the renderer concatenates them with
 * commas into the model's `negative_prompt` field.
 */
export const VISUAL_PROMPT_HARD_NEGATIVES = [
  // text-generation ban (Stage 5 owns all text rendering)
  'text',
  'words',
  'letters',
  'captions',
  'watermarks',
  'signs with words',
  'headlines',
  'typography',
  // logo-generation ban (principle #6 — logos are server-composited only)
  'logos',
  'AI-rendered logos',
  // generic AI-image tells we never want
  'stock-photo look',
  'over-saturated',
  'corporate clipart',
  'template-y',
] as const;

/**
 * Helper: merge the hard negatives with any BrandSkill-level
 * `forbidden_visuals` and emit a single comma-separated string for the
 * model's `negative_prompt` field. Dedupes case-insensitively.
 */
export function buildNegativePrompt(brandForbidden: readonly string[] = []): string {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const term of [...VISUAL_PROMPT_HARD_NEGATIVES, ...brandForbidden]) {
    const key = term.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(term.trim());
  }
  return out.join(', ');
}
