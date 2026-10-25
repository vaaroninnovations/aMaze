import type { Arena, DetectionSettings, Point } from "./types.ts";
import type { ProjectItem } from "@/pages/dashboard/page.tsx";

// ==========================================================================
// TRIAL & PROJECT DATA STRUCTURES
// ==========================================================================

export interface ZoneRecord {
  id: string;
  name: string;
  color: string;
  entries: number;
  timeSeconds: number;
  dwellPercent: number;
  firstEntryLatency: number | null;
  meanSpeed?: number;
  distanceCm?: number;
}

export interface SpeedDataPoint {
  t: number;
  speed: number;
  isMoving: boolean;
}

export interface TrajectoryDataPoint {
  x: number;
  y: number;
  t: number;
  speed: number;
  zoneId?: string;
}

export interface TrialRecord {
  id: string;
  trialNumber: number;
  projectId: string;
  projectName: string;
  animalNumber: string;
  groupNumber: string;
  strain: string;
  mazeName: string;
  mazeId: string;
  templateId: string;
  createdAt: string;
  durationSeconds: number;
  initialDuration: number;
  experimentalSettings: {
    mazeName: string;
    mazeId: string;
    templateId: string;
    arena: Arena;
    zones: Array<{ id: string; name: string; color: string; polygon?: Point[] }>;
    settings: DetectionSettings;
    contrastMode: string;
    videoSource: string;
    uploadedFileName?: string | null;
    habituationDelay: number;
    scaleCmPerPx?: number;
    notes?: string;
  };
  metrics: {
    totalDistanceCm: number;
    totalDistanceM: number;
    meanSpeedCmS: number;
    maxSpeedCmS: number;
    immobilitySeconds: number;
    immobilityPercent: number;
    mobileSeconds: number;
    boutsCount: number;
    zoneEntriesTotal: number;
    latencyToFirstZone?: number;
    primaryIndexLabel: string;
    primaryIndexValue: string;
  };
  zoneStats: ZoneRecord[];
  trajectory: TrajectoryDataPoint[];
  speedSeries: SpeedDataPoint[];
}

// ==========================================================================
// REALISTIC SAMPLE TRIAL GENERATORS
// ==========================================================================

export function generateSampleTrialsForProject(project: ProjectItem): TrialRecord[] {
  const pId = project.id;
  const tId = project.templateId;
  const isEPM = tId === "elevated_plus";
  const isBM = tId === "barnes_maze";
  const isOFT = tId === "open_field";
  const isNOR = tId === "nor";
  const isYM = tId === "y_maze";

  const makeSpeedSeries = (duration: number, meanSpeed: number): SpeedDataPoint[] => {
    const pts: SpeedDataPoint[] = [];
    const step = 0.5;
    let s = meanSpeed;
    for (let t = 0; t <= duration; t += step) {
      const restPhase = Math.sin(t * 0.1) < -0.4;
      if (restPhase) {
        s = Math.max(0, s * 0.85 + (Math.random() * 0.5));
      } else {
        const target = meanSpeed + Math.sin(t * 0.25) * 6 + (Math.random() * 6 - 3);
        s = Math.max(1.0, s * 0.7 + target * 0.3);
      }
      pts.push({
        t: Number(t.toFixed(1)),
        speed: Number(s.toFixed(1)),
        isMoving: s >= 2.0,
      });
    }
    return pts;
  };

  const makeTrajectory = (duration: number): TrajectoryDataPoint[] => {
    const pts: TrajectoryDataPoint[] = [];
    const cx = 640;
    const cy = 360;
    const count = Math.min(400, Math.floor(duration * 2));
    for (let i = 0; i < count; i++) {
      const t = (i / count) * duration;
      let x = cx;
      let y = cy;
      if (isEPM) {
        const arm = Math.floor(i / 30) % 4;
        const dist = 60 + Math.sin(i * 0.2) * 180;
        const angles = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2];
        x = cx + Math.cos(angles[arm]) * dist;
        y = cy + Math.sin(angles[arm]) * dist;
      } else if (isYM) {
        const arm = Math.floor(i / 35) % 3;
        const dist = 50 + Math.sin(i * 0.2) * 160;
        const angles = [-Math.PI / 2, Math.PI / 6, (5 * Math.PI) / 6];
        x = cx + Math.cos(angles[arm]) * dist;
        y = cy + Math.sin(angles[arm]) * dist;
      } else {
        const r = 80 + Math.sin(i * 0.08) * 160 + (i % 20);
        const a = i * 0.07;
        x = cx + Math.cos(a) * r;
        y = cy + Math.sin(a) * r;
      }
      pts.push({
        x: Math.round(x),
        y: Math.round(y),
        t: Number(t.toFixed(1)),
        speed: Math.round(Math.random() * 12 + 6),
      });
    }
    return pts;
  };

  // Generate 2 sample trials for the project
  const trial1: TrialRecord = {
    id: `trial-${pId}-1`,
    trialNumber: 1,
    projectId: pId,
    projectName: project.name,
    animalNumber: "M-101",
    groupNumber: "Cohort A (Vehicle Control)",
    strain: project.strain || "C57BL/6J Mice",
    mazeName: project.templateName,
    mazeId: project.templateId,
    templateId: project.templateId,
    createdAt: new Date(Date.now() - 3600 * 1000 * 3).toISOString(),
    durationSeconds: 300,
    initialDuration: 300,
    experimentalSettings: {
      mazeName: project.templateName,
      mazeId: project.templateId,
      templateId: project.templateId,
      arena: {
        shape: isBM || isOFT ? "circle" : "rect",
        rect: { x: 340, y: 120, w: 600, h: 480 },
        rotation: 0,
      },
      zones: [
        { id: "z-1", name: isEPM ? "Open Arm North" : isBM ? "Escape Hole (Target)" : isOFT ? "Center Zone" : isYM ? "Arm A" : "Novel Object", color: "#38bdf8" },
        { id: "z-2", name: isEPM ? "Open Arm South" : isBM ? "Quadrant North" : isOFT ? "Periphery Ring" : isYM ? "Arm B" : "Familiar Object", color: "#52d8c4" },
        { id: "z-3", name: isEPM ? "Closed Arm East" : isBM ? "Quadrant East" : isOFT ? "Corner North-East" : isYM ? "Arm C" : "Corner East", color: "#a855f7" },
        { id: "z-4", name: isEPM ? "Closed Arm West" : isBM ? "Quadrant West" : isOFT ? "Corner South-West" : "Corner West", color: "#f59e0b" },
        { id: "z-5", name: isEPM ? "Central Intersection" : isBM ? "Quadrant South" : "Center", color: "#ec4899" },
      ],
      settings: { mode: "dark", threshold: 42, minArea: 80, fps: 30 },
      contrastMode: "Black",
      videoSource: "sample",
      habituationDelay: 15,
      scaleCmPerPx: 0.12,
    },
    metrics: {
      totalDistanceCm: isOFT ? 2410 : isEPM ? 1840 : 1560,
      totalDistanceM: isOFT ? 24.1 : isEPM ? 18.4 : 15.6,
      meanSpeedCmS: 11.4,
      maxSpeedCmS: 28.6,
      immobilitySeconds: 42,
      immobilityPercent: 14,
      mobileSeconds: 258,
      boutsCount: 18,
      zoneEntriesTotal: 28,
      latencyToFirstZone: 4.2,
      primaryIndexLabel: isEPM ? "Open Arm Dwell" : isBM ? "Escape Latency" : isOFT ? "Thigmotaxis Index" : isYM ? "Alternation Rate" : "Discrimination Index",
      primaryIndexValue: isEPM ? "18.4%" : isBM ? "22.8 s" : isOFT ? "81.6%" : isYM ? "68.4%" : "+0.38",
    },
    zoneStats: [
      {
        id: "z-1",
        name: isEPM ? "Open Arm North" : isBM ? "Escape Target" : isOFT ? "Center Zone" : isYM ? "Arm A" : "Novel Object",
        color: "#38bdf8",
        entries: 6,
        timeSeconds: 32,
        dwellPercent: 11,
        firstEntryLatency: 8.4,
        meanSpeed: 12.1,
        distanceCm: 387,
      },
      {
        id: "z-2",
        name: isEPM ? "Open Arm South" : isBM ? "Quadrant North" : isOFT ? "Periphery Ring" : isYM ? "Arm B" : "Familiar Object",
        color: "#52d8c4",
        entries: 5,
        timeSeconds: 24,
        dwellPercent: 8,
        firstEntryLatency: 14.2,
        meanSpeed: 11.5,
        distanceCm: 276,
      },
      {
        id: "z-3",
        name: isEPM ? "Closed Arm East" : isBM ? "Quadrant East" : isOFT ? "Corner North-East" : isYM ? "Arm C" : "Corner East",
        color: "#a855f7",
        entries: 9,
        timeSeconds: 118,
        dwellPercent: 39,
        firstEntryLatency: 2.1,
        meanSpeed: 9.8,
        distanceCm: 640,
      },
      {
        id: "z-4",
        name: isEPM ? "Closed Arm West" : isBM ? "Quadrant West" : isOFT ? "Corner South-West" : "Corner West",
        color: "#f59e0b",
        entries: 8,
        timeSeconds: 96,
        dwellPercent: 32,
        firstEntryLatency: 18.5,
        meanSpeed: 10.4,
        distanceCm: 537,
      },
      {
        id: "z-5",
        name: isEPM ? "Central Intersection" : isBM ? "Quadrant South" : "Center",
        color: "#ec4899",
        entries: 14,
        timeSeconds: 30,
        dwellPercent: 10,
        firstEntryLatency: 0.8,
        meanSpeed: 7.2,
        distanceCm: 216,
      },
    ],
    trajectory: makeTrajectory(300),
    speedSeries: makeSpeedSeries(300, 11.4),
  };

  const trial2: TrialRecord = {
    ...trial1,
    id: `trial-${pId}-2`,
    trialNumber: 2,
    animalNumber: "M-102",
    groupNumber: "Cohort B (Treated AC-984)",
    createdAt: new Date(Date.now() - 3600 * 1000 * 1.5).toISOString(),
    metrics: {
      totalDistanceCm: isOFT ? 2680 : isEPM ? 2120 : 1780,
      totalDistanceM: isOFT ? 26.8 : isEPM ? 21.2 : 17.8,
      meanSpeedCmS: 12.8,
      maxSpeedCmS: 31.2,
      immobilitySeconds: 26,
      immobilityPercent: 9,
      mobileSeconds: 274,
      boutsCount: 22,
      zoneEntriesTotal: 34,
      latencyToFirstZone: 2.8,
      primaryIndexLabel: trial1.metrics.primaryIndexLabel,
      primaryIndexValue: isEPM ? "26.8%" : isBM ? "16.4 s" : isOFT ? "72.4%" : isYM ? "74.2%" : "+0.49",
    },
    trajectory: makeTrajectory(300),
    speedSeries: makeSpeedSeries(300, 12.8),
  };

  return [trial2, trial1];
}

// ==========================================================================
// PERSISTENT STORAGE ACCESSORS
// ==========================================================================

export function getProjectTrials(projectId: string, fallbackProject?: ProjectItem): TrialRecord[] {
  try {
    if (typeof window !== "undefined") {
      const key = `amaze:project_${projectId}_trials`;
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (
          Array.isArray(parsed) &&
          parsed.length > 0 &&
          parsed[0] &&
          typeof parsed[0] === "object" &&
          parsed[0].metrics &&
          parsed[0].experimentalSettings
        ) {
          return parsed;
        }
      }
    }
  } catch (err) {
    console.warn("Failed to read trials from localStorage:", err);
  }

  // If no valid recorded trials exist yet, synthesize complete samples
  if (fallbackProject) {
    const samples = generateSampleTrialsForProject(fallbackProject);
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem(`amaze:project_${projectId}_trials`, JSON.stringify(samples));
      }
    } catch {}
    return samples;
  }

  return [];
}

export function saveTrialToProject(trial: TrialRecord): void {
  try {
    const pId = trial.projectId;
    const trialsKey = `amaze:project_${pId}_trials`;
    const existing = getProjectTrials(pId);
    
    // Assign sequential trial number
    const updatedTrials = [
      {
        ...trial,
        trialNumber: existing.length + 1,
      },
      ...existing,
    ];
    localStorage.setItem(trialsKey, JSON.stringify(updatedTrials));
    localStorage.setItem("amaze:last_saved_trial", JSON.stringify(trial));

    // Update Project in amaze:projects
    const projRaw = localStorage.getItem("amaze:projects");
    if (projRaw) {
      const projects: ProjectItem[] = JSON.parse(projRaw);
      const idx = projects.findIndex((p) => p.id === pId);
      if (idx !== -1) {
        projects[idx].trialCount = updatedTrials.length;
        projects[idx].lastModified = "Just now";
        projects[idx].status = "completed";
        // Update metricsSummary with the latest trial metrics
        projects[idx].metricsSummary = [
          { label: "Total Distance", value: `${(trial.metrics.totalDistanceCm / 100).toFixed(1)}`, unit: "m" },
          { label: trial.metrics.primaryIndexLabel, value: trial.metrics.primaryIndexValue, unit: "" },
          { label: "Mean Speed", value: `${trial.metrics.meanSpeedCmS}`, unit: "cm/s" },
        ];
        localStorage.setItem("amaze:projects", JSON.stringify(projects));
      }
    }
  } catch (err) {
    console.error("Failed to save trial to project:", err);
  }
}

export function getProjectById(projectId: string): ProjectItem | null {
  try {
    const projRaw = localStorage.getItem("amaze:projects");
    if (projRaw) {
      const projects: ProjectItem[] = JSON.parse(projRaw);
      const found = projects.find((p) => p.id === projectId);
      if (found) return found;
    }
  } catch {}
  return null;
}
