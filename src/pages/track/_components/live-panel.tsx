import { useEffect, useMemo, useState } from "react";
import { Circle, Download, FileVideo, Radio, RotateCcw, ScanSearch, Square } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import { assignZones } from "@/lib/tracking/metrics.ts";
import { cn } from "@/lib/utils.ts";
import { formatClock, listCameras, type CameraDevice } from "../_lib/camera-source.ts";
import type { useLiveTracking } from "../_hooks/use-live-tracking.ts";
import type { TrackingSession } from "../_hooks/use-tracking-session.ts";
import PanelSection from "@/components/tracking/panel-section.tsx";

type Props = {
  s: TrackingSession;
  live: ReturnType<typeof useLiveTracking>;
  onReview: (file: File) => void;
};

const DURATIONS = [
  { id: "none", label: "Until stopped", seconds: null },
  { id: "60", label: "1 min", seconds: 60 },
  { id: "300", label: "5 min", seconds: 300 },
  { id: "600", label: "10 min", seconds: 600 },
  { id: "1800", label: "30 min", seconds: 1800 },
] as const;

/** Controls for real-time camera sessions: camera, calibration, recording and live readouts. */
export default function LivePanel({ s, live, onReview }: Props) {
  const [devices, setDevices] = useState<CameraDevice[]>([]);
  const [record, setRecord] = useState(true);
  const [durationId, setDurationId] = useState<(typeof DURATIONS)[number]["id"]>("none");
  const duration = DURATIONS.find((d) => d.id === durationId) ?? DURATIONS[0];
  const busy = live.running || s.status === "preparing";

  // While positioning the camera (not yet tracking), keep the arena locked onto the maze.
  const { isLive, autoFollow, status, followArena } = s;
  useEffect(() => {
    if (!isLive || !autoFollow || live.running || status !== "ready") return;
    const id = setInterval(() => void followArena(), 1500);
    return () => clearInterval(id);
  }, [isLive, autoFollow, status, followArena, live.running]);

  // Device labels are only available after the camera permission was granted, i.e. once live.
  useEffect(() => {
    if (!s.isLive) return;
    let cancelled = false;
    void listCameras().then((d) => {
      if (!cancelled) setDevices(d);
    });
    return () => {
      cancelled = true;
    };
  }, [s.isLive]);

  const readout = useMemo(() => {
    const found = s.track.filter((p) => p.found);
    const last = found[found.length - 1];
    const before = found[found.length - 2];
    const speed =
      last && before && last.t > before.t
        ? Math.hypot(last.x - before.x, last.y - before.y) / s.pxPerCm / (last.t - before.t)
        : 0;
    const zoneIds = last ? (assignZones([last], s.zones)[0] ?? []) : [];
    const zoneNames = s.zones.filter((z) => zoneIds.includes(z.id));
    const lastPoint = s.track[s.track.length - 1];
    return { speed, zoneNames, detected: lastPoint?.found ?? false };
  }, [s.track, s.zones, s.pxPerCm]);

  return (
    <PanelSection
      step="00"
      collapsible
      title="Live camera"
      action={
        live.running ? (
          <span className="flex items-center gap-1.5 rounded-full bg-destructive/15 px-2 py-0.5 font-mono text-[11px] text-destructive">
            <span className="size-1.5 animate-pulse rounded-full bg-destructive" />
            {record ? "REC" : "LIVE"} {formatClock(live.elapsed)}
          </span>
        ) : (
          <span className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
            <Radio className="size-3.5 text-primary" /> {s.dims.w}×{s.dims.h}
          </span>
        )
      }
    >
      {devices.length > 1 && (
        <Select value={s.source?.deviceId} onValueChange={(id) => void s.load("camera", id)} disabled={busy}>
          <SelectTrigger size="sm" className="w-full cursor-pointer">
            <SelectValue placeholder="Choose camera" />
          </SelectTrigger>
          <SelectContent>
            {devices.map((d) => (
              <SelectItem key={d.deviceId} value={d.deviceId} className="cursor-pointer">
                {d.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <div className="grid grid-cols-2 gap-2">
        <Button size="sm" variant="secondary" onClick={() => void s.detectArenaNow()} disabled={busy}>
          <ScanSearch /> Detect arena
        </Button>
        <Button size="sm" variant="secondary" onClick={() => void s.recalibrate()} disabled={busy}>
          <RotateCcw /> Recalibrate
        </Button>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Recalibrate with the arena empty: it captures a clean background and redraws the arena and zones.
      </p>

      <div className="flex items-center justify-between gap-3">
        <Label htmlFor="live-follow" className="text-xs text-muted-foreground">
          Auto-follow arena and zones
        </Label>
        <Switch id="live-follow" checked={s.autoFollow} onCheckedChange={s.setAutoFollow} className="cursor-pointer" />
      </div>
      <p className="-mt-1 text-[11px] text-muted-foreground">
        Re-detects the maze every few seconds and shifts, scales and rotates the arena, arms and zones if the camera or maze moves.
        Dragging the arena by hand pauses it.
      </p>

      <div className="flex items-center justify-between gap-3">
        <Label htmlFor="live-record" className="text-xs text-muted-foreground">
          Record video while tracking
        </Label>
        <Switch id="live-record" checked={record} onCheckedChange={setRecord} disabled={live.running} className="cursor-pointer" />
      </div>
      <p className="-mt-1 text-[11px] text-muted-foreground">
        {record
          ? "The video is kept until you start a new session, so download it after stopping."
          : "Turn this on to download the video after the session."}
      </p>
      <div className="flex items-center justify-between gap-3">
        <Label className="text-xs text-muted-foreground">Session length</Label>
        <Select value={durationId} onValueChange={(v) => setDurationId(v as typeof durationId)} disabled={live.running}>
          <SelectTrigger size="sm" className="w-36 cursor-pointer">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DURATIONS.map((d) => (
              <SelectItem key={d.id} value={d.id} className="cursor-pointer">
                {d.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {live.running ? (
        <Button size="sm" variant="destructive" className="w-full" onClick={live.stop}>
          <Square /> Stop session
        </Button>
      ) : (
        <Button
          size="sm"
          className="w-full"
          onClick={() => live.start({ record, maxSeconds: duration.seconds })}
          disabled={busy || !s.arena}
        >
          <Circle className="fill-current" /> {s.status === "done" ? "Start new session" : "Start live tracking"}
        </Button>
      )}

      {(live.running || s.status === "done") && (
        <div className="grid grid-cols-3 gap-px overflow-hidden rounded-md border bg-border text-center">
          <Readout label="Speed" value={readout.speed.toFixed(1)} unit="cm/s" />
          <Readout
            label="Zone"
            value={readout.zoneNames.map((z) => z.name).join(", ") || "none"}
            color={readout.zoneNames[0]?.color}
          />
          <Readout
            label="Animal"
            value={readout.detected ? "found" : "lost"}
            className={readout.detected ? "text-primary" : "text-destructive"}
          />
        </div>
      )}

      {live.recording && !live.running && (
        <div className="space-y-2 rounded-md border bg-muted/40 p-2.5">
          <p className="flex items-center gap-1.5 truncate font-mono text-[11px]">
            <FileVideo className="size-3.5 shrink-0" /> {live.recording.file.name} ·{" "}
            {(live.recording.file.size / 1e6).toFixed(1)} MB
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Button size="sm" variant="secondary" asChild>
              <a href={live.recording.url} download={live.recording.file.name}>
                <Download /> Save video
              </a>
            </Button>
            <Button size="sm" variant="secondary" onClick={() => live.recording && onReview(live.recording.file)}>
              <FileVideo /> Review
            </Button>
          </div>
        </div>
      )}
    </PanelSection>
  );
}

type ReadoutProps = { label: string; value: string; unit?: string; color?: string; className?: string };

function Readout({ label, value, unit, color, className }: ReadoutProps) {
  return (
    <div className="min-w-0 bg-card px-1.5 py-2">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={cn("truncate font-mono text-sm font-semibold tabular-nums", className)} style={color ? { color } : undefined}>
        {value}
        {unit && <span className="pl-0.5 text-[10px] font-normal text-muted-foreground">{unit}</span>}
      </p>
    </div>
  );
}
