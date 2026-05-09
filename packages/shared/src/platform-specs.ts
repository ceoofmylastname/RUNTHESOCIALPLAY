/**
 * Canonical platform output specs.
 *
 * The user picks platforms + formats; we own the pixel dimensions.
 * Enforces principle #3 (every visual must match platform-correct dimensions).
 *
 * Source of truth — duplicating these elsewhere is a bug.
 */

export const PLATFORM_SPECS = {
  instagram: {
    feed_square:    { w: 1080, h: 1080, ratio: '1:1',    type: 'image' },
    feed_portrait:  { w: 1080, h: 1350, ratio: '4:5',    type: 'image' },
    feed_landscape: { w: 1080, h: 566,  ratio: '1.91:1', type: 'image' },
    story:          { w: 1080, h: 1920, ratio: '9:16',   type: 'image|video', max_duration_s: 60 },
    reel:           { w: 1080, h: 1920, ratio: '9:16',   type: 'video',       max_duration_s: 90 },
    carousel:       { w: 1080, h: 1350, ratio: '4:5',    type: 'image',       max_slides: 10 },
  },
  facebook: {
    feed:           { w: 1200, h: 630,  ratio: '1.91:1', type: 'image' },
    feed_square:    { w: 1080, h: 1080, ratio: '1:1',    type: 'image' },
    story:          { w: 1080, h: 1920, ratio: '9:16',   type: 'image|video', max_duration_s: 60 },
    reel:           { w: 1080, h: 1920, ratio: '9:16',   type: 'video',       max_duration_s: 90 },
    cover:          { w: 1640, h: 624,  ratio: '~2.63:1', type: 'image' },
  },
  tiktok: {
    video:          { w: 1080, h: 1920, ratio: '9:16',   type: 'video', max_duration_s: 600 },
    photo_post:     { w: 1080, h: 1920, ratio: '9:16',   type: 'image' },
  },
  linkedin: {
    feed_square:    { w: 1080, h: 1080, ratio: '1:1',    type: 'image' },
    feed_landscape: { w: 1200, h: 627,  ratio: '1.91:1', type: 'image' },
    feed_portrait:  { w: 1080, h: 1350, ratio: '4:5',    type: 'image' },
    video:          { w: 1080, h: 1920, ratio: '9:16',   type: 'video', max_duration_s: 600 },
    document:       { w: 1080, h: 1350, ratio: '4:5',    type: 'pdf-carousel', max_slides: 20 },
  },
  x: {
    feed:           { w: 1200, h: 675,  ratio: '16:9',   type: 'image' },
    feed_square:    { w: 1080, h: 1080, ratio: '1:1',    type: 'image' },
    video:          { w: 1280, h: 720,  ratio: '16:9',   type: 'video', max_duration_s: 140 },
  },
  youtube: {
    short:          { w: 1080, h: 1920, ratio: '9:16',   type: 'video', max_duration_s: 60 },
    thumbnail:      { w: 1280, h: 720,  ratio: '16:9',   type: 'image' },
  },
  pinterest: {
    standard_pin:   { w: 1000, h: 1500, ratio: '2:3',    type: 'image' },
    video_pin:      { w: 1080, h: 1920, ratio: '9:16',   type: 'video', max_duration_s: 60 },
  },
  threads: {
    feed_square:    { w: 1080, h: 1080, ratio: '1:1',    type: 'image' },
    feed_portrait:  { w: 1080, h: 1350, ratio: '4:5',    type: 'image' },
  },
} as const;

export type Platform = keyof typeof PLATFORM_SPECS;

export type PlatformFormat<P extends Platform = Platform> =
  keyof (typeof PLATFORM_SPECS)[P] & string;

export type PlatformSpec = {
  w: number;
  h: number;
  ratio: string;
  type: 'image' | 'video' | 'image|video' | 'pdf-carousel';
  max_duration_s?: number;
  max_slides?: number;
};

export function getSpec<P extends Platform>(
  platform: P,
  format: PlatformFormat<P>,
): PlatformSpec {
  const spec = (PLATFORM_SPECS[platform] as Record<string, PlatformSpec>)[format];
  if (!spec) {
    throw new Error(`Unknown format "${format}" for platform "${platform}"`);
  }
  return spec;
}

export function isValidFormat(platform: string, format: string): boolean {
  if (!(platform in PLATFORM_SPECS)) return false;
  return format in PLATFORM_SPECS[platform as Platform];
}

export function listFormats<P extends Platform>(platform: P): PlatformFormat<P>[] {
  return Object.keys(PLATFORM_SPECS[platform]) as PlatformFormat<P>[];
}

export const PLATFORMS = Object.keys(PLATFORM_SPECS) as Platform[];
