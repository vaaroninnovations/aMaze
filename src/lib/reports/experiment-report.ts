import { format } from "date-fns";
import { availableMetrics, groupSeries, type StatsGroup, type StatsSubject, type StatsTrial } from "@/lib/experiments/group-data.ts";
import { addFigure, addFooters, addHeading, addNote, addTable, addTitle, newCursor } from "@/lib/pdf-helpers.ts";
import type { ReportFigure } from "./trial-report.ts";

type ReportTrial = StatsTrial & { recordedAt: string };
type ReportSubject = StatsSubject & { trialCount: number };

export type ExperimentReportInput = {
  name: string;
  description?: string;
  testName: string;
  groups: StatsGroup[];
  subjects: ReportSubject[];
  trials: ReportTrial[];
  truncated: boolean;
  /** Optional chart (e.g. the group comparison currently on screen). */
  chart?: ReportFigure;
};

const MAX_TRIAL_ROWS = 200;
const f = (n: number, d: number) => (Number.isFinite(n) ? n.toFixed(d) : "n/a");

/** Builds an experiment PDF: setup, group means per measure, and the trial list. */
export function buildExperimentReport(input: ExperimentReportInput) {
  const { groups, subjects, trials } = input;
  const c = newCursor();
  addTitle(c, input.name, [input.testName, `Generated ${format(new Date(), "MMM d, yyyy HH:mm")}`, ...(input.description ? [input.description] : [])]);

  addHeading(c, "Overview");
  const subjectsIn = (id: string) => subjects.filter((s) => s.groupId === id);
  const ungrouped = subjects.filter((s) => !s.groupId).length;
  addTable(
    c,
    ["Group", "Subjects", "Trials"],
    [
      ...groups.map((g) => [g.name, String(subjectsIn(g._id).length), String(subjectsIn(g._id).reduce((a, s) => a + s.trialCount, 0))]),
      ...(ungrouped ? [["No group", String(ungrouped), String(subjects.filter((s) => !s.groupId).reduce((a, s) => a + s.trialCount, 0))]] : []),
      ["Total", String(subjects.length), String(subjects.reduce((a, s) => a + s.trialCount, 0))],
    ],
  );

  if (input.chart) {
    addHeading(c, "Group comparison");
    addFigure(c, input.chart.dataUrl, input.chart.caption, 90);
  }

  const metrics = availableMetrics(trials);
  const body: string[][] = [];
  for (const m of metrics) {
    for (const s of groupSeries(trials, subjects, groups, m, null, false)) {
      if (!s.stats) continue;
      const d = Math.max(m.digits, 2);
      body.push([m.unit ? `${m.label} (${m.unit})` : m.label, s.group.name, String(s.stats.n), f(s.stats.mean, d), f(s.stats.sd, d), f(s.stats.sem, d)]);
    }
  }
  if (body.length) {
    addHeading(c, "Group statistics");
    addTable(c, ["Measure", "Group", "n", "Mean", "SD", "SEM"], body, 2);
    addNote(c, "One value per animal (mean of its trials), grouped by the animal's group. n is the number of animals.");
  }

  addHeading(c, "Trials");
  const subjectById = new Map(subjects.map((s) => [s._id, s]));
  const groupById = new Map(groups.map((g) => [g._id, g]));
  const shown = trials.slice(0, MAX_TRIAL_ROWS);
  addTable(
    c,
    ["Subject", "Group", "Session", "Distance (cm)", "Mean speed (cm/s)"],
    shown.map((t) => {
      const subject = subjectById.get(t.subjectId);
      return [
        subject?.code ?? "Deleted",
        (subject?.groupId && groupById.get(subject.groupId)?.name) || "No group",
        t.session,
        f(t.summary.totalDistance, 1),
        f(t.summary.meanSpeed, 2),
      ];
    }),
    3,
  );
  if (trials.length > shown.length || input.truncated) {
    addNote(c, `Showing ${shown.length} trials. Use the data export for the complete list.`);
  }

  addFooters(c, input.name);
  return c.doc;
}
