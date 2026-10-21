import { bonferroni, describe, oneWayAnova, welchTTest, type AnovaResult, type Descriptives, type TTestResult } from "./stats.ts";

/** Shape of one row from `api.experiments.trials.statsData`, kept structural so it stays testable. */
export type StatsTrial = {
  _id: string;
  subjectId: string;
  session: string;
  summary: { duration: number; totalDistance: number; meanSpeed: number; maxSpeed: number; mobileTime: number; immobileTime: number };
  zones: { id: string; name: string; time: number; entries: number; latency: number | null }[];
  measures: { label: string; value: number | null; unit: string; digits: number }[];
};

export type StatsSubject = { _id: string; code: string; groupId: string | null };
export type StatsGroup = { _id: string; name: string; color: string };

export type Metric = {
  key: string;
  label: string;
  unit: string;
  digits: number;
  category: "Test" | "Locomotion" | "Zones";
  read: (t: StatsTrial) => number | null;
};

const pct = (part: number, whole: number) => (whole > 0 ? (part / whole) * 100 : null);

const LOCOMOTION: Metric[] = [
  { key: "distance", label: "Total distance", unit: "cm", digits: 1, category: "Locomotion", read: (t) => t.summary.totalDistance },
  { key: "mean-speed", label: "Mean speed", unit: "cm/s", digits: 2, category: "Locomotion", read: (t) => t.summary.meanSpeed },
  { key: "max-speed", label: "Max speed", unit: "cm/s", digits: 1, category: "Locomotion", read: (t) => t.summary.maxSpeed },
  { key: "immobile", label: "Immobile time", unit: "s", digits: 1, category: "Locomotion", read: (t) => t.summary.immobileTime },
  {
    key: "immobile-pct",
    label: "Immobile time",
    unit: "%",
    digits: 1,
    category: "Locomotion",
    read: (t) => pct(t.summary.immobileTime, t.summary.duration),
  },
];

/** Every metric present in the data: test measures first, then locomotion, then each zone. */
export function availableMetrics(trials: StatsTrial[]): Metric[] {
  const tests = new Map<string, Metric>();
  const zones = new Map<string, string>();
  for (const t of trials) {
    for (const m of t.measures) {
      const key = `test:${m.label}|${m.unit}`;
      if (!tests.has(key)) {
        tests.set(key, {
          key,
          label: m.label,
          unit: m.unit,
          digits: m.digits,
          category: "Test",
          read: (x) => x.measures.find((y) => y.label === m.label && y.unit === m.unit)?.value ?? null,
        });
      }
    }
    for (const z of t.zones) if (!zones.has(z.id)) zones.set(z.id, z.name);
  }
  const zoneMetrics = [...zones].flatMap(([id, name]): Metric[] => {
    const zone = (t: StatsTrial) => t.zones.find((z) => z.id === id);
    return [
      { key: `zone-time:${id}`, label: `${name} time`, unit: "%", digits: 1, category: "Zones", read: (t) => { const z = zone(t); return z ? pct(z.time, t.summary.duration) : null; } },
      { key: `zone-entries:${id}`, label: `${name} entries`, unit: "", digits: 0, category: "Zones", read: (t) => zone(t)?.entries ?? null },
      { key: `zone-latency:${id}`, label: `${name} latency`, unit: "s", digits: 1, category: "Zones", read: (t) => zone(t)?.latency ?? null },
    ];
  });
  return [...tests.values(), ...LOCOMOTION, ...zoneMetrics];
}

export function sessionsOf(trials: StatsTrial[]): string[] {
  return [...new Set(trials.map((t) => t.session))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

export type SubjectValue = { subjectId: string; code: string; value: number; trials: number };

export type GroupSeries = {
  group: StatsGroup;
  values: SubjectValue[];
  stats: Descriptives | null;
};

export type PairwiseResult = { a: StatsGroup; b: StatsGroup; test: TTestResult; pAdjusted: number };

export type Comparison =
  | { kind: "none"; reason: string }
  | { kind: "t-test"; a: StatsGroup; b: StatsGroup; test: TTestResult }
  | { kind: "anova"; anova: AnovaResult; pairwise: PairwiseResult[] };

export const UNGROUPED: StatsGroup = { _id: "ungrouped", name: "No group", color: "#94a3b8" };

/**
 * One value per subject (the mean of its trials in the chosen session), grouped by the subject's
 * group. Averaging per animal avoids counting repeated trials as independent samples.
 */
export function groupSeries(
  trials: StatsTrial[],
  subjects: StatsSubject[],
  groups: StatsGroup[],
  metric: Metric,
  session: string | null,
  includeUngrouped: boolean,
): GroupSeries[] {
  const subjectById = new Map(subjects.map((s) => [s._id, s]));
  const perSubject = new Map<string, number[]>();
  for (const t of trials) {
    if (session !== null && t.session !== session) continue;
    const v = metric.read(t);
    if (v === null || !Number.isFinite(v) || !subjectById.has(t.subjectId)) continue;
    const list = perSubject.get(t.subjectId) ?? [];
    list.push(v);
    perSubject.set(t.subjectId, list);
  }
  const allGroups = includeUngrouped ? [...groups, UNGROUPED] : groups;
  return allGroups
    .map((group) => {
      const values: SubjectValue[] = [];
      for (const [subjectId, vs] of perSubject) {
        const s = subjectById.get(subjectId);
        if (!s || (s.groupId ?? UNGROUPED._id) !== group._id) continue;
        values.push({ subjectId, code: s.code, value: vs.reduce((a, b) => a + b, 0) / vs.length, trials: vs.length });
      }
      values.sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));
      return { group, values, stats: describe(values.map((v) => v.value)) };
    })
    .filter((g) => g.values.length > 0);
}

/** Welch t-test for two groups; one-way ANOVA plus Bonferroni-corrected pairwise tests for 3+. */
export function compareGroups(series: GroupSeries[]): Comparison {
  const usable = series.filter((s) => s.values.length >= 2);
  if (series.length < 2) return { kind: "none", reason: "Assign subjects to at least two groups to compare them." };
  if (usable.length < 2) return { kind: "none", reason: "Each group needs at least 2 animals with data for a statistical test." };
  if (usable.length === 2) {
    const [a, b] = usable;
    const test = welchTTest(a.values.map((v) => v.value), b.values.map((v) => v.value));
    return test ? { kind: "t-test", a: a.group, b: b.group, test } : { kind: "none", reason: "Not enough data for a t-test." };
  }
  const anova = oneWayAnova(usable.map((s) => s.values.map((v) => v.value)));
  if (!anova) return { kind: "none", reason: "Not enough data for ANOVA." };
  const pairs: { a: GroupSeries; b: GroupSeries }[] = [];
  for (let i = 0; i < usable.length; i++) for (let j = i + 1; j < usable.length; j++) pairs.push({ a: usable[i], b: usable[j] });
  const pairwise = pairs.flatMap(({ a, b }): PairwiseResult[] => {
    const test = welchTTest(a.values.map((v) => v.value), b.values.map((v) => v.value));
    return test ? [{ a: a.group, b: b.group, test, pAdjusted: bonferroni(test.p, pairs.length) }] : [];
  });
  return { kind: "anova", anova, pairwise };
}

/** Long-format rows (one per subject) for CSV export to other stats software. */
export function seriesRows(series: GroupSeries[], metric: Metric, session: string | null) {
  return series.flatMap((s) =>
    s.values.map((v) => ({
      group: s.group.name,
      subject: v.code,
      session: session ?? "All sessions",
      measure: metric.unit ? `${metric.label} (${metric.unit})` : metric.label,
      value: Number(v.value.toFixed(4)),
      trials_averaged: v.trials,
    })),
  );
}
