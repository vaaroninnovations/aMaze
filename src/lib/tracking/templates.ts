import {
  armPolygon,
  circlePolygon,
  pieSlice,
  rectCenter,
  rectPolygon,
  rotatePoint,
} from "./geometry.ts";
import type { Arena, ArenaShape, Point, TemplateId, TemplateParams, Zone } from "./types.ts";

export const ZONE_COLORS = [
  "#22d3ee",
  "#f59e0b",
  "#a3e635",
  "#f472b6",
  "#818cf8",
  "#fb7185",
  "#34d399",
] as const;

const BARNES_HOLE_COUNTS = [20, 18] as const;
const BARNES_POSITIONS = [
  { id: "n", label: "north" },
  { id: "e", label: "east" },
  { id: "s", label: "south" },
  { id: "w", label: "west" },
] as const;

type TemplateDef = {
  id: TemplateId;
  name: string;
  short: string;
  description: string;
  shape: ArenaShape;
  sizeLabel: string;
  sizeRange: [number, number];
  defaultSize: number;
  variants: { id: string; label: string }[];
  build: (arena: Arena, p: TemplateParams) => Omit<Zone, "color">[];
};

const zone = (id: string, name: string, polygon: Point[], excludes?: string[]) => ({
  id,
  name,
  polygon,
  excludes,
});

export const TEMPLATES: TemplateDef[] = [
  {
    id: "open-field",
    name: "Open field",
    short: "OFT",
    description: "Center vs. periphery for anxiety-like behavior and locomotion.",
    shape: "rect",
    sizeLabel: "Center size",
    sizeRange: [0.2, 0.8],
    defaultSize: 0.5,
    variants: [
      { id: "center", label: "Center + periphery" },
      { id: "corners", label: "Center + periphery + corners" },
    ],
    build: ({ rect }, p) => {
      const c = rectCenter(rect);
      const center = rectPolygon({
        x: c.x - (rect.w * p.size) / 2,
        y: c.y - (rect.h * p.size) / 2,
        w: rect.w * p.size,
        h: rect.h * p.size,
      });
      const zones = [zone("center", "Center", center), zone("periphery", "Periphery", rectPolygon(rect), ["center"])];
      if (p.variant === "corners") {
        const cw = rect.w * 0.2;
        const ch = rect.h * 0.2;
        const corners: [string, number, number][] = [
          ["Corner NW", rect.x, rect.y],
          ["Corner NE", rect.x + rect.w - cw, rect.y],
          ["Corner SE", rect.x + rect.w - cw, rect.y + rect.h - ch],
          ["Corner SW", rect.x, rect.y + rect.h - ch],
        ];
        corners.forEach(([name, x, y], i) =>
          zones.push(zone(`corner-${i}`, name, rectPolygon({ x, y, w: cw, h: ch }))),
        );
      }
      return zones;
    },
  },
  {
    id: "elevated-plus",
    name: "Elevated plus maze",
    short: "EPM",
    description: "Two open and two closed arms around a central square.",
    shape: "rect",
    sizeLabel: "Arm width",
    sizeRange: [0.06, 0.3],
    defaultSize: 0.12,
    variants: [
      { id: "open-ns", label: "Open arms north/south" },
      { id: "open-ew", label: "Open arms east/west" },
    ],
    build: ({ rect }, p) => {
      const c = rectCenter(rect);
      const half = Math.min(rect.w, rect.h) / 2;
      const w = Math.min(rect.w, rect.h) * p.size;
      const openNS = p.variant !== "open-ew";
      const arm = (name: string, angle: number, id: string) =>
        zone(id, name, armPolygon(c, angle, w / 2, half, w));
      return [
        zone("center", "Center", rectPolygon({ x: c.x - w / 2, y: c.y - w / 2, w, h: w })),
        arm(openNS ? "Open arm N" : "Closed arm N", -90, "arm-n"),
        arm(openNS ? "Open arm S" : "Closed arm S", 90, "arm-s"),
        arm(openNS ? "Closed arm E" : "Open arm E", 0, "arm-e"),
        arm(openNS ? "Closed arm W" : "Open arm W", 180, "arm-w"),
      ];
    },
  },
  {
    id: "y-maze",
    name: "Y-maze",
    short: "YM",
    description: "Three arms 120 degrees apart for spontaneous alternation.",
    shape: "rect",
    sizeLabel: "Arm width",
    sizeRange: [0.08, 0.35],
    defaultSize: 0.18,
    variants: [
      { id: "up", label: "Arm A pointing up" },
      { id: "down", label: "Arm A pointing down" },
    ],
    build: ({ rect }, p) => {
      const c = rectCenter(rect);
      const reach = Math.min(rect.w, rect.h) / 2;
      const w = Math.min(rect.w, rect.h) * p.size;
      const hub = w / Math.sqrt(3);
      const base = p.variant === "down" ? 90 : -90;
      const angles = [base, base + 120, base + 240];
      const hubPoly = angles.map((a) => {
        const r = ((a + 60) * Math.PI) / 180;
        return { x: c.x + Math.cos(r) * hub * 1.15, y: c.y + Math.sin(r) * hub * 1.15 };
      });
      return [
        zone("center", "Center", hubPoly),
        ...angles.map((a, i) =>
          zone(`arm-${i}`, `Arm ${"ABC"[i]}`, armPolygon(c, a, hub * 0.55, reach, w)),
        ),
      ];
    },
  },
  {
    id: "water-maze",
    name: "Water maze",
    short: "MWM",
    description: "Four quadrants and a hidden platform zone.",
    shape: "circle",
    sizeLabel: "Platform size",
    sizeRange: [0.05, 0.25],
    defaultSize: 0.1,
    variants: [
      { id: "NE", label: "Platform in NE" },
      { id: "NW", label: "Platform in NW" },
      { id: "SW", label: "Platform in SW" },
      { id: "SE", label: "Platform in SE" },
    ],
    build: ({ rect }, p) => {
      const c = rectCenter(rect);
      const r = Math.min(rect.w, rect.h) / 2;
      const quads: [string, number][] = [
        ["NE", -90],
        ["SE", 0],
        ["SW", 90],
        ["NW", 180],
      ];
      const target = quads.find(([id]) => id === p.variant) ?? quads[0];
      const mid = ((target[1] + 45) * Math.PI) / 180;
      const platformCenter = { x: c.x + Math.cos(mid) * r * 0.5, y: c.y + Math.sin(mid) * r * 0.5 };
      return [
        zone("platform", "Platform", circlePolygon(platformCenter, r * p.size, 32)),
        ...quads.map(([id, from]) =>
          zone(`quad-${id}`, id === target[0] ? `${id} (target)` : id, pieSlice(c, r, from, from + 90)),
        ),
      ];
    },
  },
  {
    id: "barnes-maze",
    name: "Barnes maze",
    short: "BM",
    description: "Circular platform with holes around the edge and one escape hole.",
    shape: "circle",
    sizeLabel: "Hole size",
    sizeRange: [0.03, 0.1],
    defaultSize: 0.055,
    variants: BARNES_HOLE_COUNTS.flatMap((n) =>
      BARNES_POSITIONS.map((p) => ({ id: `${n}-${p.id}`, label: `${n} holes, escape ${p.label}` })),
    ),
    build: ({ rect }, p) => {
      const c = rectCenter(rect);
      const r = Math.min(rect.w, rect.h) / 2;
      const [countStr, pos] = p.variant.split("-");
      const n = Number(countStr) || 20;
      const quarter = BARNES_POSITIONS.findIndex((q) => q.id === pos);
      const escapeIdx = Math.round((n * Math.max(quarter, 0)) / 4) % n;
      const angleOf = (i: number) => -90 + (i * 360) / n;
      const holeAt = (i: number) => {
        const a = (angleOf(i) * Math.PI) / 180;
        return circlePolygon({ x: c.x + Math.cos(a) * r * 0.86, y: c.y + Math.sin(a) * r * 0.86 }, r * p.size, 24);
      };
      const holes = Array.from({ length: n }, (_, i) =>
        i === escapeIdx ? zone("escape", "Escape hole", holeAt(i)) : zone(`hole-${i}`, `Hole ${i + 1}`, holeAt(i)),
      );
      const mid = angleOf(escapeIdx);
      return [...holes, zone("target-quadrant", "Target quadrant", pieSlice(c, r, mid - 45, mid + 45))];
    },
  },
  {
    id: "radial-arm",
    name: "Radial arm maze",
    short: "RAM",
    description: "Central hub with arms radiating out, for working memory.",
    shape: "rect",
    sizeLabel: "Arm width",
    sizeRange: [0.04, 0.14],
    defaultSize: 0.09,
    variants: [
      { id: "8", label: "8 arms" },
      { id: "12", label: "12 arms" },
      { id: "6", label: "6 arms" },
    ],
    build: ({ rect }, p) => {
      const c = rectCenter(rect);
      const reach = Math.min(rect.w, rect.h) / 2;
      const w = Math.min(rect.w, rect.h) * p.size;
      const n = Number(p.variant) || 8;
      // Hub just large enough that neighboring arms do not overlap.
      const hub = Math.min(w / 2 / Math.tan(Math.PI / n), reach * 0.6);
      const arms = Array.from({ length: n }, (_, i) =>
        zone(`arm-${i}`, `Arm ${i + 1}`, armPolygon(c, -90 + (i * 360) / n, hub, reach, w)),
      );
      return [zone("center", "Hub", circlePolygon(c, hub, 32)), ...arms];
    },
  },
  {
    id: "novel-object",
    name: "Novel object",
    short: "NOR",
    description: "Two object-interaction zones for recognition memory.",
    shape: "rect",
    sizeLabel: "Object zone radius",
    sizeRange: [0.06, 0.25],
    defaultSize: 0.12,
    variants: [
      { id: "horizontal", label: "Objects side by side" },
      { id: "diagonal", label: "Objects in diagonal corners" },
    ],
    build: ({ rect }, p) => {
      const r = Math.min(rect.w, rect.h) * p.size;
      const diag = p.variant === "diagonal";
      const a = { x: rect.x + rect.w * 0.25, y: rect.y + rect.h * (diag ? 0.25 : 0.5) };
      const b = { x: rect.x + rect.w * 0.75, y: rect.y + rect.h * (diag ? 0.75 : 0.5) };
      return [
        zone("object-a", "Familiar object", circlePolygon(a, r, 40)),
        zone("object-b", "Novel object", circlePolygon(b, r, 40)),
      ];
    },
  },
  {
    id: "light-dark",
    name: "Light/dark box",
    short: "LDB",
    description: "Split arena into a light and a dark compartment.",
    shape: "rect",
    sizeLabel: "Light side share",
    sizeRange: [0.3, 0.8],
    defaultSize: 0.66,
    variants: [
      { id: "light-left", label: "Light on the left" },
      { id: "light-right", label: "Light on the right" },
    ],
    build: ({ rect }, p) => {
      const lw = rect.w * p.size;
      const lightLeft = p.variant !== "light-right";
      const light = { x: lightLeft ? rect.x : rect.x + rect.w - lw, y: rect.y, w: lw, h: rect.h };
      const dark = { x: lightLeft ? rect.x + lw : rect.x, y: rect.y, w: rect.w - lw, h: rect.h };
      return [zone("light", "Light", rectPolygon(light)), zone("dark", "Dark", rectPolygon(dark))];
    },
  },
  {
    id: "three-chamber",
    name: "Three-chamber",
    short: "3CH",
    description: "Social preference: three chambers and two cup zones.",
    shape: "rect",
    sizeLabel: "Cup zone radius",
    sizeRange: [0.05, 0.2],
    defaultSize: 0.1,
    variants: [{ id: "standard", label: "Standard layout" }],
    build: ({ rect }, p) => {
      const cw = rect.w / 3;
      const r = Math.min(rect.w, rect.h) * p.size;
      return [
        zone("cup-left", "Cup left", circlePolygon({ x: rect.x + cw / 2, y: rect.y + rect.h / 2 }, r, 32)),
        zone("cup-right", "Cup right", circlePolygon({ x: rect.x + cw * 2.5, y: rect.y + rect.h / 2 }, r, 32)),
        zone("chamber-left", "Left chamber", rectPolygon({ x: rect.x, y: rect.y, w: cw, h: rect.h })),
        zone("chamber-center", "Center chamber", rectPolygon({ x: rect.x + cw, y: rect.y, w: cw, h: rect.h })),
        zone("chamber-right", "Right chamber", rectPolygon({ x: rect.x + cw * 2, y: rect.y, w: cw, h: rect.h })),
      ];
    },
  },
  {
    id: "custom",
    name: "Whole arena",
    short: "ARN",
    description: "No sub-zones. Tracks locomotion across the full arena.",
    shape: "rect",
    sizeLabel: "",
    sizeRange: [0, 1],
    defaultSize: 0,
    variants: [{ id: "none", label: "Single zone" }],
    build: ({ rect, shape }) => [
      zone(
        "arena",
        "Arena",
        shape === "circle" ? circlePolygon(rectCenter(rect), Math.min(rect.w, rect.h) / 2) : rectPolygon(rect),
      ),
    ],
  },
];

export function getTemplate(id: TemplateId): TemplateDef {
  return TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0];
}

export function defaultParams(id: TemplateId): TemplateParams {
  const t = getTemplate(id);
  return { size: t.defaultSize, rotation: 0, variant: t.variants[0].id };
}

export function buildZones(id: TemplateId, arena: Arena, params: TemplateParams): Zone[] {
  const c = rectCenter(arena.rect);
  return getTemplate(id)
    .build(arena, params)
    .map((z, i) => ({
      ...z,
      color: ZONE_COLORS[i % ZONE_COLORS.length],
      polygon: z.polygon.map((pt) => rotatePoint(pt, c, params.rotation + (arena.rotation ?? 0))),
    }));
}
