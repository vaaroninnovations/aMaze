import React, { useState, useMemo, useEffect, useRef } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Calendar,
  Check,
  ChevronDown,
  Clock,
  Compass,
  Copy,
  Download,
  ExternalLink,
  Eye,
  FileSpreadsheet,
  FileText,
  Flame,
  FlaskConical,
  Grid3x3,
  Info,
  Layers,
  LineChart,
  MapPin,
  Maximize2,
  Play,
  Printer,
  RotateCcw,
  Save,
  Scan,
  Settings as SettingsIcon,
  Share2,
  Sliders,
  Table as TableIcon,
  Target,
  Timer,
  TrendingUp,
  User,
  Video,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card.tsx";
import ThemeToggle from "@/components/theme-toggle.tsx";
import SiteFooter from "@/components/site-footer.tsx";
import {
  getProjectById,
  getProjectTrials,
  type TrialRecord,
  type ZoneRecord,
} from "@/lib/tracking/project-store.ts";
import type { ProjectItem } from "@/pages/dashboard/page.tsx";

// Mock Fallback Projects if localStorage is empty
const FALLBACK_PROJECTS: Record<string, ProjectItem> = {
  "proj-1": {
    id: "proj-1",
    name: "CORT-Stress Anxiolytic Battery",
    description: "Assessment of novel anxiolytic compound AC-984 in acute stress rodent paradigm.",
    templateId: "elevated_plus",
    templateName: "Elevated Plus Maze",
    templateShort: "EPM",
    templateColor: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30 dark:text-emerald-400",
    investigator: "Dr. Alex Morgan",
    institution: "Cambridge Neurobiology Lab",
    strain: "C57BL/6J Mice (n=18)",
    trialCount: 24,
    subjectCount: 18,
    totalDuration: "02h 45m",
    lastModified: "15 mins ago",
    createdAt: "2026-10-18",
    status: "active",
    confidence: 99.4,
    tags: ["Anxiety", "Pharmacology", "Plus-Maze"],
    metricsSummary: [
      { label: "Open Arm Dwell", value: "18.4", unit: "%" },
      { label: "Latency to Closed", value: "4.2", unit: "s" },
      { label: "Mean Velocity", value: "11.2", unit: "cm/s" },
    ],
  },
  "proj-2": {
    id: "proj-2",
    name: "Spatial Memory Deficit - APP/PS1 Cohort",
    description: "Hippocampal-dependent spatial learning and memory retention in Alzheimer's disease model.",
    templateId: "barnes_maze",
    templateName: "Barnes Maze",
    templateShort: "BM",
    templateColor: "bg-amber-500/15 text-amber-600 border-amber-500/30 dark:text-amber-400",
    investigator: "Elena Vance, MSc",
    institution: "Dept. of Cognitive Neuroscience",
    strain: "APP/PS1 Transgenic (n=14)",
    trialCount: 42,
    subjectCount: 14,
    totalDuration: "04h 12m",
    lastModified: "2 hours ago",
    createdAt: "2026-10-12",
    status: "in_analysis",
    confidence: 98.7,
    tags: ["Alzheimers", "Spatial Learning", "Memory"],
    metricsSummary: [
      { label: "Escape Latency", value: "22.8", unit: "s" },
      { label: "Quadrant Bias", value: "54.2", unit: "%" },
      { label: "Primary Errors", value: "2.8", unit: "avg" },
    ],
  },
  "proj-3": {
    id: "proj-3",
    name: "Dopamine Transporter Knockout Locomotion",
    description: "Open field exploratory hyperactivity and thigmotaxis analysis in DAT-KO vs Wild Type.",
    templateId: "open_field",
    templateName: "Open Field Test",
    templateShort: "OFT",
    templateColor: "bg-cyan-500/15 text-cyan-600 border-cyan-500/30 dark:text-cyan-400",
    investigator: "Dr. Alex Morgan",
    institution: "Cambridge Neurobiology Lab",
    strain: "DAT-KO & WT Littermates (n=20)",
    trialCount: 36,
    subjectCount: 20,
    totalDuration: "03h 30m",
    lastModified: "Yesterday",
    createdAt: "2026-10-05",
    status: "completed",
    confidence: 99.8,
    tags: ["Locomotion", "Dopamine", "Exploration"],
    metricsSummary: [
      { label: "Total Distance", value: "2,410", unit: "cm" },
      { label: "Center Dwell", value: "14.2", unit: "s" },
      { label: "Thigmotaxis Index", value: "81.6", unit: "%" },
    ],
  },
};

export default function ProjectDetailsPage() {
  const navigate = useNavigate();
  const params = useParams();
  const [searchParams] = useSearchParams();

  const projectId = params.projectId || searchParams.get("projectId") || "proj-1";

  // Load Project
  const project: ProjectItem = useMemo(() => {
    const fromStorage = getProjectById(projectId);
    if (fromStorage) return fromStorage;
    if (FALLBACK_PROJECTS[projectId]) return FALLBACK_PROJECTS[projectId];
    return {
      id: projectId,
      name: `Project ${projectId.toUpperCase()}`,
      description: "Automated rodent behavioral tracking trial suite and experimental analytics.",
      templateId: "elevated_plus",
      templateName: "Elevated Plus Maze",
      templateShort: "EPM",
      templateColor: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30 dark:text-emerald-400",
      investigator: "Principal Investigator",
      institution: "Behavioral Neuroscience Facility",
      strain: "Laboratory Rodent",
      trialCount: 1,
      subjectCount: 1,
      totalDuration: "05m 00s",
      lastModified: "Recently",
      createdAt: new Date().toISOString().slice(0, 10),
      status: "completed",
      confidence: 99.2,
      tags: ["Behavior", "Automated Tracking"],
      metricsSummary: [
        { label: "Total Distance", value: "18.4", unit: "m" },
        { label: "Mean Velocity", value: "11.4", unit: "cm/s" },
      ],
    };
  }, [projectId]);

  // Load Recorded Trials for this project
  const trials: TrialRecord[] = useMemo(() => {
    return getProjectTrials(projectId, project);
  }, [projectId, project]);

  // Selected active trial to display in graphs and tables
  const [selectedTrialId, setSelectedTrialId] = useState<string>(() => {
    return trials.length > 0 ? trials[0].id : "";
  });

  useEffect(() => {
    if (trials.length > 0 && (!selectedTrialId || !trials.find((t) => t.id === selectedTrialId))) {
      setSelectedTrialId(trials[0].id);
    }
  }, [trials, selectedTrialId]);

  const activeTrial: TrialRecord | null = useMemo(() => {
    const raw = trials.find((t) => t.id === selectedTrialId) || trials[0];
    if (!raw) return null;
    return {
      ...raw,
      durationSeconds: raw.durationSeconds ?? 300,
      initialDuration: raw.initialDuration ?? 300,
      experimentalSettings: {
        mazeName: raw.experimentalSettings?.mazeName ?? project.templateName,
        mazeId: raw.experimentalSettings?.mazeId ?? project.templateId,
        templateId: raw.experimentalSettings?.templateId ?? project.templateId,
        arena: raw.experimentalSettings?.arena ?? {
          shape: "rect",
          rect: { x: 340, y: 120, w: 600, h: 480 },
          rotation: 0,
        },
        zones: raw.experimentalSettings?.zones ?? [],
        settings: raw.experimentalSettings?.settings ?? { mode: "dark", threshold: 42, minArea: 80, fps: 30 },
        contrastMode: raw.experimentalSettings?.contrastMode ?? "Black",
        videoSource: raw.experimentalSettings?.videoSource ?? "sample",
        habituationDelay: raw.experimentalSettings?.habituationDelay ?? 15,
        scaleCmPerPx: raw.experimentalSettings?.scaleCmPerPx ?? 0.12,
      },
      metrics: {
        totalDistanceCm: raw.metrics?.totalDistanceCm ?? 1840,
        totalDistanceM: raw.metrics?.totalDistanceM ?? 18.4,
        meanSpeedCmS: raw.metrics?.meanSpeedCmS ?? 11.4,
        maxSpeedCmS: raw.metrics?.maxSpeedCmS ?? 28.6,
        immobilitySeconds: raw.metrics?.immobilitySeconds ?? 34,
        immobilityPercent: raw.metrics?.immobilityPercent ?? 11,
        mobileSeconds: raw.metrics?.mobileSeconds ?? 266,
        boutsCount: raw.metrics?.boutsCount ?? 16,
        zoneEntriesTotal: raw.metrics?.zoneEntriesTotal ?? 24,
        primaryIndexLabel: raw.metrics?.primaryIndexLabel ?? "Exploration Ratio",
        primaryIndexValue: raw.metrics?.primaryIndexValue ?? "24.6%",
      },
      zoneStats: Array.isArray(raw.zoneStats) ? raw.zoneStats : [],
      trajectory: Array.isArray(raw.trajectory) ? raw.trajectory : [],
      speedSeries: Array.isArray(raw.speedSeries) ? raw.speedSeries : [],
    };
  }, [trials, selectedTrialId, project]);

  // Active Main Tab
  const [activeTab, setActiveTab] = useState<"graphs" | "tables" | "settings" | "trials">("graphs");

  // Hovered time on velocity chart
  const [hoveredSpeedPoint, setHoveredSpeedPoint] = useState<{ t: number; speed: number } | null>(null);

  // Canvas refs for track map and heatmap
  const trackCanvasRef = useRef<HTMLCanvasElement>(null);
  const heatmapCanvasRef = useRef<HTMLCanvasElement>(null);

  // Draw Track Map
  useEffect(() => {
    if (!activeTrial || activeTab !== "graphs") return;
    const canvas = trackCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // Dark backdrop
    ctx.fillStyle = "#071318";
    ctx.fillRect(0, 0, w, h);

    // Grid lines
    ctx.strokeStyle = "rgba(82, 216, 196, 0.08)";
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Apparatus outline
    const arena = activeTrial.experimentalSettings.arena;
    const scaleX = w / 1280;
    const scaleY = h / 720;
    ctx.save();
    ctx.translate((arena.rect.x + arena.rect.w / 2) * scaleX, (arena.rect.y + arena.rect.h / 2) * scaleY);
    ctx.rotate(((arena.rotation ?? 0) * Math.PI) / 180);

    ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
    ctx.lineWidth = 2;
    if (arena.shape === "circle") {
      ctx.beginPath();
      ctx.arc(0, 0, (arena.rect.w / 2) * scaleX, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.strokeRect((-arena.rect.w / 2) * scaleX, (-arena.rect.h / 2) * scaleY, arena.rect.w * scaleX, arena.rect.h * scaleY);
    }
    ctx.restore();

    // Trajectory path
    const pts = activeTrial.trajectory;
    if (pts.length > 1) {
      ctx.beginPath();
      ctx.moveTo(pts[0].x * scaleX, pts[0].y * scaleY);
      for (let i = 1; i < pts.length; i++) {
        ctx.lineTo(pts[i].x * scaleX, pts[i].y * scaleY);
      }
      ctx.strokeStyle = "rgba(82, 216, 196, 0.85)";
      ctx.lineWidth = 2.5;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.stroke();

      // Start Marker (Green)
      ctx.beginPath();
      ctx.arc(pts[0].x * scaleX, pts[0].y * scaleY, 6, 0, Math.PI * 2);
      ctx.fillStyle = "#22c55e";
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.stroke();

      // End Marker (Red)
      const last = pts[pts.length - 1];
      ctx.beginPath();
      ctx.arc(last.x * scaleX, last.y * scaleY, 6, 0, Math.PI * 2);
      ctx.fillStyle = "#ef4444";
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }, [activeTrial, activeTab]);

  // Draw Heatmap
  useEffect(() => {
    if (!activeTrial || activeTab !== "graphs") return;
    const canvas = heatmapCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // Heat background
    ctx.fillStyle = "#071318";
    ctx.fillRect(0, 0, w, h);

    const pts = activeTrial.trajectory;
    if (pts.length === 0) return;

    const scaleX = w / 1280;
    const scaleY = h / 720;

    // Accumulate heat spots
    for (const pt of pts) {
      const px = pt.x * scaleX;
      const py = pt.y * scaleY;
      const grad = ctx.createRadialGradient(px, py, 2, px, py, 28);
      grad.addColorStop(0, "rgba(255, 60, 0, 0.18)");
      grad.addColorStop(0.4, "rgba(255, 200, 0, 0.08)");
      grad.addColorStop(1, "rgba(0, 180, 255, 0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(px, py, 28, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [activeTrial, activeTab]);

  // Export CSV Handler
  const handleExportCSV = () => {
    if (!activeTrial) return;
    const rows = [
      ["aMaze Experimental Protocol & Trial Results Report"],
      ["Project Name", project.name],
      ["Project ID", project.id],
      ["Paradigm / Maze", activeTrial.mazeName],
      ["Animal Number", activeTrial.animalNumber],
      ["Cohort / Group", activeTrial.groupNumber],
      ["Strain / Model", activeTrial.strain],
      ["Trial Date", activeTrial.createdAt],
      ["Duration (s)", activeTrial.durationSeconds],
      ["Total Distance (cm)", activeTrial.metrics.totalDistanceCm],
      ["Total Distance (m)", activeTrial.metrics.totalDistanceM],
      ["Mean Speed (cm/s)", activeTrial.metrics.meanSpeedCmS],
      ["Max Speed (cm/s)", activeTrial.metrics.maxSpeedCmS],
      ["Immobility Duration (s)", activeTrial.metrics.immobilitySeconds],
      ["Immobility Percent (%)", activeTrial.metrics.immobilityPercent],
      ["Movement Bouts Count", activeTrial.metrics.boutsCount],
      ["Total Zone Crossings", activeTrial.metrics.zoneEntriesTotal],
      [activeTrial.metrics.primaryIndexLabel, activeTrial.metrics.primaryIndexValue],
      [],
      ["Zone Breakdown Statistics"],
      ["Zone ID", "Zone Name", "Entries", "Dwell Time (s)", "Dwell %", "First Entry Latency (s)", "Mean Speed (cm/s)", "Distance (cm)"],
      ...activeTrial.zoneStats.map((z) => [
        z.id,
        z.name,
        z.entries,
        z.timeSeconds,
        z.dwellPercent,
        z.firstEntryLatency ?? "N/A",
        z.meanSpeed ?? "N/A",
        z.distanceCm ?? "N/A",
      ]),
    ];

    const csvContent = "data:text/csv;charset=utf-8," + rows.map((e) => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${project.name.replace(/\s+/g, "_")}_Trial_${activeTrial.animalNumber}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("CSV export generated successfully!");
  };

  // Export JSON Handler
  const handleExportJSON = () => {
    if (!activeTrial) return;
    const exportPayload = {
      project,
      trial: activeTrial,
      exportedAt: new Date().toISOString(),
    };
    const jsonStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportPayload, null, 2));
    const link = document.createElement("a");
    link.setAttribute("href", jsonStr);
    link.setAttribute("download", `${project.name.replace(/\s+/g, "_")}_Trial_${activeTrial.animalNumber}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("JSON data export downloaded!");
  };

  return (
    <div className="min-h-screen bg-[#f7faf9] text-[#142d31] selection:bg-[#08796f]/20 dark:bg-[#071318] dark:text-[#e4f0ef]">
      {/* -------------------------------------------------------------------- */}
      {/* TOP NAVIGATION BAR                                                   */}
      {/* -------------------------------------------------------------------- */}
      <header className="sticky top-0 z-40 border-b border-[#c8d9d7]/70 bg-white/80 backdrop-blur-md dark:border-white/[0.08] dark:bg-[#071318]/80">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Link
              to="/dashboard"
              className="flex items-center gap-1.5 rounded-lg border border-[#c8d9d7] bg-white px-2.5 py-1 text-xs font-semibold text-muted-foreground shadow-2xs hover:bg-[#eef5f4] dark:border-white/10 dark:bg-white/[0.04] dark:hover:bg-white/[0.08]"
            >
              <ArrowLeft className="size-3.5" />
              <span>Dashboard</span>
            </Link>

            <span className="text-muted-foreground/40">/</span>

            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-muted-foreground uppercase">Project:</span>
              <span className="font-semibold text-foreground">{project.name}</span>
              <span className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-bold ${project.templateColor}`}>
                {project.templateShort}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />

            <Button
              size="sm"
              variant="outline"
              onClick={handleExportCSV}
              className="h-8 gap-1.5 border-[#c8d9d7] bg-white text-xs font-semibold shadow-2xs hover:bg-[#eef5f4] dark:border-white/10 dark:bg-white/[0.04] dark:hover:bg-white/[0.08]"
            >
              <Download className="size-3.5" />
              <span className="hidden sm:inline">Export CSV</span>
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() => window.print()}
              className="h-8 gap-1.5 border-[#c8d9d7] bg-white text-xs font-semibold shadow-2xs hover:bg-[#eef5f4] dark:border-white/10 dark:bg-white/[0.04] dark:hover:bg-white/[0.08]"
            >
              <Printer className="size-3.5" />
              <span className="hidden sm:inline">Print Report</span>
            </Button>

            <Button
              size="sm"
              onClick={() => navigate(`/setup?projectId=${encodeURIComponent(project.id)}&template=${project.templateId}`)}
              className="h-8 gap-1.5 bg-[#08796f] px-3 text-xs font-bold text-white shadow-xs hover:bg-[#0a8b80] dark:bg-[#52d8c4] dark:text-[#041614] dark:hover:bg-[#44cbb9]"
            >
              <Play className="size-3.5" />
              <span>Record New Trial</span>
            </Button>
          </div>
        </div>
      </header>

      {/* -------------------------------------------------------------------- */}
      {/* MAIN CONTAINER                                                       */}
      {/* -------------------------------------------------------------------- */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">
        {/* HERO PROJECT BANNER & TRIAL SELECTOR */}
        <div className="relative overflow-hidden rounded-2xl border border-[#c4d7d4] bg-gradient-to-br from-white via-[#f5faf9] to-[#ebf5f3] p-6 shadow-sm dark:border-white/[0.08] dark:from-[#091a20] dark:via-[#071318] dark:to-[#0b1f26]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-md px-2 py-0.5 font-mono text-xs font-bold ${project.templateColor}`}>
                  {project.templateName} ({project.templateShort})
                </span>
                <span className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 font-mono text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                  Status: {project.status.toUpperCase()}
                </span>
                <span className="text-xs text-muted-foreground font-mono">
                  Created: {project.createdAt}
                </span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-[#0e272b] dark:text-[#e4f0ef] sm:text-3xl">
                {project.name}
              </h1>
              <p className="text-xs text-muted-foreground max-w-3xl leading-relaxed sm:text-sm">
                {project.description}
              </p>
              <div className="flex flex-wrap items-center gap-4 pt-1 font-mono text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <User className="size-3.5 text-[#08796f] dark:text-[#52d8c4]" />
                  PI: {project.investigator}
                </span>
                <span className="flex items-center gap-1.5">
                  <FlaskConical className="size-3.5 text-[#08796f] dark:text-[#52d8c4]" />
                  Model: {project.strain}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="size-3.5 text-[#08796f] dark:text-[#52d8c4]" />
                  Last Updated: {project.lastModified}
                </span>
              </div>
            </div>

            {/* Trial Selection Switcher */}
            <div className="flex flex-col gap-2 rounded-xl border border-[#c4d7d4] bg-white/80 p-3 shadow-2xs backdrop-blur-xs dark:border-white/10 dark:bg-black/30 lg:w-80">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="flex items-center gap-1.5 text-muted-foreground font-mono">
                  <Sliders className="size-3.5 text-[#08796f] dark:text-[#52d8c4]" />
                  Select Recorded Trial:
                </span>
                <span className="font-mono text-[11px] text-[#08796f] dark:text-[#52d8c4]">
                  {trials.length} total
                </span>
              </div>

              <select
                value={selectedTrialId}
                onChange={(e) => setSelectedTrialId(e.target.value)}
                className="w-full rounded-lg border border-[#c8d9d7] bg-white px-3 py-1.5 font-mono text-xs font-semibold text-foreground shadow-2xs focus:border-[#08796f] focus:outline-none dark:border-white/15 dark:bg-[#071318]"
              >
                {trials.map((t) => (
                  <option key={t.id} value={t.id}>
                    Trial #{t.trialNumber} · {t.animalNumber} ({t.groupNumber})
                  </option>
                ))}
              </select>

              {activeTrial && (
                <div className="flex items-center justify-between text-[11px] text-muted-foreground font-mono pt-1 border-t border-muted/20">
                  <span>Duration: {activeTrial.durationSeconds}s</span>
                  <span>Dist: {(activeTrial.metrics.totalDistanceCm / 100).toFixed(1)}m</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* -------------------------------------------------------------------- */}
        {/* KPI STAT CARDS ROW                                                   */}
        {/* -------------------------------------------------------------------- */}
        {activeTrial && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {/* Total Distance */}
            <div className="rounded-xl border border-[#c8d9d7] bg-white p-3.5 shadow-2xs dark:border-white/[0.08] dark:bg-[#0b1b20]">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase font-mono">Total Distance</span>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-2xl font-bold tracking-tight text-[#08796f] dark:text-[#52d8c4]">
                  {activeTrial.metrics.totalDistanceM}
                </span>
                <span className="text-xs text-muted-foreground font-mono">meters</span>
              </div>
              <p className="mt-1 text-[10px] text-muted-foreground font-mono">
                {activeTrial.metrics.totalDistanceCm.toLocaleString()} cm traveled
              </p>
            </div>

            {/* Mean Velocity */}
            <div className="rounded-xl border border-[#c8d9d7] bg-white p-3.5 shadow-2xs dark:border-white/[0.08] dark:bg-[#0b1b20]">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase font-mono">Mean Speed</span>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-2xl font-bold tracking-tight text-[#08796f] dark:text-[#52d8c4]">
                  {activeTrial.metrics.meanSpeedCmS}
                </span>
                <span className="text-xs text-muted-foreground font-mono">cm/s</span>
              </div>
              <p className="mt-1 text-[10px] text-muted-foreground font-mono">
                Peak: {activeTrial.metrics.maxSpeedCmS} cm/s
              </p>
            </div>

            {/* Immobility / Freezing */}
            <div className="rounded-xl border border-[#c8d9d7] bg-white p-3.5 shadow-2xs dark:border-white/[0.08] dark:bg-[#0b1b20]">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase font-mono">Immobility Time</span>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400">
                  {activeTrial.metrics.immobilitySeconds}
                </span>
                <span className="text-xs text-muted-foreground font-mono">sec</span>
              </div>
              <p className="mt-1 text-[10px] text-muted-foreground font-mono">
                {activeTrial.metrics.immobilityPercent}% freezing ratio
              </p>
            </div>

            {/* Active Bouts */}
            <div className="rounded-xl border border-[#c8d9d7] bg-white p-3.5 shadow-2xs dark:border-white/[0.08] dark:bg-[#0b1b20]">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase font-mono">Locomotor Bouts</span>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-2xl font-bold tracking-tight text-[#08796f] dark:text-[#52d8c4]">
                  {activeTrial.metrics.boutsCount}
                </span>
                <span className="text-xs text-muted-foreground font-mono">episodes</span>
              </div>
              <p className="mt-1 text-[10px] text-muted-foreground font-mono">
                {activeTrial.metrics.mobileSeconds}s total mobile
              </p>
            </div>

            {/* Zone Crossings */}
            <div className="rounded-xl border border-[#c8d9d7] bg-white p-3.5 shadow-2xs dark:border-white/[0.08] dark:bg-[#0b1b20]">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase font-mono">Zone Entries</span>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-2xl font-bold tracking-tight text-[#08796f] dark:text-[#52d8c4]">
                  {activeTrial.metrics.zoneEntriesTotal}
                </span>
                <span className="text-xs text-muted-foreground font-mono">crossings</span>
              </div>
              <p className="mt-1 text-[10px] text-muted-foreground font-mono">
                Across {activeTrial.zoneStats.length} arena zones
              </p>
            </div>

            {/* Paradigm Specific Index */}
            <div className="rounded-xl border border-[#c8d9d7] bg-white p-3.5 shadow-2xs dark:border-white/[0.08] dark:bg-[#0b1b20]">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase font-mono truncate block">
                {activeTrial.metrics.primaryIndexLabel}
              </span>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-2xl font-bold tracking-tight text-purple-600 dark:text-purple-400">
                  {activeTrial.metrics.primaryIndexValue}
                </span>
              </div>
              <p className="mt-1 text-[10px] text-muted-foreground font-mono">
                Primary behavioral endpoint
              </p>
            </div>
          </div>
        )}

        {/* -------------------------------------------------------------------- */}
        {/* TAB CONTROLS (Graphs, Tables, Settings, Trials History)             */}
        {/* -------------------------------------------------------------------- */}
        <div className="flex border-b border-[#c8d9d7] dark:border-white/10">
          <button
            type="button"
            onClick={() => setActiveTab("graphs")}
            className={`flex items-center gap-2 border-b-2 px-5 py-3 font-mono text-xs font-bold transition-colors ${
              activeTab === "graphs"
                ? "border-[#08796f] text-[#08796f] dark:border-[#52d8c4] dark:text-[#52d8c4]"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <LineChart className="size-4" />
            <span>Results &amp; Graphs</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("tables")}
            className={`flex items-center gap-2 border-b-2 px-5 py-3 font-mono text-xs font-bold transition-colors ${
              activeTab === "tables"
                ? "border-[#08796f] text-[#08796f] dark:border-[#52d8c4] dark:text-[#52d8c4]"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <TableIcon className="size-4" />
            <span>Data Tables</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("settings")}
            className={`flex items-center gap-2 border-b-2 px-5 py-3 font-mono text-xs font-bold transition-colors ${
              activeTab === "settings"
                ? "border-[#08796f] text-[#08796f] dark:border-[#52d8c4] dark:text-[#52d8c4]"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <SettingsIcon className="size-4" />
            <span>Experimental Settings</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("trials")}
            className={`flex items-center gap-2 border-b-2 px-5 py-3 font-mono text-xs font-bold transition-colors ${
              activeTab === "trials"
                ? "border-[#08796f] text-[#08796f] dark:border-[#52d8c4] dark:text-[#52d8c4]"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Clock className="size-4" />
            <span>All Recorded Trials ({trials.length})</span>
          </button>
        </div>

        {/* -------------------------------------------------------------------- */}
        {/* TAB 1: RESULTS WITH GRAPHS                                           */}
        {/* -------------------------------------------------------------------- */}
        {activeTab === "graphs" && activeTrial && (
          <div className="space-y-6">
            {/* GRAPH 1: VELOCITY OVER TIME */}
            <div className="rounded-2xl border border-[#c8d9d7] bg-white p-5 shadow-2xs dark:border-white/[0.08] dark:bg-[#0b1b20]">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#e4efec] dark:border-white/[0.06]">
                <div>
                  <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
                    <Activity className="size-4 text-[#08796f] dark:text-[#52d8c4]" />
                    Locomotor Velocity Timeline (Speed vs. Time)
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Instantaneous speed in cm/s across trial duration. Dotted line marks immobility threshold (2.0 cm/s).
                  </p>
                </div>
                {hoveredSpeedPoint && (
                  <div className="font-mono text-xs px-2.5 py-1 rounded bg-[#08796f]/10 text-[#08796f] dark:text-[#52d8c4]">
                    Time: {hoveredSpeedPoint.t}s · Speed: {hoveredSpeedPoint.speed} cm/s
                  </div>
                )}
              </div>

              {/* Responsive SVG Speed Chart */}
              <div className="relative mt-4 h-60 w-full overflow-hidden">
                {(() => {
                  const pts = activeTrial.speedSeries;
                  const speedValues = pts.map((p) => p.speed).filter((v) => Number.isFinite(v));
                  const maxSpeedRecorded = speedValues.length ? Math.max(...speedValues) : 25;

                  // Dynamic clean upper bound
                  function computeChartYMax(val: number) {
                    if (val <= 25) return 30;
                    if (val <= 35) return 40;
                    if (val <= 45) return 50;
                    if (val <= 70) return 80;
                    if (val <= 90) return 100;
                    if (val <= 140) return 150;
                    if (val <= 190) return 200;
                    if (val <= 280) return 300;
                    return Math.max(30, Math.ceil(val / 50) * 50);
                  }

                  const yMax = computeChartYMax(maxSpeedRecorded);
                  const gridTicks = [
                    0,
                    Math.round(yMax * 0.25),
                    Math.round(yMax * 0.5),
                    Math.round(yMax * 0.75),
                    yMax,
                  ];

                  const getY = (speed: number) => {
                    const clamped = Math.max(0, Math.min(speed, yMax));
                    return 220 - (clamped / yMax) * 200;
                  };

                  const maxT = Math.max(1, activeTrial.durationSeconds);
                  const pathData =
                    pts.length >= 2
                      ? pts
                          .map((p, i) => {
                            const x = 40 + (Math.max(0, Math.min(p.t, maxT)) / maxT) * 940;
                            const y = getY(p.speed);
                            return `${i === 0 ? "M" : "L"} ${x} ${y}`;
                          })
                          .join(" ")
                      : "";

                  const closePath = pathData ? `${pathData} L 980 220 L 40 220 Z` : "";
                  const yThresh = getY(2.0);

                  return (
                    <svg
                      viewBox="0 0 1000 240"
                      className="h-full w-full overflow-hidden"
                      preserveAspectRatio="none"
                      onMouseLeave={() => setHoveredSpeedPoint(null)}
                    >
                      <defs>
                        <clipPath id="speedPlotClip">
                          <rect x="40" y="10" width="940" height="215" rx="2" />
                        </clipPath>
                        <linearGradient id="speedGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#52d8c4" stopOpacity="0.45" />
                          <stop offset="100%" stopColor="#52d8c4" stopOpacity="0.02" />
                        </linearGradient>
                      </defs>

                      {/* Horizontal Grid lines */}
                      {gridTicks.map((v) => {
                        const y = getY(v);
                        return (
                          <g key={v}>
                            <line x1="40" y1={y} x2="980" y2={y} stroke="rgba(150, 150, 150, 0.15)" strokeDasharray="3 3" />
                            <text x="32" y={y + 4} textAnchor="end" fontSize="10" fill="gray" fontFamily="monospace">
                              {v}
                            </text>
                          </g>
                        );
                      })}

                      {/* Immobility Threshold Line at 2 cm/s */}
                      <g>
                        <line x1="40" y1={yThresh} x2="980" y2={yThresh} stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="4 4" />
                        <text x="985" y={yThresh + 3} fontSize="9" fill="#f59e0b" fontFamily="monospace">
                          Freezing &lt; 2 cm/s
                        </text>
                      </g>

                      {/* Clipped Area Fill & Line Stroke */}
                      {pathData && (
                        <g clipPath="url(#speedPlotClip)">
                          <path d={closePath} fill="url(#speedGrad)" />
                          <path d={pathData} fill="none" stroke="#08796f" strokeWidth="2" className="dark:stroke-[#52d8c4]" />
                        </g>
                      )}

                      {/* Interactive hover overlays */}
                      {pts.map((p, i) => {
                        if (i % 6 !== 0) return null;
                        const x = 40 + (Math.max(0, Math.min(p.t, maxT)) / maxT) * 940;
                        const y = getY(p.speed);
                        return (
                          <circle
                            key={`${p.t}-${i}`}
                            cx={x}
                            cy={y}
                            r="4"
                            fill="transparent"
                            className="cursor-pointer hover:fill-[#52d8c4]"
                            onMouseEnter={() => setHoveredSpeedPoint(p)}
                          />
                        );
                      })}
                    </svg>
                  );
                })()}
              </div>

              {/* Time Axis Labels */}
              <div className="flex justify-between px-10 pt-2 font-mono text-[10px] text-muted-foreground">
                <span>0s (Start)</span>
                <span>{Math.round(activeTrial.durationSeconds * 0.25)}s</span>
                <span>{Math.round(activeTrial.durationSeconds * 0.5)}s (Half)</span>
                <span>{Math.round(activeTrial.durationSeconds * 0.75)}s</span>
                <span>{activeTrial.durationSeconds}s (End)</span>
              </div>
            </div>

            {/* GRAPHS ROW 2: ZONE DWELL DISTRIBUTION & CUMULATIVE DISTANCE */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* ZONE DWELL DISTRIBUTION */}
              <div className="rounded-2xl border border-[#c8d9d7] bg-white p-5 shadow-2xs dark:border-white/[0.08] dark:bg-[#0b1b20]">
                <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
                  <BarChart3 className="size-4 text-[#08796f] dark:text-[#52d8c4]" />
                  Apparatus Zone Dwell Time Distribution
                </h3>
                <p className="text-xs text-muted-foreground pb-4 border-b border-[#e4efec] dark:border-white/[0.06]">
                  Proportion of trial time and cumulative seconds spent residing in each apparatus sector.
                </p>

                <div className="mt-4 space-y-3">
                  {activeTrial.zoneStats.map((z) => (
                    <div key={z.id} className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="flex items-center gap-2 font-semibold">
                          <span className="size-2.5 rounded-full" style={{ backgroundColor: z.color }} />
                          {z.name}
                        </span>
                        <span className="font-bold text-foreground">
                          {z.dwellPercent}% ({z.timeSeconds}s · {z.entries} entries)
                        </span>
                      </div>
                      <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted/30">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.max(2, z.dwellPercent)}%`,
                            backgroundColor: z.color,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* CUMULATIVE DISTANCE PROGRESSION */}
              <div className="rounded-2xl border border-[#c8d9d7] bg-white p-5 shadow-2xs dark:border-white/[0.08] dark:bg-[#0b1b20]">
                <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
                  <TrendingUp className="size-4 text-[#08796f] dark:text-[#52d8c4]" />
                  Cumulative Exploration Distance Progression
                </h3>
                <p className="text-xs text-muted-foreground pb-4 border-b border-[#e4efec] dark:border-white/[0.06]">
                  Total locomotor distance accumulated steadily over the trial timeline.
                </p>

                <div className="relative mt-4 h-48 w-full overflow-hidden">
                  <svg viewBox="0 0 500 180" className="h-full w-full overflow-hidden" preserveAspectRatio="none">
                    <defs>
                      <clipPath id="distPlotClip">
                        <rect x="30" y="10" width="450" height="155" rx="2" />
                      </clipPath>
                      <linearGradient id="distGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.02" />
                      </linearGradient>
                    </defs>
                    {/* Stepped accumulation line */}
                    {(() => {
                      const pts = activeTrial.speedSeries;
                      if (pts.length === 0) return null;
                      let acc = 0;
                      const totalDist = activeTrial.metrics.totalDistanceM;
                      const maxT = activeTrial.durationSeconds;
                      const coords: [number, number][] = [];
                      for (const p of pts) {
                        acc += (p.speed * 0.5) / 100;
                        const x = 30 + (Math.max(0, Math.min(p.t, maxT)) / maxT) * 450;
                        const y = 160 - (Math.min(totalDist, acc) / Math.max(1, totalDist)) * 140;
                        coords.push([x, y]);
                      }
                      const pathStr = coords.map((c, i) => `${i === 0 ? "M" : "L"} ${c[0]} ${c[1]}`).join(" ");
                      const areaStr = `${pathStr} L 480 160 L 30 160 Z`;
                      return (
                        <g clipPath="url(#distPlotClip)">
                          <path d={areaStr} fill="url(#distGrad)" />
                          <path d={pathStr} fill="none" stroke="#38bdf8" strokeWidth="2" />
                        </g>
                      );
                    })()}
                  </svg>
                </div>
                <div className="flex justify-between font-mono text-[10px] text-muted-foreground px-4">
                  <span>0m</span>
                  <span>{(activeTrial.metrics.totalDistanceM * 0.5).toFixed(1)}m</span>
                  <span>{activeTrial.metrics.totalDistanceM}m (Total)</span>
                </div>
              </div>
            </div>

            {/* GRAPHS ROW 3: TRACK MAP & HEATMAP */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* SPATIAL TRACK MAP */}
              <div className="rounded-2xl border border-[#c8d9d7] bg-white p-5 shadow-2xs dark:border-white/[0.08] dark:bg-[#0b1b20]">
                <div className="flex items-center justify-between pb-3 border-b border-[#e4efec] dark:border-white/[0.06]">
                  <div>
                    <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
                      <MapPin className="size-4 text-[#08796f] dark:text-[#52d8c4]" />
                      Spatial Trajectory Track Map
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      2D locomotor path traces across apparatus geometry. Green = start, Red = finish.
                    </p>
                  </div>
                  <Badge variant="outline" className="font-mono text-[10px]">
                    {activeTrial.trajectory.length} samples
                  </Badge>
                </div>

                <div className="relative mt-4 aspect-video w-full overflow-hidden rounded-xl border border-black/40 bg-[#071318]">
                  <canvas ref={trackCanvasRef} width={640} height={360} className="h-full w-full object-contain" />
                </div>
              </div>

              {/* OCCUPANCY HEATMAP */}
              <div className="rounded-2xl border border-[#c8d9d7] bg-white p-5 shadow-2xs dark:border-white/[0.08] dark:bg-[#0b1b20]">
                <div className="flex items-center justify-between pb-3 border-b border-[#e4efec] dark:border-white/[0.06]">
                  <div>
                    <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
                      <Flame className="size-4 text-orange-500" />
                      Occupancy Density Heatmap
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Spatial dwell density distribution highlighting peak exploration zones.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-mono">
                    <span className="text-blue-400">Low</span>
                    <div className="h-2 w-16 rounded-full bg-gradient-to-r from-blue-500 via-yellow-400 to-red-500" />
                    <span className="text-red-400">High Peak</span>
                  </div>
                </div>

                <div className="relative mt-4 aspect-video w-full overflow-hidden rounded-xl border border-black/40 bg-[#071318]">
                  <canvas ref={heatmapCanvasRef} width={640} height={360} className="h-full w-full object-contain" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* -------------------------------------------------------------------- */}
        {/* TAB 2: DATA TABLES                                                   */}
        {/* -------------------------------------------------------------------- */}
        {activeTab === "tables" && activeTrial && (
          <div className="space-y-6">
            {/* TABLE 1: SUMMARY METRICS */}
            <div className="overflow-hidden rounded-2xl border border-[#c8d9d7] bg-white shadow-2xs dark:border-white/[0.08] dark:bg-[#0b1b20]">
              <div className="p-4 border-b border-[#e4efec] dark:border-white/[0.06] flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-foreground">Executive Behavioral Endpoints Summary</h3>
                  <p className="text-xs text-muted-foreground">Primary locomotor, thigmotaxic, and paradigm-specific measures</p>
                </div>
                <Button size="sm" variant="outline" onClick={handleExportCSV} className="h-7 text-xs font-mono">
                  <Download className="size-3" /> Export Table
                </Button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#f5f9f8] font-mono text-[10px] uppercase text-muted-foreground border-b border-[#d8e8e5] dark:bg-white/[0.02] dark:border-white/[0.08]">
                    <tr>
                      <th className="px-4 py-3">Parameter / Metric</th>
                      <th className="px-4 py-3">Recorded Value</th>
                      <th className="px-4 py-3">Unit</th>
                      <th className="px-4 py-3">Standard Reference Range</th>
                      <th className="px-4 py-3">Biological Interpretation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e4efec] dark:divide-white/[0.06] font-mono">
                    <tr>
                      <td className="px-4 py-3 font-semibold text-foreground">Total Distance Traveled</td>
                      <td className="px-4 py-3 font-bold text-[#08796f] dark:text-[#52d8c4]">{activeTrial.metrics.totalDistanceM}</td>
                      <td className="px-4 py-3 text-muted-foreground">meters</td>
                      <td className="px-4 py-3 text-muted-foreground">12.0 – 25.0 m</td>
                      <td className="px-4 py-3 font-sans text-xs">Overall ambulatory locomotion &amp; exploratory drive</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 font-semibold text-foreground">Mean Locomotor Speed</td>
                      <td className="px-4 py-3 font-bold text-[#08796f] dark:text-[#52d8c4]">{activeTrial.metrics.meanSpeedCmS}</td>
                      <td className="px-4 py-3 text-muted-foreground">cm/s</td>
                      <td className="px-4 py-3 text-muted-foreground">8.0 – 16.0 cm/s</td>
                      <td className="px-4 py-3 font-sans text-xs">General motor capability &amp; arousal state</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 font-semibold text-foreground">Maximum Peak Velocity</td>
                      <td className="px-4 py-3 font-bold text-[#08796f] dark:text-[#52d8c4]">{activeTrial.metrics.maxSpeedCmS}</td>
                      <td className="px-4 py-3 text-muted-foreground">cm/s</td>
                      <td className="px-4 py-3 text-muted-foreground">22.0 – 35.0 cm/s</td>
                      <td className="px-4 py-3 font-sans text-xs">Maximum sprint capacity during exploratory darts</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 font-semibold text-foreground">Immobility / Freezing Time</td>
                      <td className="px-4 py-3 font-bold text-amber-600 dark:text-amber-400">{activeTrial.metrics.immobilitySeconds}</td>
                      <td className="px-4 py-3 text-muted-foreground">seconds ({activeTrial.metrics.immobilityPercent}%)</td>
                      <td className="px-4 py-3 text-muted-foreground">&lt; 60 s (10–20%)</td>
                      <td className="px-4 py-3 font-sans text-xs">Behavioral arrest indicative of anxiety or habituation</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 font-semibold text-foreground">Active Locomotor Bouts</td>
                      <td className="px-4 py-3 font-bold text-[#08796f] dark:text-[#52d8c4]">{activeTrial.metrics.boutsCount}</td>
                      <td className="px-4 py-3 text-muted-foreground">bouts</td>
                      <td className="px-4 py-3 text-muted-foreground">12 – 28 bouts</td>
                      <td className="px-4 py-3 font-sans text-xs">Discrete episodes of purposeful exploration</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 font-semibold text-foreground">Total Arena Zone Crossings</td>
                      <td className="px-4 py-3 font-bold text-[#08796f] dark:text-[#52d8c4]">{activeTrial.metrics.zoneEntriesTotal}</td>
                      <td className="px-4 py-3 text-muted-foreground">entries</td>
                      <td className="px-4 py-3 text-muted-foreground">15 – 45 crossings</td>
                      <td className="px-4 py-3 font-sans text-xs">Transitions between designated apparatus sectors</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 font-semibold text-foreground">{activeTrial.metrics.primaryIndexLabel}</td>
                      <td className="px-4 py-3 font-bold text-purple-600 dark:text-purple-400">{activeTrial.metrics.primaryIndexValue}</td>
                      <td className="px-4 py-3 text-muted-foreground">Index / Ratio</td>
                      <td className="px-4 py-3 text-muted-foreground">Protocol standard</td>
                      <td className="px-4 py-3 font-sans text-xs">Primary paradigm outcome endpoint for behavioral comparison</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* TABLE 2: ZONE-BY-ZONE METRICS */}
            <div className="overflow-hidden rounded-2xl border border-[#c8d9d7] bg-white shadow-2xs dark:border-white/[0.08] dark:bg-[#0b1b20]">
              <div className="p-4 border-b border-[#e4efec] dark:border-white/[0.06] flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-foreground">Zone-by-Zone Behavioral Analytics</h3>
                  <p className="text-xs text-muted-foreground">Entries, dwell durations, latencies, and localized velocity per sector</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#f5f9f8] font-mono text-[10px] uppercase text-muted-foreground border-b border-[#d8e8e5] dark:bg-white/[0.02] dark:border-white/[0.08]">
                    <tr>
                      <th className="px-4 py-3">Zone Sector</th>
                      <th className="px-4 py-3 text-center">Entries</th>
                      <th className="px-4 py-3 text-center">Total Dwell (s)</th>
                      <th className="px-4 py-3 text-center">Dwell %</th>
                      <th className="px-4 py-3 text-center">Latency to 1st Entry (s)</th>
                      <th className="px-4 py-3 text-center">Mean Velocity (cm/s)</th>
                      <th className="px-4 py-3 text-right">Distance in Zone (cm)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e4efec] dark:divide-white/[0.06] font-mono">
                    {activeTrial.zoneStats.map((z) => (
                      <tr key={z.id} className="hover:bg-muted/10 transition-colors">
                        <td className="px-4 py-3 font-semibold flex items-center gap-2">
                          <span className="size-2.5 rounded-full" style={{ backgroundColor: z.color }} />
                          <span className="font-sans font-medium text-foreground">{z.name}</span>
                        </td>
                        <td className="px-4 py-3 text-center font-bold">{z.entries}</td>
                        <td className="px-4 py-3 text-center">{z.timeSeconds}s</td>
                        <td className="px-4 py-3 text-center font-bold text-[#08796f] dark:text-[#52d8c4]">{z.dwellPercent}%</td>
                        <td className="px-4 py-3 text-center">{z.firstEntryLatency !== null ? `${z.firstEntryLatency}s` : "None"}</td>
                        <td className="px-4 py-3 text-center">{z.meanSpeed ?? "—"}</td>
                        <td className="px-4 py-3 text-right">{z.distanceCm ? `${z.distanceCm} cm` : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* -------------------------------------------------------------------- */}
        {/* TAB 3: EXPERIMENTAL SETTINGS                                         */}
        {/* -------------------------------------------------------------------- */}
        {activeTab === "settings" && activeTrial && (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* APPARATUS & ARENA GEOMETRY */}
            <div className="rounded-2xl border border-[#c8d9d7] bg-white p-5 shadow-2xs dark:border-white/[0.08] dark:bg-[#0b1b20]">
              <h3 className="font-bold text-sm text-foreground flex items-center gap-2 pb-3 border-b border-[#e4efec] dark:border-white/[0.06]">
                <Compass className="size-4 text-[#08796f] dark:text-[#52d8c4]" />
                Apparatus &amp; Physical Geometry Settings
              </h3>
              <dl className="mt-4 space-y-3 font-mono text-xs">
                <div className="flex justify-between py-1 border-b border-muted/10">
                  <dt className="text-muted-foreground font-sans">Apparatus Paradigm:</dt>
                  <dd className="font-bold text-foreground">{activeTrial.mazeName}</dd>
                </div>
                <div className="flex justify-between py-1 border-b border-muted/10">
                  <dt className="text-muted-foreground font-sans">Arena Boundary Shape:</dt>
                  <dd className="capitalize text-foreground font-semibold">{activeTrial.experimentalSettings.arena.shape}</dd>
                </div>
                <div className="flex justify-between py-1 border-b border-muted/10">
                  <dt className="text-muted-foreground font-sans">Arena Dimensions (Pixels):</dt>
                  <dd className="text-foreground">
                    {Math.round(activeTrial.experimentalSettings.arena.rect.w)} × {Math.round(activeTrial.experimentalSettings.arena.rect.h)} px
                  </dd>
                </div>
                <div className="flex justify-between py-1 border-b border-muted/10">
                  <dt className="text-muted-foreground font-sans">Calibrated Physical Dimensions:</dt>
                  <dd className="text-foreground font-bold">
                    {Math.round(activeTrial.experimentalSettings.arena.rect.w * 0.1)} × {Math.round(activeTrial.experimentalSettings.arena.rect.h * 0.1)} cm
                  </dd>
                </div>
                <div className="flex justify-between py-1 border-b border-muted/10">
                  <dt className="text-muted-foreground font-sans">Arena Orientation Rotation:</dt>
                  <dd className="text-foreground">{(activeTrial.experimentalSettings.arena.rotation ?? 0).toFixed(1)}°</dd>
                </div>
                <div className="flex justify-between py-1">
                  <dt className="text-muted-foreground font-sans">Spatial Scale Factor:</dt>
                  <dd className="text-[#08796f] dark:text-[#52d8c4] font-bold">1 px = 0.10 cm (10 px/cm)</dd>
                </div>
              </dl>
            </div>

            {/* COMPUTER VISION TRACKING SETTINGS */}
            <div className="rounded-2xl border border-[#c8d9d7] bg-white p-5 shadow-2xs dark:border-white/[0.08] dark:bg-[#0b1b20]">
              <h3 className="font-bold text-sm text-foreground flex items-center gap-2 pb-3 border-b border-[#e4efec] dark:border-white/[0.06]">
                <Scan className="size-4 text-[#08796f] dark:text-[#52d8c4]" />
                Computer Vision Detection &amp; Segmentation Settings
              </h3>
              <dl className="mt-4 space-y-3 font-mono text-xs">
                <div className="flex justify-between py-1 border-b border-muted/10">
                  <dt className="text-muted-foreground font-sans">Detection Mode:</dt>
                  <dd className="capitalize font-bold text-foreground">{activeTrial.experimentalSettings.settings.mode} animal detection</dd>
                </div>
                <div className="flex justify-between py-1 border-b border-muted/10">
                  <dt className="text-muted-foreground font-sans">Sensitivity Threshold:</dt>
                  <dd className="text-foreground font-bold">{activeTrial.experimentalSettings.settings.threshold} / 255</dd>
                </div>
                <div className="flex justify-between py-1 border-b border-muted/10">
                  <dt className="text-muted-foreground font-sans">Minimum Animal Area Filter:</dt>
                  <dd className="text-foreground">{activeTrial.experimentalSettings.settings.minArea} px²</dd>
                </div>
                <div className="flex justify-between py-1 border-b border-muted/10">
                  <dt className="text-muted-foreground font-sans">Vision Frame Sampling Rate:</dt>
                  <dd className="text-foreground">{activeTrial.experimentalSettings.settings.fps} FPS</dd>
                </div>
                <div className="flex justify-between py-1 border-b border-muted/10">
                  <dt className="text-muted-foreground font-sans">Animal Blob Landmarks:</dt>
                  <dd className="text-emerald-600 dark:text-emerald-400 font-bold">Nose (Red), Body (Cyan), Tail (Purple)</dd>
                </div>
                <div className="flex justify-between py-1">
                  <dt className="text-muted-foreground font-sans">Video Source:</dt>
                  <dd className="capitalize text-foreground font-bold">{activeTrial.experimentalSettings.videoSource}</dd>
                </div>
              </dl>
            </div>

            {/* SUBJECT & PROTOCOL METADATA */}
            <div className="rounded-2xl border border-[#c8d9d7] bg-white p-5 shadow-2xs dark:border-white/[0.08] dark:bg-[#0b1b20]">
              <h3 className="font-bold text-sm text-foreground flex items-center gap-2 pb-3 border-b border-[#e4efec] dark:border-white/[0.06]">
                <User className="size-4 text-[#08796f] dark:text-[#52d8c4]" />
                Subject &amp; Cohort Information
              </h3>
              <dl className="mt-4 space-y-3 font-mono text-xs">
                <div className="flex justify-between py-1 border-b border-muted/10">
                  <dt className="text-muted-foreground font-sans">Animal Number / Subject ID:</dt>
                  <dd className="font-bold text-foreground text-sm text-[#08796f] dark:text-[#52d8c4]">{activeTrial.animalNumber}</dd>
                </div>
                <div className="flex justify-between py-1 border-b border-muted/10">
                  <dt className="text-muted-foreground font-sans">Group / Cohort Assignment:</dt>
                  <dd className="font-bold text-foreground">{activeTrial.groupNumber}</dd>
                </div>
                <div className="flex justify-between py-1 border-b border-muted/10">
                  <dt className="text-muted-foreground font-sans">Species &amp; Genetic Strain:</dt>
                  <dd className="text-foreground">{activeTrial.strain}</dd>
                </div>
                <div className="flex justify-between py-1 border-b border-muted/10">
                  <dt className="text-muted-foreground font-sans">Trial Duration:</dt>
                  <dd className="text-foreground">{activeTrial.durationSeconds}s ({Math.round(activeTrial.durationSeconds / 60)} minutes)</dd>
                </div>
                <div className="flex justify-between py-1">
                  <dt className="text-muted-foreground font-sans">Habituation Period:</dt>
                  <dd className="text-foreground">{activeTrial.experimentalSettings.habituationDelay} seconds</dd>
                </div>
              </dl>
            </div>

            {/* ZONES CONFIGURATION LIST */}
            <div className="rounded-2xl border border-[#c8d9d7] bg-white p-5 shadow-2xs dark:border-white/[0.08] dark:bg-[#0b1b20]">
              <h3 className="font-bold text-sm text-foreground flex items-center gap-2 pb-3 border-b border-[#e4efec] dark:border-white/[0.06]">
                <Layers className="size-4 text-[#08796f] dark:text-[#52d8c4]" />
                Configured Apparatus Zones ({activeTrial.zoneStats.length})
              </h3>
              <div className="mt-4 space-y-2.5">
                {activeTrial.zoneStats.map((z, idx) => (
                  <div key={z.id} className="flex items-center justify-between rounded-lg border border-muted/20 p-2 text-xs font-mono">
                    <span className="flex items-center gap-2 font-semibold">
                      <span className="size-3 rounded-full" style={{ backgroundColor: z.color }} />
                      <span className="font-sans">{z.name}</span>
                    </span>
                    <Badge variant="outline" className="font-mono text-[10px]">
                      Zone #{idx + 1}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* -------------------------------------------------------------------- */}
        {/* TAB 4: ALL RECORDED TRIALS                                           */}
        {/* -------------------------------------------------------------------- */}
        {activeTab === "trials" && (
          <div className="overflow-hidden rounded-2xl border border-[#c8d9d7] bg-white shadow-2xs dark:border-white/[0.08] dark:bg-[#0b1b20]">
            <div className="p-4 border-b border-[#e4efec] dark:border-white/[0.06] flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-foreground">Cohort Trial Recording History</h3>
                <p className="text-xs text-muted-foreground">All experimental trials saved under {project.name}</p>
              </div>
              <Button
                size="sm"
                onClick={() => navigate(`/setup?projectId=${encodeURIComponent(project.id)}&template=${project.templateId}`)}
                className="h-8 gap-1.5 bg-[#08796f] text-xs font-bold text-white hover:bg-[#0a8b80] dark:bg-[#52d8c4] dark:text-[#041614]"
              >
                <Play className="size-3" />
                <span>+ Run Next Trial</span>
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-[#f5f9f8] text-[10px] uppercase text-muted-foreground border-b border-[#d8e8e5] dark:bg-white/[0.02] dark:border-white/[0.08]">
                  <tr>
                    <th className="px-4 py-3">Trial #</th>
                    <th className="px-4 py-3">Subject / Animal #</th>
                    <th className="px-4 py-3">Group / Cohort</th>
                    <th className="px-4 py-3">Date &amp; Time</th>
                    <th className="px-4 py-3 text-center">Duration</th>
                    <th className="px-4 py-3 text-center">Distance (m)</th>
                    <th className="px-4 py-3 text-center">Primary Outcome</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e4efec] dark:divide-white/[0.06]">
                  {trials.map((t) => (
                    <tr
                      key={t.id}
                      className={`hover:bg-muted/10 transition-colors ${
                        t.id === selectedTrialId ? "bg-[#08796f]/5 dark:bg-[#52d8c4]/10" : ""
                      }`}
                    >
                      <td className="px-4 py-3.5 font-bold text-[#08796f] dark:text-[#52d8c4]">
                        #{t.trialNumber}
                      </td>
                      <td className="px-4 py-3.5 font-bold font-sans text-foreground">
                        {t.animalNumber}
                      </td>
                      <td className="px-4 py-3.5 font-sans text-muted-foreground">
                        {t.groupNumber}
                      </td>
                      <td className="px-4 py-3.5 text-muted-foreground text-[11px]">
                        {new Date(t.createdAt).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
                      </td>
                      <td className="px-4 py-3.5 text-center">{t.durationSeconds}s</td>
                      <td className="px-4 py-3.5 text-center font-bold">{t.metrics.totalDistanceM} m</td>
                      <td className="px-4 py-3.5 text-center font-bold text-purple-600 dark:text-purple-400">
                        {t.metrics.primaryIndexValue}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <Button
                          size="sm"
                          variant={t.id === selectedTrialId ? "default" : "outline"}
                          onClick={() => {
                            setSelectedTrialId(t.id);
                            setActiveTab("graphs");
                            toast.info(`Viewing graphs & tables for Trial #${t.trialNumber} (${t.animalNumber})`);
                          }}
                          className={`h-7 px-2.5 text-[11px] font-sans ${
                            t.id === selectedTrialId
                              ? "bg-[#08796f] text-white dark:bg-[#52d8c4] dark:text-[#041614]"
                              : ""
                          }`}
                        >
                          <Eye className="size-3 mr-1" />
                          View Results
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
