export type Point = { x: number; y: number };

export type Rect = { x: number; y: number; w: number; h: number };

export type ArenaShape = "rect" | "circle";

/** rotation: degrees clockwise around the rect center (0 = axis-aligned). */
export type Arena = { rect: Rect; shape: ArenaShape; rotation?: number };

export type Zone = {
  id: string;
  name: string;
  color: string;
  polygon: Point[];
  /** A point inside any of these zones is NOT inside this zone (e.g. periphery excludes center). */
  excludes?: string[];
};

export type TemplateId =
  | "open-field"
  | "elevated-plus"
  | "y-maze"
  | "water-maze"
  | "barnes-maze"
  | "radial-arm"
  | "novel-object"
  | "light-dark"
  | "three-chamber"
  | "custom";

export type TemplateParams = {
  /** Template-specific size fraction (center size, arm width, platform size...). */
  size: number;
  /** Rotation of all zones around the arena center, in degrees. */
  rotation: number;
  variant: string;
};

export type TrackPoint = {
  t: number;
  x: number;
  y: number;
  found: boolean;
  area: number;
};

export type DetectionMode = "background" | "dark" | "light";

export type DetectionSettings = {
  mode: DetectionMode;
  /** 0-255 intensity threshold (difference for background mode, absolute otherwise). */
  threshold: number;
  /** Minimum blob size in processing pixels. */
  minArea: number;
  /** Analysis sampling rate in frames per second. */
  fps: number;
};

export type Gray = { data: Uint8ClampedArray; width: number; height: number };
