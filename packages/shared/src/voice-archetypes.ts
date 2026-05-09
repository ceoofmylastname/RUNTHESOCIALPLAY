/**
 * Voice archetypes.
 *
 * Adapted from the Higgsfield Cowork Pack. Each archetype expands into a
 * deterministic block injected into the Stage 2 (Copy) system prompt.
 */

export const VOICE_ARCHETYPES = {
  'warm-friendly': {
    label: 'Warm & friendly',
    best_for: 'lifestyle, wellness, parenting, beauty, food brands',
    rules: [
      'Talk to the reader like a friend over coffee',
      'Warm, encouraging, never judgmental',
      'Use "we" and "us" sometimes, but mostly "you"',
      'Soft humor, never sarcasm',
      'Lead with empathy, then solution',
    ],
  },
  'sarcastic-witty': {
    label: 'Sarcastic & witty',
    best_for: 'gen-z products, niche internet, anything where the audience is in on the joke',
    rules: [
      'Self-aware about being an ad',
      'Drop pop-culture references when natural',
      'Punch up, never down',
      'Short sentences, sharp asides',
      '"Tell me why I just bought this" energy',
    ],
  },
  'calm-educational': {
    label: 'Calm & educational',
    best_for: 'courses, books, tools, B2B, anything where the buyer needs to feel smart',
    rules: [
      'Authority without arrogance',
      'Lead with the insight, then the product',
      'Cite specifics: numbers, names, timelines',
      'Never hype-y, never vague',
      'Treat the reader as already informed',
    ],
  },
  'professional-polished': {
    label: 'Professional & polished',
    best_for: 'software, finance, services, premium brands',
    rules: [
      'Confident but not loud',
      'Plain English with occasional industry term (defined)',
      'Lead with the outcome, not the process',
      'Short paragraphs, scannable bullets',
      'No exclamation points, no all-caps',
    ],
  },
} as const;

export type VoiceArchetype = keyof typeof VOICE_ARCHETYPES;

export const VOICE_ARCHETYPE_KEYS = Object.keys(VOICE_ARCHETYPES) as VoiceArchetype[];

export const HARD_VOICE_RULES = [
  '5th-grade reading level on every viewer-facing line',
  'Short sentences, plain words',
  'No em dashes (use commas, periods, or rephrase)',
  'Talk to one person, not a room',
  'Never sound like an ad',
] as const;
