import { getTemplate } from "@/lib/tracking/templates.ts";
import type { Arena, TemplateId } from "@/lib/tracking/types.ts";
import { fetchVideoFrame, uploadVideo } from "@/lib/tracking/server-api.ts";
import { createScene, DEMO_H, DEMO_W, type DemoScene } from "./demo-scenes.ts";

/** A seekable source of frames: an uploaded video or the built-in demo arena. */
export type FrameSource = {
  kind: "video" | "demo" | "camera";
  name: string;
  serverSessionId?: string;
  liveSessionId?: string;
  originalFile?: File;
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

export async function createServerVideoSource(
  file: File,
  token: string,
  onUploadProgress: (progress: number) => void,
  signal: AbortSignal,
): Promise<FrameSource> {
  const uploaded = await uploadVideo(file, token, onUploadProgress, signal);
  let bitmap: ImageBitmap | null = null;
  let seekVersion = 0;
  return {
    kind: "video",
    name: file.name,
    serverSessionId: uploaded.sessionId,
    originalFile: file,
    width: uploaded.width,
    height: uploaded.height,
    duration: uploaded.duration,
    seek: async (time) => {
      const version = ++seekVersion;
      const next = await fetchVideoFrame(uploaded.sessionId, time, token);
      if (version !== seekVersion) {
        next.close();
        return;
      }
      bitmap?.close();
      bitmap = next;
    },
    draw: (ctx, width, height) => {
      if (bitmap) ctx.drawImage(bitmap, 0, 0, width, height);
    },
    dispose: () => {
      seekVersion++;
      bitmap?.close();
      bitmap = null;
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
  return {
    x: c.x + dx * Math.min(r, half * 1.0),
    y: c.y + dy * Math.min(r, half * 1.0),
  };
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

function createMazeDemoSource(
  templateId: TemplateId,
  scene: DemoScene,
): FrameSource {
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
export function createDemoSource(
  templateId: TemplateId = "open-field",
): FrameSource {
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
