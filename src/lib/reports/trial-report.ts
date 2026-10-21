import type { BoutSummary } from "@/lib/tracking/analytics.ts";
import type { TrackSummary } from "@/lib/tracking/metrics.ts";
import type { Measure } from "@/lib/tracking/test-measures.ts";
import { trialInfoRows, type TrialInfo } from "@/lib/experiments/trial-info.ts";
import { addFigure, addFooters, addHeading, addNote, addTable, addTitle, newCursor } from "@/lib/pdf-helpers.ts";

export type ReportFigure = { caption: string; dataUrl: string };

export type TrialReportInput = {
  title: string;
  /** Short lines under the title (test name, source file, date). */
  details: string[];
  info?: TrialInfo;
  summary: TrackSummary;
  measures: Measure[];
  bouts: BoutSummary;
  boutSettings: { threshold: number; minDuration: number };
  figures: ReportFigure[];
};

const fixed = (n: number | null, d = 1) => (n === null || !Number.isFinite(n) ? "n/a" : n.toFixed(d));

/** Builds a one-trial PDF: key numbers first, then the tracking path and charts. */
export function buildTrialReport(input: TrialReportInput) {
  const { summary: s, bouts, boutSettings } = input;
  const c = newCursor();
  addTitle(c, input.title, input.details);

  const info = trialInfoRows(input.info).filter((r) => String(r.value) !== "");
  if (info.length) {
    addHeading(c, "Experiment details");
    addTable(c, ["Field", "Value"], info.map((r) => [String(r.measure), String(r.value)]), 99);
  }

  if (input.measures.length) {
    addHeading(c, "Test measures");
    addTable(
      c,
      ["Measure", "Value", "Unit"],
      input.measures.map((m) => [m.label, fixed(m.value, m.digits), m.unit]),
    );
  }

  addHeading(c, "Locomotion");
  addTable(
    c,
    ["Measure", "Value", "Unit"],
    [
      ["Duration", fixed(s.duration), "s"],
      ["Animal detected", fixed(s.detectedPct), "%"],
      ["Total distance", fixed(s.totalDistance), "cm"],
      ["Mean speed", fixed(s.meanSpeed, 2), "cm/s"],
      ["Max speed", fixed(s.maxSpeed, 2), "cm/s"],
      ["Mobile time", fixed(s.mobileTime), "s"],
      ["Immobile time", fixed(s.immobileTime), "s"],
    ],
  );

  if (s.zones.length) {
    addHeading(c, "Zones");
    addTable(
      c,
      ["Zone", "Time (s)", "Entries", "Latency (s)", "Distance (cm)"],
      s.zones.map((z) => [z.name, fixed(z.time), String(z.entries), fixed(z.latency), fixed(z.distance)]),
    );
  }

  addHeading(c, "Immobility");
  addTable(
    c,
    ["Measure", "Value"],
    [
      ["Bouts", String(bouts.count)],
      ["Total immobile (s)", fixed(bouts.total)],
      ["Mean bout (s)", fixed(bouts.mean)],
      ["Longest bout (s)", fixed(bouts.longest)],
      ["First bout (s)", fixed(bouts.latency)],
    ],
  );
  addNote(c, `A bout is a stretch with speed below ${boutSettings.threshold} cm/s for at least ${boutSettings.minDuration.toFixed(1)} s.`);

  if (input.figures.length) {
    c.doc.addPage();
    c.y = 14;
    addHeading(c, "Figures");
    for (const f of input.figures) addFigure(c, f.dataUrl, f.caption);
  }

  addFooters(c, input.title);
  return c.doc;
}
