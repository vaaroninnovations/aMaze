import { polygonCentroid, rotatePoint } from "./geometry.ts";
import type { Point, Rect, Zone } from "./types.ts";

/**
 * Manual adjustment of one zone, made by dragging it on the video.
 * Offsets are fractions of the arena size, in the arena's own (unrotated) axes, so the zone
 * follows when the arena is moved, resized or rotated.
 */
export type ZoneEdit = { dx: number; dy: number; scale: number };
export type ZoneEdits = Record<string, ZoneEdit>;

export const NO_EDIT: ZoneEdit = { dx: 0, dy: 0, scale: 1 };
export const SCALE_RANGE = [0.2, 4] as const;

export const clampScale = (s: number) => Math.min(Math.max(s, SCALE_RANGE[0]), SCALE_RANGE[1]);

/** Zones that are "the rest of the arena" (e.g. periphery) follow the zones they exclude and can't be dragged. */
export const isDraggableZone = (z: Zone) => !z.excludes?.length;

export function applyZoneEdits(zones: Zone[], edits: ZoneEdits, arena: Rect, rotationDeg = 0): Zone[] {
  return zones.map((z) => {
    const e = edits[z.id];
    if (!e || !isDraggableZone(z)) return z;
    const c = polygonCentroid(z.polygon);
    const { x: ox, y: oy } = rotatePoint({ x: e.dx * arena.w, y: e.dy * arena.h }, { x: 0, y: 0 }, rotationDeg);
    return {
      ...z,
      polygon: z.polygon.map((p) => ({ x: c.x + (p.x - c.x) * e.scale + ox, y: c.y + (p.y - c.y) * e.scale + oy })),
    };
  });
}

export function polygonBounds(poly: Point[]): Rect {
  const xs = poly.map((p) => p.x);
  const ys = poly.map((p) => p.y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
}

/** Larger zones first so smaller ones are drawn on top and stay clickable. */
export function byAreaDescending(zones: Zone[]): Zone[] {
  const area = (z: Zone) => {
    const b = polygonBounds(z.polygon);
    return b.w * b.h;
  };
  return [...zones].sort((a, b) => area(b) - area(a));
}
