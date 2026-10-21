import { z } from "zod";
import type { TrackPoint } from "../tracking/types.ts";

const trackFileSchema = z.object({
  v: z.literal(1),
  t: z.array(z.number()),
  x: z.array(z.number()),
  y: z.array(z.number()),
  f: z.array(z.union([z.literal(0), z.literal(1)])),
  a: z.array(z.number()),
});

const round = (n: number, d: number) => Math.round(n * 10 ** d) / 10 ** d;

export function encodeTrack(points: TrackPoint[]): string {
  return JSON.stringify({
    v: 1,
    t: points.map((p) => round(p.t, 3)),
    x: points.map((p) => round(p.x, 2)),
    y: points.map((p) => round(p.y, 2)),
    f: points.map((p) => (p.found ? 1 : 0)),
    a: points.map((p) => Math.round(p.area)),
  } satisfies z.infer<typeof trackFileSchema>);
}

export function decodeTrack(json: unknown): TrackPoint[] {
  const parsed = trackFileSchema.safeParse(json);
  if (!parsed.success)
    throw new Error("The saved track file is damaged or in an unknown format.");
  const { t, x, y, f, a } = parsed.data;
  if (![x, y, f, a].every((col) => col.length === t.length)) {
    throw new Error("The saved track file is incomplete.");
  }
  return t.map((time, i) => ({
    t: time,
    x: x[i],
    y: y[i],
    found: f[i] === 1,
    area: a[i],
  }));
}
