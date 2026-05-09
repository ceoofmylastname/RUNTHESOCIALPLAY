/**
 * Brand Skill v0.2 — locked schema.
 *
 * The user fills this out once during onboarding. Every downstream
 * generation reads from a frozen snapshot of it (brand_skill_versions table).
 *
 * Single source of truth. Both apps/web (form validation) and apps/jobs
 * (generation pipeline) import from here.
 */

import { z } from 'zod';

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

export const HexColor = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, 'Hex color must be 6 digits, e.g. #DA7756');

export const Hashtag = z
  .string()
  .regex(/^#[A-Za-z0-9_]+$/, 'Hashtag must start with # and contain only letters, digits, underscores');

export const Iso8601 = z.string().datetime();

// ---------------------------------------------------------------------------
// 1. Brand core — who you are
// ---------------------------------------------------------------------------

export const BrandCore = z.object({
  name: z.string().min(1).max(80),
  tagline: z.string().max(140).optional(),
  one_liner: z.string().min(10).max(220),       // "we help X do Y so they can Z"
  audience: z.string().min(10).max(500),         // free-text persona
  product_categories: z.array(z.string().max(60)).max(8).default([]),
  value_props: z.array(z.string().max(140)).min(1).max(5),
});
export type BrandCore = z.infer<typeof BrandCore>;

// ---------------------------------------------------------------------------
// 2. Voice — how you talk
// ---------------------------------------------------------------------------

const VOICE_ARCHETYPE_ENUM = [
  'warm-friendly',
  'sarcastic-witty',
  'calm-educational',
  'professional-polished',
  'custom',
] as const;

export const Voice = z
  .object({
    archetype: z.enum(VOICE_ARCHETYPE_ENUM),
    custom_description: z.string().max(500).optional(),

    /**
     * 200-1000 char raw user writing sample. Fed to Claude as a cadence,
     * punctuation, and rhythm reference. Without this, copy reads like a
     * generic archetype instead of specifically the user.
     */
    voice_sample: z.string().min(200).max(1000),

    vocabulary_do: z.array(z.string().max(60)).max(20).default([]),
    vocabulary_dont: z.array(z.string().max(60)).max(20).default([]),
    reading_level: z.enum(['5th-grade', '8th-grade', 'college']).default('5th-grade'),
    emoji_policy: z.enum(['none', 'sparing', 'liberal']).default('sparing'),
    cta_style: z.string().max(200).optional(),
  })
  .refine(
    (v) => v.archetype !== 'custom' || (!!v.custom_description && v.custom_description.length >= 10),
    { message: 'custom_description is required when archetype is "custom"', path: ['custom_description'] },
  );
export type Voice = z.infer<typeof Voice>;

// ---------------------------------------------------------------------------
// 3. Visual aesthetic — how you look
// ---------------------------------------------------------------------------

export const VisualAesthetic = z.object({
  vibe_keywords: z.array(z.string().max(40)).min(2).max(8),
  reference_image_urls: z.array(z.string().url()).max(12).default([]),

  /**
   * LLM-generated description of mood-board uploads. Generated server-side
   * during onboarding step 3 by passing reference_image_urls to Claude vision.
   * Injected into Stage 3 visual prompts as "visual DNA".
   *
   * reference_image_urls without this is dead data the generator can't use.
   */
  extracted_style_notes: z.string().max(2000).default(''),

  shooting_style: z
    .enum(['photoreal', 'editorial', 'studio', 'documentary', 'cinematic'])
    .default('cinematic'),
  lighting: z
    .enum(['golden-hour', 'soft-daylight', 'studio-key', 'moody-low-key', 'mixed'])
    .default('soft-daylight'),
  composition: z
    .enum(['rule-of-thirds', 'centered', 'negative-space', 'mixed'])
    .default('mixed'),
  forbidden_visuals: z
    .array(z.string().max(80))
    .default([
      'stock-photo look',
      'AI-rendered text',
      'AI-rendered logos',
      'over-saturated',
      'corporate clipart',
      'template-y',
    ]),
});
export type VisualAesthetic = z.infer<typeof VisualAesthetic>;

// ---------------------------------------------------------------------------
// 4. Identity — locked across every post
// ---------------------------------------------------------------------------

export const BrandColors = z.object({
  primary: HexColor,
  secondary: HexColor,
  accent: HexColor,
  text_dark: HexColor.default('#0A0A0A'),
  text_light: HexColor.default('#FAFAFA'),
  background: HexColor.default('#FFFFFF'),
});
export type BrandColors = z.infer<typeof BrandColors>;

export const FontSpec = z.object({
  family: z.string().min(1).max(80),
  weight: z.enum(['300', '400', '500', '600', '700', '800', '900']),
  source: z.enum(['google-fonts', 'self-hosted']).default('google-fonts'),
  asset_id: z.string().uuid().optional(),     // FK to brand_assets if self-hosted
});
export type FontSpec = z.infer<typeof FontSpec>;

export const BrandFonts = z.object({
  heading: FontSpec,
  body: FontSpec,
});
export type BrandFonts = z.infer<typeof BrandFonts>;

export const BrandLogo = z.object({
  primary_asset_id: z.string().uuid(),         // PNG with transparency
  monochrome_asset_id: z.string().uuid(),      // for dark-on-light + light-on-dark
  icon_asset_id: z.string().uuid().optional(), // square mark only
  safe_zone_pct: z.number().min(0).max(50).default(8),
  default_position: z
    .enum(['top-left', 'top-right', 'bottom-left', 'bottom-right', 'center', 'none'])
    .default('bottom-right'),
});
export type BrandLogo = z.infer<typeof BrandLogo>;

// ---------------------------------------------------------------------------
// 5. Characters — UGC actors, identity-locked via Higgsfield SOUL
//    Lives in its own table, but referenced here for default + ordering.
// ---------------------------------------------------------------------------

export const CharacterRef = z.object({
  character_id: z.string().uuid(),
  is_default: z.boolean().default(false),
});
export type CharacterRef = z.infer<typeof CharacterRef>;

// Full character (mirrors the brand_characters table)
export const Character = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  name: z.string().min(1).max(80),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  archetype: z.enum([
    'gym-bro-twenties',
    'busy-mom-thirties',
    'gen-z-creator',
    'white-collar-professional',
    'outdoorsy-thirties',
    'senior',
    'custom',
  ]),
  specifics: z.string().max(500),
  default_scene: z.string().max(200),
  soul_job_id: z.string(),                     // Higgsfield SOUL identity-lock ref
  soul_prompt: z.string().min(20),             // fallback for regeneration
  portrait_asset_id: z.string().uuid().optional(),
  tags: z.array(z.string()).default([]),
  created_at: Iso8601,
});
export type Character = z.infer<typeof Character>;

// ---------------------------------------------------------------------------
// 6. Distribution — platforms the user is targeting
// ---------------------------------------------------------------------------

export const PlatformTarget = z.object({
  platform: z.enum([
    'instagram',
    'facebook',
    'tiktok',
    'linkedin',
    'x',
    'youtube',
    'pinterest',
    'threads',
  ]),
  formats: z.array(z.string()).min(1),         // validated against PLATFORM_SPECS at runtime
  is_priority: z.boolean().default(false),
});
export type PlatformTarget = z.infer<typeof PlatformTarget>;

// ---------------------------------------------------------------------------
// 7. Hard rules — universal guardrails
// ---------------------------------------------------------------------------

export const HardRules = z.object({
  no_em_dashes: z.boolean().default(true),
  no_ai_logos: z.boolean().default(true),
  no_ai_text_in_image: z.boolean().default(true),
  no_auto_post: z.boolean().default(true),
  identity_lock_required: z.boolean().default(true),
});
export type HardRules = z.infer<typeof HardRules>;

// ---------------------------------------------------------------------------
// 8. Identity-lock — character behavior toggle
// ---------------------------------------------------------------------------

export const IdentityLock = z.object({
  use_character_by_default: z.boolean().default(false),
});
export type IdentityLock = z.infer<typeof IdentityLock>;

// ---------------------------------------------------------------------------
// === Top-level Brand Skill ===
// ---------------------------------------------------------------------------

export const BrandSkill = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),                  // workspace_id will replace this when teams ship
  brand_core: BrandCore,
  voice: Voice,
  visual_aesthetic: VisualAesthetic,
  colors: BrandColors,
  fonts: BrandFonts,
  logo: BrandLogo,
  characters: z.array(CharacterRef).default([]),
  platforms: z.array(PlatformTarget).min(1),
  hard_rules: HardRules.default({}),
  identity_lock: IdentityLock.default({ use_character_by_default: false }),
  default_cta: z.string().min(3).max(200),
  default_hashtags_pool: z.array(Hashtag).min(20).max(40),
  version: z.number().int().nonnegative().default(1),
  is_complete: z.boolean().default(false),
  completed_at: Iso8601.nullable().default(null),
  created_at: Iso8601,
  updated_at: Iso8601,
});
export type BrandSkill = z.infer<typeof BrandSkill>;

// ---------------------------------------------------------------------------
// Partial schemas for the onboarding wizard (each step submits a partial save)
// ---------------------------------------------------------------------------

export const BrandSkillDraft = BrandSkill.partial({
  voice: true,
  visual_aesthetic: true,
  colors: true,
  fonts: true,
  logo: true,
  characters: true,
  platforms: true,
  default_cta: true,
  default_hashtags_pool: true,
  is_complete: true,
  completed_at: true,
});
export type BrandSkillDraft = z.infer<typeof BrandSkillDraft>;
