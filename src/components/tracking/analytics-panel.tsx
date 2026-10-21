import { useEffect, useState, type ReactNode } from "react";
import DataExportMenu, {
  type ExportDataset,
} from "@/components/data-export-menu.tsx";
import ExportableFigure from "@/components/exportable-figure.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs.tsx";
import { baseFilename, summaryRows, trackRows } from "@/lib/tracking/export.ts";
import type { TrackSummary } from "@/lib/tracking/metrics.ts";
import {
  calculateServerAnalytics,
  type ServerAnalytics,
} from "@/lib/tracking/server-api.ts";
import { getTemplate } from "@/lib/tracking/templates.ts";
import type { Measure } from "@/lib/tracking/test-measures.ts";
import type {
  Rect,
  TemplateId,
  TrackPoint,
  Zone,
} from "@/lib/tracking/types.ts";
import { trialInfoRows, type TrialInfo } from "@/lib/experiments/trial-info.ts";
import HeatmapView, { HeatLegend } from "./heatmap-view.tsx";
import MeasureGrid from "./measure-grid.tsx";
import PanelSection from "./panel-section.tsx";
import PathView, { PathLegend } from "./path-view.tsx";
import SliderRow from "./slider-row.tsx";
import SpeedChart from "./speed-chart.tsx";
import TrialReportButton from "./trial-report-button.tsx";
import ZoneTimeline from "./zone-timeline.tsx";

export type AnalyticsData = {
  track: TrackPoint[];
  zones: Zone[];
  pxPerCm: number;
  dims: { w: number; h: number };
  templateId: TemplateId;
  arenaRect: Rect | null;
  sourceName: string | undefined;
  /** Total length used for seeking (video duration, or trial length). */
  duration: number;
  currentTime: number;
  onSeek: (t: number) => void;
  drawFrame: (ctx: CanvasRenderingContext2D, w: number, h: number) => void;
  frameVersion: number;
  /** Bench-sheet details added to the top of the summary CSV. */
  info?: TrialInfo;
};

type Props = {
  data: AnalyticsData;
  summary: TrackSummary;
  busy?: boolean;
  step?: string;
  anonymousSessionId?: string;
  /** Server-computed measures; local values are only a fallback for unsaved previews. */
  serverMeasures?: Pick<Measure, "label" | "value" | "unit" | "digits">[];
  /** Extra buttons shown next to the export menu (e.g. save to experiment). */
  actions?: ReactNode;
};

const HEAT_RESOLUTIONS = [24, 40, 64] as const;

type AnalyticsState = {
  track: TrackPoint[];
  zones: Zone[];
  pxPerCm: number;
  dims: AnalyticsData["dims"];
  threshold: number;
  minBout: number;
  smooth: number;
  heatCols: 24 | 40 | 64;
  anonymousSessionId: string;
  result?: ServerAnalytics;
  error?: string;
};

export default function AnalyticsPanel({
  data,
  summary,
  busy = false,
  step = "04",
  actions,
  serverMeasures,
  anonymousSessionId,
}: Props) {
  const [threshold, setThreshold] = useState(2);
  const [minBout, setMinBout] = useState(1);
  const [smooth, setSmooth] = useState(3);
  const [heatCols, setHeatCols] = useState<24 | 40 | 64>(40);
  const { track, zones, pxPerCm, dims, templateId } = data;

  const [analyticsState, setAnalyticsState] = useState<AnalyticsState | null>(
    null,
  );
  useEffect(() => {
    if (!anonymousSessionId || busy || track.length === 0) return;
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      void calculateServerAnalytics(
        {
          track,
          zones,
          pxPerCm,
          dims,
          threshold,
          minBout,
          smooth,
          heatCols,
        },
        controller.signal,
      )
        .then((result) =>
          setAnalyticsState({
            track,
            zones,
            pxPerCm,
            dims,
            threshold,
            minBout,
            smooth,
            heatCols,
            anonymousSessionId,
            result,
          }),
        )
        .catch((error: unknown) => {
          if (controller.signal.aborted) return;
          setAnalyticsState({
            track,
            zones,
            pxPerCm,
            dims,
            threshold,
            minBout,
            smooth,
            heatCols,
            anonymousSessionId,
            error:
              error instanceof Error
                ? error.message
                : "Could not calculate server-side analytics.",
          });
        });
    }, 200);
    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [
    anonymousSessionId,
    busy,
    track,
    zones,
    pxPerCm,
    dims,
    threshold,
    minBout,
    smooth,
    heatCols,
  ]);

  const stateMatches =
    analyticsState !== null &&
    analyticsState.track === track &&
    analyticsState.zones === zones &&
    analyticsState.pxPerCm === pxPerCm &&
    analyticsState.dims === dims &&
    analyticsState.threshold === threshold &&
    analyticsState.minBout === minBout &&
    analyticsState.smooth === smooth &&
    analyticsState.heatCols === heatCols &&
    analyticsState.anonymousSessionId === anonymousSessionId;
  const analytics = stateMatches ? analyticsState?.result : null;
  const analyticsError = stateMatches ? (analyticsState?.error ?? null) : null;
  const series = analytics?.series ?? [];
  const bouts = analytics?.bouts ?? [];
  const occupancy = analytics?.occupancy ?? [];
  const grid = analytics
    ? { ...analytics.grid, data: new Float32Array(analytics.grid.data) }
    : { cols: heatCols, rows: 1, cell: 1, data: new Float32Array(), max: 0 };
  const measures: Measure[] = (serverMeasures ?? []).map((measure) => ({
    ...measure,
    hint: "Computed by the tracking server.",
  }));
  const t0 = track[0]?.t ?? 0;
  const boutStats = analytics?.boutStats ?? {
    count: 0,
    total: 0,
    mean: 0,
    longest: 0,
    latency: null,
  };
  const seek = (t: number) =>
    data.onSeek(Math.min(Math.max(t, 0), data.duration));
  const template = getTemplate(templateId);
  const name = baseFilename(data.sourceName);

  const datasets: ExportDataset[] = [
    {
      label: "Summary measures",
      filename: `${name}-summary`,
      rows: () => [
        ...trialInfoRows(data.info),
        ...summaryRows(summary, measures, bouts, {
          threshold,
          minDuration: minBout,
        }),
      ],
    },
    {
      label: "Frame-by-frame track",
      filename: `${name}-track`,
      rows: () =>
        trackRows(
          track,
          zones,
          pxPerCm,
          data.arenaRect ?? { x: 0, y: 0 },
          series,
          bouts,
        ),
    },
  ];

  return (
    <PanelSection
      step={step}
      title="Behavior analytics"
      action={
        <div className="flex items-center gap-2">
          {actions}
          <TrialReportButton
            data={data}
            summary={summary}
            measures={measures}
            series={series}
            bouts={bouts}
            grid={grid}
            occupancy={occupancy}
            threshold={threshold}
            minBout={minBout}
            filename={name}
            disabled={busy || !analytics}
          />
          <DataExportMenu
            datasets={datasets}
            workbookName={`${name}-trial`}
            disabled={busy || !analytics}
          />
        </div>
      }
    >
      {analyticsError ? (
        <p role="alert" className="text-sm text-destructive">
          Server analytics failed: {analyticsError}
        </p>
      ) : !analytics && track.length > 0 ? (
        <p role="status" className="text-sm text-muted-foreground">
          {busy
            ? "Detailed analytics will be calculated after tracking completes."
            : "Calculating detailed analytics on the server…"}
        </p>
      ) : null}
      {measures.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
            {template.name} measures
          </p>
          <MeasureGrid measures={measures} />
        </div>
      )}

      <Tabs defaultValue="path" className="gap-3">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="path" className="cursor-pointer">
            Path
          </TabsTrigger>
          <TabsTrigger value="heatmap" className="cursor-pointer">
            Heatmap
          </TabsTrigger>
          <TabsTrigger value="speed" className="cursor-pointer">
            Speed
          </TabsTrigger>
          <TabsTrigger value="timeline" className="cursor-pointer">
            Zone timeline
          </TabsTrigger>
          <TabsTrigger value="immobility" className="cursor-pointer">
            Immobility
          </TabsTrigger>
        </TabsList>

        <TabsContent value="path" className="space-y-3">
          <ExportableFigure filename={`${name}-path`}>
            <PathView
              dims={dims}
              track={track}
              zones={zones}
              drawFrame={data.drawFrame}
              frameVersion={data.frameVersion}
            />
            <PathLegend duration={summary.duration} />
          </ExportableFigure>
          <p className="text-xs text-muted-foreground">
            The line follows the animal from start to end. Gaps appear where it
            was not detected.
          </p>
        </TabsContent>

        <TabsContent value="heatmap" className="space-y-3">
          <ExportableFigure filename={`${name}-heatmap`}>
            <HeatmapView
              dims={dims}
              grid={grid}
              zones={zones}
              drawFrame={data.drawFrame}
              frameVersion={data.frameVersion}
            />
            <HeatLegend max={grid.max} />
          </ExportableFigure>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex gap-1">
              {HEAT_RESOLUTIONS.map((c) => (
                <Button
                  key={c}
                  size="sm"
                  variant={heatCols === c ? "default" : "ghost"}
                  className="h-7 px-2 font-mono text-[11px]"
                  onClick={() => setHeatCols(c)}
                >
                  {c === 24 ? "Coarse" : c === 40 ? "Medium" : "Fine"}
                </Button>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="speed" className="space-y-3">
          <ExportableFigure filename={`${name}-speed`}>
            <SpeedChart
              series={series}
              bouts={bouts}
              threshold={threshold}
              currentTime={data.currentTime}
              onSeek={seek}
            />
          </ExportableFigure>
          <div className="max-w-xs">
            <SliderRow
              label="Smoothing"
              value={smooth}
              min={1}
              max={15}
              step={2}
              format={(v) => (v === 1 ? "off" : `${v} samples`)}
              onChange={setSmooth}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Click the chart to jump to that moment. Shaded areas are immobility
            bouts.
          </p>
        </TabsContent>

        <TabsContent value="timeline" className="space-y-3">
          <ExportableFigure filename={`${name}-zone-timeline`}>
            <ZoneTimeline
              occupancy={occupancy}
              bouts={bouts}
              t0={t0}
              duration={summary.duration}
              currentTime={data.currentTime}
              onSeek={seek}
            />
          </ExportableFigure>
          <p className="text-xs text-muted-foreground">
            Each bar shows when the animal was inside that zone. Click to jump
            to a moment.
          </p>
        </TabsContent>

        <TabsContent value="immobility" className="space-y-4">
          <MeasureGrid
            measures={[
              {
                label: "Bouts",
                value: boutStats.count,
                unit: "",
                digits: 0,
                hint: "",
              },
              {
                label: "Total immobile",
                value: boutStats.total,
                unit: "s",
                digits: 1,
                hint: "",
              },
              {
                label: "Immobile share",
                value:
                  summary.duration > 0
                    ? (boutStats.total / summary.duration) * 100
                    : 0,
                unit: "%",
                digits: 1,
                hint: "",
              },
              {
                label: "Mean bout",
                value: boutStats.mean,
                unit: "s",
                digits: 1,
                hint: "",
              },
              {
                label: "Longest bout",
                value: boutStats.longest,
                unit: "s",
                digits: 1,
                hint: "",
              },
              {
                label: "First bout",
                value: boutStats.latency,
                unit: "s",
                digits: 1,
                hint: "",
              },
            ]}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <SliderRow
              label="Speed threshold"
              value={threshold}
              min={0.5}
              max={10}
              step={0.5}
              format={(v) => `${v} cm/s`}
              onChange={setThreshold}
            />
            <SliderRow
              label="Minimum bout length"
              value={minBout}
              min={0.2}
              max={5}
              step={0.1}
              format={(v) => `${v.toFixed(1)} s`}
              onChange={setMinBout}
            />
          </div>
          {bouts.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {bouts.slice(0, 60).map((b) => (
                <button
                  key={b.start}
                  type="button"
                  onClick={() => seek(b.start)}
                  className="cursor-pointer rounded border bg-muted px-2 py-0.5 font-mono text-[11px] tabular-nums transition-colors hover:border-primary hover:text-primary"
                >
                  {b.start.toFixed(1)}s · {b.duration.toFixed(1)}s
                </button>
              ))}
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            A bout is any stretch where speed stays below the threshold for at
            least the minimum length. Click a bout to view it.
          </p>
        </TabsContent>
      </Tabs>
    </PanelSection>
  );
}
