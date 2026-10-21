import { useState } from "react";
import type { GroupSeries } from "@/lib/experiments/group-data.ts";

type Props = {
  series: GroupSeries[];
  unit: string;
  digits: number;
  errorKind: "sem" | "sd";
};

const W = 640;
const H = 300;
const PAD = { top: 16, right: 12, bottom: 44, left: 56 };
const TICKS = 5;

/** Rounds the axis range outward to "nice" steps (1, 2, 2.5, 5 x 10^n). */
function niceScale(lo: number, hi: number) {
  const span = hi - lo || Math.abs(hi) || 1;
  const raw = span / TICKS;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((s) => s * mag).find((s) => s >= raw) ?? raw;
  const min = Math.floor(lo / step) * step;
  const max = Math.ceil(hi / step) * step;
  const ticks: number[] = [];
  for (let v = min; v <= max + step / 2; v += step) ticks.push(Number(v.toFixed(10)));
  return { min, max, ticks };
}

/** Deterministic jitter per animal so dots don't overlap and don't jump between renders. */
function jitter(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return ((Math.abs(h) % 1000) / 1000 - 0.5) * 0.5;
}

/** Bar = group mean, whisker = SEM or SD, dots = individual animals. Drawn as SVG for full control. */
export default function GroupChart({ series, unit, digits, errorKind }: Props) {
  const [hover, setHover] = useState<{ x: number; y: number; text: string } | null>(null);
  const all = series.flatMap((s) => s.values.map((v) => v.value));
  const tops = series.map((s) => (s.stats ? s.stats.mean + (errorKind === "sem" ? s.stats.sem : s.stats.sd) : 0));
  const bottoms = series.map((s) => (s.stats ? s.stats.mean - (errorKind === "sem" ? s.stats.sem : s.stats.sd) : 0));
  const { min, max, ticks } = niceScale(Math.min(0, ...all, ...bottoms), Math.max(0, ...all, ...tops));
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const y = (v: number) => PAD.top + plotH - ((v - min) / (max - min || 1)) * plotH;
  const band = plotW / Math.max(series.length, 1);
  const barW = Math.min(band * 0.55, 96);
  const fmt = (v: number) => v.toFixed(digits);

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Group means with individual animals">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} stroke="var(--border)" strokeDasharray={t === 0 ? undefined : "3 3"} />
            <text x={PAD.left - 8} y={y(t)} textAnchor="end" dominantBaseline="middle" className="fill-muted-foreground font-mono text-[11px]">
              {Number.isInteger(t) ? t : t.toFixed(2).replace(/0+$/, "")}
            </text>
          </g>
        ))}
        {unit && (
          <text
            transform={`translate(14 ${PAD.top + plotH / 2}) rotate(-90)`}
            textAnchor="middle"
            className="fill-muted-foreground font-mono text-[11px]"
          >
            {unit}
          </text>
        )}
        {series.map((s, i) => {
          const cx = PAD.left + band * i + band / 2;
          if (!s.stats) return null;
          const err = errorKind === "sem" ? s.stats.sem : s.stats.sd;
          const top = y(Math.max(s.stats.mean, 0));
          const base = y(Math.min(s.stats.mean, 0));
          return (
            <g key={s.group._id}>
              <rect x={cx - barW / 2} y={top} width={barW} height={Math.max(base - top, 1)} rx={4} fill={s.group.color} fillOpacity={0.28} stroke={s.group.color} strokeWidth={1.5} />
              {s.values.length > 1 && (
                <g stroke="var(--foreground)" strokeWidth={1.5}>
                  <line x1={cx} x2={cx} y1={y(s.stats.mean - err)} y2={y(s.stats.mean + err)} />
                  <line x1={cx - 10} x2={cx + 10} y1={y(s.stats.mean + err)} y2={y(s.stats.mean + err)} />
                  <line x1={cx - 10} x2={cx + 10} y1={y(s.stats.mean - err)} y2={y(s.stats.mean - err)} />
                </g>
              )}
              {s.values.map((v) => {
                const dx = cx + jitter(v.subjectId) * barW;
                return (
                  <circle
                    key={v.subjectId}
                    cx={dx}
                    cy={y(v.value)}
                    r={4.5}
                    fill={s.group.color}
                    stroke="var(--card)"
                    strokeWidth={1.5}
                    className="cursor-pointer"
                    onMouseEnter={() =>
                      setHover({
                        x: (dx / W) * 100,
                        y: (y(v.value) / H) * 100,
                        text: `${v.code}: ${fmt(v.value)}${unit ? ` ${unit}` : ""}${v.trials > 1 ? ` (mean of ${v.trials} trials)` : ""}`,
                      })
                    }
                    onMouseLeave={() => setHover(null)}
                  />
                );
              })}
              <text x={cx} y={H - PAD.bottom + 18} textAnchor="middle" className="fill-foreground text-[12px] font-medium">
                {s.group.name.length > 18 ? `${s.group.name.slice(0, 17)}…` : s.group.name}
              </text>
              <text x={cx} y={H - PAD.bottom + 33} textAnchor="middle" className="fill-muted-foreground font-mono text-[10px]">
                n = {s.values.length}
              </text>
            </g>
          );
        })}
      </svg>
      {hover && (
        <div
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-[130%] whitespace-nowrap rounded-md border bg-popover px-2 py-1 font-mono text-xs text-popover-foreground shadow-md"
          style={{ left: `${hover.x}%`, top: `${hover.y}%` }}
        >
          {hover.text}
        </div>
      )}
    </div>
  );
}
