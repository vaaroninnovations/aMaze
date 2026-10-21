import { useCallback, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { format } from "date-fns";
import {
  AlertTriangle,
  ArrowLeft,
  Pause,
  Play,
  Radio,
  Trash2,
  Video,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { getAnonymousSessionId } from "@/lib/anonymous-session.ts";
import { useSessionOwnerKey } from "@/lib/session-convex.ts";
import AppHeader from "@/components/app-header.tsx";
import ConfirmDialog from "@/components/confirm-dialog.tsx";
import AnalyticsPanel, {
  type AnalyticsData,
} from "@/components/tracking/analytics-panel.tsx";
import ArenaViewport from "@/components/tracking/arena-viewport.tsx";
import ResultsPanel from "@/components/tracking/results-panel.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  ErrorState,
  ErrorStateDescription,
  ErrorStateHeader,
  ErrorStateMedia,
  ErrorStateTitle,
} from "@/components/ui/error-state.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Slider } from "@/components/ui/slider.tsx";
import { errorMessage } from "@/lib/errors.ts";
import { getTemplate } from "@/lib/tracking/templates.ts";
import type { TemplateId, TrackPoint } from "@/lib/tracking/types.ts";
import GroupBadge from "../_components/group-badge.tsx";
import QueryBoundary from "../_components/query-boundary.tsx";
import NotAvailable from "../_components/not-available.tsx";
import { useReplay } from "./_hooks/use-replay.ts";
import { useSnapshot, useTrackFile } from "./_hooks/use-trial-files.ts";
import TrialNotes from "./_components/trial-notes.tsx";

const noop = () => undefined;

function TrialView({
  trialId,
  experimentId,
}: {
  trialId: Id<"trials">;
  experimentId: string;
}) {
  const { ownerKey, isLoading } = useSessionOwnerKey();
  const anonymousSessionId = getAnonymousSessionId();
  const navigate = useNavigate();
  const data = useQuery(
    api.experiments.trials.get,
    isLoading ? "skip" : { trialId, ...(ownerKey ? { ownerKey } : {}) },
  );
  const remove = useMutation(api.experiments.trials.remove);
  const trackQuery = useTrackFile(data?.trackUrl);
  const snapshot = useSnapshot(
    data === undefined ? undefined : (data?.snapshotUrl ?? null),
  );
  const track: TrackPoint[] = useMemo(
    () => trackQuery.data ?? [],
    [trackQuery.data],
  );
  const [currentTime, setCurrentTime] = useState<number | null>(null);
  const end = track[track.length - 1]?.t ?? 0;
  const replay = useReplay(end, setCurrentTime);
  const time = currentTime ?? end;

  const img = snapshot.data;
  const drawFrame = useCallback(
    (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      if (img) ctx.drawImage(img, 0, 0, w, h);
      else {
        ctx.fillStyle = "#111";
        ctx.fillRect(0, 0, w, h);
      }
    },
    [img],
  );

  const summary = data?.trial.summary ?? null;

  if (data === undefined) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="aspect-[4/3] w-full max-w-3xl" />
      </div>
    );
  }
  if (data === null) return <NotAvailable what="Trial" />;

  const { trial, subject, group, experiment, canEdit } = data;
  const analyticsData: AnalyticsData = {
    track,
    zones: trial.zones,
    pxPerCm: trial.pxPerCm,
    dims: trial.dims,
    templateId: trial.templateId as TemplateId,
    arenaRect: trial.arena.rect,
    sourceName: `${subject?.code ?? "subject"}-${trial.session}`,
    duration: end,
    currentTime: time,
    onSeek: (t) => {
      replay.pause();
      setCurrentTime(t);
    },
    drawFrame,
    frameVersion: img ? 1 : 0,
    info: trial.info,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 space-y-1.5">
          <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-primary">
            {trial.live ? (
              <Radio className="size-3.5" />
            ) : (
              <Video className="size-3.5" />
            )}
            {getTemplate(trial.templateId as TemplateId).name} ·{" "}
            {experiment.name}
          </p>
          <h1 className="flex flex-wrap items-center gap-3 text-2xl font-semibold tracking-tight">
            <span className="font-mono">
              {subject?.code ?? "Deleted subject"}
            </span>
            <span className="text-muted-foreground">/</span>
            <span className="truncate">{trial.session}</span>
            {group && <GroupBadge group={group} />}
          </h1>
          <p className="font-mono text-xs text-muted-foreground">
            {format(new Date(trial.recordedAt), "PPP 'at' HH:mm")} ·{" "}
            {trial.sourceName} · {trial.fps} fps · arena {trial.arenaCm} cm
          </p>
        </div>
        {canEdit && (
          <ConfirmDialog
            title="Delete this trial?"
            description="The saved results, track, background image, and attached video are removed permanently."
            onConfirm={async () => {
              try {
                await remove({ trialId, ...(ownerKey ? { ownerKey } : {}) });
                navigate(`/experiments/${experimentId}`);
              } catch (e) {
                toast.error(errorMessage(e, "Could not delete the trial."));
              }
            }}
            trigger={
              <Button
                size="sm"
                variant="ghost"
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 /> Delete
              </Button>
            }
          />
        )}
      </div>

      {trackQuery.isError ? (
        <ErrorState>
          <ErrorStateHeader>
            <ErrorStateMedia variant="icon">
              <AlertTriangle />
            </ErrorStateMedia>
            <ErrorStateTitle>Could not load the track</ErrorStateTitle>
            <ErrorStateDescription>
              {trackQuery.error.message}
            </ErrorStateDescription>
          </ErrorStateHeader>
        </ErrorState>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0 space-y-3">
            {trackQuery.isPending || snapshot.isPending ? (
              <Skeleton
                className="w-full"
                style={{ aspectRatio: `${trial.dims.w} / ${trial.dims.h}` }}
              />
            ) : (
              <ArenaViewport
                dims={trial.dims}
                frameVersion={img ? 1 : 0}
                drawCurrent={drawFrame}
                arena={trial.arena}
                onArenaChange={noop}
                zones={trial.zones}
                track={track}
                currentTime={time}
                editable={false}
                probe={null}
              />
            )}
            <div className="flex items-center gap-3">
              <Button
                size="icon"
                variant="secondary"
                className="size-8"
                onClick={replay.toggle}
                disabled={end <= 0}
                aria-label={replay.playing ? "Pause replay" : "Play replay"}
              >
                {replay.playing ? <Pause /> : <Play />}
              </Button>
              <span className="w-16 font-mono text-xs tabular-nums">
                {time.toFixed(1)} s
              </span>
              <Slider
                value={[time]}
                min={0}
                max={Math.max(end, 0.1)}
                step={0.1}
                onValueChange={([t]) => {
                  replay.pause();
                  setCurrentTime(t);
                }}
                className="cursor-pointer"
              />
            </div>
            {data.videoUrl && (
              <video
                className="w-full rounded-lg border bg-black"
                controls
                preload="metadata"
                src={data.videoUrl}
              >
                Your browser cannot play this saved trial video.
              </video>
            )}
          </div>
          <TrialNotes
            trialId={trialId}
            session={trial.session}
            notes={trial.notes ?? ""}
            info={trial.info}
            canEdit={canEdit}
          />
        </div>
      )}

      {summary && (
        <>
          <ResultsPanel summary={summary} />
          <AnalyticsPanel
            data={analyticsData}
            summary={summary}
            serverMeasures={trial.measures}
            anonymousSessionId={anonymousSessionId}
            step="02"
          />
        </>
      )}
    </div>
  );
}

export default function TrialPage() {
  const { experimentId = "", trialId } = useParams();
  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-[1400px] space-y-4 p-4 py-6">
        <Button size="sm" variant="ghost" className="-ml-2" asChild>
          <Link to={`/experiments/${experimentId}`}>
            <ArrowLeft /> Experiment
          </Link>
        </Button>
        <QueryBoundary key={trialId} fallback={<NotAvailable what="Trial" />}>
          <TrialView
            trialId={trialId as Id<"trials">}
            experimentId={experimentId}
          />
        </QueryBoundary>
      </main>
    </div>
  );
}
