import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { Point, TrackPoint } from "@/lib/tracking/types.ts";
import { detectAnimal } from "@/lib/tracking/vision.ts";
import { startRecorder, type Recorder } from "../_lib/camera-source.ts";
import type { TrackingSession } from "./use-tracking-session.ts";

/** How often the growing track is pushed to React (results, overlays, charts). */
const PUBLISH_MS = 250;
/** How often live auto-follow re-detects the maze (cheap, but no need to run it every frame). */
const FOLLOW_MS = 2000;

export type LiveOptions = { record: boolean; maxSeconds: number | null };
export type Recording = { file: File; url: string };

/**
 * Real-time tracking loop for the camera: grabs frames at the chosen sampling rate,
 * detects the animal, streams the track into the session and optionally records the video.
 */
export function useLiveTracking(s: TrackingSession) {
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [recording, setRecording] = useState<Recording | null>(null);
  const stopRef = useRef<(() => Promise<void>) | null>(null);

  // Keep the latest session in a ref so the loop always reads current settings without restarting.
  const sRef = useRef(s);
  useEffect(() => {
    sRef.current = s;
  });

  const clearRecording = useCallback(() => {
    setRecording((r) => {
      if (r) URL.revokeObjectURL(r.url);
      return null;
    });
  }, []);

  const start = useCallback(
    (opts: LiveOptions) => {
      const session = sRef.current;
      let mask = session.buildMask();
      if (!mask || !session.source?.stream || running) return;
      // The arena can move during the session (auto-follow or manual), so rebuild the mask when it does.
      let maskArena = session.arena;
      clearRecording();
      const recorder: Recorder | null = opts.record ? startRecorder(session.source.stream) : null;
      const points: TrackPoint[] = [];
      let prev: Point | null = null;
      let active = true;
      let lastPublish = 0;
      let lastFollow = 0;
      const t0 = performance.now();

      const finish = async () => {
        if (!active) return;
        active = false;
        stopRef.current = null;
        setRunning(false);
        sRef.current.endLiveTracking([...points]);
        if (recorder) {
          const file = await recorder.stop();
          setRecording({ file, url: URL.createObjectURL(file) });
          toast.success("Video recorded. Use Download video to keep it.");
        }
      };

      const tick = async () => {
        if (!active) return;
        const cur = sRef.current;
        const tickStart = performance.now();
        const t = (tickStart - t0) / 1000;
        if (cur.arena !== maskArena) {
          maskArena = cur.arena;
          mask = cur.buildMask() ?? mask;
        }
        if (cur.autoFollow && tickStart - lastFollow >= FOLLOW_MS) {
          lastFollow = tickStart;
          void cur.followArena();
        }
        const frame = await cur.grabLive();
        if (frame && mask) {
          const det = detectAnimal(frame, cur.background, mask, cur.settings, prev);
          if (det.found) prev = { x: det.x, y: det.y };
          points.push({ t, x: det.x, y: det.y, found: det.found, area: det.area });
        }
        if (tickStart - lastPublish >= PUBLISH_MS) {
          lastPublish = tickStart;
          cur.publishLiveTrack([...points], t);
          setElapsed(t);
        }
        if (opts.maxSeconds !== null && t >= opts.maxSeconds) {
          void finish();
          return;
        }
        // Schedule the next sample relative to the start of this one to hold the sampling rate.
        const wait = Math.max(0, 1000 / cur.settings.fps - (performance.now() - tickStart));
        setTimeout(() => void tick(), wait);
      };

      stopRef.current = finish;
      session.beginLiveTracking();
      setElapsed(0);
      setRunning(true);
      void tick();
    },
    [running, clearRecording],
  );

  const stop = useCallback(() => void stopRef.current?.(), []);

  // Stop the loop if the page unmounts mid-session.
  useEffect(() => () => void stopRef.current?.(), []);

  return { running, elapsed, recording, start, stop, clearRecording };
}
