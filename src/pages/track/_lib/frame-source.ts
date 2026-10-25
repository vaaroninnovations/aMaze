import { getTemplate } from "@/lib/tracking/templates.ts";
import type { Arena, TemplateId } from "@/lib/tracking/types.ts";
import { convertToMp4 } from "./convert-video.ts";
import { createScene, DEMO_H, DEMO_W, type DemoScene } from "./demo-scenes.ts";

/** A seekable source of frames: an uploaded video or the built-in demo arena. */
export type FrameSource = {
  kind: "video" | "demo" | "camera";
  name: string;
  /** Live camera only. */
  stream?: MediaStream;
  deviceId?: string;
  width: number;
  height: number;
  duration: number;
  /** Demo scenes only: the maze template and arena (in source pixels) the scene was drawn with. */
  preset?: { templateId: TemplateId; arena: Arena };
  seek: (t: number) => Promise<void>;
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void;
  dispose: () => void;
};

type LoadedVideo = { video: HTMLVideoElement; url: string };

/**
 * Browser-recorded WebM files (e.g. from the camera) have no duration in their header.
 * Seeking far past the end forces the browser to scan the file and report the real length.
 */
async function resolveStreamingDuration(video: HTMLVideoElement): Promise<void> {
  await new Promise<void>((resolve) => {
    const done = () => {
      if (!Number.isFinite(video.duration)) return;
      video.removeEventListener("durationchange", done);
      video.removeEventListener("timeupdate", done);
      resolve();
    };
    video.addEventListener("durationchange", done);
    video.addEventListener("timeupdate", done);
    video.currentTime = Number.MAX_SAFE_INTEGER;
    setTimeout(resolve, 5000);
  });
  await new Promise<void>((resolve) => {
    video.addEventListener("seeked", () => resolve(), { once: true });
    video.currentTime = 0;
  });
}

/** Tries native playback; resolves null if the browser can't decode the file. */
async function tryLoadVideo(file: File): Promise<LoadedVideo | null> {
  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  video.src = url;

  const ok = await new Promise<boolean>((resolve) => {
    video.onloadeddata = () => resolve(true);
    video.onerror = () => resolve(false);
  });
  if (ok && video.duration === Infinity) await resolveStreamingDuration(video);
  // Some containers load but have no decodable video track (videoWidth 0) or unknown length.
  if (!ok || !Number.isFinite(video.duration) || video.videoWidth === 0) {
    video.removeAttribute("src");
    video.load();
    URL.revokeObjectURL(url);
    return null;
  }
  return { video, url };
}

export async function createVideoSource(
  file: File,
  onConvertProgress?: (p: number) => void,
): Promise<FrameSource> {
  let loaded = await tryLoadVideo(file);
  if (!loaded) {
    // Formats like AVI, MKV, WMV or ProRes MOV aren't playable in browsers; convert on-device.
    onConvertProgress?.(0);
    const converted = await convertToMp4(file, (p) => onConvertProgress?.(p));
    loaded = await tryLoadVideo(converted);
    if (!loaded) throw new Error("This video could not be read, even after conversion.");
  }
  const { video, url } = loaded;

  const seek = (t: number) =>
    new Promise<void>((resolve) => {
      const target = Math.min(Math.max(t, 0), video.duration - 0.001);
      if (Math.abs(video.currentTime - target) < 0.0005 && video.readyState >= 2) {
        resolve();
        return;
      }
      video.addEventListener("seeked", () => resolve(), { once: true });
      video.currentTime = target;
    });

  return {
    kind: "video",
    name: file.name,
    width: video.videoWidth,
    height: video.videoHeight,
    duration: video.duration,
    seek,
    draw: (ctx, w, h) => ctx.drawImage(video, 0, 0, w, h),
    dispose: () => {
      video.removeAttribute("src");
      video.load();
      URL.revokeObjectURL(url);
    },
  };
}

const DEMO_DURATION = 90;
const ARENA = { x: 150, y: 70, size: 340 };

/** Deterministic, wall-hugging path that mimics a mouse in an open field. */
function demoPose(t: number) {
  const c = { x: ARENA.x + ARENA.size / 2, y: ARENA.y + ARENA.size / 2 };
  const half = ARENA.size / 2 - 22;
  const theta = t * 0.21 + Math.sin(t * 0.37) * 1.4 + Math.sin(t * 0.11) * 2.2;
  // Mostly near the walls, with occasional excursions through the center.
  const excursion = Math.max(0, Math.sin(t * 0.13 + 1.2)) ** 6;
  const radial = 0.92 - excursion * 0.85 + Math.sin(t * 1.7) * 0.04;
  // Square-ish trajectory: map circle to square using the infinity norm.
  const dx = Math.cos(theta);
  const dy = Math.sin(theta);
  const k = 1 / Math.max(Math.abs(dx), Math.abs(dy));
  const squareness = 0.75;
  const r = half * radial * (1 + (k - 1) * squareness);
  // Pauses: slow down time locally to simulate freezing.
  return { x: c.x + dx * Math.min(r, half * 1.0), y: c.y + dy * Math.min(r, half * 1.0) };
}

function frozenTime(t: number): number {
  // Two freezing bouts where the animal stays still.
  const bouts: [number, number][] = [
    [22, 28],
    [61, 66],
  ];
  let shift = 0;
  for (const [a, b] of bouts) {
    if (t > b) shift += b - a;
    else if (t > a) shift += t - a;
  }
  return t - shift;
}

function createMazeDemoSource(templateId: TemplateId, scene: DemoScene): FrameSource {
  let current = 0;
  return {
    kind: "demo",
    name: `Demo: ${getTemplate(templateId).name.toLowerCase()}, ${scene.duration} s`,
    width: DEMO_W,
    height: DEMO_H,
    duration: scene.duration,
    preset: { templateId, arena: scene.arena },
    seek: async (t) => {
      current = Math.min(Math.max(t, 0), scene.duration);
    },
    draw: (ctx, w, h) => {
      ctx.save();
      ctx.scale(w / DEMO_W, h / DEMO_H);
      scene.draw(ctx, current);
      ctx.restore();
    },
    dispose: () => undefined,
  };
}

/** Built-in demo for a maze. Mazes without a dedicated scene fall back to the open field. */
export function createDemoSource(templateId: TemplateId = "open-field"): FrameSource {
  const scene = createScene(templateId);
  if (scene) return createMazeDemoSource(templateId, scene);
  let current = 0;
  return {
    kind: "demo",
    name: "Demo: open field, 90 s",
    width: DEMO_W,
    height: DEMO_H,
    duration: DEMO_DURATION,
    seek: async (t) => {
      current = Math.min(Math.max(t, 0), DEMO_DURATION);
    },
    draw: (ctx, w, h) => {
      ctx.save();
      ctx.scale(w / DEMO_W, h / DEMO_H);
      ctx.fillStyle = "#1c1f24";
      ctx.fillRect(0, 0, DEMO_W, DEMO_H);
      ctx.fillStyle = "#d9d6cc";
      ctx.fillRect(ARENA.x, ARENA.y, ARENA.size, ARENA.size);
      ctx.strokeStyle = "#b8b4a8";
      ctx.lineWidth = 1;
      for (let i = 1; i < 4; i++) {
        const o = (ARENA.size / 4) * i;
        ctx.beginPath();
        ctx.moveTo(ARENA.x + o, ARENA.y);
        ctx.lineTo(ARENA.x + o, ARENA.y + ARENA.size);
        ctx.moveTo(ARENA.x, ARENA.y + o);
        ctx.lineTo(ARENA.x + ARENA.size, ARENA.y + o);
        ctx.stroke();
      }
      const tt = frozenTime(current);
      const p = demoPose(tt);
      const ahead = demoPose(tt + 0.15);
      const angle = Math.atan2(ahead.y - p.y, ahead.x - p.x);
      ctx.translate(p.x, p.y);
      ctx.rotate(angle);
      ctx.strokeStyle = "#3a3a3a";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(-14, 0);
      ctx.quadraticCurveTo(-30, Math.sin(current * 6) * 6, -42, 0);
      ctx.stroke();
      ctx.fillStyle = "#26231f";
      ctx.beginPath();
      ctx.ellipse(0, 0, 16, 9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(14, 0, 7, 5.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    },
    dispose: () => undefined,
  };
}
