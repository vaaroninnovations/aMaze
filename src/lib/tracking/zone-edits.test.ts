import { describe, expect, it } from "vitest";
import { applyZoneEdits, clampScale } from "./zone-edits.ts";
import { arenaPolygon, normalizeDeg } from "./geometry.ts";
import type { Zone } from "./types.ts";

const square: Zone = {
  id: "center",
  name: "Center",
  color: "#000",
  polygon: [
    { x: 40, y: 40 },
    { x: 60, y: 40 },
    { x: 60, y: 60 },
    { x: 40, y: 60 },
  ],
};
const ring: Zone = { ...square, id: "periphery", excludes: ["center"] };
const arena = { x: 0, y: 0, w: 100, h: 200 };

describe("applyZoneEdits", () => {
  it("moves by a fraction of the arena size and scales about the zone center", () => {
    const [moved] = applyZoneEdits([square], { center: { dx: 0.1, dy: 0.1, scale: 2 } }, arena);
    // Centre (50,50) shifts by (10, 20); half-size grows from 10 to 20.
    expect(moved.polygon[0]).toEqual({ x: 40, y: 50 });
    expect(moved.polygon[2]).toEqual({ x: 80, y: 90 });
  });

  it("leaves unedited and remainder zones untouched", () => {
    const zones = applyZoneEdits([square, ring], { periphery: { dx: 0.5, dy: 0.5, scale: 3 } }, arena);
    expect(zones[0]).toBe(square);
    expect(zones[1]).toBe(ring);
  });

  it("keeps the scale within a usable range", () => {
    expect(clampScale(0.01)).toBe(0.2);
    expect(clampScale(10)).toBe(4);
  });

  it("moves along the arena's own axes when the arena is rotated", () => {
    // A 90 degree arena turns a rightward offset (arena x) into a downward one on screen.
    const [moved] = applyZoneEdits([square], { center: { dx: 0.1, dy: 0, scale: 1 } }, arena, 90);
    expect(moved.polygon[0].x).toBeCloseTo(40);
    expect(moved.polygon[0].y).toBeCloseTo(50);
  });
});

describe("rotated arena", () => {
  it("rotates the arena outline used for the tracking mask", () => {
    const poly = arenaPolygon({ rect: { x: 0, y: 0, w: 100, h: 20 }, shape: "rect", rotation: 90 });
    // A wide 100x20 strip turned 90 degrees becomes tall around its center (50, 10).
    const xs = poly.map((p) => p.x);
    const ys = poly.map((p) => p.y);
    expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(20);
    expect(Math.max(...ys) - Math.min(...ys)).toBeCloseTo(100);
  });

  it("normalizes angles into a single turn", () => {
    expect(normalizeDeg(190)).toBe(-170);
    expect(normalizeDeg(-190)).toBe(170);
    expect(normalizeDeg(360)).toBe(0);
  });
});
