import { useEffect, useRef } from "react";
import { polygonToPath } from "@/lib/tracking/geometry.ts";
import type { TrackPoint, Zone } from "@/lib/tracking/types.ts";

type Props = {
  dims: { w: number; h: number };
  track: TrackPoint[];
  zones: Zone[];
  drawFrame: (ctx: CanvasRenderingContext2D, w: number, h: number) => void;
  frameVersion: number;
};

// Start of the path is cool blue, end is hot orange, so direction of travel reads at a glance.
const HUE_START = 200;
const HUE_END = 20;

function colorAt(k: number): string {
  const hue = HUE_START + (HUE_END - HUE_START) * k;
  return `hsl(${hue} 95% 58%)`;
}

/** Draws the path as short colored segments; lost-detection frames break the line. */
function drawPath(ctx: CanvasRenderingContext2D, track: TrackPoint[], w: number, h: number) {
  ctx.clearRect(0, 0, w, h);
  const found = track.filter((p) => p.found);
  if (found.length < 2) return;
  const lineWidth = Math.max(w / 220, 1.5);
  ctx.lineWidth = lineWidth;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (let i = 1; i < found.length; i++) {
    ctx.strokeStyle = colorAt(i / (found.length - 1));
    ctx.beginPath();
    ctx.moveTo(found[i - 1].x, found[i - 1].y);
    ctx.lineTo(found[i].x, found[i].y);
    ctx.stroke();
  }
  const marker = (p: TrackPoint, fill: string) => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, lineWidth * 2.4, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.lineWidth = lineWidth * 0.8;
    ctx.strokeStyle = "white";
    ctx.stroke();
  };
  marker(found[0], colorAt(0));
  marker(found[found.length - 1], colorAt(1));
}

export default function PathView({ dims, track, zones, drawFrame, frameVersion }: Props) {
  const frameRef = useRef<HTMLCanvasElement>(null);
  const pathRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const ctx = frameRef.current?.getContext("2d");
    if (ctx) drawFrame(ctx, dims.w, dims.h);
  }, [drawFrame, dims, frameVersion]);

  useEffect(() => {
    const ctx = pathRef.current?.getContext("2d");
    if (ctx) drawPath(ctx, track, dims.w, dims.h);
  }, [track, dims]);

  return (
    <div
      className="relative mx-auto w-full overflow-hidden rounded-md bg-black"
      style={{ aspectRatio: `${dims.w} / ${dims.h}`, maxWidth: `calc(52vh * ${dims.w / dims.h})` }}
    >
      <canvas ref={frameRef} width={dims.w} height={dims.h} className="absolute inset-0 size-full opacity-45 grayscale" />
      <svg viewBox={`0 0 ${dims.w} ${dims.h}`} className="pointer-events-none absolute inset-0 size-full">
        {zones.map((z) => (
          <path
            key={z.id}
            d={polygonToPath(z.polygon)}
            fill="none"
            stroke="white"
            strokeOpacity={0.4}
            strokeWidth={Math.max(dims.w / 400, 0.75)}
            strokeDasharray="4 3"
          />
        ))}
      </svg>
      <canvas ref={pathRef} width={dims.w} height={dims.h} className="absolute inset-0 size-full" />
    </div>
  );
}

export function PathLegend({ duration }: { duration: number }) {
  const gradient = `linear-gradient(90deg, ${colorAt(0)}, ${colorAt(0.5)}, ${colorAt(1)})`;
  return (
    <div className="flex items-center gap-2 font-mono text-[11px] text-muted-foreground">
      <span>Start</span>
      <div className="h-2 flex-1 rounded-full" style={{ background: gradient }} />
      <span>End · {duration.toFixed(1)} s</span>
    </div>
  );
}
