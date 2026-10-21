import { normalizeDeg, rectCenter, rotatePoint } from "./geometry.ts";
import { getTemplate } from "./templates.ts";
import type { Arena, Gray, Point, TemplateId } from "./types.ts";
import { segmentArena, type ArenaRegion } from "./vision.ts";

/** Maze families that can be told apart from the arena outline alone. */
export type MazeKind = "open-field" | "water-maze" | "elevated-plus" | "y-maze";

export type MazeDetection = {
  kind: MazeKind;
  arena: Arena;
  /** Template size parameter (arm width) for arm mazes. */
  size?: number;
  /** 0-1 confidence in the shape classification. */
  confidence: number;
};

export const MAZE_LABELS: Record<MazeKind, string> = {
  "open-field": "Square / rectangular arena",
  "water-maze": "Round arena",
  "elevated-plus": "Plus maze (4 arms)",
  "y-maze": "Y-maze (3 arms)",
};

const RAY_COUNT = 180;
const ARM_LEVEL = 0.55;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** Pixels of the region that touch the outside: enough to find the tight rotated box. */
function boundary({ mask, width, height }: ArenaRegion): Point[] {
  const pts: Point[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      if (!mask[i]) continue;
      const edge = x === 0 || y === 0 || x === width - 1 || y === height - 1 || !mask[i - 1] || !mask[i + 1] || !mask[i - width] || !mask[i + width];
      if (edge) pts.push({ x, y });
    }
  }
  return pts;
}

type Box = { rotation: number; center: Point; w: number; h: number };

function boxAt(pts: Point[], deg: number): Box {
  const o = { x: 0, y: 0 };
  let minU = Infinity;
  let maxU = -Infinity;
  let minV = Infinity;
  let maxV = -Infinity;
  for (const p of pts) {
    const q = rotatePoint(p, o, -deg);
    if (q.x < minU) minU = q.x;
    if (q.x > maxU) maxU = q.x;
    if (q.y < minV) minV = q.y;
    if (q.y > maxV) maxV = q.y;
  }
  const center = rotatePoint({ x: (minU + maxU) / 2, y: (minV + maxV) / 2 }, o, deg);
  return { rotation: deg, center, w: maxU - minU + 1, h: maxV - minV + 1 };
}

/** Minimum-area rotated bounding box (coarse 1 degree sweep, then a 0.25 degree refinement). */
export function minAreaBox(pts: Point[]): Box {
  let best = boxAt(pts, 0);
  for (let d = -45; d < 45; d += 1) {
    const b = boxAt(pts, d);
    if (b.w * b.h < best.w * best.h) best = b;
  }
  const coarse = best.rotation;
  for (let d = coarse - 1; d <= coarse + 1; d += 0.25) {
    const b = boxAt(pts, d);
    if (b.w * b.h < best.w * best.h) best = b;
  }
  return best;
}

/** Distance from the center to the region edge along evenly spaced rays (tolerates 2 px gaps). */
function radialProfile({ mask, width, height }: ArenaRegion, c: Point): number[] {
  const radii: number[] = [];
  const maxR = Math.hypot(width, height);
  for (let k = 0; k < RAY_COUNT; k++) {
    const a = (k / RAY_COUNT) * Math.PI * 2;
    const dx = Math.cos(a);
    const dy = Math.sin(a);
    let last = 0;
    let misses = 0;
    for (let r = 0; r < maxR; r++) {
      const x = Math.round(c.x + dx * r);
      const y = Math.round(c.y + dy * r);
      if (x < 0 || y < 0 || x >= width || y >= height) break;
      if (mask[y * width + x]) {
        last = r;
        misses = 0;
      } else if (++misses > 2) break;
    }
    radii.push(last);
  }
  return radii;
}

type Arm = { angle: number; reach: number };

/** Contiguous runs of long rays are arms; returns each arm's direction (degrees) and length. */
export function findArms(radii: number[]): Arm[] {
  const n = radii.length;
  const peak = Math.max(...radii);
  const on = radii.map((r) => r >= peak * ARM_LEVEL);
  if (on.every(Boolean) || !on.some(Boolean)) return [];
  // Start scanning just after a gap so runs never wrap around the array end.
  const start = on.findIndex((v, i) => !v && on[(i + 1) % n]) + 1;
  const arms: Arm[] = [];
  let run: number[] = [];
  for (let s = 0; s <= n; s++) {
    const i = (start + s) % n;
    if (s < n && on[i]) {
      run.push(s + start);
      continue;
    }
    if (run.length >= 2) {
      const mid = (run[0] + run[run.length - 1]) / 2;
      arms.push({ angle: normalizeDeg((mid / n) * 360), reach: Math.max(...run.map((j) => radii[j % n])) });
    }
    run = [];
  }
  return arms;
}

/** Mean orientation of a k-fold symmetric pattern, reduced to one sector around 0. */
function symmetricMean(angles: number[], k: number): number {
  let sx = 0;
  let sy = 0;
  for (const a of angles) {
    const r = (a * k * Math.PI) / 180;
    sx += Math.cos(r);
    sy += Math.sin(r);
  }
  return (Math.atan2(sy, sx) * 180) / Math.PI / k;
}

function spacingScore(arms: Arm[], k: number): number {
  const sorted = [...arms].map((a) => ((a.angle % 360) + 360) % 360).sort((a, b) => a - b);
  const step = 360 / k;
  const devs = sorted.map((a, i) => {
    const next = i === sorted.length - 1 ? sorted[0] + 360 : sorted[i + 1];
    return Math.abs(next - a - step);
  });
  const reaches = arms.map((a) => a.reach);
  const reachSpread = (Math.max(...reaches) - Math.min(...reaches)) / Math.max(...reaches);
  return clamp01(1 - devs.reduce((s, d) => s + d, 0) / devs.length / (step / 2)) * clamp01(1 - reachSpread);
}

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
};

function squareAround(c: Point, half: number, rotation: number): Arena {
  return { shape: "rect", rect: { x: c.x - half, y: c.y - half, w: half * 2, h: half * 2 }, rotation };
}

function clampSize(id: TemplateId, size: number): number {
  const [lo, hi] = getTemplate(id).sizeRange;
  return Math.min(hi, Math.max(lo, size));
}

/**
 * Recognizes the maze in an image (background or live frame) and fits the arena to it:
 * position, size, rotation and, for arm mazes, the arm width.
 */
export function detectMaze(img: Gray): MazeDetection | null {
  const region = segmentArena(img);
  if (!region) return null;
  const { blob } = region;
  const c = { x: blob.cx, y: blob.cy };
  const box = minAreaBox(boundary(region));
  const fill = blob.area / (box.w * box.h);
  const aspect = box.w / box.h;

  const asRect = (confidence: number): MazeDetection => {
    // Snap near-straight boxes so a level camera gives a level arena.
    const rotation = Math.abs(box.rotation) < 0.75 ? 0 : box.rotation;
    return {
      kind: "open-field",
      arena: { shape: "rect", rect: { x: box.center.x - box.w / 2, y: box.center.y - box.h / 2, w: box.w, h: box.h }, rotation },
      confidence,
    };
  };

  if (fill >= 0.88) return asRect(clamp01((fill - 0.8) / 0.15));

  const radii = radialProfile(region, c);
  const mean = radii.reduce((s, r) => s + r, 0) / radii.length;
  const cv = Math.sqrt(radii.reduce((s, r) => s + (r - mean) ** 2, 0) / radii.length) / mean;
  if (fill > 0.68 && aspect > 0.85 && aspect < 1.18 && cv < 0.1) {
    const r = Math.sqrt(blob.area / Math.PI);
    return {
      kind: "water-maze",
      arena: { shape: "circle", rect: { x: c.x - r, y: c.y - r, w: r * 2, h: r * 2 } },
      confidence: clamp01(1 - cv * 6),
    };
  }

  const arms = findArms(radii);
  const reach = arms.length ? median(arms.map((a) => a.reach)) : 0;
  if (arms.length === 4 && reach > 0) {
    // Cross of two bars (2L x w) overlapping in a w x w center: area = 4Lw - w^2.
    const w = 2 * reach - Math.sqrt(Math.max(4 * reach * reach - blob.area, 0));
    return {
      kind: "elevated-plus",
      arena: squareAround(c, reach, normalizeDeg(symmetricMean(arms.map((a) => a.angle), 4))),
      size: clampSize("elevated-plus", w / (2 * reach)),
      confidence: spacingScore(arms, 4),
    };
  }
  if (arms.length === 3 && reach > 0) {
    // Template arm A points up (-90 degrees); the arena rotation turns it onto the detected arms.
    const offset = symmetricMean(arms.map((a) => a.angle + 90), 3);
    const w = blob.area / (3 * reach);
    return {
      kind: "y-maze",
      arena: squareAround(c, reach, normalizeDeg(offset)),
      size: clampSize("y-maze", w / (2 * reach)),
      confidence: spacingScore(arms, 3),
    };
  }
  return asRect(0.3);
}

/** Template to use for a detection, keeping the user's choice when it fits the detected shape. */
export function templateFor(kind: MazeKind, current: TemplateId): TemplateId {
  if (kind === "elevated-plus" || kind === "y-maze") return kind;
  if (current === "custom") return current;
  if (kind === "water-maze") return "water-maze";
  const fitsRect = getTemplate(current).shape === "rect" && current !== "elevated-plus" && current !== "y-maze";
  return fitsRect ? current : "open-field";
}

/**
 * Symmetric mazes look identical every `period` degrees (90 for squares and plus mazes, 120 for
 * Y-mazes), so pick the equivalent detected angle closest to the current one. This keeps arm
 * labels (open vs closed, A/B/C) on the same physical arms. Rectangles that aren't square swap
 * width and height on a 90 degree turn, so that case is undone too.
 */
export function alignArena(prev: Arena, next: Arena, period: number): Arena {
  if (next.shape === "circle") return next;
  const cur = prev.rotation ?? 0;
  const raw = next.rotation ?? 0;
  const steps = Math.round(normalizeDeg(cur - raw) / period);
  const rotation = normalizeDeg(raw + steps * period);
  const quarterTurns = period === 90 ? Math.abs(steps) % 2 : 0;
  if (!quarterTurns) return { ...next, rotation };
  const c = rectCenter(next.rect);
  const { w, h } = { w: next.rect.h, h: next.rect.w };
  return { ...next, rotation, rect: { x: c.x - w / 2, y: c.y - h / 2, w, h } };
}

/** True when the new arena differs enough from the old one to be worth applying (ignores jitter). */
export function arenaMoved(prev: Arena, next: Arena): boolean {
  if (prev.shape !== next.shape) return true;
  const size = Math.max(prev.rect.w, prev.rect.h, 1);
  const a = rectCenter(prev.rect);
  const b = rectCenter(next.rect);
  const shift = Math.hypot(a.x - b.x, a.y - b.y) / size;
  const grow = Math.max(Math.abs(prev.rect.w - next.rect.w), Math.abs(prev.rect.h - next.rect.h)) / size;
  const turn = Math.abs(normalizeDeg((prev.rotation ?? 0) - (next.rotation ?? 0)));
  return shift > 0.015 || grow > 0.02 || turn > 1;
}

/** Moves part of the way toward the new arena so live auto-follow glides instead of jumping. */
export function blendArena(prev: Arena, next: Arena, alpha: number): Arena {
  if (prev.shape !== next.shape) return next;
  const mix = (p: number, n: number) => p + (n - p) * alpha;
  const rot = prev.rotation ?? 0;
  return {
    shape: next.shape,
    rect: { x: mix(prev.rect.x, next.rect.x), y: mix(prev.rect.y, next.rect.y), w: mix(prev.rect.w, next.rect.w), h: mix(prev.rect.h, next.rect.h) },
    // Round arenas look the same at any angle, so keep the user's quadrant orientation.
    rotation: next.shape === "circle" ? prev.rotation : normalizeDeg(rot + normalizeDeg((next.rotation ?? 0) - rot) * alpha),
  };
}
