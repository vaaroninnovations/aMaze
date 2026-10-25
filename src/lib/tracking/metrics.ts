import { distance, zoneContains } from "./geometry.ts";
import type { TrackPoint, Zone } from "./types.ts";

export type ZoneStats = {
  id: string;
  name: string;
  color: string;
  time: number;
  entries: number;
  latency: number | null;
  distance: number;
};

export type TrackSummary = {
  duration: number;
  detectedPct: number;
  totalDistance: number;
  meanSpeed: number;
  maxSpeed: number;
  mobileTime: number;
  immobileTime: number;
  zones: ZoneStats[];
};

/** Movements smaller than this (cm) between samples are treated as detection jitter. */
export const JITTER_CM = 0.15;
/** Below this speed (cm/s) the animal is considered immobile. */
const IMMOBILE_SPEED = 2;

/** Returns the ids of every zone each point falls inside. */
export function assignZones(points: TrackPoint[], zones: Zone[]): string[][] {
  const byId = new Map(zones.map((z) => [z.id, z]));
  return points.map((p) => zones.filter((z) => zoneContains(z, p, byId)).map((z) => z.id));
}

export function summarize(points: TrackPoint[], zones: Zone[], pxPerCm: number): TrackSummary {
  const found = points.filter((p) => p.found);
  const zoneHits = assignZones(found, zones);
  const stats = new Map<string, ZoneStats>(
    zones.map((z) => [z.id, { id: z.id, name: z.name, color: z.color, time: 0, entries: 0, latency: null, distance: 0 }]),
  );
  const t0 = points[0]?.t ?? 0;
  let totalDistance = 0;
  let maxSpeed = 0;
  let mobileTime = 0;
  let immobileTime = 0;
  let prevInside = new Set<string>();

  found.forEach((p, i) => {
    const hits = new Set(zoneHits[i]);
    const prev = found[i - 1];
    const dt = prev ? p.t - prev.t : 0;
    const rawCm = prev ? distance(prev, p) / pxPerCm : 0;
    const stepCm = rawCm < JITTER_CM ? 0 : rawCm;
    // Guard against division by near-zero timestamp delta and cap spike artifacts
    const effectiveDt = Math.max(dt, 0.02);
    const rawSpeed = dt > 0 ? stepCm / effectiveDt : 0;
    const speed = Math.min(rawSpeed, 100);
    totalDistance += stepCm;
    if (speed > maxSpeed) maxSpeed = speed;
    if (dt > 0) {
      if (speed < IMMOBILE_SPEED) immobileTime += dt;
      else mobileTime += dt;
    }
    for (const id of hits) {
      const s = stats.get(id);
      if (!s) continue;
      if (dt > 0 && prevInside.has(id)) {
        s.time += dt;
        s.distance += stepCm;
      }
      if (!prevInside.has(id)) {
        s.entries++;
        if (s.latency === null) s.latency = p.t - t0;
      }
    }
    prevInside = hits;
  });

  const duration = points.length > 1 ? points[points.length - 1].t - t0 : 0;
  const moveTime = mobileTime + immobileTime;
  return {
    duration,
    detectedPct: points.length ? (found.length / points.length) * 100 : 0,
    totalDistance,
    meanSpeed: moveTime > 0 ? totalDistance / moveTime : 0,
    maxSpeed,
    mobileTime,
    immobileTime,
    zones: [...stats.values()],
  };
}
