import { describe, expect, it } from "vitest";
import { availableMetrics, compareGroups, groupSeries, sessionsOf, type StatsTrial } from "./group-data.ts";

const trial = (id: string, subjectId: string, session: string, distance: number, center: number | null = 10): StatsTrial => ({
  _id: id,
  subjectId,
  session,
  summary: { duration: 100, totalDistance: distance, meanSpeed: distance / 100, maxSpeed: 20, mobileTime: 80, immobileTime: 20 },
  zones: [{ id: "center", name: "Center", time: 25, entries: 3, latency: 4 }],
  measures: [{ label: "Center time", value: center, unit: "%", digits: 1 }],
});

const groups = [
  { _id: "g1", name: "Control", color: "#0ea5e9" },
  { _id: "g2", name: "Drug", color: "#f97316" },
  { _id: "g3", name: "High dose", color: "#a855f7" },
];
const subjects = [
  { _id: "s1", code: "M1", groupId: "g1" },
  { _id: "s2", code: "M2", groupId: "g1" },
  { _id: "s3", code: "M3", groupId: "g2" },
  { _id: "s4", code: "M4", groupId: "g2" },
  { _id: "s5", code: "M5", groupId: null },
];

const distance = availableMetrics([trial("x", "s1", "Day 1", 1)]).find((m) => m.key === "distance");
if (!distance) throw new Error("distance metric missing");

describe("availableMetrics", () => {
  it("lists test measures first and derives zone percentages", () => {
    const metrics = availableMetrics([trial("t", "s1", "Day 1", 100)]);
    expect(metrics[0]?.label).toBe("Center time");
    const zone = metrics.find((m) => m.key === "zone-time:center");
    expect(zone?.read(trial("t", "s1", "Day 1", 100))).toBe(25);
  });
});

describe("groupSeries", () => {
  const trials = [
    trial("a", "s1", "Day 1", 100),
    trial("b", "s1", "Day 1", 200), // second trial of the same animal is averaged, not double counted
    trial("c", "s2", "Day 1", 300),
    trial("d", "s3", "Day 1", 500),
    trial("e", "s4", "Day 2", 900),
    trial("f", "s5", "Day 1", 50),
  ];

  it("averages repeated trials per animal and filters by session", () => {
    const series = groupSeries(trials, subjects, groups, distance, "Day 1", false);
    expect(series.map((s) => s.group.name)).toEqual(["Control", "Drug"]);
    expect(series[0]?.values.map((v) => v.value)).toEqual([150, 300]);
    expect(series[0]?.values[0]?.trials).toBe(2);
    expect(series[1]?.values).toHaveLength(1);
  });

  it("includes ungrouped animals only when asked", () => {
    const series = groupSeries(trials, subjects, groups, distance, null, true);
    expect(series.at(-1)?.group.name).toBe("No group");
  });

  it("skips missing values", () => {
    const center = availableMetrics(trials)[0];
    const series = groupSeries([trial("z", "s1", "Day 1", 1, null)], subjects, groups, center, null, false);
    expect(series).toHaveLength(0);
  });

  it("orders sessions naturally", () => {
    expect(sessionsOf([trial("1", "s1", "Day 10", 1), trial("2", "s1", "Day 2", 1)])).toEqual(["Day 2", "Day 10"]);
  });
});

describe("compareGroups", () => {
  const trials = ["s1", "s2", "s3", "s4"].map((s, i) => trial(s, s, "Day 1", [100, 120, 300, 320][i]));

  it("uses a t-test for two groups", () => {
    const r = compareGroups(groupSeries(trials, subjects, groups, distance, null, false));
    expect(r.kind).toBe("t-test");
    if (r.kind === "t-test") expect(r.test.p).toBeLessThan(0.05);
  });

  it("uses ANOVA with corrected pairwise tests for three groups", () => {
    const more = [
      ...trials,
      trial("s6", "s6", "Day 1", 600),
      trial("s7", "s7", "Day 1", 640),
    ];
    const subs = [...subjects, { _id: "s6", code: "M6", groupId: "g3" }, { _id: "s7", code: "M7", groupId: "g3" }];
    const r = compareGroups(groupSeries(more, subs, groups, distance, null, false));
    expect(r.kind).toBe("anova");
    if (r.kind === "anova") {
      expect(r.pairwise).toHaveLength(3);
      for (const p of r.pairwise) expect(p.pAdjusted).toBeGreaterThanOrEqual(p.test.p);
    }
  });

  it("explains why no test is possible", () => {
    const r = compareGroups(groupSeries([trials[0], trials[2]], subjects, groups, distance, null, false));
    expect(r.kind).toBe("none");
  });
});
