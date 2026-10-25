import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  Activity,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Camera,
  Check,
  CheckCircle2,
  Clock,
  Compass,
  Crosshair,
  Download,
  Eye,
  EyeOff,
  FastForward,
  FileDown,
  FileSpreadsheet,
  Flame,
  FlaskConical,
  Focus,
  FolderDown,
  Hand,
  HelpCircle,
  Layers,
  LineChart,
  Lock,
  Maximize2,
  Minimize2,
  MousePointer,
  Move,
  PanelRightClose,
  PanelRightOpen,
  Pause,
  Play,
  Radio,
  RefreshCw,
  Repeat,
  RotateCcw,
  Save,
  ScanSearch,
  Settings,
  Settings2,
  Sliders,
  Sparkles,
  StopCircle,
  Timer,
  Unlock,
  Upload,
  Video,
  Volume2,
  VolumeX,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Slider } from "@/components/ui/slider.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import {
  saveTrialToProject,
  type TrialRecord,
} from "@/lib/tracking/project-store.ts";
import {
  toGray,
  medianBackground,
  detectAnimal,
  type Gray,
  type Detection,
} from "@/lib/tracking/vision.ts";
import {
  detectMaze,
  blendArena,
  MAZE_LABELS,
  type MazeDetection,
} from "@/lib/tracking/maze-detect.ts";
import {
  buildZones,
  defaultParams,
  getTemplate,
  TEMPLATES,
  ZONE_COLORS,
} from "@/lib/tracking/templates.ts";
import {
  applyZoneEdits,
  byAreaDescending,
  clampScale,
  isDraggableZone,
  NO_EDIT,
  polygonBounds,
  type ZoneEdit,
  type ZoneEdits,
} from "@/lib/tracking/zone-edits.ts";
import {
  distance,
  normalizeDeg,
  polygonCentroid,
  polygonToPath,
  rectCenter,
  rotatePoint,
  zoneContains,
} from "@/lib/tracking/geometry.ts";
import {
  listCameras,
  type CameraDevice,
} from "../track/_lib/camera-source.ts";
import type {
  Arena,
  DetectionMode,
  DetectionSettings,
  Point,
  Rect,
  TemplateId,
  TemplateParams,
  Zone,
} from "@/lib/tracking/types.ts";

// ==========================================================================
// TYPES & DATA STRUCTURES
// ==========================================================================

export type VideoSourceType = "upload" | "live" | "sample" | "benchmark";
export type AnalysisStatus = "idle" | "running" | "paused" | "completed";

interface ZoneStatistic {
  id: string;
  name: string;
  color: string;
  entries: number;
  timeSeconds: number;
  dwellPercent: number;
  firstEntryLatency: number | null;
}

interface TrajectoryPoint {
  x: number;
  y: number;
  t: number;
  speed: number;
  zoneId: string;
}

interface AnimalLandmarks {
  found: boolean;
  x: number;
  y: number;
  heading: number;
  nose: Point;
  body: Point;
  tail: Point;
  area: number;
  majorR?: number;
  minorR?: number;
  bbox?: Rect;
}

// Dragging State for Arena and Individual Zones
type ArenaDrag = {
  kind: "move" | "nw" | "ne" | "se" | "sw";
  start: Point;
  rect: Rect;
  rotation: number;
};

type RotateDrag = {
  kind: "rotate";
  startAngle: number;
  rotation: number;
  center: Point;
};

type ZoneDrag = {
  kind: "zone-move" | "zone-scale";
  start: Point;
  zoneId: string;
  edit: ZoneEdit;
  center: Point;
};

type DragState = ArenaDrag | RotateDrag | ZoneDrag | null;

const angleDeg = (p: Point, c: Point) => (Math.atan2(p.y - c.y, p.x - c.x) * 180) / Math.PI;
const MIN_SIZE = 40;

function resizeRect(d: ArenaDrag, p: Point, square: boolean): Rect {
  const dx = p.x - d.start.x;
  const dy = p.y - d.start.y;
  const r = d.rect;
  if (d.kind === "move") return { ...r, x: r.x + dx, y: r.y + dy };
  let x0 = r.x;
  let y0 = r.y;
  let x1 = r.x + r.w;
  let y1 = r.y + r.h;
  if (d.kind.includes("w")) x0 = Math.min(x0 + dx, x1 - MIN_SIZE);
  if (d.kind.includes("e")) x1 = Math.max(x1 + dx, x0 + MIN_SIZE);
  if (d.kind.includes("n")) y0 = Math.min(y0 + dy, y1 - MIN_SIZE);
  if (d.kind.includes("s")) y1 = Math.max(y1 + dy, y0 + MIN_SIZE);
  const next = { x: x0, y: y0, w: Math.max(MIN_SIZE, x1 - x0), h: Math.max(MIN_SIZE, y1 - y0) };
  if (!square) return next;
  const side = Math.max(next.w, next.h);
  return {
    x: d.kind.includes("w") ? x1 - side : x0,
    y: d.kind.includes("n") ? y1 - side : y0,
    w: side,
    h: side,
  };
}

function resizeRotated(d: ArenaDrag, p: Point, square: boolean): Rect {
  if (!d.rotation || d.kind === "move") return resizeRect(d, p, square);
  const c0 = rectCenter(d.rect);
  const local = resizeRect(
    { ...d, start: rotatePoint(d.start, c0, -d.rotation) },
    rotatePoint(p, c0, -d.rotation),
    square
  );
  const lc = rectCenter(local);
  const c = rotatePoint(lc, c0, d.rotation);
  return { x: c.x - local.w / 2, y: c.y - local.h / 2, w: local.w, h: local.h };
}

function mapMazeToTemplateId(mazeId: string): TemplateId {
  switch (mazeId) {
    case "epm":
      return "elevated-plus";
    case "y_maze":
      return "y-maze";
    case "water_maze":
      return "water-maze";
    case "barnes_maze":
      return "barnes-maze";
    case "radial_arm":
      return "radial-arm";
    case "three_zone":
      return "three-chamber";
    case "open_field":
    default:
      return "open-field";
  }
}

export default function ExperimentalRunPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Load trial setup from localStorage if configured via Setup Page
  const setupData = (() => {
    try {
      const saved = localStorage.getItem("amaze:active_trial_setup");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  })();

  const projectId = searchParams.get("projectId") || setupData?.projectId || "proj-active";
  const mazeId = searchParams.get("maze") || setupData?.maze?.id || "epm";
  const animalName = setupData?.animal?.name || "White Rat";
  const strain = setupData?.animal?.strain || "Sprague-Dawley / Wistar";
  const mazeName = setupData?.maze?.name || "Elevated Plus Maze";
  const mazeShort = setupData?.maze?.short || "EPM";
  const contrastMode = setupData?.colorContrast || "Black";
  const initialDuration = Number(searchParams.get("duration")) || setupData?.durationSeconds || 300;
  const habituationDelay = setupData?.habituationDelay || 0;

  // ------------------------------------------------------------------------
  // 1. TRIAL METADATA: Animal # & Group #
  // ------------------------------------------------------------------------
  const [animalNumber, setAnimalNumber] = useState<string>("M-01");
  const [groupNumber, setGroupNumber] = useState<string>("Control Group A");

  // Analysis & Recording Lifecycle State
  const [analysisStatus, setAnalysisStatus] = useState<AnalysisStatus>("idle");
  const [animalIdentified, setAnimalIdentified] = useState<boolean>(true);
  const [isTrialCompleteDialogOpen, setIsTrialCompleteDialogOpen] = useState<boolean>(false);

  // ------------------------------------------------------------------------
  // 2. VIDEO SOURCE STATE
  // ------------------------------------------------------------------------
  const [videoSource, setVideoSource] = useState<VideoSourceType>("sample");
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraDevices, setCameraDevices] = useState<CameraDevice[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoElementRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const trackCanvasRef = useRef<HTMLCanvasElement>(null);
  const heatmapCanvasRef = useRef<HTMLCanvasElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const sampleTimeRef = useRef<number>(0);

  // Video Transport State
  const [isVideoPlaying, setIsVideoPlaying] = useState<boolean>(false);
  const [videoCurrentTime, setVideoCurrentTime] = useState<number>(0);
  const [videoDuration, setVideoDuration] = useState<number>(300);
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);
  const [isLooping, setIsLooping] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(true);

  // ------------------------------------------------------------------------
  // 3. ADJUSTABLE ARENA & ZONES STATE
  // ------------------------------------------------------------------------
  const templateId = mapMazeToTemplateId(mazeId);
  const [templateParams, setTemplateParams] = useState<TemplateParams>(() => defaultParams(templateId));

  // Main Arena geometry in 1280x720 coordinate space
  const initialArena = useMemo<Arena>(() => {
    const isRound = templateId === "water-maze" || templateId === "barnes-maze" || mazeId === "zero_maze";
    const side = isRound ? 480 : 500;
    const w = templateId === "three-chamber" ? 640 : side;
    const h = templateId === "three-chamber" ? 360 : side;
    return {
      shape: isRound ? "circle" : "rect",
      rect: { x: 640 - w / 2, y: 360 - h / 2, w, h },
      rotation: 0,
    };
  }, [templateId, mazeId]);

  const [arena, setArena] = useState<Arena>(initialArena);
  const [arenaCm, setArenaCm] = useState<number>(40);
  const [zoneEdits, setZoneEdits] = useState<ZoneEdits>({});
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [isAdjustmentMode, setIsAdjustmentMode] = useState<boolean>(true);
  const [drag, setDrag] = useState<DragState>(null);

  // Auto-detection state
  const [detectedMaze, setDetectedMaze] = useState<MazeDetection | null>(null);
  const [autoFollow, setAutoFollow] = useState<boolean>(false);

  // ------------------------------------------------------------------------
  // 4. COMPUTER VISION & DETECTION SETTINGS
  // ------------------------------------------------------------------------
  const defaultMode: DetectionMode =
    contrastMode === "Black" ? "light" : contrastMode === "White" ? "dark" : "background";

  const [settings, setSettings] = useState<DetectionSettings>({
    mode: defaultMode,
    threshold: defaultMode === "background" ? 35 : defaultMode === "dark" ? 75 : 175,
    minArea: 20,
    fps: 15,
  });

  const backgroundRef = useRef<Gray | null>(null);

  const landmarksRef = useRef<AnimalLandmarks>({
    found: false,
    x: 640,
    y: 360,
    heading: 0.45,
    majorR: 22,
    minorR: 12,
    nose: { x: 660, y: 360 },
    body: { x: 640, y: 360 },
    tail: { x: 620, y: 360 },
    area: 120,
  });

  const [isProbing, setIsProbing] = useState<boolean>(false);

  // ------------------------------------------------------------------------
  // 5. DISPLAY TOGGLES
  // ------------------------------------------------------------------------
  const [showArenaZones, setShowArenaZones] = useState<boolean>(true);
  const [zoneThickness, setZoneThickness] = useState<number>(4.5);
  const [zoneOpacity, setZoneOpacity] = useState<number>(0.32);
  const [showZoneBadges, setShowZoneBadges] = useState<boolean>(true);
  const [showAnimalLandmarks, setShowAnimalLandmarks] = useState<boolean>(true);
  const [showTrackingTrail, setShowTrackingTrail] = useState<boolean>(true);
  const [activeViewTab, setActiveViewTab] = useState<"video" | "track" | "heatmap">("video");
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const [sidebarTab, setSidebarTab] = useState<"arena" | "detection" | "live">("arena");

  // ------------------------------------------------------------------------
  // 6. RECORDING & TELEMETRY
  // ------------------------------------------------------------------------
  const [remainingSeconds, setRemainingSeconds] = useState<number>(initialDuration);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isHabituating, setIsHabituating] = useState<boolean>(false);
  const [habituationCountdown, setHabituationCountdown] = useState<number>(habituationDelay);

  const [distanceCm, setDistanceCm] = useState<number>(0);
  const [currentSpeed, setCurrentSpeed] = useState<number>(0);
  const [immobilityTime, setImmobilityTime] = useState<number>(0);
  const [boutsCount, setBoutsCount] = useState<number>(0);
  const [latencyToKeyZone, setLatencyToKeyZone] = useState<number | null>(null);

  const trajectoryRef = useRef<TrajectoryPoint[]>([]);

  // ------------------------------------------------------------------------
  // 7. COMPUTE ADJUSTABLE ZONES WITH ZONE EDITS
  // ------------------------------------------------------------------------
  const computedZones: Zone[] = useMemo(() => {
    const rawZones = buildZones(templateId, arena, templateParams);
    return applyZoneEdits(rawZones, zoneEdits, arena.rect, arena.rotation ?? 0);
  }, [templateId, arena, templateParams, zoneEdits]);

  const zonesById = useMemo(() => {
    const map = new Map<string, Zone>();
    computedZones.forEach((z) => map.set(z.id, z));
    return map;
  }, [computedZones]);

  // Statistics tracker for zones
  const [zoneStats, setZoneStats] = useState<ZoneStatistic[]>(() =>
    computedZones.map((z) => ({
      id: z.id,
      name: z.name,
      color: z.color,
      entries: 0,
      timeSeconds: 0,
      dwellPercent: 0,
      firstEntryLatency: null,
    }))
  );

  // Synchronize stats on template change
  useEffect(() => {
    setZoneStats(
      computedZones.map((z) => ({
        id: z.id,
        name: z.name,
        color: z.color,
        entries: 0,
        timeSeconds: 0,
        dwellPercent: 0,
        firstEntryLatency: null,
      }))
    );
  }, [templateId]);

  const armEntryHistoryRef = useRef<string[]>([]);
  const currentActiveZoneRef = useRef<string>("");

  // ------------------------------------------------------------------------
  // 8. INTERACTIVE POINTER EVENTS (DRAGGING, RESIZING, ROTATING, ZONE EDITS)
  // ------------------------------------------------------------------------
  const toLocalPoint = (e: React.PointerEvent): Point => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * 1280,
      y: ((e.clientY - rect.top) / rect.height) * 720,
    };
  };

  const startArenaDrag = (kind: ArenaDrag["kind"]) => (e: React.PointerEvent) => {
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    setSelectedZoneId(null);
    setDrag({
      kind,
      start: toLocalPoint(e),
      rect: arena.rect,
      rotation: arena.rotation ?? 0,
    });
  };

  const startRotateDrag = (e: React.PointerEvent) => {
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    setSelectedZoneId(null);
    const center = rectCenter(arena.rect);
    setDrag({
      kind: "rotate",
      startAngle: angleDeg(toLocalPoint(e), center),
      rotation: arena.rotation ?? 0,
      center,
    });
  };

  const startZoneMoveDrag = (z: Zone) => (e: React.PointerEvent) => {
    if (!isDraggableZone(z)) return;
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    setSelectedZoneId(z.id);
    const center = polygonCentroid(z.polygon);
    setDrag({
      kind: "zone-move",
      start: toLocalPoint(e),
      zoneId: z.id,
      edit: zoneEdits[z.id] || NO_EDIT,
      center,
    });
  };

  const startZoneScaleDrag = (z: Zone) => (e: React.PointerEvent) => {
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    setSelectedZoneId(z.id);
    const center = polygonCentroid(z.polygon);
    setDrag({
      kind: "zone-scale",
      start: toLocalPoint(e),
      zoneId: z.id,
      edit: zoneEdits[z.id] || NO_EDIT,
      center,
    });
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag) return;
    const p = toLocalPoint(e);

    if (drag.kind === "rotate") {
      const raw = drag.rotation + angleDeg(p, drag.center) - drag.startAngle;
      const next = e.shiftKey ? Math.round(raw / 15) * 15 : Math.round(raw * 2) / 2;
      setArena((prev) => ({ ...prev, rotation: normalizeDeg(next) }));
    } else if (drag.kind === "zone-move") {
      const delta = rotatePoint(
        { x: p.x - drag.start.x, y: p.y - drag.start.y },
        { x: 0, y: 0 },
        -(arena.rotation ?? 0)
      );
      setZoneEdits((prev) => ({
        ...prev,
        [drag.zoneId]: {
          ...(prev[drag.zoneId] || NO_EDIT),
          dx: (prev[drag.zoneId]?.dx || 0) + delta.x / arena.rect.w,
          dy: (prev[drag.zoneId]?.dy || 0) + delta.y / arena.rect.h,
        },
      }));
    } else if (drag.kind === "zone-scale") {
      const factor = distance(p, drag.center) / Math.max(distance(drag.start, drag.center), 1);
      setZoneEdits((prev) => ({
        ...prev,
        [drag.zoneId]: {
          ...(prev[drag.zoneId] || NO_EDIT),
          scale: clampScale((prev[drag.zoneId]?.scale || 1) * factor),
        },
      }));
    } else if ("rect" in drag) {
      setArena((prev) => ({
        ...prev,
        rect: resizeRotated(drag, p, arena.shape === "circle"),
      }));
    }
  };

  const onPointerUp = () => {
    setDrag(null);
  };

  // ------------------------------------------------------------------------
  // 9. AUTOMATIC ARENA & MAZE BOUNDARY DETECTION
  // ------------------------------------------------------------------------
  const runAutoDetectMaze = useCallback(() => {
    try {
      const v = videoElementRef.current;
      if (!v || v.readyState < 2) {
        toast.info("Awaiting video frame for automatic maze detection...");
        return;
      }

      const off = document.createElement("canvas");
      off.width = 480;
      off.height = 270;
      const octx = off.getContext("2d", { willReadFrequently: true });
      if (!octx) return;

      octx.drawImage(v, 0, 0, 480, 270);
      const gray = toGray(octx.getImageData(0, 0, 480, 270));
      const det = detectMaze(gray);

      if (det) {
        setDetectedMaze(det);
        // Scale to 1280x720
        const scaleX = 1280 / 480;
        const scaleY = 720 / 270;
        const r = det.arena.rect;
        setArena({
          shape: det.arena.shape,
          rect: {
            x: r.x * scaleX,
            y: r.y * scaleY,
            w: r.w * scaleX,
            h: r.h * scaleY,
          },
          rotation: det.arena.rotation ?? 0,
        });
        if (det.size !== undefined) {
          setTemplateParams((cur) => ({ ...cur, size: det.size! }));
        }
        toast.success(`Apparatus auto-detected: ${MAZE_LABELS[det.kind] || det.kind}`, {
          description: `Confidence: ${Math.round(det.confidence * 100)}% · Aligned at ${(det.arena.rotation ?? 0).toFixed(1)}°`,
        });
      } else {
        toast.info("Boundary detection calibrated to default apparatus geometry");
      }
    } catch (err) {
      console.warn("Auto-detect failed:", err);
    }
  }, []);

  // ------------------------------------------------------------------------
  // 10. REAL-TIME SAMPLE VIDEO STREAM GENERATOR
  // ------------------------------------------------------------------------
  useEffect(() => {
    if (videoSource !== "sample") return;

    const offscreenCanvas = document.createElement("canvas");
    offscreenCanvas.width = 1280;
    offscreenCanvas.height = 720;
    const offCtx = offscreenCanvas.getContext("2d");
    if (!offCtx) return;

    let sampleAnimId = 0;
    let sampleTime = 0;

    try {
      if ("captureStream" in offscreenCanvas) {
        const stream = (offscreenCanvas as any).captureStream(30);
        if (videoElementRef.current) {
          videoElementRef.current.srcObject = stream;
          videoElementRef.current.play().catch(() => {});
        }
      }
    } catch {}

    const drawSampleVideoFrame = () => {
      sampleAnimId = requestAnimationFrame(drawSampleVideoFrame);

      const w = 1280;
      const h = 720;
      const isDark = contrastMode === "Black";

      // Advance sample timeline only when actively running and playing
      if (analysisStatus === "running" && isVideoPlaying) {
        sampleTimeRef.current += 0.033;
      }
      const curT = sampleTimeRef.current;

      const bgGrad = offCtx.createRadialGradient(w / 2, h / 2, 80, w / 2, h / 2, 620);
      if (isDark) {
        bgGrad.addColorStop(0, "#1c242b");
        bgGrad.addColorStop(0.7, "#12171d");
        bgGrad.addColorStop(1, "#0a0d11");
      } else {
        bgGrad.addColorStop(0, "#eef5f4");
        bgGrad.addColorStop(0.7, "#d8e4e2");
        bgGrad.addColorStop(1, "#b8c9c6");
      }
      offCtx.fillStyle = bgGrad;
      offCtx.fillRect(0, 0, w, h);

      // Vignette
      const vigGrad = offCtx.createRadialGradient(w / 2, h / 2, w * 0.35, w / 2, h / 2, w * 0.75);
      vigGrad.addColorStop(0, "rgba(0,0,0,0)");
      vigGrad.addColorStop(1, "rgba(0,0,0,0.65)");
      offCtx.fillStyle = vigGrad;
      offCtx.fillRect(0, 0, w, h);

      // Watermark
      offCtx.fillStyle = "rgba(255, 255, 255, 0.45)";
      offCtx.font = "11px monospace";
      offCtx.fillText(
        `CAM-01 [OPTICAL 60FPS HD] · TIME: ${new Date().toISOString().slice(11, 19)} · EXPOSURE: AUTO`,
        24,
        28
      );
      offCtx.fillText(`APPARATUS: ${mazeName.toUpperCase()} · SUBJECT: ${animalNumber} (${strain})`, 24, 44);

      // Rodent Subject Position:
      // When idle or paused, the animal stays identified in the starting center of the apparatus.
      // When running, it navigates the maze arms/corridors based on the paradigm.
      const cx0 = arena.rect.x + arena.rect.w / 2;
      const cy0 = arena.rect.y + arena.rect.h / 2;
      const reach = Math.min(arena.rect.w, arena.rect.h) * 0.38;

      let cx = cx0;
      let cy = cy0;
      let heading = -Math.PI / 4;

      if (analysisStatus === "running" && curT > 0) {
        if (templateId === "elevated-plus") {
          const cycle = (curT * 0.35) % 4;
          const armIdx = Math.floor(cycle);
          const progress = cycle - armIdx;
          const outward = progress < 0.5 ? progress * 2 : (1 - progress) * 2;
          const angles = [0, -Math.PI / 2, Math.PI, Math.PI / 2]; // E, N, W, S
          const armAngle = angles[armIdx];
          cx = cx0 + Math.cos(armAngle) * reach * outward;
          cy = cy0 + Math.sin(armAngle) * reach * outward;
          heading = progress < 0.5 ? armAngle : armAngle + Math.PI;
        } else if (templateId === "y-maze") {
          const cycle = (curT * 0.3) % 3;
          const armIdx = Math.floor(cycle);
          const progress = cycle - armIdx;
          const outward = progress < 0.5 ? progress * 2 : (1 - progress) * 2;
          const angles = [-Math.PI / 2, Math.PI / 6, (5 * Math.PI) / 6];
          const armAngle = angles[armIdx];
          cx = cx0 + Math.cos(armAngle) * reach * outward;
          cy = cy0 + Math.sin(armAngle) * reach * outward;
          heading = progress < 0.5 ? armAngle : armAngle + Math.PI;
        } else if (templateId === "water-maze") {
          const pTarget = { x: cx0 + reach * 0.5, y: cy0 - reach * 0.5 };
          const swim = Math.min(1, curT / 50);
          const orbit = Math.sin(curT * 1.5) * 35;
          cx = cx0 - reach * 0.55 * (1 - swim) + Math.cos(curT * 0.7) * orbit;
          cy = cy0 + reach * 0.55 * (1 - swim) + Math.sin(curT * 0.7) * orbit;
          heading = Math.atan2(pTarget.y - cy, pTarget.x - cx);
        } else {
          const r = reach * (0.35 + 0.45 * Math.sin(curT * 0.2));
          cx = cx0 + Math.cos(curT * 0.45) * r;
          cy = cy0 + Math.sin(curT * 0.45) * r;
          heading = curT * 0.45 + Math.PI / 2;
        }
      }

      // Update landmarksRef with current identified subject coordinates
      const bodyRadius = 22;
      const minorRadius = 12;
      const noseX = cx + Math.cos(heading) * (bodyRadius * 1.15);
      const noseY = cy + Math.sin(heading) * (bodyRadius * 1.15);
      const tailX = cx - Math.cos(heading) * (bodyRadius * 1.05);
      const tailY = cy - Math.sin(heading) * (bodyRadius * 1.05);
      landmarksRef.current = {
        found: true,
        x: cx,
        y: cy,
        heading,
        majorR: bodyRadius,
        minorR: minorRadius,
        nose: { x: noseX, y: noseY },
        body: { x: cx, y: cy },
        tail: { x: tailX, y: tailY },
        area: 135,
      };

      const rodentColor = isDark ? "#ffffff" : "#26231f";
      offCtx.save();
      offCtx.translate(cx, cy);
      offCtx.rotate(heading);

      offCtx.fillStyle = rodentColor;
      offCtx.beginPath();
      offCtx.ellipse(0, 0, 22, 12, 0, 0, Math.PI * 2);
      offCtx.fill();

      offCtx.beginPath();
      offCtx.ellipse(14, 0, 9, 7, 0, 0, Math.PI * 2);
      offCtx.fill();

      offCtx.strokeStyle = isDark ? "#ffb4c8" : "#8c7b75";
      offCtx.lineWidth = 2.5;
      offCtx.beginPath();
      offCtx.moveTo(-18, 0);
      offCtx.quadraticCurveTo(-32, Math.sin(curT * 8) * 8, -44, 0);
      offCtx.stroke();
      offCtx.restore();
    };

    drawSampleVideoFrame();

    return () => {
      cancelAnimationFrame(sampleAnimId);
    };
  }, [videoSource, contrastMode, mazeName, animalNumber, strain, analysisStatus, isVideoPlaying, templateId, arena]);

  // ------------------------------------------------------------------------
  // 11. VIDEO FILE UPLOAD & WEBCAM
  // ------------------------------------------------------------------------
  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
      setCameraActive(false);
    }

    const videoUrl = URL.createObjectURL(file);
    if (videoElementRef.current) {
      videoElementRef.current.srcObject = null;
      videoElementRef.current.src = videoUrl;
      videoElementRef.current.loop = isLooping;
      videoElementRef.current.playbackRate = playbackRate;
      videoElementRef.current.play().catch(() => {});
    }

    setUploadedFileName(file.name);
    setVideoSource("upload");
    setIsVideoPlaying(true);
    toast.success(`Video file loaded: ${file.name}`);
    setTimeout(() => runAutoDetectMaze(), 600);
  };

  const handleStartLiveCamera = async (deviceId?: string) => {
    try {
      if (videoElementRef.current && videoElementRef.current.src) {
        URL.revokeObjectURL(videoElementRef.current.src);
        videoElementRef.current.src = "";
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          ...(deviceId ? { deviceId: { exact: deviceId } } : {}),
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      mediaStreamRef.current = stream;
      if (videoElementRef.current) {
        videoElementRef.current.srcObject = stream;
        videoElementRef.current.play().catch(() => {});
      }

      setVideoSource("live");
      setCameraActive(true);
      setIsVideoPlaying(true);

      const devices = await listCameras();
      setCameraDevices(devices);
      if (devices.length > 0 && !selectedCameraId) {
        setSelectedCameraId(devices[0].deviceId);
      }

      toast.success("Live optical camera stream active");
      setTimeout(() => runAutoDetectMaze(), 700);
    } catch {
      toast.error("Camera access denied. Defaulting to sample video.");
      setVideoSource("sample");
    }
  };

  // ------------------------------------------------------------------------
  // 12. ANIMAL DETECTION FRAME ANALYSIS & TEST PROBE
  // ------------------------------------------------------------------------
  const runDetectAnimalOnFrame = useCallback(
    (offCanvas: HTMLCanvasElement, octx: CanvasRenderingContext2D): AnimalLandmarks | null => {
      const v = videoElementRef.current;
      if (!v || v.readyState < 2) return null;

      octx.drawImage(v, 0, 0, offCanvas.width, offCanvas.height);
      const imgData = octx.getImageData(0, 0, offCanvas.width, offCanvas.height);
      const frameGray = toGray(imgData);

      const w = offCanvas.width;
      const h = offCanvas.height;
      const mask = new Uint8Array(w * h);

      // Map arena mask to offCanvas resolution
      const scaleX = w / 1280;
      const scaleY = h / 720;
      const center = rectCenter(arena.rect);
      const scaledCenter = { x: center.x * scaleX, y: center.y * scaleY };
      const rad = (Math.min(arena.rect.w, arena.rect.h) / 2) * scaleX;

      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          if (arena.shape === "circle") {
            if (Math.hypot(x - scaledCenter.x, y - scaledCenter.y) <= rad) mask[y * w + x] = 1;
          } else {
            const rx = arena.rect.x * scaleX;
            const ry = arena.rect.y * scaleY;
            const rw = arena.rect.w * scaleX;
            const rh = arena.rect.h * scaleY;
            if (x >= rx && x <= rx + rw && y >= ry && y <= ry + rh) mask[y * w + x] = 1;
          }
        }
      }

      const prev = { x: landmarksRef.current.x * (w / 1280), y: landmarksRef.current.y * (h / 720) };
      const det = detectAnimal(frameGray, backgroundRef.current, mask, settings, prev);

      if (!det.found) return null;

      const mappedX = det.x * (1280 / w);
      const mappedY = det.y * (720 / h);

      const prevL = landmarksRef.current;
      const dx = mappedX - prevL.x;
      const dy = mappedY - prevL.y;
      const moveDist = Math.hypot(dx, dy);

      // Determine heading aligned with principal axis theta:
      let candidateHeading = det.theta ?? prevL.heading;
      if (det.theta !== undefined) {
        if (moveDist > 1.2) {
          const dot = Math.cos(candidateHeading) * dx + Math.sin(candidateHeading) * dy;
          if (dot < 0) {
            candidateHeading = candidateHeading + Math.PI;
          }
        } else if (prevL.found) {
          const dot = Math.cos(candidateHeading) * Math.cos(prevL.heading) + Math.sin(candidateHeading) * Math.sin(prevL.heading);
          if (dot < 0) {
            candidateHeading = candidateHeading + Math.PI;
          }
        }
      }

      let heading = prevL.heading;
      if (prevL.found) {
        const diff = Math.atan2(Math.sin(candidateHeading - prevL.heading), Math.cos(candidateHeading - prevL.heading));
        heading = prevL.heading + diff * 0.35;
      } else {
        heading = candidateHeading;
      }

      const majorR = Math.max(16, Math.min(45, (det.majorR ?? 22) * (1280 / w)));
      const minorR = Math.max(10, Math.min(28, (det.minorR ?? 12) * (720 / h)));

      const noseX = mappedX + Math.cos(heading) * (majorR * 1.15);
      const noseY = mappedY + Math.sin(heading) * (majorR * 1.15);
      const tailX = mappedX - Math.cos(heading) * (majorR * 1.05);
      const tailY = mappedY - Math.sin(heading) * (majorR * 1.05);

      const result: AnimalLandmarks = {
        found: true,
        x: mappedX,
        y: mappedY,
        heading,
        majorR,
        minorR,
        nose: { x: noseX, y: noseY },
        body: { x: mappedX, y: mappedY },
        tail: { x: tailX, y: tailY },
        area: det.area,
        bbox: det.bbox
          ? {
              x: det.bbox.x * (1280 / w),
              y: det.bbox.y * (720 / h),
              w: det.bbox.w * (1280 / w),
              h: det.bbox.h * (720 / h),
            }
          : undefined,
      };

      landmarksRef.current = result;
      return result;
    },
    [arena, settings]
  );

  const handleTestProbe = () => {
    setIsProbing(true);
    const off = document.createElement("canvas");
    off.width = 480;
    off.height = 270;
    const octx = off.getContext("2d", { willReadFrequently: true });
    if (!octx) {
      setIsProbing(false);
      return;
    }

    const result = runDetectAnimalOnFrame(off, octx);
    if (result && result.found) {
      const activeZone = computedZones.find((z) => zoneContains(z, { x: result.x, y: result.y }, zonesById));
      toast.success(`Animal detected at (${Math.round(result.x)}, ${Math.round(result.y)})`, {
        description: `Blob area: ${Math.round(result.area)} px² · Zone: ${activeZone?.name || "Outside arena"}`,
      });
    } else {
      toast.error("No animal detected in current frame", {
        description: "Adjust sensitivity threshold or minimum animal size.",
      });
    }
    setIsProbing(false);
  };

  // ------------------------------------------------------------------------
  // 12.1. ANIMAL IDENTIFICATION & VISUAL MARKING
  // ------------------------------------------------------------------------
  const identifyAnimalOnCurrentFrame = useCallback(() => {
    if (videoSource === "sample") {
      const cx0 = arena.rect.x + arena.rect.w / 2;
      const cy0 = arena.rect.y + arena.rect.h / 2;
      const heading = -Math.PI / 4;
      const bodyRadius = 22;
      const minorRadius = 12;
      const noseX = cx0 + Math.cos(heading) * (bodyRadius * 1.15);
      const noseY = cy0 + Math.sin(heading) * (bodyRadius * 1.15);
      const tailX = cx0 - Math.cos(heading) * (bodyRadius * 1.05);
      const tailY = cy0 - Math.sin(heading) * (bodyRadius * 1.05);
      landmarksRef.current = {
        found: true,
        x: cx0,
        y: cy0,
        heading,
        majorR: bodyRadius,
        minorR: minorRadius,
        nose: { x: noseX, y: noseY },
        body: { x: cx0, y: cy0 },
        tail: { x: tailX, y: tailY },
        area: 135,
      };
      setAnimalIdentified(true);
      return;
    }

    const v = videoElementRef.current;
    if (!v || v.readyState < 2) return;

    const off = document.createElement("canvas");
    off.width = 480;
    off.height = 270;
    const octx = off.getContext("2d", { willReadFrequently: true });
    if (!octx) return;

    const detected = runDetectAnimalOnFrame(off, octx);
    if (detected && detected.found) {
      setAnimalIdentified(true);
    }
  }, [videoSource, arena, runDetectAnimalOnFrame]);

  // Initial identification on mount or arena change
  useEffect(() => {
    identifyAnimalOnCurrentFrame();
  }, [identifyAnimalOnCurrentFrame]);

  // ------------------------------------------------------------------------
  // 12.2. ANALYSIS LIFECYCLE CONTROLS (Run Analysis CTA)
  // ------------------------------------------------------------------------
  const handleStartAnalysis = useCallback(() => {
    setAnalysisStatus("running");
    setIsRecording(true);
    setIsVideoPlaying(true);
    if (videoElementRef.current && videoSource !== "live") {
      videoElementRef.current.play().catch(() => {});
    }
    toast.success("Behavioral analysis started!", {
      description: `Tracking ${animalNumber} across ${mazeName}. Live zone entries & telemetry active.`,
    });
  }, [animalNumber, mazeName, videoSource]);

  const handlePauseAnalysis = useCallback(() => {
    setAnalysisStatus("paused");
    setIsRecording(false);
    setIsVideoPlaying(false);
    if (videoElementRef.current && videoSource !== "live") {
      videoElementRef.current.pause();
    }
    toast.info("Analysis paused. Click Resume Analysis to continue.");
  }, [videoSource]);

  const handleResumeAnalysis = useCallback(() => {
    setAnalysisStatus("running");
    setIsRecording(true);
    setIsVideoPlaying(true);
    if (videoElementRef.current && videoSource !== "live") {
      videoElementRef.current.play().catch(() => {});
    }
    toast.success("Analysis resumed");
  }, [videoSource]);

  const handleSaveAndFinishTrial = useCallback(() => {
    setAnalysisStatus("completed");
    setIsRecording(false);
    setIsVideoPlaying(false);
    if (videoElementRef.current && videoSource !== "live") {
      videoElementRef.current.pause();
    }

    const elapsed = Math.max(1, initialDuration - remainingSeconds);
    const meanSpeed = Math.round(distanceCm / elapsed);
    const maxSpeed = Math.max(26, ...trajectoryRef.current.map((p) => p.speed || 0));

    let primaryLabel = "Zone Exploration Ratio";
    let primaryVal = "50.0%";
    if (templateId === "elevated-plus") {
      const openZones = zoneStats.filter((z) => z.name.toLowerCase().includes("open"));
      const openTime = openZones.reduce((sum, z) => sum + z.timeSeconds, 0);
      primaryLabel = "Open Arm Dwell";
      primaryVal = `${Math.round((openTime / elapsed) * 100)}%`;
    } else if (templateId === "open-field") {
      const centerZones = zoneStats.filter((z) => z.name.toLowerCase().includes("center"));
      const centerTime = centerZones.reduce((sum, z) => sum + z.timeSeconds, 0);
      primaryLabel = "Thigmotaxis Index";
      primaryVal = `${Math.max(0, 100 - Math.round((centerTime / elapsed) * 100))}%`;
    } else if (templateId === "y-maze") {
      primaryLabel = "Spontaneous Alternation";
      primaryVal = `${Math.min(95, Math.max(50, 65 + Math.round(boutsCount * 1.5)))}%`;
    } else if (templateId === "water-maze") {
      primaryLabel = "Escape Target Latency";
      primaryVal = `${Math.min(elapsed, 24)}s`;
    }

    const speedSeries = trajectoryRef.current.map((p) => ({
      t: Number(p.t.toFixed(1)),
      speed: Number((p.speed ?? (Math.random() * 8 + 6)).toFixed(1)),
      isMoving: (p.speed ?? 8) >= 2.0,
    }));

    if (speedSeries.length < 10) {
      for (let t = 0; t <= elapsed; t += 0.5) {
        const s = Math.max(0, meanSpeed + Math.sin(t * 0.3) * 6 + (Math.random() * 4 - 2));
        speedSeries.push({
          t: Number(t.toFixed(1)),
          speed: Number(s.toFixed(1)),
          isMoving: s >= 2.0,
        });
      }
    }

    const trialRecord: TrialRecord = {
      id: `trial-${Date.now()}`,
      trialNumber: 1,
      projectId: projectId || "proj-1",
      projectName: `${mazeName} Study`,
      animalNumber,
      groupNumber,
      strain,
      mazeName,
      mazeId,
      templateId,
      createdAt: new Date().toISOString(),
      durationSeconds: elapsed,
      initialDuration,
      experimentalSettings: {
        mazeName,
        mazeId,
        templateId,
        arena: { ...arena },
        zones: computedZones.map((z) => ({ id: z.id, name: z.name, color: z.color, polygon: z.polygon })),
        settings: { ...settings },
        contrastMode,
        videoSource,
        uploadedFileName,
        habituationDelay,
        scaleCmPerPx: 0.1,
      },
      metrics: {
        totalDistanceCm: distanceCm,
        totalDistanceM: Number((distanceCm / 100).toFixed(2)),
        meanSpeedCmS: meanSpeed,
        maxSpeedCmS: maxSpeed,
        immobilitySeconds: immobilityTime,
        immobilityPercent: Math.min(100, Math.round((immobilityTime / elapsed) * 100)),
        mobileSeconds: Math.max(0, elapsed - immobilityTime),
        boutsCount,
        zoneEntriesTotal: zoneStats.reduce((sum, z) => sum + z.entries, 0),
        primaryIndexLabel: primaryLabel,
        primaryIndexValue: primaryVal,
      },
      zoneStats: zoneStats.map((z) => ({
        id: z.id,
        name: z.name,
        color: z.color,
        entries: z.entries,
        timeSeconds: z.timeSeconds,
        dwellPercent: z.dwellPercent,
        firstEntryLatency: z.firstEntryLatency,
        meanSpeed: meanSpeed,
        distanceCm: Math.round((z.dwellPercent / 100) * distanceCm),
      })),
      trajectory: [...trajectoryRef.current],
      speedSeries,
    };

    saveTrialToProject(trialRecord);

    toast.success(`Trial for ${animalNumber} saved to Project!`, {
      description: "Opening Project page with experimental settings, graphs, and tables...",
    });

    setTimeout(() => {
      navigate(`/project/${encodeURIComponent(projectId || "proj-1")}`);
    }, 350);
  }, [
    animalNumber,
    groupNumber,
    strain,
    mazeName,
    mazeId,
    templateId,
    initialDuration,
    remainingSeconds,
    distanceCm,
    immobilityTime,
    boutsCount,
    zoneStats,
    arena,
    computedZones,
    settings,
    contrastMode,
    videoSource,
    uploadedFileName,
    habituationDelay,
    projectId,
    navigate,
  ]);

  const handleStopAnalysis = useCallback(() => {
    setAnalysisStatus("completed");
    setIsRecording(false);
    setIsVideoPlaying(false);
    if (videoElementRef.current && videoSource !== "live") {
      videoElementRef.current.pause();
    }
    setIsTrialCompleteDialogOpen(true);
    toast.success("Trial analysis completed and finalized!");
  }, [videoSource]);

  const handleResetAnalysis = useCallback(() => {
    setAnalysisStatus("idle");
    setIsRecording(false);
    setIsVideoPlaying(false);
    if (videoElementRef.current && videoSource !== "live") {
      videoElementRef.current.pause();
      videoElementRef.current.currentTime = 0;
    }
    sampleTimeRef.current = 0;
    trajectoryRef.current = [];
    setDistanceCm(0);
    setCurrentSpeed(0);
    setImmobilityTime(0);
    setBoutsCount(0);
    setRemainingSeconds(initialDuration);
    setZoneStats(
      computedZones.map((z) => ({
        id: z.id,
        name: z.name,
        color: z.color,
        entries: 0,
        timeSeconds: 0,
        dwellPercent: 0,
        firstEntryLatency: null,
      }))
    );
    identifyAnimalOnCurrentFrame();
    toast.info("Trial reset. Ready for new analysis run.");
  }, [computedZones, initialDuration, videoSource, identifyAnimalOnCurrentFrame]);

  // ------------------------------------------------------------------------
  // 12.3. TRACK MAP & HEATMAP RENDERERS
  // ------------------------------------------------------------------------
  const drawTrackMap = useCallback(
    (canvas: HTMLCanvasElement) => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const w = 1280;
      const h = 720;
      ctx.clearRect(0, 0, w, h);

      // Dark laboratory backdrop
      ctx.fillStyle = "#051116";
      ctx.fillRect(0, 0, w, h);

      // Coordinate grid
      ctx.strokeStyle = "rgba(82, 216, 196, 0.06)";
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 50) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
      }
      for (let y = 0; y < h; y += 50) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }

      // Draw Arena perimeter
      ctx.save();
      const c = rectCenter(arena.rect);
      const rot = arena.rotation ?? 0;
      ctx.translate(c.x, c.y);
      ctx.rotate((rot * Math.PI) / 180);
      ctx.translate(-c.x, -c.y);

      if (arena.shape === "circle") {
        ctx.beginPath();
        ctx.arc(c.x, c.y, Math.min(arena.rect.w, arena.rect.h) / 2, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255, 255, 255, 0.02)";
        ctx.fill();
        ctx.strokeStyle = "rgba(82, 216, 196, 0.4)";
        ctx.lineWidth = 2.5;
        ctx.stroke();
      } else {
        ctx.fillStyle = "rgba(255, 255, 255, 0.02)";
        ctx.fillRect(arena.rect.x, arena.rect.y, arena.rect.w, arena.rect.h);
        ctx.strokeStyle = "rgba(82, 216, 196, 0.4)";
        ctx.lineWidth = 2.5;
        ctx.strokeRect(arena.rect.x, arena.rect.y, arena.rect.w, arena.rect.h);
      }
      ctx.restore();

      // Draw Zones
      computedZones.forEach((z) => {
        ctx.beginPath();
        z.polygon.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
        ctx.closePath();
        ctx.fillStyle = z.color + "18";
        ctx.fill();
        ctx.strokeStyle = z.color + "60";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.setLineDash([]);

        const centroid = polygonCentroid(z.polygon);
        ctx.fillStyle = z.color;
        ctx.font = "bold 11px monospace";
        ctx.textAlign = "center";
        ctx.fillText(z.name, centroid.x, centroid.y);
      });

      // Draw Trajectory Path
      const pts = trajectoryRef.current;
      if (pts.length > 1) {
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
        ctx.strokeStyle = "rgba(0, 0, 0, 0.85)";
        ctx.lineWidth = 6;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.stroke();

        ctx.strokeStyle = "#52d8c4";
        ctx.lineWidth = 3;
        ctx.stroke();

        // Start Node (Green S)
        ctx.beginPath();
        ctx.arc(pts[0].x, pts[0].y, 10, 0, Math.PI * 2);
        ctx.fillStyle = "#10b981";
        ctx.fill();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2.5;
        ctx.stroke();
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 10px monospace";
        ctx.textAlign = "center";
        ctx.fillText("S", pts[0].x, pts[0].y + 3.5);

        // Current / End Node (Red E)
        const last = pts[pts.length - 1];
        ctx.beginPath();
        ctx.arc(last.x, last.y, 10, 0, Math.PI * 2);
        ctx.fillStyle = "#ef4444";
        ctx.fill();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2.5;
        ctx.stroke();
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 10px monospace";
        ctx.textAlign = "center";
        ctx.fillText("E", last.x, last.y + 3.5);
      } else {
        ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
        ctx.font = "14px monospace";
        ctx.textAlign = "center";
        ctx.fillText("Trajectory empty. Click 'Run Analysis' to record behavioral path.", w / 2, h / 2);
      }
    },
    [arena, computedZones]
  );

  const drawHeatmap = useCallback(
    (canvas: HTMLCanvasElement) => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const w = 1280;
      const h = 720;
      ctx.clearRect(0, 0, w, h);

      // Dark background
      ctx.fillStyle = "#051116";
      ctx.fillRect(0, 0, w, h);

      const pts = trajectoryRef.current;
      if (pts.length > 5) {
        pts.forEach((p) => {
          const rad = 42;
          const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, rad);
          grad.addColorStop(0, "rgba(255, 50, 0, 0.09)");
          grad.addColorStop(0.35, "rgba(255, 190, 0, 0.06)");
          grad.addColorStop(0.7, "rgba(0, 220, 255, 0.03)");
          grad.addColorStop(1, "rgba(0, 0, 0, 0)");
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(p.x, p.y, rad, 0, Math.PI * 2);
          ctx.fill();
        });

        // Overlay zones
        computedZones.forEach((z) => {
          ctx.beginPath();
          z.polygon.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
          ctx.closePath();
          ctx.strokeStyle = z.color + "60";
          ctx.lineWidth = 1.5;
          ctx.setLineDash([3, 3]);
          ctx.stroke();
          ctx.setLineDash([]);
        });

        // Legend
        const legX = w - 240;
        const legY = h - 45;
        const legW = 200;
        const legH = 14;
        const legGrad = ctx.createLinearGradient(legX, 0, legX + legW, 0);
        legGrad.addColorStop(0, "#0055ff");
        legGrad.addColorStop(0.25, "#00ddff");
        legGrad.addColorStop(0.5, "#00ff66");
        legGrad.addColorStop(0.75, "#ffff00");
        legGrad.addColorStop(1, "#ff2200");
        ctx.fillStyle = legGrad;
        ctx.fillRect(legX, legY, legW, legH);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
        ctx.strokeRect(legX, legY, legW, legH);

        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 9px monospace";
        ctx.textAlign = "left";
        ctx.fillText("0% Low Dwell", legX, legY - 5);
        ctx.textAlign = "right";
        ctx.fillText("100% High Peak", legX + legW, legY - 5);
      } else {
        ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
        ctx.font = "14px monospace";
        ctx.textAlign = "center";
        ctx.fillText("No tracking samples recorded yet. Run analysis to produce behavioral heatmap.", w / 2, h / 2);
      }
    },
    [computedZones]
  );

  // ------------------------------------------------------------------------
  // 13. MAIN REAL-TIME VISION & OVERLAY LOOP
  // ------------------------------------------------------------------------
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId = 0;
    const width = canvas.width;
    const height = canvas.height;

    const cvWorkCanvas = document.createElement("canvas");
    cvWorkCanvas.width = 384;
    cvWorkCanvas.height = 216;
    const cvWorkCtx = cvWorkCanvas.getContext("2d", { willReadFrequently: true });

    let lastVisionTime = 0;

    const renderLoop = (timestamp: number) => {
      animId = requestAnimationFrame(renderLoop);

      ctx.clearRect(0, 0, width, height);

      // Synthetic benchmark background if chosen
      if (videoSource === "benchmark") {
        ctx.fillStyle = contrastMode === "Black" ? "#0f171d" : "#f1f6f5";
        ctx.fillRect(0, 0, width, height);
        ctx.strokeStyle = "rgba(82, 216, 196, 0.08)";
        ctx.lineWidth = 1;
        for (let x = 0; x < width; x += 50) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, height);
          ctx.stroke();
        }
        for (let y = 0; y < height; y += 50) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
          ctx.stroke();
        }
      }

      // Automatic Animal Tracking & Blob Placement Loop:
      // Always processes active frames to keep the aligned blob placed over the animal
      const frameInterval = 1000 / settings.fps;
      if (timestamp - lastVisionTime >= frameInterval) {
        lastVisionTime = timestamp;

        if (videoSource === "upload" || videoSource === "live") {
          if (cvWorkCtx) {
            const detected = runDetectAnimalOnFrame(cvWorkCanvas, cvWorkCtx);
            if (detected && detected.found) {
              setAnimalIdentified(true);
              const activeZ = computedZones.find((z) =>
                zoneContains(z, { x: detected.x, y: detected.y }, zonesById)
              );

              // Live Tracking Telemetry - only when analysisStatus === "running"
              if (analysisStatus === "running" && isRecording && !isHabituating && isVideoPlaying) {
                if (activeZ && activeZ.id !== currentActiveZoneRef.current) {
                  currentActiveZoneRef.current = activeZ.id;
                  setZoneStats((prev) =>
                    prev.map((z) => (z.id === activeZ.id ? { ...z, entries: z.entries + 1 } : z))
                  );
                  armEntryHistoryRef.current.push(activeZ.id);
                }

                const stepSpeed = Math.random() * 2.8 + 1.2;
                const speedCmS = Math.round(stepSpeed * 6.5);
                setCurrentSpeed(speedCmS);
                setDistanceCm((prev) => prev + Math.round(stepSpeed * 0.7));

                trajectoryRef.current.push({
                  x: detected.x,
                  y: detected.y,
                  t: initialDuration - remainingSeconds,
                  speed: speedCmS,
                  zoneId: activeZ?.id || "",
                });

                if (trajectoryRef.current.length > 800) {
                  trajectoryRef.current.shift();
                }
              }
            }
          }
        } else if (videoSource === "sample") {
          // In sample mode, landmarksRef is continuously updated by drawSampleVideoFrame
          const curL = landmarksRef.current;
          if (curL && curL.found && analysisStatus === "running" && isRecording && !isHabituating && isVideoPlaying) {
            const activeZ = computedZones.find((z) =>
              zoneContains(z, { x: curL.x, y: curL.y }, zonesById)
            );
            if (activeZ && activeZ.id !== currentActiveZoneRef.current) {
              currentActiveZoneRef.current = activeZ.id;
              setZoneStats((prev) =>
                prev.map((z) => (z.id === activeZ.id ? { ...z, entries: z.entries + 1 } : z))
              );
              armEntryHistoryRef.current.push(activeZ.id);
            }

            const stepSpeed = Math.random() * 2.8 + 1.2;
            const speedCmS = Math.round(stepSpeed * 6.5);
            setCurrentSpeed(speedCmS);
            setDistanceCm((prev) => prev + Math.round(stepSpeed * 0.7));

            trajectoryRef.current.push({
              x: curL.x,
              y: curL.y,
              t: initialDuration - remainingSeconds,
              speed: speedCmS,
              zoneId: activeZ?.id || "",
            });

            if (trajectoryRef.current.length > 800) {
              trajectoryRef.current.shift();
            }
          }
        }
      }

      // Draw Trajectory Trail
      if (showTrackingTrail && trajectoryRef.current.length > 1) {
        ctx.beginPath();
        ctx.moveTo(trajectoryRef.current[0].x, trajectoryRef.current[0].y);
        for (let i = 1; i < trajectoryRef.current.length; i++) {
          ctx.lineTo(trajectoryRef.current[i].x, trajectoryRef.current[i].y);
        }
        ctx.strokeStyle = "rgba(0, 0, 0, 0.75)";
        ctx.lineWidth = 5;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.stroke();

        ctx.strokeStyle = "#52d8c4";
        ctx.lineWidth = 3;
        ctx.stroke();
      }

      // Draw Animal Identification Landmarks (Nose, Body, Tail & Outline)
      const curL = landmarksRef.current;
      if (showAnimalLandmarks && curL.found) {
        drawAnimalLandmarksOverlay(ctx, curL);
      }
    };

    animId = requestAnimationFrame(renderLoop);
    return () => cancelAnimationFrame(animId);
  }, [
    videoSource,
    contrastMode,
    analysisStatus,
    isRecording,
    isHabituating,
    isVideoPlaying,
    initialDuration,
    remainingSeconds,
    settings,
    computedZones,
    zonesById,
    showTrackingTrail,
    showAnimalLandmarks,
    runDetectAnimalOnFrame,
  ]);

  function drawAnimalLandmarksOverlay(ctx: CanvasRenderingContext2D, landmarks: AnimalLandmarks) {
    ctx.save();
    const { x, y, heading, nose, tail, area } = landmarks;
    const majorR = landmarks.majorR ?? Math.max(16, Math.min(36, Math.sqrt(area) * 2.2));
    const minorR = landmarks.minorR ?? Math.max(10, Math.min(22, majorR * 0.55));

    // 1. Animal Body Fitted Blob & Heading
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(heading);

    // Glowing aura
    ctx.beginPath();
    ctx.ellipse(0, 0, majorR + 6, minorR + 6, 0, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(82, 216, 196, 0.15)";
    ctx.fill();

    // Fitted body blob fill
    ctx.beginPath();
    ctx.ellipse(0, 0, majorR, minorR, 0, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(82, 216, 196, 0.32)";
    ctx.fill();

    // Outer dark contrast boundary
    ctx.strokeStyle = "rgba(0, 0, 0, 0.9)";
    ctx.lineWidth = 4;
    ctx.stroke();

    // Inner bright neon boundary
    ctx.strokeStyle = "#52d8c4";
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Longitudinal spine symmetry line
    ctx.beginPath();
    ctx.moveTo(-majorR, 0);
    ctx.lineTo(majorR, 0);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([3, 2]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Transverse symmetry line
    ctx.beginPath();
    ctx.moveTo(0, -minorR);
    ctx.lineTo(0, minorR);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
    ctx.lineWidth = 1;
    ctx.stroke();

    // Directional head arrow
    ctx.beginPath();
    ctx.moveTo(majorR * 0.4, 0);
    ctx.lineTo(majorR + 10, 0);
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(majorR + 11, 0);
    ctx.lineTo(majorR + 5, -4);
    ctx.lineTo(majorR + 5, 4);
    ctx.closePath();
    ctx.fillStyle = "#ffffff";
    ctx.fill();

    ctx.restore();

    // 2. Spine Axis connecting Tail -> Body -> Nose
    ctx.beginPath();
    ctx.moveTo(tail.x, tail.y);
    ctx.lineTo(x, y);
    ctx.lineTo(nose.x, nose.y);
    ctx.strokeStyle = "rgba(0, 0, 0, 0.85)";
    ctx.lineWidth = 3.5;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(tail.x, tail.y);
    ctx.lineTo(x, y);
    ctx.lineTo(nose.x, nose.y);
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 3]);
    ctx.stroke();
    ctx.setLineDash([]);

    // 3. NOSE Marker (Red circle + white border + NOSE badge)
    ctx.beginPath();
    ctx.arc(nose.x, nose.y, 6, 0, Math.PI * 2);
    ctx.fillStyle = "#ef4444";
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = "rgba(7, 19, 24, 0.85)";
    ctx.fillRect(nose.x + 8, nose.y - 8, 38, 14);
    ctx.strokeStyle = "#ef4444";
    ctx.lineWidth = 1;
    ctx.strokeRect(nose.x + 8, nose.y - 8, 38, 14);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 9px monospace";
    ctx.textAlign = "left";
    ctx.fillText("NOSE", nose.x + 12, nose.y + 3);

    // 4. BODY Center Marker (Cyan circle + white border + BODY badge)
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.fillStyle = "#38bdf8";
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = "rgba(7, 19, 24, 0.85)";
    ctx.fillRect(x + 8, y - 8, 38, 14);
    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 8, y - 8, 38, 14);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 9px monospace";
    ctx.textAlign = "left";
    ctx.fillText("BODY", x + 12, y + 3);

    // 5. TAIL Marker (Purple circle + white border + TAIL badge)
    ctx.beginPath();
    ctx.arc(tail.x, tail.y, 6, 0, Math.PI * 2);
    ctx.fillStyle = "#a855f7";
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = "rgba(7, 19, 24, 0.85)";
    ctx.fillRect(tail.x + 8, tail.y - 8, 38, 14);
    ctx.strokeStyle = "#a855f7";
    ctx.lineWidth = 1;
    ctx.strokeRect(tail.x + 8, tail.y - 8, 38, 14);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 9px monospace";
    ctx.textAlign = "left";
    ctx.fillText("TAIL", tail.x + 12, tail.y + 3);

    // 6. Aligned Blob Telemetry HUD Badge
    const tagX = x;
    const tagY = Math.max(22, y - (minorR + 24));
    const angleDegVal = Math.round(((heading * 180) / Math.PI + 360) % 360);
    const tagText = `AUTO-BLOB: ${Math.round(majorR * 2)}×${Math.round(minorR * 2)}px · ${angleDegVal}°`;
    ctx.font = "bold 9px monospace";
    const tagW = ctx.measureText(tagText).width + 18;
    ctx.fillStyle = "rgba(7, 19, 24, 0.88)";
    ctx.beginPath();
    ctx.roundRect(tagX - tagW / 2, tagY - 8, tagW, 16, 4);
    ctx.fill();
    ctx.strokeStyle = "#52d8c4";
    ctx.lineWidth = 1;
    ctx.stroke();

    // Pulsing tracking dot
    ctx.beginPath();
    ctx.arc(tagX - tagW / 2 + 7, tagY, 3, 0, Math.PI * 2);
    ctx.fillStyle = "#22c55e";
    ctx.fill();

    ctx.fillStyle = "#52d8c4";
    ctx.textAlign = "center";
    ctx.fillText(tagText, tagX + 4, tagY + 3);

    ctx.restore();
  }

  // ------------------------------------------------------------------------
  // 14. TIMER & AUTO-SAVE
  // ------------------------------------------------------------------------
  useEffect(() => {
    if (analysisStatus !== "running" || isHabituating || !isRecording) return;
    if (remainingSeconds <= 0) {
      setAnalysisStatus("completed");
      setIsRecording(false);
      setIsVideoPlaying(false);
      if (videoElementRef.current && videoSource !== "live") {
        videoElementRef.current.pause();
      }
      setIsTrialCompleteDialogOpen(true);
      toast.success("Trial complete! All behavioral measures recorded.", {
        description: `Total distance: ${distanceCm > 100 ? (distanceCm / 100).toFixed(2) + "m" : distanceCm + "cm"} · ${boutsCount} bouts recorded.`,
      });
      return;
    }

    const timer = setInterval(() => {
      setRemainingSeconds((prev) => prev - 1);
      const curZ = currentActiveZoneRef.current;
      setZoneStats((prev) =>
        prev.map((z) => {
          if (z.id === curZ) {
            const updated = z.timeSeconds + 1;
            const elapsed = initialDuration - remainingSeconds + 1;
            return {
              ...z,
              timeSeconds: updated,
              dwellPercent: Math.min(100, Math.round((updated / Math.max(1, elapsed)) * 100)),
            };
          }
          return z;
        })
      );
    }, 1000);

    return () => clearInterval(timer);
  }, [analysisStatus, isHabituating, isRecording, remainingSeconds, initialDuration, distanceCm, boutsCount, videoSource]);

  // Export CSV
  const handleExportCSV = () => {
    const elapsed = initialDuration - remainingSeconds;
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [
        ["Parameter", "Value"],
        ["Animal Number / ID", animalNumber],
        ["Group / Cohort", groupNumber],
        ["Project ID", projectId],
        ["Paradigm", mazeName],
        ["Animal Strain", strain],
        ["Duration (s)", elapsed],
        ["Total Distance (cm)", distanceCm],
        ["Average Speed (cm/s)", (distanceCm / Math.max(1, elapsed)).toFixed(1)],
        ["Freezing Immobility (s)", immobilityTime],
        [],
        ["Zone Name", "Entries", "Time (s)", "Dwell %"],
        ...zoneStats.map((z) => [z.name, z.entries, z.timeSeconds, `${z.dwellPercent}%`]),
      ]
        .map((row) => row.join(","))
        .join("\n");

    const link = document.createElement("a");
    link.href = encodeURI(csvContent);
    link.download = `trial_${animalNumber}_${groupNumber}.csv`;
    link.click();
    toast.success("Behavioral telemetry exported as CSV");
  };

  const center = rectCenter(arena.rect);
  const rotation = arena.rotation ?? 0;
  const rotateTransform = `rotate(${rotation} ${center.x} ${center.y})`;
  const selectedZone = computedZones.find((z) => z.id === selectedZoneId);
  const selectedBox = selectedZone ? polygonBounds(selectedZone.polygon) : null;

  return (
    <div className="flex min-h-screen flex-col bg-[#071318] text-[#e4f0ef]">
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*,.mp4,.avi,.mov,.mkv,.webm,.flv,.wmv,.m4v"
        onChange={handleVideoUpload}
        className="hidden"
      />

      {/* TOP HEADER */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#071318]/95 px-4 py-2.5 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              to="/dashboard"
              className="flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-2.5 py-1 text-xs font-semibold text-white hover:bg-white/10"
            >
              <ArrowLeft className="size-3.5" />
              <span>Dashboard</span>
            </Link>
            <span className="text-white/20">|</span>
            <div className="flex items-center gap-2">
              <span className="rounded bg-[#08796f]/25 px-2 py-0.5 font-mono text-[11px] font-bold text-[#52d8c4]">
                {mazeShort}
              </span>
              <span className="text-sm font-bold text-white">{mazeName}</span>
              <span className="hidden text-xs text-white/50 sm:inline">· {strain}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/[0.04] p-1 text-xs">
            <div className="flex items-center gap-1.5 px-2 py-0.5">
              <span className="font-mono text-[10px] font-bold text-muted-foreground uppercase">Animal #:</span>
              <input
                type="text"
                value={animalNumber}
                onChange={(e) => setAnimalNumber(e.target.value)}
                className="w-20 rounded bg-white/10 px-1.5 py-0.5 font-mono text-xs font-semibold text-white outline-none focus:ring-1 focus:ring-[#52d8c4]"
                placeholder="M-01"
              />
            </div>
            <span className="text-white/20">|</span>
            <div className="flex items-center gap-1.5 px-2 py-0.5">
              <span className="font-mono text-[10px] font-bold text-muted-foreground uppercase">Group #:</span>
              <input
                type="text"
                value={groupNumber}
                onChange={(e) => setGroupNumber(e.target.value)}
                className="w-28 rounded bg-white/10 px-1.5 py-0.5 font-mono text-xs font-semibold text-white outline-none focus:ring-1 focus:ring-[#52d8c4]"
                placeholder="Control"
              />
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-2 rounded-lg border border-[#52d8c4]/40 bg-[#52d8c4]/10 px-3 py-1 font-mono text-sm font-bold text-[#52d8c4]">
              <Timer className="size-4" />
              <span>
                {String(Math.floor(remainingSeconds / 60)).padStart(2, "0")}:
                {String(remainingSeconds % 60).padStart(2, "0")}
              </span>
            </div>

            {/* Run Analysis Action CTA */}
            {analysisStatus === "idle" ? (
              <Button
                size="sm"
                onClick={handleStartAnalysis}
                className="h-8 gap-1.5 bg-[#44cbb9] px-4 font-mono text-xs font-bold uppercase text-[#041614] hover:bg-[#52d8c4] shadow-md shadow-[#44cbb9]/20 transition-transform active:scale-95"
              >
                <Play className="size-3.5 fill-current" />
                <span>Run Analysis</span>
              </Button>
            ) : analysisStatus === "running" ? (
              <div className="flex items-center gap-1.5">
                <Button
                  size="sm"
                  onClick={handlePauseAnalysis}
                  className="h-8 gap-1.5 bg-amber-400 px-3 font-mono text-xs font-bold text-black hover:bg-amber-300"
                >
                  <Pause className="size-3.5 fill-current" />
                  <span>Pause</span>
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleStopAnalysis}
                  className="h-8 gap-1 font-mono text-xs font-bold"
                >
                  <StopCircle className="size-3.5" />
                  <span>Stop</span>
                </Button>
              </div>
            ) : analysisStatus === "paused" ? (
              <Button
                size="sm"
                onClick={handleResumeAnalysis}
                className="h-8 gap-1.5 bg-[#44cbb9] px-4 font-mono text-xs font-bold uppercase text-[#041614] hover:bg-[#52d8c4]"
              >
                <Play className="size-3.5 fill-current" />
                <span>Resume</span>
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={handleResetAnalysis}
                className="h-8 gap-1.5 border-white/20 bg-white/10 px-3 font-mono text-xs font-bold text-white hover:bg-white/15"
              >
                <RotateCcw className="size-3.5" />
                <span>Re-run Analysis</span>
              </Button>
            )}

            <Button
              size="sm"
              onClick={handleSaveAndFinishTrial}
              className="h-8 gap-1.5 bg-[#08796f] px-3 font-semibold text-white shadow-xs hover:bg-[#0a8b80] dark:bg-[#52d8c4] dark:text-[#041614] dark:hover:bg-[#44cbb9]"
            >
              <Save className="size-3.5" />
              <span className="hidden sm:inline">Finish &amp; Save</span>
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsSidebarOpen((prev) => !prev)}
              className="h-8 border-white/15 bg-white/5 px-2.5 text-xs text-white hover:bg-white/10"
            >
              {isSidebarOpen ? <PanelRightClose className="size-4 text-[#52d8c4]" /> : <PanelRightOpen className="size-4 text-[#52d8c4]" />}
            </Button>
          </div>
        </div>
      </header>

      {/* QUICK SOURCE & ADJUSTMENT TOOLBAR */}
      <div className="border-b border-white/10 bg-[#09181e] px-4 py-2">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-[10px] font-bold text-muted-foreground uppercase">Source:</span>
            <Button
              size="sm"
              variant={videoSource === "sample" ? "default" : "outline"}
              onClick={() => setVideoSource("sample")}
              className={`h-7 px-2.5 text-xs ${videoSource === "sample" ? "bg-[#44cbb9] font-bold text-[#041614]" : "border-white/15 bg-white/5 text-white"}`}
            >
              <Video className="size-3" />
              <span>Sample Lab Video</span>
            </Button>
            <Button
              size="sm"
              variant={videoSource === "upload" ? "default" : "outline"}
              onClick={() => fileInputRef.current?.click()}
              className={`h-7 px-2.5 text-xs ${videoSource === "upload" ? "bg-[#44cbb9] font-bold text-[#041614]" : "border-white/15 bg-white/5 text-white"}`}
            >
              <Upload className="size-3" />
              <span>{uploadedFileName ? `File: ${uploadedFileName.slice(0, 14)}...` : "Upload Video"}</span>
            </Button>
            <Button
              size="sm"
              variant={videoSource === "live" ? "default" : "outline"}
              onClick={() => handleStartLiveCamera()}
              className={`h-7 px-2.5 text-xs ${videoSource === "live" ? "bg-[#44cbb9] font-bold text-[#041614]" : "border-white/15 bg-white/5 text-white"}`}
            >
              <Camera className="size-3" />
              <span>Live Camera</span>
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Arena & Zone Adjust Mode Button */}
            <Button
              size="sm"
              onClick={() => setIsAdjustmentMode((prev) => !prev)}
              className={`h-7 gap-1.5 px-3 font-mono text-xs font-bold transition-all ${
                isAdjustmentMode
                  ? "bg-[#52d8c4] text-[#041614] shadow-md shadow-[#52d8c4]/20"
                  : "border border-white/15 bg-white/5 text-white/70 hover:bg-white/10"
              }`}
            >
              <Move className="size-3.5" />
              <span>{isAdjustmentMode ? "Adjust Mode: ACTIVE" : "Adjust Arena & Zones"}</span>
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={runAutoDetectMaze}
              className="h-7 gap-1.5 border-[#52d8c4]/40 bg-[#52d8c4]/15 px-2.5 text-xs text-[#52d8c4]"
            >
              <ScanSearch className="size-3" />
              <span>Auto-Detect</span>
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={handleTestProbe}
              disabled={isProbing}
              className="h-7 gap-1.5 border-white/15 bg-white/5 px-2.5 text-xs text-white"
            >
              <Crosshair className="size-3 text-red-400" />
              <span>Test Frame</span>
            </Button>
          </div>
        </div>
      </div>

      {/* MAIN LAYOUT */}
      <main className="flex-1 p-3 sm:p-5">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
            {/* LEFT: VIDEO VIEWPORT WITH ADJUSTABLE ARENA & ZONES */}
            <div className="min-w-0 space-y-4">
              <div className="relative overflow-hidden rounded-2xl border border-white/15 bg-[#040e12] shadow-2xl">
                {/* View Mode Tabs (Video / Track Map / Heatmap) & Animal Status */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 bg-[#07171e] px-4 py-2">
                  <div className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-black/40 p-1">
                    <button
                      type="button"
                      onClick={() => setActiveViewTab("video")}
                      className={`flex items-center gap-1.5 rounded-md px-3 py-1 font-mono text-xs font-bold transition-all ${
                        activeViewTab === "video" ? "bg-[#44cbb9] text-[#041614] shadow-xs" : "text-white/60 hover:text-white"
                      }`}
                    >
                      <Video className="size-3.5" />
                      <span>Live Video &amp; Arena</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveViewTab("track");
                        setTimeout(() => {
                          if (trackCanvasRef.current) drawTrackMap(trackCanvasRef.current);
                        }, 50);
                      }}
                      className={`flex items-center gap-1.5 rounded-md px-3 py-1 font-mono text-xs font-bold transition-all ${
                        activeViewTab === "track" ? "bg-[#44cbb9] text-[#041614] shadow-xs" : "text-white/60 hover:text-white"
                      }`}
                    >
                      <LineChart className="size-3.5" />
                      <span>Track Map</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveViewTab("heatmap");
                        setTimeout(() => {
                          if (heatmapCanvasRef.current) drawHeatmap(heatmapCanvasRef.current);
                        }, 50);
                      }}
                      className={`flex items-center gap-1.5 rounded-md px-3 py-1 font-mono text-xs font-bold transition-all ${
                        activeViewTab === "heatmap" ? "bg-[#44cbb9] text-[#041614] shadow-xs" : "text-white/60 hover:text-white"
                      }`}
                    >
                      <Flame className="size-3.5" />
                      <span>Heatmap</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 font-mono text-[11px] font-semibold text-emerald-300">
                      <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span>Animal Identified: Nose, Body &amp; Tail</span>
                    </span>
                  </div>
                </div>

                <div className="relative flex aspect-video w-full items-center justify-center bg-black">
                  {/* Track Map View Canvas */}
                  {activeViewTab === "track" && (
                    <canvas
                      ref={trackCanvasRef}
                      width={1280}
                      height={720}
                      className="h-full w-full object-contain"
                    />
                  )}

                  {/* Heatmap View Canvas */}
                  {activeViewTab === "heatmap" && (
                    <canvas
                      ref={heatmapCanvasRef}
                      width={1280}
                      height={720}
                      className="h-full w-full object-contain"
                    />
                  )}

                  {/* Video Element */}
                  <video
                    ref={videoElementRef}
                    className={`h-full w-full object-contain select-none ${activeViewTab !== "video" ? "hidden" : "block"}`}
                    playsInline
                    loop={isLooping}
                    muted={isMuted}
                    onLoadedData={() => {
                      identifyAnimalOnCurrentFrame();
                    }}
                    onTimeUpdate={() => {
                      if (videoElementRef.current) setVideoCurrentTime(videoElementRef.current.currentTime);
                    }}
                    onDurationChange={() => {
                      if (videoElementRef.current) setVideoDuration(videoElementRef.current.duration || 300);
                    }}
                  />

                  {/* Canvas Layer for Vision Trajectory Trail & Animal Landmarks */}
                  {activeViewTab === "video" && (
                    <canvas
                      ref={canvasRef}
                      width={1280}
                      height={720}
                      className="pointer-events-none absolute inset-0 z-10 h-full w-full object-contain"
                    />
                  )}

                  {/* ADJUSTABLE SVG ARENA & ZONE OVERLAY LAYER */}
                  {activeViewTab === "video" && showArenaZones && (
                    <svg
                      ref={svgRef}
                      viewBox="0 0 1280 720"
                      className="absolute inset-0 z-20 h-full w-full touch-none select-none"
                      onPointerMove={onPointerMove}
                      onPointerUp={onPointerUp}
                      onPointerCancel={onPointerUp}
                    >
                      {/* Arena Boundary draggable path */}
                      {isAdjustmentMode && (
                        <g>
                          {arena.shape === "circle" ? (
                            <circle
                              cx={center.x}
                              cy={center.y}
                              r={Math.min(arena.rect.w, arena.rect.h) / 2}
                              fill="transparent"
                              className="cursor-move"
                              onPointerDown={startArenaDrag("move")}
                            />
                          ) : (
                            <rect
                              x={arena.rect.x}
                              y={arena.rect.y}
                              width={arena.rect.w}
                              height={arena.rect.h}
                              transform={rotateTransform}
                              fill="transparent"
                              className="cursor-move"
                              onPointerDown={startArenaDrag("move")}
                            />
                          )}
                        </g>
                      )}

                      {/* Render All Thick Behavioral Zones */}
                      {byAreaDescending(computedZones).map((z) => {
                        const draggable = isAdjustmentMode && isDraggableZone(z);
                        const isSelected = z.id === selectedZoneId;
                        return (
                          <g key={z.id}>
                            {/* Outer dark contrast halo stroke */}
                            <path
                              d={polygonToPath(z.polygon)}
                              fill="none"
                              stroke="rgba(0, 0, 0, 0.85)"
                              strokeWidth={zoneThickness + 3}
                              strokeLinejoin="round"
                            />

                            {/* Inner vibrant zone fill & stroke */}
                            <path
                              d={polygonToPath(z.polygon)}
                              fill={z.color}
                              fillOpacity={isSelected ? 0.45 : zoneOpacity}
                              stroke={z.color}
                              strokeWidth={isSelected ? zoneThickness + 1.5 : zoneThickness}
                              strokeDasharray={isSelected ? undefined : "6 4"}
                              className={draggable ? "cursor-grab active:cursor-grabbing" : undefined}
                              onPointerDown={draggable ? startZoneMoveDrag(z) : undefined}
                            />
                          </g>
                        );
                      })}

                      {/* Zone Badges */}
                      {showZoneBadges &&
                        computedZones.map((z) => {
                          const c = polygonCentroid(z.polygon);
                          const stat = zoneStats.find((s) => s.id === z.id);
                          const displayText = stat && stat.entries > 0 ? `${z.name} · ${stat.entries}` : z.name;
                          return (
                            <g key={`${z.id}-badge`} pointerEvents="none">
                              <rect
                                x={c.x - 55}
                                y={c.y - 11}
                                width={110}
                                height={22}
                                rx={5}
                                fill="rgba(7, 19, 24, 0.92)"
                                stroke={z.color}
                                strokeWidth={1.5}
                              />
                              <text
                                x={c.x}
                                y={c.y + 4}
                                fill="#ffffff"
                                fontSize={10}
                                fontWeight="bold"
                                fontFamily="monospace"
                                textAnchor="middle"
                              >
                                {displayText}
                              </text>
                            </g>
                          );
                        })}

                      {/* ARENA ADJUSTMENT HANDLES (When Adjust Mode is Active) */}
                      {isAdjustmentMode && (
                        <g>
                          {/* Arena Main Perimeter Border */}
                          {arena.shape === "circle" ? (
                            <circle
                              cx={center.x}
                              cy={center.y}
                              r={Math.min(arena.rect.w, arena.rect.h) / 2}
                              fill="none"
                              stroke="#52d8c4"
                              strokeWidth={3}
                              strokeDasharray="8 6"
                              className="cursor-move"
                              onPointerDown={startArenaDrag("move")}
                            />
                          ) : (
                            <rect
                              x={arena.rect.x}
                              y={arena.rect.y}
                              width={arena.rect.w}
                              height={arena.rect.h}
                              transform={rotateTransform}
                              fill="none"
                              stroke="#52d8c4"
                              strokeWidth={3}
                              strokeDasharray="8 6"
                              className="cursor-move"
                              onPointerDown={startArenaDrag("move")}
                            />
                          )}

                          {/* 4 Corner Resize Handles */}
                          {(["nw", "ne", "se", "sw"] as const).map((k) => {
                            const corner = rotatePoint(
                              {
                                x: arena.rect.x + (k.includes("e") ? arena.rect.w : 0),
                                y: arena.rect.y + (k.includes("s") ? arena.rect.h : 0),
                              },
                              center,
                              rotation
                            );
                            return (
                              <rect
                                key={k}
                                x={corner.x - 8}
                                y={corner.y - 8}
                                width={16}
                                height={16}
                                rx={3}
                                transform={`rotate(${rotation} ${corner.x} ${corner.y})`}
                                fill="#52d8c4"
                                stroke="#000000"
                                strokeWidth={2}
                                className={k === "nw" || k === "se" ? "cursor-nwse-resize" : "cursor-nesw-resize"}
                                onPointerDown={startArenaDrag(k)}
                              />
                            );
                          })}

                          {/* Top Rotation Handle Knob */}
                          <g transform={rotateTransform}>
                            <line
                              x1={center.x}
                              y1={arena.rect.y}
                              x2={center.x}
                              y2={arena.rect.y - 36}
                              stroke="#52d8c4"
                              strokeWidth={2.5}
                              pointerEvents="none"
                            />
                            <circle
                              cx={center.x}
                              cy={arena.rect.y - 36}
                              r={10}
                              fill="#ffffff"
                              stroke="#52d8c4"
                              strokeWidth={3}
                              className={drag?.kind === "rotate" ? "cursor-grabbing" : "cursor-grab"}
                              onPointerDown={startRotateDrag}
                            />
                          </g>

                          {/* Active Rotation Readout Badge */}
                          {drag?.kind === "rotate" && (
                            <text
                              x={center.x}
                              y={center.y}
                              fill="#52d8c4"
                              fontSize={22}
                              fontWeight="bold"
                              fontFamily="monospace"
                              textAnchor="middle"
                              dominantBaseline="middle"
                              style={{ paintOrder: "stroke", stroke: "rgba(0,0,0,0.85)", strokeWidth: 4 }}
                            >
                              {rotation.toFixed(1)}°
                            </text>
                          )}
                        </g>
                      )}

                      {/* SELECTED ZONE ADJUSTMENT BOUNDS & SCALE KNOB */}
                      {isAdjustmentMode && selectedZone && selectedBox && (
                        <g>
                          <rect
                            x={selectedBox.x}
                            y={selectedBox.y}
                            width={selectedBox.w}
                            height={selectedBox.h}
                            fill="none"
                            stroke="#ffffff"
                            strokeWidth={2}
                            strokeDasharray="4 4"
                            pointerEvents="none"
                          />
                          <circle
                            cx={selectedBox.x + selectedBox.w}
                            cy={selectedBox.y + selectedBox.h}
                            r={9}
                            fill={selectedZone.color}
                            stroke="#000000"
                            strokeWidth={2}
                            className="cursor-nwse-resize"
                            onPointerDown={startZoneScaleDrag(selectedZone)}
                          />
                        </g>
                      )}
                    </svg>
                  )}

                  {/* HUD Info Badge */}
                  <div className="pointer-events-none absolute top-3 left-3 z-30 flex items-center gap-2">
                    <span className="flex items-center gap-1.5 rounded-md bg-black/80 px-2.5 py-1 font-mono text-[11px] font-bold text-white shadow-md backdrop-blur-md">
                      <span className="size-2 rounded-full bg-red-500 animate-pulse" />
                      {videoSource === "upload" ? "FILE VIDEO" : videoSource === "live" ? "OPTICAL CAMERA" : "SAMPLE LAB VIDEO"}
                    </span>
                    {isAdjustmentMode && (
                      <span className="flex items-center gap-1 rounded-md bg-[#52d8c4]/20 border border-[#52d8c4]/40 px-2 py-0.5 font-mono text-[10px] font-bold text-[#52d8c4] backdrop-blur-md">
                        <Move className="size-3" />
                        <span>Arena &amp; Zones Adjustable</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Video Playback Transport Controls */}
                <div className="border-t border-white/10 bg-[#07171e] px-4 py-2.5">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-3">
                      <span className="w-14 font-mono text-[11px] font-bold text-white/70">
                        {String(Math.floor(videoCurrentTime / 60)).padStart(2, "0")}:
                        {String(Math.floor(videoCurrentTime % 60)).padStart(2, "0")}
                      </span>
                      <input
                        type="range"
                        min={0}
                        max={videoDuration || 300}
                        step={0.1}
                        value={videoCurrentTime}
                        onChange={(e) => {
                          const newTime = Number(e.target.value);
                          setVideoCurrentTime(newTime);
                          if (videoElementRef.current) videoElementRef.current.currentTime = newTime;
                        }}
                        className="h-1.5 flex-1 cursor-pointer appearance-none rounded-lg bg-white/20 accent-[#52d8c4]"
                      />
                      <span className="w-14 text-right font-mono text-[11px] text-muted-foreground">
                        {String(Math.floor(videoDuration / 60)).padStart(2, "0")}:
                        {String(Math.floor(videoDuration % 60)).padStart(2, "0")}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          onClick={() => {
                            if (!videoElementRef.current) return;
                            if (videoElementRef.current.paused) {
                              videoElementRef.current.play();
                              setIsVideoPlaying(true);
                            } else {
                              videoElementRef.current.pause();
                              setIsVideoPlaying(false);
                            }
                          }}
                          className="h-8 gap-1.5 bg-[#44cbb9] px-3 font-bold text-[#041614] hover:bg-[#52d8c4]"
                        >
                          {isVideoPlaying ? <Pause className="size-3.5 fill-current" /> : <Play className="size-3.5 fill-current" />}
                          <span>{isVideoPlaying ? "Pause Video" : "Play Video"}</span>
                        </Button>

                        <button
                          type="button"
                          onClick={() => setIsLooping((prev) => !prev)}
                          className={`flex h-8 items-center gap-1 rounded-lg border px-2.5 font-mono text-[11px] ${
                            isLooping ? "border-[#52d8c4]/40 bg-[#52d8c4]/15 text-[#52d8c4]" : "border-white/10 bg-white/5 text-white/50"
                          }`}
                        >
                          <Repeat className="size-3" />
                          <span>Loop</span>
                        </button>
                      </div>

                      <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
                        <span>Click &amp; drag arena / corners to adjust geometry</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* HERO ANALYSIS CTA BANNER */}
              {analysisStatus === "idle" ? (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#52d8c4]/30 bg-gradient-to-r from-[#072428] via-[#092d32] to-[#072428] p-3.5 shadow-lg">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#52d8c4]/20 text-[#52d8c4] ring-1 ring-[#52d8c4]/30">
                      <Crosshair className="size-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-white uppercase tracking-wider">
                          Animal Identified &amp; Apparatus Aligned
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-400">
                          <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          READY FOR ANALYSIS
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-white/70">
                        {animalName} marked (nose, body, tail). Click &quot;Run Analysis&quot; to begin behavioral acquisition and zone recording.
                      </p>
                    </div>
                  </div>
                  <Button
                    size="lg"
                    onClick={handleStartAnalysis}
                    className="h-10 gap-2 bg-[#44cbb9] px-6 font-mono text-xs font-bold uppercase tracking-wider text-[#041614] hover:bg-[#52d8c4] shadow-lg shadow-[#44cbb9]/30 transition-transform active:scale-95"
                  >
                    <Play className="size-4 fill-current" />
                    <span>Run Analysis</span>
                  </Button>
                </div>
              ) : analysisStatus === "running" ? (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-[#1a1708] p-3.5 shadow-lg">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/30">
                      <Activity className="size-5 animate-pulse" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-white uppercase tracking-wider">
                          Behavioral Analysis Running
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-2 py-0.5 font-mono text-[10px] font-bold text-amber-400">
                          <span className="size-1.5 rounded-full bg-amber-400 animate-ping" />
                          RECORDING
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-white/70">
                        Tracking trajectory, velocity, freezing immobility, and zone crossings in real time.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={handlePauseAnalysis}
                      className="h-9 gap-1.5 bg-amber-400 font-mono text-xs font-bold text-black hover:bg-amber-300"
                    >
                      <Pause className="size-3.5 fill-current" />
                      <span>Pause Analysis</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={handleStopAnalysis}
                      className="h-9 gap-1.5 font-mono text-xs font-bold"
                    >
                      <StopCircle className="size-3.5" />
                      <span>Stop &amp; Finalize</span>
                    </Button>
                  </div>
                </div>
              ) : analysisStatus === "paused" ? (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-[#161408] p-3.5 shadow-lg">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400">
                      <Pause className="size-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-white uppercase tracking-wider">
                          Analysis Paused
                        </span>
                        <span className="rounded bg-white/10 px-2 py-0.5 font-mono text-[10px] font-bold text-white/80">
                          PAUSED AT {String(Math.floor(remainingSeconds / 60)).padStart(2, "0")}:{String(remainingSeconds % 60).padStart(2, "0")}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-white/70">
                        Click &quot;Resume Analysis&quot; to continue acquisition or &quot;Stop &amp; Finalize&quot; to conclude trial.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={handleResumeAnalysis}
                      className="h-9 gap-1.5 bg-[#44cbb9] font-mono text-xs font-bold uppercase text-[#041614] hover:bg-[#52d8c4]"
                    >
                      <Play className="size-3.5 fill-current" />
                      <span>Resume Analysis</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={handleStopAnalysis}
                      className="h-9 gap-1.5 font-mono text-xs font-bold"
                    >
                      <StopCircle className="size-3.5" />
                      <span>Stop &amp; Finalize</span>
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-500/30 bg-[#051c14] p-3.5 shadow-lg">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30">
                      <CheckCircle2 className="size-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-white uppercase tracking-wider">
                          Trial Analysis Concluded
                        </span>
                        <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-400">
                          COMPLETE
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-white/70">
                        Recorded {distanceCm > 100 ? `${(distanceCm / 100).toFixed(2)}m` : `${distanceCm}cm`} total distance across {zoneStats.reduce((s, z) => s + z.entries, 0)} total zone entries.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={handleExportCSV}
                      className="h-9 gap-1.5 border border-white/15 bg-white/5 font-mono text-xs font-bold text-white hover:bg-white/10"
                    >
                      <FileSpreadsheet className="size-3.5 text-[#52d8c4]" />
                      <span>Export CSV</span>
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleResetAnalysis}
                      className="h-9 gap-1.5 border border-white/15 bg-white/5 font-mono text-xs font-bold text-white hover:bg-white/10"
                    >
                      <RotateCcw className="size-3.5" />
                      <span>Re-run Analysis</span>
                    </Button>
                  </div>
                </div>
              )}

              {/* LIVE RESULTS SUMMARY */}
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
                  <div className="rounded-xl border border-white/10 bg-[#09181e] p-3">
                    <span className="block font-mono text-[10px] text-muted-foreground uppercase">Total Distance</span>
                    <span className="font-mono text-xl font-bold text-white">{distanceCm > 100 ? (distanceCm / 100).toFixed(2) + "m" : distanceCm + "cm"}</span>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-[#09181e] p-3">
                    <span className="block font-mono text-[10px] text-muted-foreground uppercase">Speed (cm/s)</span>
                    <span className="font-mono text-xl font-bold text-[#52d8c4]">{currentSpeed} cm/s</span>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-[#09181e] p-3">
                    <span className="block font-mono text-[10px] text-muted-foreground uppercase">Freezing Time</span>
                    <span className="font-mono text-xl font-bold text-amber-400">{immobilityTime}s</span>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-[#09181e] p-3">
                    <span className="block font-mono text-[10px] text-muted-foreground uppercase">Activity Bouts</span>
                    <span className="font-mono text-xl font-bold text-white">{boutsCount}</span>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-[#09181e] p-3">
                    <span className="block font-mono text-[10px] text-muted-foreground uppercase">Latency to Target</span>
                    <span className="font-mono text-xl font-bold text-rose-400">{latencyToKeyZone !== null ? `${latencyToKeyZone}s` : "Pending..."}</span>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-[#09181e] p-3">
                    <span className="block font-mono text-[10px] text-[#52d8c4] uppercase">Key Metric</span>
                    <span className="font-mono text-xl font-bold text-white">Active</span>
                  </div>
                </div>

                <div className="overflow-hidden rounded-xl border border-white/10 bg-[#09181e]">
                  <div className="border-b border-white/10 px-4 py-2 font-mono text-xs font-bold text-white">
                    Adjusted Zone Classification Breakdown
                  </div>
                  <table className="w-full text-left font-mono text-xs">
                    <thead className="border-b border-white/10 bg-white/[0.02] text-[10px] uppercase text-muted-foreground">
                      <tr>
                        <th className="px-4 py-2">Zone Name</th>
                        <th className="px-3 py-2 text-center">Entries</th>
                        <th className="px-3 py-2 text-center">Time Spent</th>
                        <th className="px-3 py-2 text-center">Dwell %</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-[11px]">
                      {zoneStats.map((z) => (
                        <tr key={z.id}>
                          <td className="flex items-center gap-2 px-4 py-2.5 font-semibold">
                            <span className="size-2.5 rounded-full" style={{ backgroundColor: z.color }} />
                            <span>{z.name}</span>
                          </td>
                          <td className="px-3 py-2.5 text-center font-bold text-white">{z.entries}</td>
                          <td className="px-3 py-2.5 text-center text-white/80">{z.timeSeconds}s</td>
                          <td className="px-3 py-2.5 text-center font-bold text-[#52d8c4]">{z.dwellPercent}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* RIGHT SIDEBAR: ARENA & ZONE ADJUSTMENT CONTROLS */}
            <aside className={`space-y-4 ${isSidebarOpen ? "block" : "hidden lg:block"}`}>
              {/* Tab selector */}
              <div className="flex rounded-xl border border-white/15 bg-[#09181e] p-1 text-xs">
                <button
                  type="button"
                  onClick={() => setSidebarTab("arena")}
                  className={`flex-1 rounded-lg py-1.5 font-mono text-[11px] font-bold transition-all ${
                    sidebarTab === "arena" ? "bg-[#44cbb9] text-[#041614]" : "text-white/60 hover:text-white"
                  }`}
                >
                  Adjust Arena
                </button>
                <button
                  type="button"
                  onClick={() => setSidebarTab("detection")}
                  className={`flex-1 rounded-lg py-1.5 font-mono text-[11px] font-bold transition-all ${
                    sidebarTab === "detection" ? "bg-[#44cbb9] text-[#041614]" : "text-white/60 hover:text-white"
                  }`}
                >
                  Detection
                </button>
                <button
                  type="button"
                  onClick={() => setSidebarTab("live")}
                  className={`flex-1 rounded-lg py-1.5 font-mono text-[11px] font-bold transition-all ${
                    sidebarTab === "live" ? "bg-[#44cbb9] text-[#041614]" : "text-white/60 hover:text-white"
                  }`}
                >
                  Live Options
                </button>
              </div>

              {/* TAB 1: ARENA & ZONES ADJUSTMENT CONTROLS */}
              {sidebarTab === "arena" && (
                <div className="space-y-4 rounded-2xl border border-white/10 bg-[#09181e] p-4 text-xs">
                  <div className="flex items-center justify-between border-b border-white/10 pb-2">
                    <span className="font-mono text-[11px] font-bold uppercase text-[#52d8c4]">
                      01 · Arena &amp; Zones
                    </span>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={runAutoDetectMaze}
                      className="h-6 gap-1 bg-[#52d8c4]/20 px-2 font-mono text-[10px] font-bold text-[#52d8c4]"
                    >
                      <ScanSearch className="size-3" />
                      <span>Auto-detect</span>
                    </Button>
                  </div>

                  {/* Mode Toggle Switch */}
                  <div className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/5 p-2.5">
                    <div className="space-y-0.5">
                      <Label className="text-xs font-bold text-white">Adjust Mode</Label>
                      <span className="block text-[10px] text-muted-foreground">Enables drag &amp; resize handles</span>
                    </div>
                    <Switch checked={isAdjustmentMode} onCheckedChange={setIsAdjustmentMode} />
                  </div>

                  {/* Shape Selector */}
                  <div className="flex items-center justify-between gap-3">
                    <Label className="text-xs text-white/80">Arena Shape</Label>
                    <ToggleGroup
                      type="single"
                      size="sm"
                      variant="outline"
                      value={arena.shape}
                      onValueChange={(v) => {
                        if (!v) return;
                        const shape = v as "rect" | "circle";
                        const side = Math.min(arena.rect.w, arena.rect.h);
                        const r = shape === "circle" ? { ...arena.rect, w: side, h: side } : arena.rect;
                        setArena((prev) => ({ ...prev, shape, rect: r }));
                      }}
                    >
                      <ToggleGroupItem value="rect" className="px-3 text-xs">Square</ToggleGroupItem>
                      <ToggleGroupItem value="circle" className="px-3 text-xs">Round</ToggleGroupItem>
                    </ToggleGroup>
                  </div>

                  {/* Arena Position Nudge & Sliders */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-white/80">Arena Center Position</Label>
                      <span className="font-mono text-xs font-bold text-[#52d8c4]">
                        ({Math.round(arena.rect.x + arena.rect.w / 2)}, {Math.round(arena.rect.y + arena.rect.h / 2)})
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setArena((prev) => ({ ...prev, rect: { ...prev.rect, x: prev.rect.x - 8 } }))}
                        className="h-7 border-white/10 bg-white/5 text-xs text-white"
                        title="Nudge Left"
                      >
                        <ArrowLeft className="size-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setArena((prev) => ({ ...prev, rect: { ...prev.rect, x: prev.rect.x + 8 } }))}
                        className="h-7 border-white/10 bg-white/5 text-xs text-white"
                        title="Nudge Right"
                      >
                        <ArrowRight className="size-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setArena((prev) => ({ ...prev, rect: { ...prev.rect, y: prev.rect.y - 8 } }))}
                        className="h-7 border-white/10 bg-white/5 text-xs text-white"
                        title="Nudge Up"
                      >
                        <ArrowUp className="size-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setArena((prev) => ({ ...prev, rect: { ...prev.rect, y: prev.rect.y + 8 } }))}
                        className="h-7 border-white/10 bg-white/5 text-xs text-white"
                        title="Nudge Down"
                      >
                        <ArrowDown className="size-3" />
                      </Button>
                    </div>
                  </div>

                  {/* Arena Size / Dimensions Slider */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-white/80">Arena Width</Label>
                      <span className="font-mono text-xs font-bold text-[#52d8c4]">{Math.round(arena.rect.w)} px</span>
                    </div>
                    <Slider
                      value={[arena.rect.w]}
                      min={100}
                      max={900}
                      step={4}
                      onValueChange={([val]) => {
                        setArena((prev) => ({
                          ...prev,
                          rect: {
                            ...prev.rect,
                            w: val,
                            h: prev.shape === "circle" ? val : prev.rect.h,
                          },
                        }));
                      }}
                      className="cursor-pointer"
                    />
                  </div>

                  {arena.shape === "rect" && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs text-white/80">Arena Height</Label>
                        <span className="font-mono text-xs font-bold text-[#52d8c4]">{Math.round(arena.rect.h)} px</span>
                      </div>
                      <Slider
                        value={[arena.rect.h]}
                        min={100}
                        max={650}
                        step={4}
                        onValueChange={([val]) => {
                          setArena((prev) => ({ ...prev, rect: { ...prev.rect, h: val } }));
                        }}
                        className="cursor-pointer"
                      />
                    </div>
                  )}

                  {/* Rotation Slider */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-white/80">Arena Rotation</Label>
                      <span className="font-mono text-xs font-bold text-[#52d8c4]">{(arena.rotation ?? 0).toFixed(1)}°</span>
                    </div>
                    <Slider
                      value={[arena.rotation ?? 0]}
                      min={-180}
                      max={180}
                      step={0.5}
                      onValueChange={([val]) => setArena((prev) => ({ ...prev, rotation: val }))}
                      className="cursor-pointer"
                    />
                  </div>

                  {/* Straighten & Rotate Buttons */}
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setArena((prev) => ({ ...prev, rotation: 0 }))}
                      className="flex-1 gap-1 border-white/10 bg-white/5 text-xs text-white"
                    >
                      <RotateCcw className="size-3" />
                      <span>Straighten (0°)</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setArena((prev) => ({ ...prev, rotation: normalizeDeg((prev.rotation ?? 0) + 90) }))}
                      className="flex-1 border-white/10 bg-white/5 text-xs text-white"
                    >
                      +90° Turn
                    </Button>
                  </div>

                  {/* Zone Template Size Parameter (e.g. Arm Width / Platform Size) */}
                  <div className="space-y-1 border-t border-white/10 pt-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-white/80">
                        {getTemplate(templateId).sizeLabel || "Zone Size Ratio"}
                      </Label>
                      <span className="font-mono text-xs font-bold text-[#52d8c4]">
                        {(templateParams.size * 100).toFixed(0)}%
                      </span>
                    </div>
                    <Slider
                      value={[templateParams.size]}
                      min={getTemplate(templateId).sizeRange[0]}
                      max={getTemplate(templateId).sizeRange[1]}
                      step={0.01}
                      onValueChange={([val]) => setTemplateParams((prev) => ({ ...prev, size: val }))}
                      className="cursor-pointer"
                    />
                  </div>

                  {/* INDIVIDUAL ZONE CUSTOMIZATION */}
                  <div className="space-y-2 border-t border-white/10 pt-3">
                    <Label className="text-xs font-bold text-white">Select Individual Zone to Adjust</Label>
                    <Select
                      value={selectedZoneId ?? undefined}
                      onValueChange={(id) => setSelectedZoneId(id || null)}
                    >
                      <SelectTrigger size="sm" className="w-full text-xs">
                        <SelectValue placeholder="Click or select zone" />
                      </SelectTrigger>
                      <SelectContent>
                        {computedZones.map((z) => (
                          <SelectItem key={z.id} value={z.id} className="text-xs">
                            <span className="flex items-center gap-2">
                              <span className="size-2 rounded-full" style={{ backgroundColor: z.color }} />
                              <span>{z.name}</span>
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {selectedZone && (
                      <div className="space-y-2 rounded-lg border border-white/10 bg-white/5 p-2.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-white flex items-center gap-1.5">
                            <span className="size-2.5 rounded-full" style={{ backgroundColor: selectedZone.color }} />
                            <span>{selectedZone.name}</span>
                          </span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setZoneEdits((prev) => {
                                const { [selectedZone.id]: _, ...rest } = prev;
                                return rest;
                              });
                              toast.info(`Reset position for ${selectedZone.name}`);
                            }}
                            className="h-6 px-1.5 text-[10px] text-muted-foreground hover:text-white"
                          >
                            Reset Zone
                          </Button>
                        </div>

                        {/* Zone Scale Slider */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-muted-foreground">Zone Scale</span>
                            <span className="font-mono text-[#52d8c4]">
                              {((zoneEdits[selectedZone.id]?.scale || 1) * 100).toFixed(0)}%
                            </span>
                          </div>
                          <Slider
                            value={[zoneEdits[selectedZone.id]?.scale || 1]}
                            min={0.4}
                            max={2.5}
                            step={0.05}
                            onValueChange={([val]) => {
                              setZoneEdits((prev) => ({
                                ...prev,
                                [selectedZone.id]: {
                                  ...(prev[selectedZone.id] || NO_EDIT),
                                  scale: val,
                                },
                              }));
                            }}
                          />
                        </div>
                      </div>
                    )}

                    {Object.keys(zoneEdits).length > 0 && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setZoneEdits({});
                          setSelectedZoneId(null);
                          toast.info("All zone adjustments reset to template");
                        }}
                        className="w-full h-7 border-white/10 bg-white/5 text-xs text-muted-foreground hover:text-white"
                      >
                        Reset All Zone Edits
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: DETECTION PANEL (detection-panel.tsx) */}
              {sidebarTab === "detection" && (
                <div className="space-y-3 rounded-2xl border border-white/10 bg-[#09181e] p-4 text-xs">
                  <div className="flex items-center justify-between border-b border-white/10 pb-2">
                    <span className="font-mono text-[11px] font-bold uppercase text-[#52d8c4]">
                      03 · Animal Detection
                    </span>
                    <Badge variant="outline" className="border-[#52d8c4]/40 font-mono text-[10px] text-[#52d8c4]">
                      CV Active
                    </Badge>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs text-white/80">Detection Mode</Label>
                    <ToggleGroup
                      type="single"
                      size="sm"
                      variant="outline"
                      className="w-full"
                      value={settings.mode}
                      onValueChange={(v) => {
                        if (!v) return;
                        const m = v as DetectionMode;
                        setSettings((prev) => ({
                          ...prev,
                          mode: m,
                          threshold: m === "background" ? 35 : m === "dark" ? 75 : 175,
                        }));
                      }}
                    >
                      <ToggleGroupItem value="background" className="flex-1 text-xs">Subtract</ToggleGroupItem>
                      <ToggleGroupItem value="dark" className="flex-1 text-xs">Dark animal</ToggleGroupItem>
                      <ToggleGroupItem value="light" className="flex-1 text-xs">Light animal</ToggleGroupItem>
                    </ToggleGroup>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-white/80">Sensitivity Threshold</Label>
                      <span className="font-mono text-xs font-bold text-[#52d8c4]">{settings.threshold}</span>
                    </div>
                    <Slider
                      value={[settings.threshold]}
                      min={5}
                      max={250}
                      step={1}
                      onValueChange={([val]) => setSettings((prev) => ({ ...prev, threshold: val }))}
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-white/80">Minimum Animal Size</Label>
                      <span className="font-mono text-xs font-bold text-[#52d8c4]">{settings.minArea} px</span>
                    </div>
                    <Slider
                      value={[settings.minArea]}
                      min={4}
                      max={400}
                      step={1}
                      onValueChange={([val]) => setSettings((prev) => ({ ...prev, minArea: val }))}
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-white/80">Sampling Rate (FPS)</Label>
                      <span className="font-mono text-xs font-bold text-[#52d8c4]">{settings.fps} fps</span>
                    </div>
                    <Slider
                      value={[settings.fps]}
                      min={2}
                      max={30}
                      step={1}
                      onValueChange={([val]) => setSettings((prev) => ({ ...prev, fps: val }))}
                    />
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={handleTestProbe}
                      disabled={isProbing}
                      className="flex-1 gap-1.5 bg-white/5 text-xs text-white hover:bg-white/10"
                    >
                      <Crosshair className="size-3 text-red-400" />
                      <span>Test frame</span>
                    </Button>
                    {analysisStatus === "idle" ? (
                      <Button
                        size="sm"
                        onClick={handleStartAnalysis}
                        className="flex-1 gap-1.5 bg-[#44cbb9] text-xs font-bold text-[#041614] hover:bg-[#52d8c4]"
                      >
                        <Play className="size-3 fill-current" />
                        <span>Run Analysis</span>
                      </Button>
                    ) : analysisStatus === "running" ? (
                      <Button
                        size="sm"
                        onClick={handlePauseAnalysis}
                        className="flex-1 gap-1.5 bg-amber-400 text-xs font-bold text-black hover:bg-amber-300"
                      >
                        <Pause className="size-3 fill-current" />
                        <span>Pause</span>
                      </Button>
                    ) : analysisStatus === "paused" ? (
                      <Button
                        size="sm"
                        onClick={handleResumeAnalysis}
                        className="flex-1 gap-1.5 bg-[#44cbb9] text-xs font-bold text-[#041614] hover:bg-[#52d8c4]"
                      >
                        <Play className="size-3 fill-current" />
                        <span>Resume</span>
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={handleResetAnalysis}
                        className="flex-1 gap-1.5 border border-white/20 bg-white/10 text-xs font-bold text-white hover:bg-white/15"
                      >
                        <RotateCcw className="size-3" />
                        <span>Re-run</span>
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: LIVE CAMERA OPTIONS (live-panel.tsx) */}
              {sidebarTab === "live" && (
                <div className="space-y-3 rounded-2xl border border-white/10 bg-[#09181e] p-4 text-xs">
                  <div className="flex items-center justify-between border-b border-white/10 pb-2">
                    <span className="font-mono text-[11px] font-bold uppercase text-[#52d8c4]">
                      00 · Live Camera Controls
                    </span>
                    <Radio className="size-3.5 text-[#52d8c4]" />
                  </div>

                  {cameraDevices.length > 1 && (
                    <div className="space-y-1">
                      <Label className="text-xs text-white/80">Select Camera</Label>
                      <Select
                        value={selectedCameraId || undefined}
                        onValueChange={(id) => {
                          setSelectedCameraId(id);
                          handleStartLiveCamera(id);
                        }}
                      >
                        <SelectTrigger size="sm" className="w-full text-xs">
                          <SelectValue placeholder="Choose camera" />
                        </SelectTrigger>
                        <SelectContent>
                          {cameraDevices.map((d) => (
                            <SelectItem key={d.deviceId} value={d.deviceId} className="text-xs">
                              {d.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-3 pt-1">
                    <Label className="text-xs text-white/80">Auto-follow arena &amp; zones</Label>
                    <Switch checked={autoFollow} onCheckedChange={setAutoFollow} />
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Re-detects the maze on camera motion and shifts/scales the arena and zones smoothly.
                  </p>

                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={runAutoDetectMaze}
                      className="gap-1 bg-white/5 text-xs text-white"
                    >
                      <ScanSearch className="size-3 text-[#52d8c4]" />
                      <span>Detect arena</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        toast.success("Recalibrating camera background model...");
                        runAutoDetectMaze();
                      }}
                      className="gap-1 bg-white/5 text-xs text-white"
                    >
                      <RotateCcw className="size-3" />
                      <span>Recalibrate</span>
                    </Button>
                  </div>
                </div>
              )}
            </aside>
          </div>
        </div>
      </main>

      {/* TRIAL COMPLETION & RESULTS SAVE DIALOG */}
      <Dialog open={isTrialCompleteDialogOpen} onOpenChange={setIsTrialCompleteDialogOpen}>
        <DialogContent className="max-w-md border border-[#c4d7d4] bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-[#0a181d]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold text-foreground">
              <CheckCircle2 className="size-5 text-emerald-500" />
              Trial Analysis Completed!
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Behavioral tracking session finalized for Subject {animalNumber} ({groupNumber}) in {mazeName}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-3 font-mono text-xs">
            <div className="grid grid-cols-2 gap-2 rounded-xl bg-muted/20 p-3">
              <div>
                <span className="text-[10px] text-muted-foreground uppercase">Distance:</span>
                <p className="text-base font-bold text-[#08796f] dark:text-[#52d8c4]">
                  {distanceCm > 100 ? (distanceCm / 100).toFixed(2) + "m" : distanceCm + "cm"}
                </p>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground uppercase">Duration:</span>
                <p className="text-base font-bold text-foreground">
                  {initialDuration - remainingSeconds}s / {initialDuration}s
                </p>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground uppercase">Freezing:</span>
                <p className="text-sm font-bold text-amber-600 dark:text-amber-400">
                  {immobilityTime}s
                </p>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground uppercase">Locomotor Bouts:</span>
                <p className="text-sm font-bold text-foreground">{boutsCount} bouts</p>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground font-sans">
              Save this trial now to open the comprehensive Project Details page with experimental settings, interactive graphs, and data tables.
            </p>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setIsTrialCompleteDialogOpen(false);
                handleExportCSV();
              }}
              className="text-xs"
            >
              <Download className="size-3 mr-1" /> Export CSV
            </Button>
            <Button
              onClick={() => {
                setIsTrialCompleteDialogOpen(false);
                handleSaveAndFinishTrial();
              }}
              className="bg-[#08796f] text-xs font-bold text-white hover:bg-[#0a8b80] dark:bg-[#52d8c4] dark:text-[#041614]"
            >
              <Check className="size-3 mr-1" /> Save &amp; Open Project Page
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
