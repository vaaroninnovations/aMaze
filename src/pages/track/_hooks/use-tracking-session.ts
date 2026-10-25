import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { arenaPolygon, pointInPolygon } from "@/lib/tracking/geometry.ts";
import { buildZones, defaultParams } from "@/lib/tracking/templates.ts";
import { alignArena, arenaMoved, blendArena, detectMaze, templateFor, type MazeDetection } from "@/lib/tracking/maze-detect.ts";
import { applyZoneEdits, type ZoneEdit, type ZoneEdits } from "@/lib/tracking/zone-edits.ts";
import type {
  Arena,
  DetectionSettings,
  Gray,
  TemplateId,
  TemplateParams,
  TrackPoint,
} from "@/lib/tracking/types.ts";
import { arenaMask, detectAnimal, detectArena, medianBackground, toGray } from "@/lib/tracking/vision.ts";
import { createDemoSource, createVideoSource, type FrameSource } from "../_lib/frame-source.ts";
import { createCameraSource, describeCameraError } from "../_lib/camera-source.ts";

/** Analysis resolution: all geometry lives in this pixel space. */
const WORK_MAX_W = 480;
const BACKGROUND_SAMPLES = 15;
const LIVE_SAMPLE_GAP_MS = 100;

export type SessionStatus = "empty" | "converting" | "preparing" | "ready" | "tracking" | "done";

export type Dims = { w: number; h: number };

function makeCanvas(d: Dims) {
  const canvas = document.createElement("canvas");
  canvas.width = d.w;
  canvas.height = d.h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas is not supported in this browser.");
  return { canvas, ctx };
}

export function useTrackingSession() {
  const [source, setSource] = useState<FrameSource | null>(null);
  const [dims, setDims] = useState<Dims>({ w: 480, h: 360 });
  const [status, setStatus] = useState<SessionStatus>("empty");
  const [error, setError] = useState<string | null>(null);
  const [background, setBackground] = useState<Gray | null>(null);
  const [arena, setArena] = useState<Arena | null>(null);
  const [templateId, setTemplateIdState] = useState<TemplateId>("open-field");
  const [params, setParams] = useState<TemplateParams>(defaultParams("open-field"));
  const [arenaCm, setArenaCm] = useState(40);
  // Per-zone drag adjustments on top of the template layout.
  const [zoneEdits, setZoneEdits] = useState<ZoneEdits>({});
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  // Latest automatic maze recognition (shown in the Arena panel) and whether live auto-follow is on.
  const [mazeDetection, setMazeDetection] = useState<MazeDetection | null>(null);
  const [autoFollow, setAutoFollow] = useState(true);
  const [settings, setSettings] = useState<DetectionSettings>({
    mode: "background",
    threshold: 35,
    minArea: 20,
    fps: 10,
  });
  const [track, setTrack] = useState<TrackPoint[]>([]);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [frameVersion, setFrameVersion] = useState(0);

  const work = useRef<ReturnType<typeof makeCanvas> | null>(null);
  const cancelRef = useRef(false);

  const zones = useMemo(
    () => (arena ? applyZoneEdits(buildZones(templateId, arena, params), zoneEdits, arena.rect, arena.rotation) : []),
    [arena, templateId, params, zoneEdits],
  );
  const pxPerCm = arena ? Math.max(arena.rect.w, 1) / Math.max(arenaCm, 0.1) : 1;

  // Release the camera / video when the source changes or the page closes (turns the camera light off).
  useEffect(() => () => source?.dispose(), [source]);

  const grabFrame = useCallback(async (src: FrameSource, t: number): Promise<Gray> => {
    const w = work.current;
    if (!w) throw new Error("Workspace not ready");
    await src.seek(t);
    src.draw(w.ctx, w.canvas.width, w.canvas.height);
    return toGray(w.ctx.getImageData(0, 0, w.canvas.width, w.canvas.height));
  }, []);

  const showFrame = useCallback(
    async (t: number) => {
      if (!source) return;
      await grabFrame(source, t);
      setCurrentTime(t);
      setFrameVersion((v) => v + 1);
    },
    [source, grabFrame],
  );

  const resetZoneEdits = useCallback(() => {
    setZoneEdits({});
    setSelectedZoneId(null);
  }, []);
  // Resetting a zone removes its entry so the panel no longer marks it as adjusted.
  const setZoneEdit = useCallback(
    (id: string, edit: ZoneEdit) =>
      setZoneEdits((prev) => {
        const { [id]: _removed, ...rest } = prev;
        const isDefault = edit.dx === 0 && edit.dy === 0 && edit.scale === 1;
        return isDefault ? rest : { ...rest, [id]: edit };
      }),
    [],
  );

  const setTemplateId = useCallback((id: TemplateId) => {
    setTemplateIdState(id);
    setParams(defaultParams(id));
    resetZoneEdits();
  }, [resetZoneEdits]);

  /** Fits arena, template and arm width to a maze detection. Falls back to the plain arena guess. */
  const applyDetection = useCallback(
    (img: Gray, keepTemplate: TemplateId | null) => {
      const det = detectMaze(img);
      setMazeDetection(det);
      if (!det) {
        setArena(detectArena(img));
        return;
      }
      setArena(det.arena);
      const fallback = det.arena.shape === "circle" ? "water-maze" : "open-field";
      const next = keepTemplate ? templateFor(det.kind, keepTemplate) : det.kind === "water-maze" || det.kind === "open-field" ? fallback : det.kind;
      setTemplateIdState((cur) => {
        if (cur !== next) resetZoneEdits();
        return next;
      });
      setParams((cur) => {
        const base = keepTemplate === next ? cur : defaultParams(next);
        return det.size === undefined ? base : { ...base, size: det.size };
      });
    },
    [resetZoneEdits],
  );

  const prepare = useCallback(
    async (src: FrameSource) => {
      const scale = Math.min(1, WORK_MAX_W / src.width);
      const d = { w: Math.round(src.width * scale), h: Math.round(src.height * scale) };
      work.current = makeCanvas(d);
      setDims(d);
      setStatus("preparing");
      setProgress(0);
      const frames: Gray[] = [];
      for (let i = 0; i < BACKGROUND_SAMPLES; i++) {
        const t = (src.duration * (i + 0.5)) / BACKGROUND_SAMPLES;
        // Live cameras can't seek, so spread samples over ~1.5 s of real time instead.
        if (src.kind === "camera") await new Promise((r) => setTimeout(r, LIVE_SAMPLE_GAP_MS));
        frames.push(await grabFrame(src, t));
        setProgress((i + 1) / BACKGROUND_SAMPLES);
      }
      const bg = medianBackground(frames);
      setBackground(bg);
      resetZoneEdits();
      if (src.preset) {
        // Demo scenes are drawn from the template geometry, so use it directly instead of detecting.
        const k = d.w / src.width;
        const { x, y, w, h } = src.preset.arena.rect;
        setMazeDetection(null);
        setArena({ ...src.preset.arena, rect: { x: x * k, y: y * k, w: w * k, h: h * k } });
        setTemplateId(src.preset.templateId);
      } else {
        applyDetection(bg, null);
      }
      await grabFrame(src, 0);
      setCurrentTime(0);
      setFrameVersion((v) => v + 1);
      setStatus("ready");
    },
    [grabFrame, resetZoneEdits, applyDetection, setTemplateId],
  );

  const load = useCallback(
    async (kind: "demo" | "camera" | File, deviceId?: string, demoTemplate?: TemplateId) => {
      cancelRef.current = true;
      source?.dispose();
      setError(null);
      setTrack([]);
      setArena(null);
      setBackground(null);
      try {
        const src =
          kind === "demo"
            ? createDemoSource(demoTemplate)
            : kind === "camera"
              ? await createCameraSource(deviceId)
              : await createVideoSource(kind, (p) => {
                  setStatus("converting");
                  setProgress(p);
                });
        if (kind === "demo") setArenaCm(40);
        setSource(src);
        await prepare(src);
      } catch (e) {
        setSource(null);
        setStatus("empty");
        setError(kind === "camera" ? describeCameraError(e) : e instanceof Error ? e.message : "Could not open this file.");
      }
    },
    [source, prepare],
  );

  /** Closes the current video and returns to the source picker. */
  const reset = useCallback(() => {
    cancelRef.current = true;
    source?.dispose();
    setSource(null);
    setError(null);
    setTrack([]);
    setArena(null);
    setBackground(null);
    setStatus("empty");
  }, [source]);

  const redetectArena = useCallback(() => {
    if (background) applyDetection(background, templateId);
  }, [background, applyDetection, templateId]);

  const buildMask = useCallback(() => {
    if (!arena) return null;
    const poly = arenaPolygon(arena);
    return arenaMask(poly, dims.w, dims.h, (p) => pointInPolygon(p, poly));
  }, [arena, dims]);

  /** Runs detection on the visible frame so users can tune the threshold before a full run. */
  const testDetection = useCallback(async () => {
    if (!source) return null;
    const mask = buildMask();
    if (!mask) return null;
    const frame = await grabFrame(source, currentTime);
    return detectAnimal(frame, background, mask, settings, null);
  }, [source, buildMask, grabFrame, currentTime, background, settings]);

  const runTracking = useCallback(async () => {
    if (!source) return;
    const mask = buildMask();
    if (!mask) return;
    cancelRef.current = false;
    setStatus("tracking");
    setTrack([]);
    const step = 1 / settings.fps;
    const total = Math.floor(source.duration / step);
    const points: TrackPoint[] = [];
    let prev: { x: number; y: number } | null = null;
    for (let i = 0; i <= total; i++) {
      if (cancelRef.current) {
        setStatus(points.length ? "done" : "ready");
        return;
      }
      const t = i * step;
      const frame = await grabFrame(source, t);
      const det = detectAnimal(frame, background, mask, settings, prev);
      if (det.found) prev = { x: det.x, y: det.y };
      points.push({ t, x: det.x, y: det.y, found: det.found, area: det.area });
      // Throttle React updates; the loop itself runs as fast as the video can seek.
      if (i % 5 === 0 || i === total) {
        setTrack([...points]);
        setProgress(i / total);
        setCurrentTime(t);
        setFrameVersion((v) => v + 1);
        await new Promise((r) => requestAnimationFrame(() => r(null)));
      }
    }
    setTrack(points);
    setStatus("done");
  }, [source, buildMask, settings, grabFrame, background]);

  const stopTracking = useCallback(() => {
    cancelRef.current = true;
  }, []);

  /** Live mode: grab the newest camera frame (grayscale) for detection. */
  const grabLive = useCallback(async (): Promise<Gray | null> => {
    if (source?.kind !== "camera" || !work.current) return null;
    return grabFrame(source, 0);
  }, [source, grabFrame]);

  /** Live mode: re-sample the (empty) arena and auto-detect the arena and zones again. */
  const recalibrate = useCallback(async () => {
    if (source?.kind === "camera") await prepare(source);
  }, [source, prepare]);

  /** Live mode: auto-detect the arena from the current camera frame (used while positioning the camera). */
  const detectArenaNow = useCallback(async () => {
    const frame = await grabLive();
    if (frame) applyDetection(frame, templateId);
  }, [grabLive, applyDetection, templateId]);

  /**
   * Live auto-follow: re-detects the maze on the newest frame and glides the arena (and with it
   * every zone and arm) toward it. Keeps the current test type; ignores jitter and unsure frames.
   */
  const followArena = useCallback(async () => {
    const frame = await grabLive();
    if (!frame) return;
    const det = detectMaze(frame);
    if (!det || det.confidence < 0.4) return;
    setMazeDetection(det);
    setArena((prev) => {
      if (!prev || prev.shape !== det.arena.shape) return prev;
      const period = templateId === "y-maze" ? 120 : 90;
      const target = alignArena(prev, det.arena, period);
      return arenaMoved(prev, target) ? blendArena(prev, target, 0.5) : prev;
    });
    if (det.size !== undefined && templateFor(det.kind, templateId) === templateId) {
      const size = det.size;
      setParams((cur) => (Math.abs(cur.size - size) > 0.01 ? { ...cur, size: cur.size + (size - cur.size) * 0.5 } : cur));
    }
  }, [grabLive, templateId]);

  /** Arena changes made by hand pause live auto-follow so it doesn't undo them. */
  const setArenaManual = useCallback((a: Arena) => {
    setArena(a);
    setAutoFollow(false);
  }, []);

  /** Live mode: switch status and publish the growing track. */
  const beginLiveTracking = useCallback(() => {
    setTrack([]);
    setCurrentTime(0);
    setStatus("tracking");
  }, []);
  const publishLiveTrack = useCallback((points: TrackPoint[], t: number) => {
    setTrack(points);
    setCurrentTime(t);
  }, []);
  const endLiveTracking = useCallback((points: TrackPoint[]) => {
    setTrack(points);
    setCurrentTime(points[points.length - 1]?.t ?? 0);
    setStatus(points.length ? "done" : "ready");
  }, []);

  const drawCurrent = useCallback(
    (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      const wk = work.current;
      if (wk) ctx.drawImage(wk.canvas, 0, 0, w, h);
    },
    [],
  );

  return {
    source,
    dims,
    status,
    error,
    arena,
    setArena,
    setArenaManual,
    mazeDetection,
    autoFollow,
    setAutoFollow,
    followArena,
    templateId,
    setTemplateId,
    params,
    setParams,
    arenaCm,
    setArenaCm,
    pxPerCm,
    settings,
    setSettings,
    zones,
    zoneEdits,
    setZoneEdit,
    resetZoneEdits,
    selectedZoneId,
    setSelectedZoneId,
    track,
    progress,
    currentTime,
    frameVersion,
    load,
    reset,
    redetectArena,
    testDetection,
    runTracking,
    stopTracking,
    showFrame,
    drawCurrent,
    grabLive,
    recalibrate,
    detectArenaNow,
    /** Paints the live camera straight onto a canvas (no React re-render per frame). */
    drawLive: source?.kind === "camera" ? source.draw : undefined,
    beginLiveTracking,
    publishLiveTrack,
    endLiveTracking,
    buildMask,
    background,
    isLive: source?.kind === "camera",
    hasBackground: background !== null,
  };
}

export type TrackingSession = ReturnType<typeof useTrackingSession>;
