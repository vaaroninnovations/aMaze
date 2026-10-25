import { useEffect, useRef } from "react";
import { polygonToPath } from "@/lib/tracking/geometry.ts";
import type { HeatGrid } from "@/lib/tracking/analytics.ts";
import type { Zone } from "@/lib/tracking/types.ts";

type Props = {
  dims: { w: number; h: number };
  grid: HeatGrid;
  zones: Zone[];
  drawFrame: (ctx: CanvasRenderingContext2D, w: number, h: number) => void;
  frameVersion: number;
};

// Perceptual "inferno"-like ramp: transparent black -> purple -> orange -> pale yellow.
const STOPS: [number, number, number, number][] = [
  [0, 0, 0, 4],
  [0.25, 87, 16, 110],
  [0.5, 188, 55, 84],
  [0.75, 249, 142, 9],
  [1, 252, 255, 164],
];

function colorAt(v: number): [number, number, number] {
  for (let i = 1; i < STOPS.length; i++) {
    const [p1, ...c1] = STOPS[i];
    const [p0, ...c0] = STOPS[i - 1];
    if (v <= p1) {
      const k = (v - p0) / (p1 - p0);
      return [0, 1, 2].map((j) => Math.round(c0[j] + (c1[j] - c0[j]) * k)) as [number, number, number];
    }
  }
  return [252, 255, 164];
}

export default function HeatmapView({ dims, grid, zones, drawFrame, frameVersion }: Props) {
  const frameRef = useRef<HTMLCanvasElement>(null);
  const heatRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const ctx = frameRef.current?.getContext("2d");
    if (ctx) drawFrame(ctx, dims.w, dims.h);
  }, [drawFrame, dims, frameVersion]);

  // Paint the grid at cell resolution; CSS scaling with smoothing gives a soft heatmap for free.
  useEffect(() => {
    const canvas = heatRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const img = ctx.createImageData(grid.cols, grid.rows);
    for (let i = 0; i < grid.data.length; i++) {
      // Square-root scaling keeps brief visits visible next to long dwell spots.
      const v = grid.max > 0 ? Math.sqrt(grid.data[i] / grid.max) : 0;
      const [r, g, b] = colorAt(v);
      img.data[i * 4] = r;
      img.data[i * 4 + 1] = g;
      img.data[i * 4 + 2] = b;
      img.data[i * 4 + 3] = v < 0.02 ? 0 : Math.round(90 + v * 165);
    }
    ctx.putImageData(img, 0, 0);
  }, [grid]);

  return (
    <div
      className="relative mx-auto w-full overflow-hidden rounded-md bg-black"
      style={{ aspectRatio: `${dims.w} / ${dims.h}`, maxWidth: `calc(52vh * ${dims.w / dims.h})` }}
    >
      <canvas ref={frameRef} width={dims.w} height={dims.h} className="absolute inset-0 size-full opacity-35 grayscale" />
      <canvas ref={heatRef} width={grid.cols} height={grid.rows} className="absolute inset-0 size-full" />
      <svg viewBox={`0 0 ${dims.w} ${dims.h}`} className="pointer-events-none absolute inset-0 size-full">
        {zones.map((z) => (
          <path
            key={z.id}
            d={polygonToPath(z.polygon)}
            fill="none"
            stroke="white"
            strokeOpacity={0.45}
            strokeWidth={Math.max(dims.w / 400, 0.75)}
            strokeDasharray="4 3"
          />
        ))}
      </svg>
    </div>
  );
}

export function HeatLegend({ max }: { max: number }) {
  const gradient = STOPS.map(([p, r, g, b]) => `rgb(${r} ${g} ${b}) ${p * 100}%`).join(", ");
  return (
    <div className="flex items-center gap-2 font-mono text-[11px] text-muted-foreground">
      <span>0 s</span>
      <div className="h-2 flex-1 rounded-full" style={{ background: `linear-gradient(90deg, ${gradient})` }} />
      <span>{max.toFixed(1)} s / cell</span>
    </div>
  );
}
