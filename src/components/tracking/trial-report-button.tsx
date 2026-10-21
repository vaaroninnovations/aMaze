import { useRef, useState } from "react";
import { FileText } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import { elementToDataUrl } from "@/lib/export-image.ts";
import type { ReportFigure } from "@/lib/reports/trial-report.ts";
import type { Bout, HeatGrid, SpeedSample, ZoneOccupancy } from "@/lib/tracking/analytics.ts";
import { summarizeBouts } from "@/lib/tracking/analytics.ts";
import type { TrackSummary } from "@/lib/tracking/metrics.ts";
import { getTemplate } from "@/lib/tracking/templates.ts";
import type { Measure } from "@/lib/tracking/test-measures.ts";
import HeatmapView, { HeatLegend } from "./heatmap-view.tsx";
import type { AnalyticsData } from "./analytics-panel.tsx";
import PathView, { PathLegend } from "./path-view.tsx";
import SpeedChart from "./speed-chart.tsx";
import ZoneTimeline from "./zone-timeline.tsx";

type Props = {
  data: AnalyticsData;
  summary: TrackSummary;
  measures: Measure[];
  series: SpeedSample[];
  bouts: Bout[];
  grid: HeatGrid;
  occupancy: ZoneOccupancy[];
  threshold: number;
  minBout: number;
  filename: string;
  disabled?: boolean;
};

const noop = () => {};
// Charts need a real layout width, so they render in a fixed-size box far off-screen.
const RENDER_WIDTH = 900;
const SETTLE_MS = 700;

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * One-click PDF. The figures on the analytics tabs are only mounted while their tab is open,
 * so the report renders its own copies off-screen, photographs them, then removes them.
 */
export default function TrialReportButton(props: Props) {
  const { data, summary, measures, series, bouts, grid, occupancy, threshold, minBout } = props;
  const [capturing, setCapturing] = useState(false);
  const stage = useRef<HTMLDivElement>(null);
  const t0 = data.track[0]?.t ?? 0;

  const figureDefs = [
    { key: "path", caption: "Tracking path" },
    { key: "heatmap", caption: "Occupancy heatmap" },
    { key: "speed", caption: "Speed over time" },
    { key: "timeline", caption: "Zone timeline" },
  ];

  const generate = async () => {
    setCapturing(true);
    try {
      await wait(SETTLE_MS);
      const figures: ReportFigure[] = [];
      for (const def of figureDefs) {
        const el = stage.current?.querySelector<HTMLElement>(`[data-figure="${def.key}"]`);
        if (el) figures.push({ caption: def.caption, dataUrl: await elementToDataUrl(el, "jpeg") });
      }
      // Loaded on demand: jsPDF is large and only needed when a report is requested.
      const { buildTrialReport } = await import("@/lib/reports/trial-report.ts");
      const doc = buildTrialReport({
        title: "Behavior tracking report",
        details: [getTemplate(data.templateId).name, data.sourceName ? `Source: ${data.sourceName}` : ""].filter(Boolean),
        info: data.info,
        summary,
        measures,
        bouts: summarizeBouts(bouts, t0),
        boutSettings: { threshold, minDuration: minBout },
        figures,
      });
      doc.save(`${props.filename}-report.pdf`);
    } catch {
      toast.error("Could not create the PDF report. Please try again.");
    } finally {
      setCapturing(false);
    }
  };

  return (
    <>
      <Button size="sm" variant="secondary" onClick={generate} disabled={props.disabled || capturing}>
        {capturing ? <Spinner /> : <FileText />} <span className="hidden sm:inline">PDF report</span>
      </Button>
      {capturing && (
        <div ref={stage} aria-hidden className="pointer-events-none fixed top-0 -left-[10000px] space-y-4" style={{ width: RENDER_WIDTH }}>
          <div data-figure="path" className="space-y-3 bg-background p-2">
            <PathView dims={data.dims} track={data.track} zones={data.zones} drawFrame={data.drawFrame} frameVersion={data.frameVersion} />
            <PathLegend duration={summary.duration} />
          </div>
          <div data-figure="heatmap" className="space-y-3 bg-background p-2">
            <HeatmapView dims={data.dims} grid={grid} zones={data.zones} drawFrame={data.drawFrame} frameVersion={data.frameVersion} />
            <HeatLegend max={grid.max} />
          </div>
          <div data-figure="speed" className="bg-background p-2">
            <SpeedChart series={series} bouts={bouts} threshold={threshold} currentTime={-1} onSeek={noop} />
          </div>
          <div data-figure="timeline" className="bg-background p-2">
            <ZoneTimeline occupancy={occupancy} bouts={bouts} t0={t0} duration={summary.duration} currentTime={-1} onSeek={noop} />
          </div>
        </div>
      )}
    </>
  );
}
