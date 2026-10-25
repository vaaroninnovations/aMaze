import { describe, expect, it } from "vitest";
import { pointInPolygon, rectPolygon, rotatePoint } from "./geometry.ts";
import { alignArena, arenaMoved, detectMaze, templateFor } from "./maze-detect.ts";
import { buildZones, defaultParams } from "./templates.ts";
import type { Arena, Gray, Point } from "./types.ts";

const W = 160;
const H = 120;
const C = { x: 80, y: 60 };

/** Bright maze on a dark floor, drawn from a point-in-shape test. */
function draw(inside: (p: Point) => boolean): Gray {
  const data = new Uint8ClampedArray(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) data[y * W + x] = inside({ x, y }) ? 210 : 35;
  return { data, width: W, height: H };
}

/** Arena polygons from the app's own templates, so the test mazes match what users draw. */
function templateShape(id: "elevated-plus" | "y-maze", rotation: number, size: number) {
  const arena: Arena = { shape: "rect", rect: { x: C.x - 50, y: C.y - 50, w: 100, h: 100 }, rotation };
  const zones = buildZones(id, arena, { ...defaultParams(id), size });
  return (p: Point) => zones.some((z) => pointInPolygon(p, z.polygon));
}

const angleGap = (a: number, b: number, period: number) => {
  const d = (((a - b) % period) + period) % period;
  return Math.min(d, period - d);
};

describe("detectMaze", () => {
  it("fits a tilted rectangular open field with its rotation", () => {
    const poly = rectPolygon({ x: C.x - 45, y: C.y - 30, w: 90, h: 60 }).map((p) => rotatePoint(p, C, 12));
    const det = detectMaze(draw((p) => pointInPolygon(p, poly)));
    expect(det?.kind).toBe("open-field");
    expect(det?.arena.rotation ?? 0).toBeCloseTo(12, 0);
    expect(det?.arena.rect.w).toBeGreaterThan(84);
    expect(det?.arena.rect.w).toBeLessThan(96);
  });

  it("keeps a level arena perfectly straight", () => {
    const det = detectMaze(draw((p) => p.x >= 30 && p.x < 130 && p.y >= 15 && p.y < 105));
    expect(det?.kind).toBe("open-field");
    expect(det?.arena.rotation).toBe(0);
  });

  it("recognizes a round water maze", () => {
    const det = detectMaze(draw((p) => Math.hypot(p.x - C.x, p.y - C.y) < 45));
    expect(det?.kind).toBe("water-maze");
    expect(det?.arena.shape).toBe("circle");
    expect(det?.arena.rect.w).toBeCloseTo(90, -1);
  });

  it("recognizes a rotated plus maze and estimates the arm width", () => {
    const det = detectMaze(draw(templateShape("elevated-plus", 20, 0.14)));
    expect(det?.kind).toBe("elevated-plus");
    expect(angleGap(det?.arena.rotation ?? 0, 20, 90)).toBeLessThan(4);
    expect(det?.size).toBeGreaterThan(0.1);
    expect(det?.size).toBeLessThan(0.19);
    expect(det?.arena.rect.w).toBeGreaterThan(85);
  });

  it("recognizes a rotated Y-maze", () => {
    const det = detectMaze(draw(templateShape("y-maze", 30, 0.2)));
    expect(det?.kind).toBe("y-maze");
    expect(angleGap(det?.arena.rotation ?? 0, 30, 120)).toBeLessThan(5);
  });

  it("returns nothing for a blank frame", () => {
    expect(detectMaze(draw(() => false))).toBeNull();
  });
});

describe("following the arena", () => {
  const base: Arena = { shape: "rect", rect: { x: 0, y: 0, w: 100, h: 100 }, rotation: 5 };

  it("picks the symmetric angle closest to the current one so arm labels don't swap", () => {
    expect(alignArena(base, { ...base, rotation: -84 }, 90).rotation).toBeCloseTo(6);
    expect(alignArena(base, { ...base, rotation: 126 }, 120).rotation).toBeCloseTo(6);
  });

  it("ignores sub-pixel jitter but reacts to a real shift", () => {
    expect(arenaMoved(base, { ...base, rect: { ...base.rect, x: 0.5 } })).toBe(false);
    expect(arenaMoved(base, { ...base, rect: { ...base.rect, x: 6 } })).toBe(true);
  });

  it("keeps the chosen rectangular test when the arena is a plain box", () => {
    expect(templateFor("open-field", "light-dark")).toBe("light-dark");
    expect(templateFor("open-field", "elevated-plus")).toBe("open-field");
    expect(templateFor("y-maze", "open-field")).toBe("y-maze");
  });
});
