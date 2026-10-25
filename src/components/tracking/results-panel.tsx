import { Activity } from "lucide-react";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty.tsx";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table.tsx";
import type { TrackSummary } from "@/lib/tracking/metrics.ts";

const fmt = (n: number, d = 1) => n.toFixed(d);

export default function ResultsPanel({ summary }: { summary: TrackSummary | null }) {
  if (!summary) {
    return (
      <Empty className="rounded-lg border border-dashed py-10">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Activity />
          </EmptyMedia>
          <EmptyTitle>No results yet</EmptyTitle>
          <EmptyDescription>Start tracking to see distance, speed and zone measures.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  const stats = [
    { label: "Distance", value: fmt(summary.totalDistance), unit: "cm" },
    { label: "Mean speed", value: fmt(summary.meanSpeed, 2), unit: "cm/s" },
    { label: "Max speed", value: fmt(summary.maxSpeed), unit: "cm/s" },
    { label: "Immobile", value: fmt(summary.immobileTime), unit: "s" },
    { label: "Duration", value: fmt(summary.duration), unit: "s" },
    { label: "Detected", value: fmt(summary.detectedPct, 0), unit: "%" },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-3 lg:grid-cols-6">
        {stats.map((st) => (
          <div key={st.label} className="bg-card p-3">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{st.label}</p>
            <p className="font-mono text-xl font-semibold tabular-nums">
              {st.value}
              <span className="pl-1 text-xs font-normal text-muted-foreground">{st.unit}</span>
            </p>
          </div>
        ))}
      </div>
      <div className="overflow-x-auto rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Zone</TableHead>
              <TableHead className="text-right">Time (s)</TableHead>
              <TableHead className="text-right">Time %</TableHead>
              <TableHead className="text-right">Entries</TableHead>
              <TableHead className="text-right">Latency (s)</TableHead>
              <TableHead className="text-right">Distance (cm)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="font-mono tabular-nums">
            {summary.zones.map((z) => (
              <TableRow key={z.id}>
                <TableCell className="font-sans">
                  <span className="flex items-center gap-2">
                    <span className="size-2.5 rounded-sm" style={{ backgroundColor: z.color }} />
                    {z.name}
                  </span>
                </TableCell>
                <TableCell className="text-right">{fmt(z.time)}</TableCell>
                <TableCell className="text-right">
                  {summary.duration > 0 ? fmt((z.time / summary.duration) * 100) : "0.0"}
                </TableCell>
                <TableCell className="text-right">{z.entries}</TableCell>
                <TableCell className="text-right">{z.latency === null ? "n/a" : fmt(z.latency)}</TableCell>
                <TableCell className="text-right">{fmt(z.distance)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
