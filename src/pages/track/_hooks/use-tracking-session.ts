import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getAnonymousSessionId } from "@/lib/anonymous-session.ts";
import { buildZones, defaultParams } from "@/lib/tracking/templates.ts";
import {
  alignArena,
  arenaMoved,
  blendArena,
  templateFor,
  type MazeDetection,
} from "@/lib/tracking/maze-detect.ts";
import {
  applyZoneEdits,
  type ZoneEdit,
  type ZoneEdits,
} from "@/lib/tracking/zone-edits.ts";
import type { TrackSummary } from "@/lib/tracking/metrics.ts";
import {
  createLiveSession,
  detectLiveArena,
  detectVideoArena,
  deleteLiveSession,
  deleteVideoSession,
  finalizeLiveSession,
  prepareVideo,
  prepareLiveSession,
  trackLiveFrame,
  testVideoDetection,
  trackVideo,
  uploadLiveBackgroundFrame,
  type ServerTrack,
} from "@/lib/tracking/server-api.ts";
import type {
  Arena,
  DetectionSettings,
  Gray,
  TemplateId,
  TemplateParams,
  TrackPoint,
} from "@/lib/tracking/types.ts";
import {
  createDemoSource,
  createServerVideoSource,
  type FrameSource,
} from "../_lib/frame-source.ts";
import {
  createCameraSource,
  describeCameraError,
} from "../_lib/camera-source.ts";

/** Analysis resolution: all geometry lives in this pixel space. */
const WORK_MAX_W = 480;
const BACKGROUND_SAMPLES = 15;
const LIVE_SAMPLE_GAP_MS = 100;

export type SessionStatus =
  | "empty"
  | "uploading"
  | "preparing"
  | "converting"
  | "ready"
  | "tracking"
  | "done";

export type Dims = { w: number; h: number };

function makeCanvas(d: Dims) {
  const canvas = document.createElement("canvas");
  canvas.width = d.w;
  canvas.height = d.h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas is not supported in this browser.");
  return { canvas, ctx };
}

function canvasJpeg(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Could not encode a camera frame."));
      },
      "image/jpeg",
      0.85,
    );
  });
}

function grayJpeg(gray: Gray): Promise<Blob> {
  const { canvas, ctx } = makeCanvas({ w: gray.width, h: gray.height });
  const image = ctx.createImageData(gray.width, gray.height);
  for (let i = 0; i < gray.data.length; i++) {
    const value = gray.data[i] ?? 0;
    const offset = i * 4;
    image.data[offset] = value;
    image.data[offset + 1] = value;
    image.data[offset + 2] = value;
    image.data[offset + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
  return canvasJpeg(canvas);
}

export function useTrackingSession() {
  const anonymousSessionId = getAnonymousSessionId();
  const [source, setSource] = useState<FrameSource | null>(null);
  const [dims, setDims] = useState<Dims>({ w: 480, h: 360 });
  const [status, setStatus] = useState<SessionStatus>("empty");
  const [error, setError] = useState<string | null>(null);
  const [background, setBackground] = useState<Gray | null>(null);
  const [arena, setArena] = useState<Arena | null>(null);
  const [templateId, setTemplateIdState] = useState<TemplateId>("open-field");
  const [params, setParams] = useState<TemplateParams>(
    defaultParams("open-field"),
  );
  const [arenaCm, setArenaCm] = useState(40);
  // Per-zone drag adjustments on top of the template layout.
  const [zoneEdits, setZoneEdits] = useState<ZoneEdits>({});
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  // Latest automatic maze recognition (shown in the Arena panel) and whether live auto-follow is on.
  const [mazeDetection, setMazeDetection] = useState<MazeDetection | null>(
    null,
  );
  const [autoFollow, setAutoFollow] = useState(true);
  const [settings, setSettings] = useState<DetectionSettings>({
    mode: "background",
    threshold: 35,
    minArea: 20,
    fps: 10,
  });
  const [track, setTrack] = useState<TrackPoint[]>([]);
  const [serverSummary, setServerSummary] = useState<TrackSummary | null>(null);
  const [serverMeasures, setServerMeasures] = useState<ServerTrack["measures"]>(
    [],
  );
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [frameVersion, setFrameVersion] = useState(0);

  const work = useRef<ReturnType<typeof makeCanvas> | null>(null);
  const cancelRef = useRef(false);
  const uploadAbortRef = useRef<AbortController | null>(null);
  const trackAbortRef = useRef<AbortController | null>(null);
  const sessionRef = useRef(anonymousSessionId);
  useEffect(() => {
    sessionRef.current = anonymousSessionId;
  }, [anonymousSessionId]);

  const zones = useMemo(
    () =>
      arena
        ? applyZoneEdits(
            buildZones(templateId, arena, params),
            zoneEdits,
            arena.rect,
            arena.rotation,
          )
        : [],
    [arena, templateId, params, zoneEdits],
  );
  const pxPerCm = arena
    ? Math.max(arena.rect.w, 1) / Math.max(arenaCm, 0.1)
    : 1;

  // Release browser capture and temporary server uploads when a session is replaced or closed.
  useEffect(
    () => () => {
      source?.dispose();
      if (source?.liveSessionId) {
        void deleteLiveSession(source.liveSessionId, sessionRef.current).catch(
          (error: unknown) =>
            console.error(
              "Could not clean up the live tracking session.",
              error,
            ),
        );
      }
      if (source?.serverSessionId) {
        void deleteVideoSession(source.serverSessionId, sessionRef.current).catch(
          (error: unknown) =>
            console.error(
              "Could not clean up the temporary video upload.",
              error,
            ),
        );
      }
    },
    [source],
  );

  const drawFrameAt = useCallback(
    async (src: FrameSource, t: number): Promise<void> => {
      const w = work.current;
      if (!w) throw new Error("Workspace not ready.");
      await src.seek(t);
      src.draw(w.ctx, w.canvas.width, w.canvas.height);
    },
    [],
  );

  const showFrame = useCallback(
    async (t: number) => {
      if (!source) return;
      await drawFrameAt(source, t);
      setCurrentTime(t);
      setFrameVersion((v) => v + 1);
    },
    [source, drawFrameAt],
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

  const setTemplateId = useCallback(
    (id: TemplateId) => {
      setTemplateIdState(id);
      setParams(defaultParams(id));
      resetZoneEdits();
    },
    [resetZoneEdits],
  );

  /** Applies a server-detected maze and falls back to the server arena estimate. */
  const applyDetectedMaze = useCallback(
    (
      det: MazeDetection | null,
      fallbackArena: Arena,
      keepTemplate: TemplateId | null,
    ) => {
      setMazeDetection(det);
      if (!det) {
        setArena(fallbackArena);
        return;
      }
      setArena(det.arena);
      const fallback =
        det.arena.shape === "circle" ? "water-maze" : "open-field";
      const next = keepTemplate
        ? templateFor(det.kind, keepTemplate)
        : det.kind === "water-maze" || det.kind === "open-field"
          ? fallback
          : det.kind;
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
      const d = {
        w: Math.round(src.width * scale),
        h: Math.round(src.height * scale),
      };
      work.current = makeCanvas(d);
      setDims(d);
      setStatus("preparing");
      setProgress(0);
      if (src.liveSessionId) {
        const anonymousSessionId = sessionRef.current;
        for (let i = 0; i < BACKGROUND_SAMPLES; i++) {
          const t =
            src.kind === "camera"
              ? 0
              : (src.duration * (i + 0.5)) / BACKGROUND_SAMPLES;
          if (src.kind === "camera")
            await new Promise((resolve) =>
              setTimeout(resolve, LIVE_SAMPLE_GAP_MS),
            );
          await src.seek(t);
          src.draw(work.current.ctx, d.w, d.h);
          await uploadLiveBackgroundFrame(
            src.liveSessionId,
            await canvasJpeg(work.current.canvas),
            anonymousSessionId,
          );
          setProgress((i + 1) / BACKGROUND_SAMPLES);
        }
        const prepared = await prepareLiveSession(src.liveSessionId, anonymousSessionId);
        const binary = atob(prepared.background);
        if (binary.length !== d.w * d.h)
          throw new Error(
            "The tracking service returned an invalid background image.",
          );
        const data = new Uint8ClampedArray(binary.length);
        for (let i = 0; i < binary.length; i++) data[i] = binary.charCodeAt(i);
        setBackground({ data, width: d.w, height: d.h });
        setMazeDetection(null);
        if (src.preset) {
          const scale = d.w / src.width;
          const { x, y, w, h } = src.preset.arena.rect;
          setArena({
            ...src.preset.arena,
            rect: { x: x * scale, y: y * scale, w: w * scale, h: h * scale },
          });
          setTemplateId(src.preset.templateId);
        } else {
          setArena(prepared.arena);
          setTemplateId(prepared.templateId);
        }
        if (prepared.size !== undefined) {
          const detectedSize = prepared.size;
          setParams((current) => ({ ...current, size: detectedSize }));
        }
        if (src.kind !== "camera") await src.seek(0);
        src.draw(work.current.ctx, d.w, d.h);
        setCurrentTime(0);
        setFrameVersion((version) => version + 1);
        setStatus("ready");
        setProgress(1);
        return;
      }
      if (src.serverSessionId) {
        const anonymousSessionId = sessionRef.current;
        const prepared = await prepareVideo(src.serverSessionId, anonymousSessionId);
        if (prepared.width !== d.w || prepared.height !== d.h) {
          throw new Error(
            "The tracking service returned inconsistent video dimensions.",
          );
        }
        const binary = atob(prepared.background);
        if (binary.length !== d.w * d.h) {
          throw new Error(
            "The tracking service returned an invalid background image.",
          );
        }
        const data = new Uint8ClampedArray(binary.length);
        for (let i = 0; i < binary.length; i++) data[i] = binary.charCodeAt(i);
        setBackground({ data, width: d.w, height: d.h });
        setMazeDetection(null);
        setArena(prepared.arena);
        setTemplateId(prepared.templateId);
        if (prepared.size !== undefined) {
          const detectedSize = prepared.size;
          setParams((current) => ({ ...current, size: detectedSize }));
        }
        const workspace = work.current;
        if (!workspace) throw new Error("Workspace not ready");
        await src.seek(0);
        src.draw(
          workspace.ctx,
          workspace.canvas.width,
          workspace.canvas.height,
        );
        setCurrentTime(0);
        setFrameVersion((version) => version + 1);
        setStatus("ready");
        setProgress(1);
        return;
      }
      throw new Error("The source is not connected to server-side processing.");
    },
    [setTemplateId],
  );

  const load = useCallback(
    async (
      kind: "demo" | "camera" | File,
      deviceId?: string,
      demoTemplate?: TemplateId,
    ) => {
      cancelRef.current = true;
      uploadAbortRef.current?.abort();
      trackAbortRef.current?.abort();
      source?.dispose();
      setError(null);
      setTrack([]);
      setServerSummary(null);
      setServerMeasures([]);
      setArena(null);
      setBackground(null);
      try {
        const src =
          kind === "demo"
            ? createDemoSource(demoTemplate)
            : kind === "camera"
              ? await createCameraSource(deviceId)
              : await (async () => {
                  const controller = new AbortController();
                  uploadAbortRef.current = controller;
                  setStatus("uploading");
                  setProgress(0);
                  return await createServerVideoSource(
                    kind,
                    anonymousSessionId,
                    (p) => setProgress(p),
                    controller.signal,
                  );
                })();
        uploadAbortRef.current = null;
        if (src.kind !== "video") {
          const scale = Math.min(1, WORK_MAX_W / src.width);
          try {
            src.liveSessionId = await createLiveSession(
              Math.round(src.width * scale),
              Math.round(src.height * scale),
              anonymousSessionId,
            );
          } catch (error) {
            src.dispose();
            throw error;
          }
        }
        if (kind === "demo") setArenaCm(40);
        setSource(src);
        await prepare(src);
      } catch (e) {
        setSource(null);
        setStatus("empty");
        setError(
          kind === "camera"
            ? describeCameraError(e)
            : e instanceof Error
              ? e.message
              : "Could not open this file.",
        );
      }
    },
    [source, prepare, anonymousSessionId],
  );

  /** Closes the current video and returns to the source picker. */
  const reset = useCallback(() => {
    cancelRef.current = true;
    uploadAbortRef.current?.abort();
    trackAbortRef.current?.abort();
    source?.dispose();
    setSource(null);
    setError(null);
    setTrack([]);
    setServerSummary(null);
    setServerMeasures([]);
    setArena(null);
    setBackground(null);
    setStatus("empty");
  }, [source]);

  const redetectArena = useCallback(async () => {
    if (!background) return;
    const anonymousSessionId = sessionRef.current;
    const result = source?.liveSessionId
      ? await detectLiveArena(
          source.liveSessionId,
          await grayJpeg(background),
          anonymousSessionId,
        )
      : source?.serverSessionId
        ? await detectVideoArena(source.serverSessionId, anonymousSessionId)
        : null;
    if (!result)
      throw new Error("The source is not connected to server-side processing.");
    applyDetectedMaze(result.detection, result.arena, templateId);
  }, [background, source, applyDetectedMaze, templateId]);

  /** Runs detection on the visible frame so users can tune the threshold before a full run. */
  const testDetection = useCallback(async () => {
    if (!source) return null;
    if (source.serverSessionId) {
      const anonymousSessionId = sessionRef.current;
      if (!arena) return null;
      return await testVideoDetection(
        source.serverSessionId,
        currentTime,
        arena,
        settings,
        anonymousSessionId,
      );
    }
    if (source.liveSessionId) {
      const anonymousSessionId = sessionRef.current;
      const workspace = work.current;
      if (!arena || !workspace)
        throw new Error("Live server tracking is not ready.");
      await source.seek(currentTime);
      source.draw(
        workspace.ctx,
        workspace.canvas.width,
        workspace.canvas.height,
      );
      return await trackLiveFrame(
        source.liveSessionId,
        await canvasJpeg(workspace.canvas),
        currentTime,
        arena,
        settings,
        anonymousSessionId,
        false,
      );
    }
    throw new Error("The source is not connected to server-side processing.");
  }, [source, arena, currentTime, settings]);

  const runTracking = useCallback(async () => {
    if (!source) return;
    if (source.liveSessionId) {
      const anonymousSessionId = sessionRef.current;
      if (!arena) {
        setError("Select a valid arena before starting tracking.");
        return;
      }
      const workspace = work.current;
      if (!workspace) {
        setError("Tracking workspace is not ready.");
        return;
      }
      cancelRef.current = false;
      const controller = new AbortController();
      trackAbortRef.current = controller;
      setStatus("tracking");
      setError(null);
      setTrack([]);
      setServerSummary(null);
      setServerMeasures([]);
      setProgress(0);
      const step = 1 / settings.fps;
      const total = Math.floor(source.duration / step);
      const points: TrackPoint[] = [];
      try {
        for (let i = 0; i <= total; i++) {
          if (cancelRef.current) break;
          const t = Math.min(i * step, source.duration);
          await source.seek(t);
          source.draw(
            workspace.ctx,
            workspace.canvas.width,
            workspace.canvas.height,
          );
          const detection = await trackLiveFrame(
            source.liveSessionId,
            await canvasJpeg(workspace.canvas),
            t,
            arena,
            settings,
            anonymousSessionId,
          );
          points.push({ t, ...detection });
          if (i % 5 === 0 || i === total) {
            setTrack([...points]);
            setProgress(total ? i / total : 1);
            setCurrentTime(t);
            setFrameVersion((version) => version + 1);
          }
        }
        if (points.length) {
          const result = await finalizeLiveSession(
            source.liveSessionId,
            anonymousSessionId,
            {
              zones,
              pxPerCm,
              templateId,
            },
          );
          setTrack(result.track);
          setServerSummary(result.summary);
          setServerMeasures(result.measures);
          setProgress(1);
          setCurrentTime(result.track.at(-1)?.t ?? 0);
          setStatus("done");
        } else {
          setStatus("ready");
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          setStatus(points.length ? "done" : "ready");
        } else {
          setError(
            error instanceof Error ? error.message : "Server tracking failed.",
          );
          setStatus("ready");
        }
      } finally {
        trackAbortRef.current = null;
      }
      return;
    }
    if (source.serverSessionId) {
      const anonymousSessionId = sessionRef.current;
      if (!arena) {
        setError("Select a valid arena before starting server-side tracking.");
        return;
      }
      cancelRef.current = false;
      const controller = new AbortController();
      trackAbortRef.current = controller;
      setStatus("tracking");
      setError(null);
      setTrack([]);
      setServerSummary(null);
      setServerMeasures([]);
      setProgress(0);
      try {
        const result = await trackVideo(
          source.serverSessionId,
          anonymousSessionId,
          {
            arena,
            zones,
            pxPerCm,
            templateId,
            settings,
          },
          (value, time) => {
            setProgress(value);
            setCurrentTime(time);
          },
          controller.signal,
        );
        setTrack(result.track);
        setServerSummary(result.summary);
        setServerMeasures(result.measures);
        setProgress(1);
        setCurrentTime(result.track.at(-1)?.t ?? 0);
        setFrameVersion((value) => value + 1);
        setStatus("done");
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          setStatus("ready");
        } else {
          setError(
            error instanceof Error
              ? error.message
              : "Server-side tracking failed.",
          );
          setStatus("ready");
        }
      } finally {
        trackAbortRef.current = null;
      }
      return;
    }
    setError("The source is not connected to server-side processing.");
  }, [source, arena, zones, pxPerCm, templateId, settings]);

  const stopTracking = useCallback(() => {
    cancelRef.current = true;
    trackAbortRef.current?.abort();
  }, []);

  const captureLiveJpeg = useCallback(async (): Promise<Blob | null> => {
    if (source?.kind !== "camera" || !work.current) return null;
    source.draw(
      work.current.ctx,
      work.current.canvas.width,
      work.current.canvas.height,
    );
    return await canvasJpeg(work.current.canvas);
  }, [source]);

  const trackCameraFrame = useCallback(
    async (frame: Blob, time: number) => {
      const anonymousSessionId = sessionRef.current;
      if (!source?.liveSessionId || !arena)
        throw new Error("Live server tracking is not ready.");
      return await trackLiveFrame(
        source.liveSessionId,
        frame,
        time,
        arena,
        settings,
        anonymousSessionId,
      );
    },
    [source, arena, settings],
  );

  const finalizeLiveTrack = useCallback(async () => {
    const anonymousSessionId = sessionRef.current;
    if (!source?.liveSessionId)
      throw new Error("Live server tracking is not ready.");
    const result = await finalizeLiveSession(source.liveSessionId, anonymousSessionId, {
      zones,
      pxPerCm,
      templateId,
    });
    setServerSummary(result.summary);
    setServerMeasures(result.measures);
    return result;
  }, [source, zones, pxPerCm, templateId]);

  /** Live mode: re-sample the (empty) arena and auto-detect the arena and zones again. */
  const recalibrate = useCallback(async () => {
    if (source?.kind === "camera") await prepare(source);
  }, [source, prepare]);

  /** Live mode: auto-detect the arena from the current camera frame (used while positioning the camera). */
  const detectArenaNow = useCallback(async () => {
    const anonymousSessionId = sessionRef.current;
    const workspace = work.current;
    if (!source?.liveSessionId || !workspace) return;
    await source.seek(currentTime);
    source.draw(workspace.ctx, workspace.canvas.width, workspace.canvas.height);
    const result = await detectLiveArena(
      source.liveSessionId,
      await canvasJpeg(workspace.canvas),
      anonymousSessionId,
    );
    applyDetectedMaze(result.detection, result.arena, templateId);
  }, [source, currentTime, applyDetectedMaze, templateId]);

  /**
   * Live auto-follow: re-detects the maze on the newest frame and glides the arena (and with it
   * every zone and arm) toward it. Keeps the current test type; ignores jitter and unsure frames.
   */
  const followArena = useCallback(async () => {
    const anonymousSessionId = sessionRef.current;
    const workspace = work.current;
    if (!source?.liveSessionId || !workspace) return;
    source.draw(workspace.ctx, workspace.canvas.width, workspace.canvas.height);
    const result = await detectLiveArena(
      source.liveSessionId,
      await canvasJpeg(workspace.canvas),
      anonymousSessionId,
    );
    const det = result.detection;
    if (!det || det.confidence < 0.4) return;
    setMazeDetection(det);
    setArena((prev) => {
      if (!prev || prev.shape !== det.arena.shape) return prev;
      const period = templateId === "y-maze" ? 120 : 90;
      const target = alignArena(prev, det.arena, period);
      return arenaMoved(prev, target) ? blendArena(prev, target, 0.5) : prev;
    });
    if (
      det.size !== undefined &&
      templateFor(det.kind, templateId) === templateId
    ) {
      const size = det.size;
      setParams((cur) =>
        Math.abs(cur.size - size) > 0.01
          ? { ...cur, size: cur.size + (size - cur.size) * 0.5 }
          : cur,
      );
    }
  }, [source, templateId]);

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
    serverSummary,
    serverMeasures,
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
    captureLiveJpeg,
    trackCameraFrame,
    finalizeLiveTrack,
    recalibrate,
    detectArenaNow,
    /** Paints the live camera straight onto a canvas (no React re-render per frame). */
    drawLive: source?.kind === "camera" ? source.draw : undefined,
    beginLiveTracking,
    publishLiveTrack,
    endLiveTracking,
    background,
    isLive: source?.kind === "camera",
    hasBackground: background !== null,
  };
}

export type TrackingSession = ReturnType<typeof useTrackingSession>;
