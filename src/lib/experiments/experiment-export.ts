import { availableMetrics, type StatsGroup, type StatsSubject, type StatsTrial } from "./group-data.ts";
import type { Row } from "@/lib/export-data.ts";

type TrialExportRow = StatsTrial & { recordedAt: string; summary: { detectedPct: number } };
type SubjectExport = StatsSubject & { sex: string; notes?: string; trialCount: number };

const num = (n: number | null, digits = 4) => (n === null || !Number.isFinite(n) ? null : Number(n.toFixed(digits)));

/** One row per saved trial: identifiers first, then every locomotion, zone and test measure. */
export function trialExportRows(trials: TrialExportRow[], subjects: SubjectExport[], groups: StatsGroup[]): Row[] {
  const subjectById = new Map(subjects.map((s) => [s._id, s]));
  const groupById = new Map(groups.map((g) => [g._id, g]));
  const metrics = availableMetrics(trials);
  return trials.map((t) => {
    const subject = subjectById.get(t.subjectId);
    const row: Row = {
      subject: subject?.code ?? "Deleted subject",
      group: (subject?.groupId && groupById.get(subject.groupId)?.name) || "No group",
      session: t.session,
      recorded_at_utc: t.recordedAt,
      duration_s: num(t.summary.duration),
      detected_pct: num(t.summary.detectedPct),
    };
    // Same label can appear with different units (e.g. seconds and %), so the unit is part of the header.
    for (const m of metrics) row[m.unit ? `${m.label} (${m.unit})` : m.label] = num(m.read(t));
    return row;
  });
}

export function subjectExportRows(subjects: SubjectExport[], groups: StatsGroup[]): Row[] {
  const groupById = new Map(groups.map((g) => [g._id, g]));
  return subjects.map((s) => ({
    subject: s.code,
    group: (s.groupId && groupById.get(s.groupId)?.name) || "No group",
    sex: s.sex,
    trials: s.trialCount,
    notes: s.notes ?? "",
  }));
}

export function groupExportRows(subjects: SubjectExport[], groups: StatsGroup[]): Row[] {
  return groups.map((g) => ({
    group: g.name,
    color: g.color,
    subjects: subjects.filter((s) => s.groupId === g._id).length,
  }));
}
