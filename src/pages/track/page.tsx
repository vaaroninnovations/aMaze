import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "convex/react";
import { Camera, FileVideo, Upload } from "lucide-react";
import { toast } from "sonner";
import { getAnonymousSessionId } from "@/lib/anonymous-session.ts";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { useSessionOwnerKey } from "@/lib/session-convex.ts";
import AppHeader from "@/components/app-header.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Progress } from "@/components/ui/progress.tsx";
import { Slider } from "@/components/ui/slider.tsx";
import type { TemplateId } from "@/lib/tracking/types.ts";
import type { Detection } from "@/lib/tracking/vision.ts";
import ArenaPanel from "./_components/arena-panel.tsx";
import ArenaViewport from "@/components/tracking/arena-viewport.tsx";
import DetectionPanel from "./_components/detection-panel.tsx";
import DemoMenu from "./_components/demo-menu.tsx";
import ResultsPanel from "@/components/tracking/results-panel.tsx";
import AnalyticsPanel, {
  type AnalyticsData,
} from "@/components/tracking/analytics-panel.tsx";
import SaveTrialButton from "./_components/save-trial-button.tsx";
import LivePanel from "./_components/live-panel.tsx";
import SaveVideoButton from "./_components/save-video-button.tsx";
import SourcePicker from "./_components/source-picker.tsx";
import { useLiveTracking } from "./_hooks/use-live-tracking.ts";
import { useTrackingSession } from "./_hooks/use-tracking-session.ts";
import { useTrialInfo } from "./_hooks/use-trial-info.ts";
import TrialInfoPanel from "./_components/trial-info-panel.tsx";
import { VIDEO_ACCEPT } from "./_lib/video-accept.ts";
import { formatClock } from "./_lib/camera-source.ts";

export default function TrackPage() {
  const anonymousSessionId = getAnonymousSessionId();
  const s = useTrackingSession();
  const {
    ownerKey,
    isLoading: authLoading,
    isAuthenticated,
  } = useSessionOwnerKey();
  const fileRef = useRef<HTMLInputElement>(null);
  const demoLoadedRef = useRef(false);
  const projectTemplateAppliedRef = useRef(false);
  const [probe, setProbe] = useState<Detection | null>(null);
  const [saveState, setSaveState] = useState<{
    key: string;
    status: "saving" | "saved" | "failed";
  } | null>(null);
  const live = useLiveTracking(s);
  const trialInfo = useTrialInfo();
  const [searchParams] = useSearchParams();
  const experimentId = searchParams.get("experimentId");
  const project = useQuery(
    api.experiments.experiments.get,
    !authLoading && experimentId
      ? {
          experimentId: experimentId as Id<"experiments">,
          ...(ownerKey ? { ownerKey } : {}),
        }
      : "skip",
  );
  const account = useQuery(
    api.users.getCurrentUser,
    isAuthenticated ? {} : "skip",
  );
  const demoParam = searchParams.get("demo");
  const wantsDemo = demoParam !== null;
  const demoTemplate =
    demoParam && demoParam !== "1" ? (demoParam as TemplateId) : undefined;
  const { load } = s;

  useEffect(() => {
    if (projectTemplateAppliedRef.current || s.status !== "empty") return;
    const templateId =
      project?.experiment.templateId ?? account?.preferences?.defaultMazeType;
    if (!templateId) return;
    s.setTemplateId(templateId as TemplateId);
    projectTemplateAppliedRef.current = true;
  }, [
    account?.preferences?.defaultMazeType,
    project?.experiment.templateId,
    s,
    s.status,
    s.setTemplateId,
  ]);

  // Landing page "Try the demo" link opens the workspace with the demo loaded.
  useEffect(() => {
    if (wantsDemo && !demoLoadedRef.current) {
      demoLoadedRef.current = true;
      void load("demo", undefined, demoTemplate);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one automatic demo load per page visit
  }, [wantsDemo]);

  const summary = s.serverSummary;
  const saveKey = JSON.stringify({
    source: s.source?.name,
    live: s.isLive,
    templateId: s.templateId,
    arena: s.arena,
    zones: s.zones,
    settings: s.settings,
    trackCount: s.track.length,
    lastPoint: s.track.at(-1),
    info: trialInfo.info,
  });
  const saveStatus =
    saveState?.key === saveKey ? saveState.status : "unsaved";

  useEffect(() => {
    if (s.status !== "done" || s.track.length === 0 || saveStatus === "saved") {
      return;
    }
    const warnBeforeLeaving = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warnBeforeLeaving);
    return () => window.removeEventListener("beforeunload", warnBeforeLeaving);
  }, [s.status, s.track.length, saveStatus]);

  const handleProbe = async () => {
    const det = await s.testDetection();
    setProbe(det);
    if (det && !det.found)
      toast.error(
        "No animal found in this frame. Try lowering the threshold or size.",
      );
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
        <DemoMenu
          onSelect={(id) => void s.load("demo", undefined, id)}
          disabled={live.running}
        >
          <span className="hidden sm:inline">Demo video</span>
        </DemoMenu>
        <Button
          size="sm"
          variant="secondary"
          onClick={openCamera}
          disabled={live.running || s.isLive}
        >
          <Camera /> <span className="hidden sm:inline">Use camera</span>
        </Button>
        <Button
          size="sm"
          onClick={() => fileRef.current?.click()}
          disabled={live.running}
        >
          <Upload /> <span className="hidden sm:inline">Upload video</span>
        </Button>
      </AppHeader>

      <main className="mx-auto max-w-[1600px] p-4">
        {s.status === "uploading" ? (
          <div className="mx-auto mt-10 max-w-xl space-y-3 rounded-xl border border-dashed px-6 py-16 text-center">
            <FileVideo className="mx-auto size-8 text-muted-foreground" />
            <p className="font-medium">
              Uploading video for server-side tracking
            </p>
            <p className="text-sm text-muted-foreground">
              The video is uploaded securely for processing. It is temporary
              until you save it with a trial.
            </p>
            <Progress value={s.progress * 100} className="mx-auto max-w-xs" />
            <p className="font-mono text-xs tabular-nums text-muted-foreground">
              {Math.round(s.progress * 100)}%
            </p>
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
                      <span className="size-1.5 animate-pulse rounded-full bg-white" />{" "}
                      LIVE
                    </span>
                  )}
                  <span className="truncate">{s.source?.name}</span>
                </span>
                <span className="shrink-0">
                  {s.dims.w}×{s.dims.h} ·{" "}
                  {s.isLive
                    ? formatClock(live.running ? live.elapsed : s.currentTime)
                    : `${duration.toFixed(1)} s`}
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
                  liveDraw={
                    s.isLive && s.status !== "preparing"
                      ? s.drawLive
                      : undefined
                  }
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
                        {s.isLive
                          ? "Calibrating: keep the arena empty"
                          : "Building background and detecting arena"}
                      </p>
                      <Progress value={s.progress * 100} />
                    </div>
                  </div>
                )}
              </div>
              {!s.isLive && (
                <div className="flex items-center gap-3">
                  <span className="w-16 font-mono text-xs tabular-nums">
                    {s.currentTime.toFixed(1)} s
                  </span>
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
                  serverMeasures={s.serverMeasures}
                  anonymousSessionId={
                    s.source?.kind === "demo" ? undefined : anonymousSessionId
                  }
                  busy={s.status === "tracking"}
                  actions={
                    <>
                      <SaveVideoButton
                        recording={
                          s.isLive && !live.running ? live.recording : null
                        }
                      />
                      <SaveTrialButton
                        s={s}
                        info={trialInfo.info}
                        videoFile={
                          live.recording?.file ?? s.source?.originalFile
                        }
                        disabled={s.status !== "done"}
                        onSaveStatusChange={(status) =>
                          setSaveState({ key: saveKey, status })
                        }
                      />
                      {s.status === "done" && (
                        <span
                          className="self-center text-xs text-muted-foreground"
                          aria-live="polite"
                        >
                          {saveStatus === "saved"
                            ? "Saved"
                            : saveStatus === "saving"
                              ? "Saving…"
                              : saveStatus === "failed"
                                ? "Save failed"
                                : "Unsaved changes"}
                        </span>
                      )}
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
