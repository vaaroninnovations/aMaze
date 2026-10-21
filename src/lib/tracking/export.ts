import Papa from "papaparse";
import { assignZones } from "./metrics.ts";
import type { Bout, SpeedSample } from "./analytics.ts";
import type { TrackSummary } from "./metrics.ts";
import type { Measure } from "./test-measures.ts";
import type { TrackPoint, Zone } from "./types.ts";

const r = (n: number | null, d = 3) => (n === null || !Number.isFinite(n) ? "" : Number(n.toFixed(d)));

export function downloadCsv(filename: string, rows: Record<string, string | number>[]) {
  const blob = new Blob(["\ufeff" + Papa.unparse(rows)], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/** One row per measure, in a long format that pastes cleanly into stats software. */
export function summaryRows(
  summary: TrackSummary,
  measures: Measure[],
  bouts: Bout[],
  boutSettings: { threshold: number; minDuration: number },
) {
  const rows: Record<string, string | number>[] = [];
  const add = (section: string, measure: string, value: number | null, unit: string) =>
    rows.push({ section, measure, value: r(value), unit });
  add("Trial", "Duration", summary.duration, "s");
  add("Trial", "Detected samples", summary.detectedPct, "%");
  add("Locomotion", "Total distance", summary.totalDistance, "cm");
  add("Locomotion", "Mean speed", summary.meanSpeed, "cm/s");
  add("Locomotion", "Max speed", summary.maxSpeed, "cm/s");
  add("Immobility", "Speed threshold", boutSettings.threshold, "cm/s");
  add("Immobility", "Minimum bout", boutSettings.minDuration, "s");
  add("Immobility", "Bouts", bouts.length, "");
  add("Immobility", "Total time", bouts.reduce((a, b) => a + b.duration, 0), "s");
  for (const z of summary.zones) {
    add(`Zone: ${z.name}`, "Time", z.time, "s");
    add(`Zone: ${z.name}`, "Time", summary.duration > 0 ? (z.time / summary.duration) * 100 : 0, "%");
    add(`Zone: ${z.name}`, "Entries", z.entries, "");
    add(`Zone: ${z.name}`, "Latency", z.latency, "s");
    add(`Zone: ${z.name}`, "Distance", z.distance, "cm");
  }
  for (const m of measures) add("Test", m.label, m.value, m.unit);
  return rows;
}

/** Sample-by-sample track with position in cm, speed, zone membership and immobility flag. */
export function trackRows(
  track: TrackPoint[],
  zones: Zone[],
  pxPerCm: number,
  origin: { x: number; y: number },
  speeds: SpeedSample[],
  bouts: Bout[],
) {
  const hits = assignZones(track, zones);
  const speedAt = new Map(speeds.map((s) => [s.t, s.speed]));
  return track.map((p, i) => {
    const row: Record<string, string | number> = {
      time_s: r(p.t),
      detected: p.found ? 1 : 0,
      x_cm: p.found ? r((p.x - origin.x) / pxPerCm) : "",
      y_cm: p.found ? r((p.y - origin.y) / pxPerCm) : "",
      speed_cm_s: p.found ? r(speedAt.get(p.t) ?? 0) : "",
      immobile: p.found && bouts.some((b) => p.t >= b.start && p.t <= b.end) ? 1 : 0,
    };
    for (const z of zones) row[`in_${z.id}`] = p.found && hits[i].includes(z.id) ? 1 : 0;
    return row;
  });
}

export function baseFilename(name: string | undefined) {
  return (name ?? "trial").replace(/\.[^.]+$/, "").replace(/[^\w-]+/g, "_") || "trial";
}
