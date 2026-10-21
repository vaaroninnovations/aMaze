import { useMemo, useState } from "react";
import { useAnonymousQuery as useQuery } from "@/lib/anonymous-convex.ts";
import { BarChart3, Users } from "lucide-react";
import { api } from "@/convex/_generated/api.js";
import type { Doc, Id } from "@/convex/_generated/dataModel.d.ts";
import DataExportMenu, { type ExportDataset } from "@/components/data-export-menu.tsx";
import ExportableFigure from "@/components/exportable-figure.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group.tsx";
import { availableMetrics, compareGroups, groupSeries, seriesRows, sessionsOf, type Metric } from "@/lib/experiments/group-data.ts";
import { downloadCsv, baseFilename } from "@/lib/tracking/export.ts";
import ComparisonCard from "./comparison-card.tsx";
import DescriptivesTable from "./descriptives-table.tsx";
import GroupChart from "./group-chart.tsx";

type Props = {
  experimentId: Id<"experiments">;
  experimentName: string;
  groups: Doc<"groups">[];
  subjects: Doc<"subjects">[];
};

const ALL_SESSIONS = "all";
const CATEGORIES: Metric["category"][] = ["Test", "Locomotion", "Zones"];

const metricLabel = (m: Metric) => (m.unit ? `${m.label} (${m.unit})` : m.label);

export default function GroupStats({ experimentId, experimentName, groups, subjects }: Props) {
  const data = useQuery(api.experiments.trials.statsData, { experimentId });
  const [metricKey, setMetricKey] = useState<string | null>(null);
  const [session, setSession] = useState(ALL_SESSIONS);
  const [errorKind, setErrorKind] = useState<"sem" | "sd">("sem");
  const [includeUngrouped, setIncludeUngrouped] = useState(false);

  const rows = data?.rows;
  const metrics = useMemo(() => (rows ? availableMetrics(rows) : []), [rows]);
  const sessions = useMemo(() => (rows ? sessionsOf(rows) : []), [rows]);
  const metric = metrics.find((m) => m.key === metricKey) ?? metrics[0];
  const sessionFilter = session === ALL_SESSIONS || !sessions.includes(session) ? null : session;

  const series = useMemo(
    () => (rows && metric ? groupSeries(rows, subjects, groups, metric, sessionFilter, includeUngrouped) : []),
    [rows, subjects, groups, metric, sessionFilter, includeUngrouped],
  );
  const comparison = useMemo(() => compareGroups(series), [series]);

  if (data === undefined) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-72 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (data.rows.length === 0 || !metric) {
    return (
      <Empty className="rounded-lg border border-dashed py-10">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <BarChart3 />
          </EmptyMedia>
          <EmptyTitle>No trials to compare yet</EmptyTitle>
          <EmptyDescription>Save trials to this experiment and assign subjects to groups to see statistics here.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  const datasets: ExportDataset[] = [
    {
      label: metricLabel(metric),
      filename: `${baseFilename(experimentName)}_${baseFilename(metric.label)}${sessionFilter ? `_${sessionFilter}` : ""}`,
      rows: () => seriesRows(series, metric, sessionFilter),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-3 rounded-lg border bg-card p-4 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_auto_auto]">
        <div className="min-w-0 space-y-1.5">
          <Label className="text-xs text-muted-foreground">Measure</Label>
          <Select value={metric.key} onValueChange={setMetricKey}>
            <SelectTrigger className="w-full cursor-pointer">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((cat) => {
                const items = metrics.filter((m) => m.category === cat);
                return items.length ? (
                  <SelectGroup key={cat}>
                    <SelectLabel>{cat === "Test" ? "Test measures" : cat}</SelectLabel>
                    {items.map((m) => (
                      <SelectItem key={m.key} value={m.key} className="cursor-pointer">
                        {metricLabel(m)}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ) : null;
              })}
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-0 space-y-1.5">
          <Label className="text-xs text-muted-foreground">Session</Label>
          <Select value={sessionFilter ?? ALL_SESSIONS} onValueChange={setSession}>
            <SelectTrigger className="w-full cursor-pointer">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_SESSIONS} className="cursor-pointer">
                All sessions
              </SelectItem>
              {sessions.map((s) => (
                <SelectItem key={s} value={s} className="cursor-pointer">
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Error bars</Label>
          <ToggleGroup
            type="single"
            variant="outline"
            size="sm"
            value={errorKind}
            onValueChange={(v) => v && setErrorKind(v === "sd" ? "sd" : "sem")}
          >
            <ToggleGroupItem value="sem" className="cursor-pointer px-3">
              SEM
            </ToggleGroupItem>
            <ToggleGroupItem value="sd" className="cursor-pointer px-3">
              SD
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
        <div className="flex items-end gap-2 pb-1.5">
          <Switch id="stats-ungrouped" checked={includeUngrouped} onCheckedChange={setIncludeUngrouped} className="cursor-pointer" />
          <Label htmlFor="stats-ungrouped" className="cursor-pointer text-xs text-muted-foreground">
            Include ungrouped
          </Label>
        </div>
      </div>

      {series.length === 0 ? (
        <Empty className="rounded-lg border border-dashed py-10">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Users />
            </EmptyMedia>
            <EmptyTitle>No grouped animals with this measure</EmptyTitle>
            <EmptyDescription>
              Assign subjects to groups in the Subjects tab, or pick another measure or session.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[3fr_2fr]">
          <div className="space-y-2 rounded-lg border bg-card p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{metricLabel(metric)}</p>
                <p className="text-xs text-muted-foreground">
                  Bars show group mean ± {errorKind.toUpperCase()}. Each dot is one animal{sessionFilter ? ` in ${sessionFilter}` : ", averaged over its trials"}.
                </p>
              </div>
              <DataExportMenu datasets={datasets} label="Export" />
            </div>
            <ExportableFigure filename={datasets[0].filename}>
              <GroupChart series={series} unit={metric.unit} digits={metric.digits} errorKind={errorKind} />
            </ExportableFigure>
          </div>
          <div className="space-y-4">
            <ComparisonCard comparison={comparison} digits={Math.max(metric.digits, 2)} />
            {data.truncated && (
              <p className="text-xs text-muted-foreground">Showing the first 1,000 trials of this experiment.</p>
            )}
          </div>
        </div>
      )}

      {series.length > 0 && <DescriptivesTable series={series} digits={Math.max(metric.digits, 2)} />}
    </div>
  );
}
