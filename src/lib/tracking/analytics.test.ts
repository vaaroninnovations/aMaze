import { describe, expect, it } from "vitest";
import { alternation, entrySequence, heatmapGrid, immobilityBouts, speedSeries, zoneOccupancy } from "./analytics.ts";
import { summarize } from "./metrics.ts";
import { testMeasures } from "./test-measures.ts";
import { buildZones, defaultParams } from "./templates.ts";
import type { Arena, TrackPoint } from "./types.ts";

const arena: Arena = { shape: "rect", rect: { x: 0, y: 0, w: 100, h: 100 } };
const pt = (t: number, x: number, y: number, found = true): TrackPoint => ({ t, x, y, found, area: 10 });

describe("immobility bouts", () => {
  it("finds still stretches longer than the minimum and ignores short ones", () => {
    // 10 px/cm. Moves fast, still 1-4 s, moves, still briefly at 6-6.5 s.
    const track = [pt(0, 0, 0), pt(1, 50, 0), pt(2, 50, 0), pt(3, 50, 0), pt(4, 50, 0), pt(5, 100, 0), pt(5.5, 100, 0)];
    const series = speedSeries(track, 10, 1);
    const bouts = immobilityBouts(series, 2, 1);
    expect(bouts).toHaveLength(1);
    expect(bouts[0].start).toBe(1);
    expect(bouts[0].end).toBe(4);
    expect(bouts[0].duration).toBe(3);
  });
});

describe("alternation", () => {
  it("counts triplets of three different arms", () => {
    expect(alternation(["a", "b", "c", "a", "b"])).toEqual({ alternations: 3, possible: 3, pct: 100 });
    expect(alternation(["a", "b", "a", "b"]).alternations).toBe(0);
    expect(alternation(["a"]).pct).toBe(0);
  });

  it("builds entry sequences from a Y-maze track", () => {
    const zones = buildZones("y-maze", arena, defaultParams("y-maze"));
    const at = (id: string) => {
      const poly = zones.find((z) => z.id === id)!.polygon;
      return { x: poly.reduce((a, p) => a + p.x, 0) / poly.length, y: poly.reduce((a, p) => a + p.y, 0) / poly.length };
    };
    const track = ["arm-0", "arm-1", "arm-1", "arm-2"].map((id, i) => ({ ...at(id), t: i, found: true, area: 1 }));
    expect(entrySequence(track, zones, ["arm-0", "arm-1", "arm-2"])).toEqual(["arm-0", "arm-1", "arm-2"]);
  });
});

describe("zone occupancy and heatmap", () => {
  const zones = buildZones("open-field", arena, defaultParams("open-field"));

  it("merges contiguous time in a zone", () => {
    const occ = zoneOccupancy([pt(0, 50, 50), pt(1, 50, 50), pt(2, 50, 50), pt(3, 5, 5)], zones);
    expect(occ.find((o) => o.id === "center")?.intervals).toEqual([{ start: 0, end: 3 }]);
  });

  it("accumulates dwell time in the right cell", () => {
    const grid = heatmapGrid([pt(0, 5, 5), pt(1, 95, 95)], 100, 100, 10, false);
    expect(grid.data[0]).toBe(1);
    expect(grid.max).toBe(1);
  });
});

describe("test measures", () => {
  it("computes the novel object discrimination index", () => {
    const zones = buildZones("novel-object", arena, defaultParams("novel-object"));
    const center = (id: string) => {
      const poly = zones.find((z) => z.id === id)!.polygon;
      return { x: poly.reduce((s, p) => s + p.x, 0) / poly.length, y: poly.reduce((s, p) => s + p.y, 0) / poly.length };
    };
    const a = center("object-a");
    const b = center("object-b");
    // Familiar: 2 s (t1, t2). Novel: 3 s (t4, t5, t6).
    const track = [pt(0, a.x, a.y), pt(1, a.x, a.y), pt(2, a.x, a.y), pt(3, b.x, b.y), pt(4, b.x, b.y), pt(5, b.x, b.y), pt(6, b.x, b.y), pt(7, 50, 2)];
    const summary = summarize(track, zones, 10);
    const di = testMeasures("novel-object", { summary, zones, track }).find((x) => x.label === "Discrimination index");
    expect(di?.value).toBeCloseTo((3 - 2) / 5, 5);
  });
});
