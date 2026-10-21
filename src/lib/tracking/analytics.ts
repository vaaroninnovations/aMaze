import { distance } from "./geometry.ts";
import { assignZones, JITTER_CM } from "./metrics.ts";
import type { TrackPoint, Zone } from "./types.ts";

export type SpeedSample = { t: number; speed: number };

export type Bout = { start: number; end: number; duration: number };

export type Interval = { start: number; end: number };

export type ZoneOccupancy = { id: string; name: string; color: string; intervals: Interval[] };

export type HeatGrid = { cols: number; rows: number; cell: number; data: Float32Array; max: number };

/** Longest gap (s) between samples still attributed to a location; larger gaps are tracking loss. */
const MAX_GAP_S = 1;

const foundOnly = (points: TrackPoint[]) => points.filter((p) => p.found);

/** Instantaneous speed (cm/s) per detected sample, optionally smoothed with a centered moving average. */
export function speedSeries(points: TrackPoint[], pxPerCm: number, smoothWindow = 1): SpeedSample[] {
  const found = foundOnly(points);
  const raw = found.map((p, i) => {
    const prev = found[i - 1];
    if (!prev) return { t: p.t, speed: 0 };
    const dt = p.t - prev.t;
    const cm = distance(prev, p) / pxPerCm;
    return { t: p.t, speed: dt > 0 && cm >= JITTER_CM ? cm / dt : 0 };
  });
  const half = Math.floor(Math.max(smoothWindow, 1) / 2);
  if (half === 0) return raw;
  return raw.map((s, i) => {
    const from = Math.max(1, i - half);
    const to = Math.min(raw.length - 1, i + half);
    if (i === 0 || to < from) return s;
    let sum = 0;
    for (let j = from; j <= to; j++) sum += raw[j].speed;
    return { t: s.t, speed: sum / (to - from + 1) };
  });
}

/** Contiguous runs below a speed threshold lasting at least `minDuration` seconds. */
export function immobilityBouts(series: SpeedSample[], threshold: number, minDuration: number): Bout[] {
  const bouts: Bout[] = [];
  let start: number | null = null;
  let last = 0;
  const close = () => {
    if (start !== null && last - start >= minDuration) bouts.push({ start, end: last, duration: last - start });
    start = null;
  };
  for (let i = 1; i < series.length; i++) {
    const s = series[i];
    const gap = s.t - series[i - 1].t > MAX_GAP_S;
    if (s.speed < threshold && !gap) {
      if (start === null) start = series[i - 1].t;
      last = s.t;
    } else {
      close();
    }
  }
  close();
  return bouts;
}

export type BoutSummary = { count: number; total: number; mean: number; longest: number; latency: number | null };

export function summarizeBouts(bouts: Bout[], t0: number): BoutSummary {
  const total = bouts.reduce((a, b) => a + b.duration, 0);
  return {
    count: bouts.length,
    total,
    mean: bouts.length ? total / bouts.length : 0,
    longest: bouts.reduce((a, b) => Math.max(a, b.duration), 0),
    latency: bouts.length ? bouts[0].start - t0 : null,
  };
}

/** Time intervals spent in each zone, merged where contiguous. */
export function zoneOccupancy(points: TrackPoint[], zones: Zone[]): ZoneOccupancy[] {
  const found = foundOnly(points);
  const hits = assignZones(found, zones);
  return zones.map((z) => {
    const intervals: Interval[] = [];
    found.forEach((p, i) => {
      const next = found[i + 1];
      if (!next || next.t - p.t > MAX_GAP_S || !hits[i].includes(z.id)) return;
      const last = intervals[intervals.length - 1];
      if (last && Math.abs(last.end - p.t) < 1e-9) last.end = next.t;
      else intervals.push({ start: p.t, end: next.t });
    });
    return { id: z.id, name: z.name, color: z.color, intervals };
  });
}

/** Ordered list of zone entries restricted to `ids`. Leaving all of them and coming back counts as a new entry. */
export function entrySequence(points: TrackPoint[], zones: Zone[], ids: string[]): string[] {
  const subset = zones.filter((z) => ids.includes(z.id));
  const hits = assignZones(foundOnly(points), zones);
  const seq: string[] = [];
  let current: string | null = null;
  for (const h of hits) {
    const inside = subset.find((z) => h.includes(z.id))?.id ?? null;
    if (inside && inside !== current) seq.push(inside);
    current = inside;
  }
  return seq;
}

/** Spontaneous alternation: share of overlapping triplets that visit three different arms. */
export function alternation(seq: string[]): { alternations: number; possible: number; pct: number } {
  const possible = Math.max(seq.length - 2, 0);
  let alternations = 0;
  for (let i = 2; i < seq.length; i++) {
    if (new Set([seq[i - 2], seq[i - 1], seq[i]]).size === 3) alternations++;
  }
  return { alternations, possible, pct: possible ? (alternations / possible) * 100 : 0 };
}

function blur(src: Float32Array, cols: number, rows: number): Float32Array {
  const k = [1, 4, 6, 4, 1];
  const tmp = new Float32Array(src.length);
  const out = new Float32Array(src.length);
  const pass = (from: Float32Array, to: Float32Array, horizontal: boolean) => {
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        let sum = 0;
        let wsum = 0;
        for (let o = -2; o <= 2; o++) {
          const xx = horizontal ? x + o : x;
          const yy = horizontal ? y : y + o;
          if (xx < 0 || yy < 0 || xx >= cols || yy >= rows) continue;
          sum += from[yy * cols + xx] * k[o + 2];
          wsum += k[o + 2];
        }
        to[y * cols + x] = sum / wsum;
      }
    }
  };
  pass(src, tmp, true);
  pass(tmp, out, false);
  return out;
}

/** Time-weighted occupancy grid over the frame, lightly smoothed. Values are seconds per cell. */
export function heatmapGrid(points: TrackPoint[], w: number, h: number, cols: number, smooth = true): HeatGrid {
  const cell = w / cols;
  const rows = Math.max(1, Math.round(h / cell));
  let data: Float32Array = new Float32Array(cols * rows);
  const found = foundOnly(points);
  found.forEach((p, i) => {
    const next = found[i + 1];
    const dt = next ? Math.min(next.t - p.t, MAX_GAP_S) : 0;
    const cx = Math.min(cols - 1, Math.max(0, Math.floor(p.x / cell)));
    const cy = Math.min(rows - 1, Math.max(0, Math.floor(p.y / cell)));
    data[cy * cols + cx] += dt;
  });
  if (smooth) data = blur(data, cols, rows);
  let max = 0;
  for (const v of data) if (v > max) max = v;
  return { cols, rows, cell, data, max };
}
