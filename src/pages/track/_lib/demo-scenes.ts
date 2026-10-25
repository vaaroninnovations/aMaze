import { distance, polygonCentroid, rectCenter } from "@/lib/tracking/geometry.ts";
import { buildZones, defaultParams } from "@/lib/tracking/templates.ts";
import type { Arena, Point, TemplateId, Zone } from "@/lib/tracking/types.ts";

export const DEMO_W = 640;
export const DEMO_H = 480;
/** Arena in demo pixel space. Every scene is built from the same template geometry the tracker uses. */
export const DEMO_ARENA: Arena = { rect: { x: 150, y: 70, w: 340, h: 340 }, shape: "rect" };

const FLOOR = "#d9d6cc";
const SPEED = 70; // px per second
const DWELL = 0.6; // seconds paused at each stop
const CENTER = "@c";

export type DemoScene = {
  duration: number;
  arena: Arena;
  /** Paints the full frame for time `t` (seconds). */
  draw: (ctx: CanvasRenderingContext2D, t: number) => void;
};

type SceneDef = {
  arena?: Arena;
  floor: (ctx: CanvasRenderingContext2D, zones: Zone[]) => void;
  /** Zone ids (or "@c" for the arena center) the animal visits in order, then loops. */
  route: string[];
};

function fillPoly(ctx: CanvasRenderingContext2D, poly: Point[], color: string) {
  ctx.fillStyle = color;
  ctx.beginPath();
  poly.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
  ctx.fill();
}

function fillCircle(ctx: CanvasRenderingContext2D, c: Point, r: number, color: string) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(c.x, c.y, r, 0, Math.PI * 2);
  ctx.fill();
}

const fillRectArena = (ctx: CanvasRenderingContext2D, color = FLOOR) => {
  const { x, y, w, h } = DEMO_ARENA.rect;
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
};

/** Mazes made of corridors: only the zone shapes are floor. */
const armsFloor = (ctx: CanvasRenderingContext2D, zones: Zone[]) =>
  zones.forEach((z) => fillPoly(ctx, z.polygon, z.name.startsWith("Closed") ? "#b3afa3" : FLOOR));

const radialRoute = (order: number[]) => order.flatMap((i) => [CENTER, `arm-${i}`]);

const ROUND_ARENA: Arena = { ...DEMO_ARENA, shape: "circle" };

const SCENES: Partial<Record<TemplateId, SceneDef>> = {
  "elevated-plus": {
    floor: armsFloor,
    route: [CENTER, "arm-e", CENTER, "arm-w", CENTER, "arm-n", CENTER, "arm-e", CENTER, "arm-w", CENTER, "arm-s", CENTER, "arm-w"],
  },
  "y-maze": {
    floor: armsFloor,
    route: ["center", "arm-0", "center", "arm-1", "center", "arm-2", "center", "arm-0", "center", "arm-2", "center", "arm-1", "center", "arm-0"],
  },
  "radial-arm": {
    floor: armsFloor,
    // Mostly new arms, with a couple of re-entries to produce working-memory errors.
    route: radialRoute([0, 3, 6, 1, 4, 4, 7, 2, 5, 3, 0]),
  },
  "water-maze": {
    arena: ROUND_ARENA,
    floor: (ctx, zones) => {
      const r = DEMO_ARENA.rect.w / 2;
      fillCircle(ctx, rectCenter(DEMO_ARENA.rect), r, "#cdd3d4");
      ctx.strokeStyle = "#b4bcbd";
      ctx.lineWidth = 1;
      const c = rectCenter(DEMO_ARENA.rect);
      ctx.beginPath();
      ctx.moveTo(c.x - r, c.y);
      ctx.lineTo(c.x + r, c.y);
      ctx.moveTo(c.x, c.y - r);
      ctx.lineTo(c.x, c.y + r);
      ctx.stroke();
      const platform = zones.find((z) => z.id === "platform");
      if (platform) fillPoly(ctx, platform.polygon, "#e2e6e6");
    },
    route: ["quad-SW", "quad-SE", CENTER, "quad-NW", "quad-SW", CENTER, "quad-NE", "platform", "platform"],
  },
  "barnes-maze": {
    arena: ROUND_ARENA,
    floor: (ctx, zones) => {
      fillCircle(ctx, rectCenter(DEMO_ARENA.rect), DEMO_ARENA.rect.w / 2, FLOOR);
      zones
        .filter((z) => z.id === "escape" || z.id.startsWith("hole-"))
        .forEach((z) => fillPoly(ctx, z.polygon, z.id === "escape" ? "#3d3a34" : "#7c786d"));
    },
    route: [CENTER, "hole-6", "hole-7", CENTER, "hole-14", "hole-12", CENTER, "hole-3", CENTER, "escape", "escape"],
  },
  "novel-object": {
    floor: (ctx, zones) => {
      fillRectArena(ctx);
      const [familiar, novel] = ["object-a", "object-b"].map((id) => zones.find((z) => z.id === id));
      if (familiar) fillCircle(ctx, polygonCentroid(familiar.polygon), 15, "#8a6d3b");
      if (novel) fillCircle(ctx, polygonCentroid(novel.polygon), 15, "#3b7a8a");
    },
    route: ["object-a", "object-b", CENTER, "object-b", "object-a", "object-b", CENTER, "object-b"],
  },
  "light-dark": {
    floor: (ctx, zones) => {
      zones.forEach((z) => fillPoly(ctx, z.polygon, z.id === "dark" ? "#8d897d" : "#e8e5db"));
    },
    route: ["light", "dark", "dark", "light", "dark", "light", "light", "dark"],
  },
  "three-chamber": {
    floor: (ctx, zones) => {
      fillRectArena(ctx);
      const { x, y, w, h } = DEMO_ARENA.rect;
      ctx.fillStyle = "#6f6b60";
      for (const f of [1 / 3, 2 / 3]) {
        const wx = x + w * f - 2;
        ctx.fillRect(wx, y, 4, h * 0.34);
        ctx.fillRect(wx, y + h * 0.66, 4, h * 0.34);
      }
      zones
        .filter((z) => z.id.startsWith("cup-"))
        .forEach((z) => fillCircle(ctx, polygonCentroid(z.polygon), 12, "#8f8f8f"));
    },
    route: ["chamber-center", "chamber-left", "cup-left", "cup-left", "chamber-left", "chamber-center", "chamber-right", "cup-right", "cup-right", "chamber-right", "chamber-center"],
  },
};

export const DEMO_TEMPLATES = Object.keys(SCENES) as TemplateId[];

/** Where the animal stands for a zone: beside objects, partway down arms, otherwise the zone middle. */
function target(token: string, zones: Zone[], center: Point, reach: number): Point {
  const zone = zones.find((z) => z.id === token);
  if (token === CENTER || !zone) return center;
  const c = polygonCentroid(zone.polygon);
  if (token.startsWith("arm-")) {
    const d = distance(c, center) || 1;
    const k = Math.min(1.35, (reach * 0.88) / d);
    return { x: center.x + (c.x - center.x) * k, y: center.y + (c.y - center.y) * k };
  }
  if (token.startsWith("object-")) return { x: c.x - 24, y: c.y + 14 };
  if (token.startsWith("cup-")) return { x: c.x, y: c.y + 26 };
  return c;
}

type Segment = { t0: number; travel: number; from: Point; to: Point };

function buildTimeline(points: Point[]): { segments: Segment[]; total: number } {
  const segments: Segment[] = [];
  let t = DWELL;
  for (let i = 0; i + 1 < points.length; i++) {
    const travel = distance(points[i], points[i + 1]) / SPEED;
    segments.push({ t0: t, travel, from: points[i], to: points[i + 1] });
    t += travel + DWELL;
  }
  return { segments, total: Math.max(t, 1) };
}

function poseAt(timeline: ReturnType<typeof buildTimeline>, first: Point, time: number): Point {
  const tt = time % timeline.total;
  let at = first;
  for (const s of timeline.segments) {
    if (tt < s.t0) return at;
    if (tt < s.t0 + s.travel) {
      const u = (tt - s.t0) / s.travel;
      const e = u * u * (3 - 2 * u);
      return { x: s.from.x + (s.to.x - s.from.x) * e, y: s.from.y + (s.to.y - s.from.y) * e };
    }
    at = s.to;
  }
  return at;
}

export function drawMouse(ctx: CanvasRenderingContext2D, p: Point, angle: number, t: number) {
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(angle);
  ctx.strokeStyle = "#3a3a3a";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(-14, 0);
  ctx.quadraticCurveTo(-30, Math.sin(t * 6) * 6, -42, 0);
  ctx.stroke();
  ctx.fillStyle = "#26231f";
  ctx.beginPath();
  ctx.ellipse(0, 0, 16, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(14, 0, 7, 5.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Returns a scene for mazes with a dedicated demo, or null (open field uses the classic demo). */
export function createScene(templateId: TemplateId): DemoScene | null {
  const def = SCENES[templateId];
  if (!def) return null;
  const arena = def.arena ?? DEMO_ARENA;
  const zones = buildZones(templateId, arena, defaultParams(templateId));
  const center = rectCenter(arena.rect);
  const reach = Math.min(arena.rect.w, arena.rect.h) / 2;
  const points = def.route.map((token) => target(token, zones, center, reach));
  const timeline = buildTimeline(points);
  let heading = -Math.PI / 2;

  return {
    duration: 60,
    arena,
    draw: (ctx, t) => {
      ctx.fillStyle = "#1c1f24";
      ctx.fillRect(0, 0, DEMO_W, DEMO_H);
      def.floor(ctx, zones);
      const p = poseAt(timeline, points[0], t);
      const ahead = poseAt(timeline, points[0], t + 0.3);
      // Keep the last heading while paused so the animal does not snap to face east.
      if (distance(p, ahead) > 0.05) heading = Math.atan2(ahead.y - p.y, ahead.x - p.x);
      drawMouse(ctx, p, heading, t);
    },
  };
}
