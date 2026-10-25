import { Area, AreaChart, CartesianGrid, ReferenceArea, ReferenceLine, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart.tsx";
import type { Bout, SpeedSample } from "@/lib/tracking/analytics.ts";

type Props = {
  series: SpeedSample[];
  bouts: Bout[];
  threshold: number;
  currentTime: number;
  onSeek: (t: number) => void;
};

const MAX_POINTS = 600;

const config = { speed: { label: "Speed (cm/s)", color: "var(--chart-1)" } } satisfies ChartConfig;

/** Keeps the max of each bucket so short sprints stay visible after downsampling. */
function downsample(series: SpeedSample[]): SpeedSample[] {
  if (series.length <= MAX_POINTS) return series;
  const size = Math.ceil(series.length / MAX_POINTS);
  const out: SpeedSample[] = [];
  for (let i = 0; i < series.length; i += size) {
    const chunk = series.slice(i, i + size);
    out.push(chunk.reduce((a, b) => (b.speed > a.speed ? b : a)));
  }
  return out;
}

export default function SpeedChart({ series, bouts, threshold, currentTime, onSeek }: Props) {
  const data = downsample(series).map((s) => ({ t: Number(s.t.toFixed(2)), speed: Number(s.speed.toFixed(2)) }));
  return (
    <ChartContainer config={config} className="aspect-auto h-64 w-full">
      <AreaChart
        data={data}
        margin={{ left: -12, right: 8, top: 8 }}
        onClick={(e) => {
          const t = Number(e?.activeLabel);
          if (Number.isFinite(t)) onSeek(t);
        }}
        className="cursor-crosshair"
      >
        <defs>
          <linearGradient id="speed-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-speed)" stopOpacity={0.45} />
            <stop offset="100%" stopColor="var(--color-speed)" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="t" type="number" domain={["dataMin", "dataMax"]} tickFormatter={(v: number) => `${Math.round(v)}s`} tickLine={false} axisLine={false} />
        <YAxis tickLine={false} axisLine={false} width={44} />
        {bouts.map((b) => (
          <ReferenceArea key={b.start} x1={b.start} x2={b.end} fill="var(--chart-3)" fillOpacity={0.14} ifOverflow="hidden" />
        ))}
        <ReferenceLine y={threshold} stroke="var(--chart-3)" strokeDasharray="4 4" />
        <ReferenceLine x={currentTime} stroke="var(--foreground)" strokeOpacity={0.5} />
        <ChartTooltip
          content={<ChartTooltipContent labelFormatter={(_, p) => `${Number(p?.[0]?.payload?.t ?? 0).toFixed(1)} s`} />}
        />
        <Area dataKey="speed" type="monotone" stroke="var(--color-speed)" strokeWidth={1.5} fill="url(#speed-fill)" isAnimationActive={false} />
      </AreaChart>
    </ChartContainer>
  );
}
