import type { Arena, Point, Rect, Zone } from "./types.ts";

export function rectCenter(r: Rect): Point {
  return { x: r.x + r.w / 2, y: r.y + r.h / 2 };
}

export function rectPolygon(r: Rect): Point[] {
  return [
    { x: r.x, y: r.y },
    { x: r.x + r.w, y: r.y },
    { x: r.x + r.w, y: r.y + r.h },
    { x: r.x, y: r.y + r.h },
  ];
}

export function circlePolygon(c: Point, r: number, n = 64): Point[] {
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    return { x: c.x + Math.cos(a) * r, y: c.y + Math.sin(a) * r };
  });
}

/** Pie slice between two angles (degrees, screen coordinates: 0 = east, 90 = south). */
export function pieSlice(c: Point, r: number, fromDeg: number, toDeg: number, n = 24): Point[] {
  const pts: Point[] = [c];
  for (let i = 0; i <= n; i++) {
    const a = ((fromDeg + ((toDeg - fromDeg) * i) / n) * Math.PI) / 180;
    pts.push({ x: c.x + Math.cos(a) * r, y: c.y + Math.sin(a) * r });
  }
  return pts;
}

/** Rectangle extending from `from` to `to` distance along an angle (degrees) with a given width. */
export function armPolygon(c: Point, angleDeg: number, from: number, to: number, width: number): Point[] {
  const a = (angleDeg * Math.PI) / 180;
  const dx = Math.cos(a);
  const dy = Math.sin(a);
  const nx = -dy * (width / 2);
  const ny = dx * (width / 2);
  const p0 = { x: c.x + dx * from, y: c.y + dy * from };
  const p1 = { x: c.x + dx * to, y: c.y + dy * to };
  return [
    { x: p0.x + nx, y: p0.y + ny },
    { x: p1.x + nx, y: p1.y + ny },
    { x: p1.x - nx, y: p1.y - ny },
    { x: p0.x - nx, y: p0.y - ny },
  ];
}

export function rotatePoint(p: Point, c: Point, deg: number): Point {
  if (deg === 0) return p;
  const a = (deg * Math.PI) / 180;
  const cos = Math.cos(a);
  const sin = Math.sin(a);
  const dx = p.x - c.x;
  const dy = p.y - c.y;
  return { x: c.x + dx * cos - dy * sin, y: c.y + dx * sin + dy * cos };
}

export function scalePolygon(poly: Point[], c: Point, factor: number): Point[] {
  return poly.map((p) => ({ x: c.x + (p.x - c.x) * factor, y: c.y + (p.y - c.y) * factor }));
}

export function polygonCentroid(poly: Point[]): Point {
  const sum = poly.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 });
  return { x: sum.x / poly.length, y: sum.y / poly.length };
}

/** Ray-casting point-in-polygon test. */
export function pointInPolygon(p: Point, poly: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i];
    const b = poly[j];
    const intersects =
      a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x;
    if (intersects) inside = !inside;
  }
  return inside;
}

export function arenaPolygon(arena: Arena): Point[] {
  const { rect } = arena;
  if (arena.shape === "circle") {
    return circlePolygon(rectCenter(rect), Math.min(rect.w, rect.h) / 2);
  }
  const c = rectCenter(rect);
  return rectPolygon(rect).map((p) => rotatePoint(p, c, arena.rotation ?? 0));
}

export function zoneContains(zone: Zone, p: Point, zonesById: Map<string, Zone>): boolean {
  if (!pointInPolygon(p, zone.polygon)) return false;
  for (const id of zone.excludes ?? []) {
    const ex = zonesById.get(id);
    if (ex && pointInPolygon(p, ex.polygon)) return false;
  }
  return true;
}

/** Normalizes an angle in degrees to the range (-180, 180]. */
export function normalizeDeg(deg: number): number {
  const d = ((deg % 360) + 360) % 360;
  return d > 180 ? d - 360 : d;
}

export function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function polygonToPath(poly: Point[]): string {
  return poly.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ") + " Z";
}
