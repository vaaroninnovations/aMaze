import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Camera, FileVideo, Upload } from "lucide-react";
import { toast } from "sonner";
import AppHeader from "@/components/app-header.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Progress } from "@/components/ui/progress.tsx";
import { Slider } from "@/components/ui/slider.tsx";
import { summarize } from "@/lib/tracking/metrics.ts";
import type { TemplateId } from "@/lib/tracking/types.ts";
import type { Detection } from "@/lib/tracking/vision.ts";
import ArenaPanel from "./_components/arena-panel.tsx";
import ArenaViewport from "@/components/tracking/arena-viewport.tsx";
import DetectionPanel from "./_components/detection-panel.tsx";
import DemoMenu from "./_components/demo-menu.tsx";
import ResultsPanel from "@/components/tracking/results-panel.tsx";
import AnalyticsPanel, { type AnalyticsData } from "@/components/tracking/analytics-panel.tsx";
import SaveTrialButton from "./_components/save-trial-button.tsx";
import LivePanel from "./_components/live-panel.tsx";
import SaveVideoButton from "./_components/save-video-button.tsx";
import SourcePicker from "./_components/source-picker.tsx";
import { useLiveTracking } from "./_hooks/use-live-tracking.ts";
import { useTrackingSession } from "./_hooks/use-tracking-session.ts";
import { useTrialInfo } from "./_hooks/use-trial-info.ts";
import TrialInfoPanel from "./_components/trial-info-panel.tsx";
import { VIDEO_ACCEPT } from "./_lib/convert-video.ts";
import { formatClock } from "./_lib/camera-source.ts";

export default function TrackPage() {
  const s = useTrackingSession();
  const fileRef = useRef<HTMLInputElement>(null);
  const [probe, setProbe] = useState<Detection | null>(null);
  const live = useLiveTracking(s);
  const trialInfo = useTrialInfo();
  const [searchParams] = useSearchParams();
  const demoParam = searchParams.get("demo");
  const mazeParam = searchParams.get("maze") || searchParams.get("template");
  const projectIdParam = searchParams.get("projectId");
  const speciesParam = searchParams.get("species") || searchParams.get("animal");
  const groupParam = searchParams.get("group");

  const resolvedTemplate = useMemo<TemplateId | undefined>(() => {
    if (demoParam && demoParam !== "1") return demoParam as TemplateId;
    if (!mazeParam) return undefined;
    const lower = mazeParam.toLowerCase().replace(/_/g, "-");
    if (lower.includes("water") || lower.includes("morris")) return "water-maze";
    if (lower.includes("elevated") || lower.includes("plus") || lower === "epm") return "elevated-plus";
    if (lower.includes("y-maze") || lower.includes("y_maze") || lower === "ym") return "y-maze";
    if (lower.includes("barnes")) return "barnes-maze";
    if (lower.includes("radial")) return "radial-arm";
    if (lower.includes("novel") || lower.includes("nor")) return "novel-object";
    if (lower.includes("light") || lower.includes("dark") || lower === "ldt") return "light-dark";
    if (lower.includes("chamber") || lower.includes("social")) return "three-chamber";
    if (lower.includes("open") || lower.includes("field") || lower === "oft") return "open-field";
    return undefined;
  }, [demoParam, mazeParam]);

  const { load } = s;

  // Auto-load demo scene if requested or if launched from setup
  useEffect(() => {
    if (resolvedTemplate || demoParam !== null) {
      void load("demo", undefined, resolvedTemplate || "open-field");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount only
  }, []);

  // Pre-fill bench-sheet details from URL/setup parameters
  useEffect(() => {
    const patch: Record<string, string> = {};
    if (speciesParam && !trialInfo.info.animalNo) patch.animalNo = speciesParam;
    if (groupParam && !trialInfo.info.group) patch.group = groupParam;
    if (projectIdParam && !trialInfo.info.experimentNo) patch.experimentNo = projectIdParam;
    if (Object.keys(patch).length > 0) {
      trialInfo.update(patch);
    }
  }, [speciesParam, groupParam, projectIdParam]);

  const summary = useMemo(
    () => (s.track.length > 1 ? summarize(s.track, s.zones, s.pxPerCm) : null),
    [s.track, s.zones, s.pxPerCm],
  );

  const handleProbe = async () => {
    const det = await s.testDetection();
    setProbe(det);
    if (det && !det.found) toast.error("No animal found in this frame. Try lowering the threshold or size.");
  };

  const onFile = (f: File | undefined) => {
    if (!f) return;
    setProbe(null);
    void s.load(f);
  };

  const openCamera = () => {
    if (live.running) return;
    setProbe(null);
    live.clearRecording();
    void s.load("camera");
  };

  const editable = s.status === "ready" || s.status === "done";
  const duration = s.source?.duration ?? 0;
  const analyticsData: AnalyticsData = {
    track: s.track,
    zones: s.zones,
    pxPerCm: s.pxPerCm,
    dims: s.dims,
    templateId: s.templateId,
    arenaRect: s.arena?.rect ?? null,
    sourceName: s.source?.name,
    duration: duration || (summary?.duration ?? 0),
    currentTime: s.currentTime,
    onSeek: (t) => void s.showFrame(t),
    drawFrame: s.drawCurrent,
    frameVersion: s.frameVersion,
    info: trialInfo.info,
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader>
        <input
          ref={fileRef}
          type="file"
          accept={VIDEO_ACCEPT}
          className="hidden"
          onChange={(e) => {
            onFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        <DemoMenu onSelect={(id) => void s.load("demo", undefined, id)} disabled={live.running}>
          <span className="hidden sm:inline">Demo video</span>
        </DemoMenu>
        <Button size="sm" variant="secondary" onClick={openCamera} disabled={live.running || s.isLive}>
          <Camera /> <span className="hidden sm:inline">Use camera</span>
        </Button>
        <Button size="sm" onClick={() => fileRef.current?.click()} disabled={live.running}>
          <Upload /> <span className="hidden sm:inline">Upload video</span>
        </Button>
      </AppHeader>

      <main className="mx-auto max-w-[1600px] p-4">
        {s.status === "converting" ? (
          <div className="mx-auto mt-10 max-w-xl space-y-3 rounded-xl border border-dashed px-6 py-16 text-center">
            <FileVideo className="mx-auto size-8 text-muted-foreground" />
            <p className="font-medium">Converting video to a playable format</p>
            <p className="text-sm text-muted-foreground">
              This format can't be played directly in the browser, so it's being converted on your computer. Large files can take a few minutes.
            </p>
            <Progress value={s.progress * 100} className="mx-auto max-w-xs" />
            <p className="font-mono text-xs tabular-nums text-muted-foreground">{Math.round(s.progress * 100)}%</p>
          </div>
        ) : s.status === "empty" ? (
          <SourcePicker
            error={s.error}
            onUpload={() => fileRef.current?.click()}
            onDropFile={onFile}
            onCamera={openCamera}
            onDemo={(id) => void s.load("demo", undefined, id)}
          />
        ) : (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
            <div className="min-w-0 space-y-4">
              <div className="flex items-center justify-between gap-2 font-mono text-xs text-muted-foreground">
                <span className="flex min-w-0 items-center gap-2">
                  {s.isLive && (
                    <span className="flex shrink-0 items-center gap-1 rounded bg-destructive px-1.5 py-0.5 text-[10px] font-semibold text-white">
                      <span className="size-1.5 animate-pulse rounded-full bg-white" /> LIVE
                    </span>
                  )}
                  <span className="truncate">{s.source?.name}</span>
                </span>
                <span className="shrink-0">
                  {s.dims.w}×{s.dims.h} · {s.isLive ? formatClock(live.running ? live.elapsed : s.currentTime) : `${duration.toFixed(1)} s`}
                </span>
              </div>
              <div className="relative">
                <ArenaViewport
                  dims={s.dims}
                  frameVersion={s.frameVersion}
                  drawCurrent={s.drawCurrent}
                  arena={s.arena}
                  onArenaChange={s.setArenaManual}
                  zones={s.zones}
                  track={s.track}
                  currentTime={s.currentTime}
                  editable={editable}
                  probe={probe}
                  liveDraw={s.isLive && s.status !== "preparing" ? s.drawLive : undefined}
                  trailSeconds={live.running ? 30 : undefined}
                  zoneEditing={{
                    edits: s.zoneEdits,
                    onChange: s.setZoneEdit,
                    selectedId: s.selectedZoneId,
                    onSelect: s.setSelectedZoneId,
                  }}
                />
                {s.status === "preparing" && (
                  <div className="absolute inset-0 grid place-items-center rounded-lg bg-background/80 backdrop-blur-sm">
                    <div className="w-64 space-y-2 text-center">
                      <p className="text-sm font-medium">
                        {s.isLive ? "Calibrating: keep the arena empty" : "Building background and detecting arena"}
                      </p>
                      <Progress value={s.progress * 100} />
                    </div>
                  </div>
                )}
              </div>
              {!s.isLive && (
              <div className="flex items-center gap-3">
                <span className="w-16 font-mono text-xs tabular-nums">{s.currentTime.toFixed(1)} s</span>
                <Slider
                  value={[s.currentTime]}
                  min={0}
                  max={Math.max(duration, 0.1)}
                  step={0.1}
                  disabled={!editable}
                  onValueChange={([t]) => {
                    setProbe(null);
                    void s.showFrame(t);
                  }}
                  className="cursor-pointer"
                />
              </div>
              )}
              <ResultsPanel summary={summary} />
              {/* Live sessions keep analytics visible so measures update while the animal is tracked. */}
              {summary && (s.status !== "tracking" || s.isLive) && (
                <AnalyticsPanel
                  data={analyticsData}
                  summary={summary}
                  busy={s.status === "tracking"}
                  actions={
                    <>
                      <SaveVideoButton recording={s.isLive && !live.running ? live.recording : null} />
                      <SaveTrialButton s={s} summary={summary} info={trialInfo.info} disabled={s.status === "tracking" || !summary} />
                    </>
                  }
                />
              )}
            </div>
            <aside className="space-y-4">
              <TrialInfoPanel state={trialInfo} />
              {s.isLive && <LivePanel s={s} live={live} onReview={onFile} />}
              <ArenaPanel s={s} disabled={!editable} />
              <DetectionPanel s={s} onProbe={() => void handleProbe()} />
            </aside>
          </div>
        )}
      </main>
    </div>
  );
}
