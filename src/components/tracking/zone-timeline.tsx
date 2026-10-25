import type { PointerEvent } from "react";
import type { Bout, ZoneOccupancy } from "@/lib/tracking/analytics.ts";

type Props = {
  occupancy: ZoneOccupancy[];
  bouts: Bout[];
  t0: number;
  duration: number;
  currentTime: number;
  onSeek: (t: number) => void;
};

type Row = { id: string; name: string; color: string; intervals: { start: number; end: number }[] };

/** Ethogram-style raster: one lane per zone plus an immobility lane, all on a shared time axis. */
export default function ZoneTimeline({ occupancy, bouts, t0, duration, currentTime, onSeek }: Props) {
  const rows: Row[] = [...occupancy, { id: "immobile", name: "Immobile", color: "var(--chart-3)", intervals: bouts }];
  const span = Math.max(duration, 0.001);
  const pos = (t: number) => `${((t - t0) / span) * 100}%`;
  const ticks = Array.from({ length: 6 }, (_, i) => t0 + (span * i) / 5);

  const seek = (e: PointerEvent<HTMLDivElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    onSeek(t0 + ((e.clientX - box.left) / box.width) * span);
  };

  return (
    <div className="grid grid-cols-[minmax(80px,140px)_1fr] gap-x-3 gap-y-1.5 text-xs">
      {rows.map((row) => (
        <div key={row.id} className="contents">
          <span className="flex items-center gap-2 truncate">
            <span className="size-2 shrink-0 rounded-sm" style={{ backgroundColor: row.color }} />
            <span className="truncate">{row.name}</span>
          </span>
          <div className="relative h-5 cursor-crosshair overflow-hidden rounded-sm bg-muted" onPointerDown={seek}>
            {row.intervals.map((iv) => (
              <div
                key={iv.start}
                className="absolute inset-y-0"
                style={{ left: pos(iv.start), width: `max(1px, ${((iv.end - iv.start) / span) * 100}%)`, backgroundColor: row.color }}
              />
            ))}
            <div className="absolute inset-y-0 w-px bg-foreground/70" style={{ left: pos(currentTime) }} />
          </div>
        </div>
      ))}
      <span />
      <div className="relative h-4 font-mono text-[10px] text-muted-foreground">
        {ticks.map((t, i) => (
          <span
            key={t}
            className="absolute"
            style={{ left: pos(t), transform: i === 0 ? "none" : i === ticks.length - 1 ? "translateX(-100%)" : "translateX(-50%)" }}
          >
            {t.toFixed(0)}s
          </span>
        ))}
      </div>
    </div>
  );
}
