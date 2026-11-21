export const DEFAULT_POINT_COUNT = 280;
export const DEFAULT_MULTIPLIER = 2;
export const POINT_LIMITS = { min: 24, max: 720 } as const;
export const MULTIPLIER_LIMITS = { min: 2, max: 6 } as const;

export type Chord = Readonly<{ from: number; to: number }>;
export type Point = Readonly<{ x: number; y: number }>;

export function buildModularGeometry(count: number, multiplier: number) {
  if (!Number.isInteger(count) || count < POINT_LIMITS.min || count > POINT_LIMITS.max) {
    throw new RangeError('Point count is outside the supported integer range.');
  }
  if (!Number.isInteger(multiplier) || multiplier < MULTIPLIER_LIMITS.min || multiplier > MULTIPLIER_LIMITS.max) {
    throw new RangeError('Multiplier is outside the supported integer range.');
  }
  const points: Point[] = [];
  const chords: Chord[] = [];
  for (let i = 0; i < count; i++) {
    const angle = (2 * Math.PI * i) / count - Math.PI / 2;
    points.push({ x: Math.cos(angle), y: Math.sin(angle) });
    chords.push({ from: i, to: (multiplier * i) % count });
  }
  return { points, chords };
}

export const OPENING_MS = 15_000;

export function openingFrame(milliseconds: number, count: number) {
  const ms = Number.isFinite(milliseconds) ? Math.max(0, Math.min(OPENING_MS, milliseconds)) : 0;
  const phase: "dawn" | "threads" | "bloom" | "form" | "title" | "complete" = ms < 2_000 ? 'dawn'
    : ms < 6_000 ? 'threads'
    : ms < 10_000 ? 'bloom'
    : ms < 13_000 ? 'form'
    : ms < OPENING_MS ? 'title' : 'complete';
  // Each phase reveals a prefix of the exact modular map, never a morphed approximation.
  const progress = ms < 2_000 ? 0
    : ms < 6_000 ? 0.18 * (ms - 2_000) / 4_000
    : ms < 10_000 ? 0.18 + 0.82 * (ms - 6_000) / 4_000 : 1;
  return {
    phase,
    visible: Math.floor(progress * count),
    titleOpacity: Math.min(1, Math.max(0, (ms - 13_000) / 1_200)),
    ms,
  };
}

export function rasterSize(cssWidth: number, cssHeight: number, devicePixelRatio: number) {
  // Two offscreen layers plus the display share this budget; zoom cannot allocate an unbounded buffer.
  const dpr = Math.min(2, Math.max(1, devicePixelRatio), 2_000 / Math.max(1, cssWidth, cssHeight));
  return {
    width: Math.max(1, Math.round(cssWidth * dpr)),
    height: Math.max(1, Math.round(cssHeight * dpr)),
  };
}
