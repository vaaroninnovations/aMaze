import { z } from "zod";
import type { Gray, TrackPoint } from "@/lib/tracking/types.ts";

/**
 * Compact column-oriented track format stored in file storage.
 * Columns keep long trials small (a 10 min run at 10 fps is ~6000 points).
 */
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
  if (!parsed.success) throw new Error("The saved track file is damaged or in an unknown format.");
  const { t, x, y, f, a } = parsed.data;
  if (![x, y, f, a].every((col) => col.length === t.length)) {
    throw new Error("The saved track file is incomplete.");
  }
  return t.map((time, i) => ({ t: time, x: x[i], y: y[i], found: f[i] === 1, area: a[i] }));
}

/** Converts the clean grayscale background to a small JPEG for revisiting trials without the video. */
export function grayToJpeg(gray: Gray): Promise<Blob | null> {
  const canvas = document.createElement("canvas");
  canvas.width = gray.width;
  canvas.height = gray.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.resolve(null);
  const img = ctx.createImageData(gray.width, gray.height);
  for (let i = 0; i < gray.data.length; i++) {
    const v = gray.data[i];
    img.data[i * 4] = v;
    img.data[i * 4 + 1] = v;
    img.data[i * 4 + 2] = v;
    img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.8));
}
