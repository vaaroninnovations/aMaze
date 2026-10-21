import { describe, expect, it } from "vitest";
import { pointInPolygon, rectPolygon, zoneContains } from "./geometry.ts";
import { summarize } from "./metrics.ts";
import { buildZones, defaultParams } from "./templates.ts";
import type { Arena, TrackPoint, Zone } from "./types.ts";
import { detectAnimal, detectArena, findBlobs, medianBackground } from "./vision.ts";

const arena: Arena = { shape: "rect", rect: { x: 0, y: 0, w: 100, h: 100 } };

const pt = (t: number, x: number, y: number, found = true): TrackPoint => ({ t, x, y, found, area: 10 });

describe("zones", () => {
  it("periphery excludes the center", () => {
    const zones = buildZones("open-field", arena, defaultParams("open-field"));
    const byId = new Map(zones.map((z) => [z.id, z]));
    const center = byId.get("center") as Zone;
    const periphery = byId.get("periphery") as Zone;
    expect(zoneContains(center, { x: 50, y: 50 }, byId)).toBe(true);
    expect(zoneContains(periphery, { x: 50, y: 50 }, byId)).toBe(false);
    expect(zoneContains(periphery, { x: 5, y: 5 }, byId)).toBe(true);
  });

  it("builds four arms plus center for the plus maze", () => {
    const zones = buildZones("elevated-plus", arena, defaultParams("elevated-plus"));
    expect(zones.map((z) => z.id)).toEqual(["center", "arm-n", "arm-s", "arm-e", "arm-w"]);
    expect(zones.find((z) => z.id === "arm-n")?.name).toMatch(/Open/);
  });

  it("point in polygon handles edges of a square", () => {
    const sq = rectPolygon({ x: 0, y: 0, w: 10, h: 10 });
    expect(pointInPolygon({ x: 5, y: 5 }, sq)).toBe(true);
    expect(pointInPolygon({ x: 15, y: 5 }, sq)).toBe(false);
  });
});

describe("summarize", () => {
  const zones = buildZones("open-field", arena, defaultParams("open-field"));

  it("computes distance, zone time, entries and latency", () => {
    // 10 px/cm: periphery (0-2 s), center (3-5 s), back to periphery.
    const track = [pt(0, 5, 5), pt(1, 5, 15), pt(2, 5, 25), pt(3, 50, 50), pt(4, 50, 60), pt(5, 50, 70), pt(6, 90, 90)];
    const s = summarize(track, zones, 10);
    const center = s.zones.find((z) => z.id === "center");
    const periphery = s.zones.find((z) => z.id === "periphery");
    expect(s.duration).toBe(6);
    expect(center?.entries).toBe(1);
    expect(center?.latency).toBe(3);
    expect(center?.time).toBe(2);
    expect(periphery?.entries).toBe(2);
    expect(periphery?.time).toBe(2);
    const expected = (10 + 10 + Math.hypot(45, 25) + 10 + 10 + Math.hypot(40, 20)) / 10;
    expect(s.totalDistance).toBeCloseTo(expected, 5);
  });

  it("ignores lost frames and counts detection rate", () => {
    const s = summarize([pt(0, 5, 5), pt(1, 0, 0, false), pt(2, 5, 25)], zones, 10);
    expect(s.detectedPct).toBeCloseTo(66.67, 1);
    expect(s.totalDistance).toBeCloseTo(2, 5);
  });

  it("treats sub-jitter movement as immobility", () => {
    const s = summarize([pt(0, 5, 5), pt(1, 5.5, 5), pt(2, 6, 5)], zones, 10);
    expect(s.totalDistance).toBe(0);
    expect(s.immobileTime).toBe(2);
  });
});

describe("vision", () => {
  const W = 40;
  const H = 30;
  const frame = (fill: (x: number, y: number) => number) => {
    const data = new Uint8ClampedArray(W * H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) data[y * W + x] = fill(x, y);
    return { data, width: W, height: H };
  };
  const inArena = (x: number, y: number) => x >= 8 && x < 32 && y >= 5 && y < 25;

  it("finds connected blobs above a minimum area", () => {
    const mask = new Uint8Array(W * H);
    for (let y = 2; y < 6; y++) for (let x = 2; x < 6; x++) mask[y * W + x] = 1;
    mask[20 * W + 20] = 1;
    const blobs = findBlobs(mask, W, H, 4);
    expect(blobs).toHaveLength(1);
    expect(blobs[0].cx).toBeCloseTo(3.5);
  });

  it("detects a bright arena on a dark background", () => {
    const a = detectArena(frame((x, y) => (inArena(x, y) ? 220 : 30)));
    expect(a.rect.x).toBeCloseTo(8, 0);
    expect(a.rect.w).toBeCloseTo(24, 0);
    expect(a.shape).toBe("rect");
  });

  it("median background removes a moving animal and subtraction finds it", () => {
    const withAnimal = (ax: number) =>
      frame((x, y) => (Math.abs(x - ax) < 2 && Math.abs(y - 15) < 2 ? 20 : inArena(x, y) ? 220 : 30));
    const bg = medianBackground([withAnimal(10), withAnimal(18), withAnimal(28)]);
    expect(bg.data[15 * W + 18]).toBe(220);
    const mask = new Uint8Array(W * H).fill(1);
    const det = detectAnimal(withAnimal(20), bg, mask, { mode: "background", threshold: 40, minArea: 3, fps: 10 }, null);
    expect(det.found).toBe(true);
    expect(det.x).toBeCloseTo(20, 0);
    expect(det.y).toBeCloseTo(15, 0);
  });
});
