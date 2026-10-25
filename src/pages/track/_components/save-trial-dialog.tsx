import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Save, FolderPlus, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import type { TrialInfo } from "@/lib/experiments/trial-info.ts";
import type { TrackSummary } from "@/lib/tracking/metrics.ts";
import { testMeasures } from "@/lib/tracking/test-measures.ts";
import { speedSeries, immobilityBouts } from "@/lib/tracking/analytics.ts";
import { getTemplate } from "@/lib/tracking/templates.ts";
import type { TrackingSession } from "../_hooks/use-tracking-session.ts";
import {
  saveTrialToProject,
  type TrialRecord,
  type ZoneRecord,
} from "@/lib/tracking/project-store.ts";
import type { ProjectItem } from "@/pages/dashboard/page.tsx";

type Props = {
  s: TrackingSession;
  summary: TrackSummary;
  info: TrialInfo;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const DEFAULT_PROJECTS = [
  { id: "proj-1", name: "Novel Spatial Memory & Reversal Learning (Morris Water Maze)" },
  { id: "proj-2", name: "Social Odor Recognition & Olfactory Investigation (APP/PS1)" },
  { id: "proj-3", name: "Dopamine Transporter Knockout Locomotion (Open Field Test)" },
  { id: "proj-4", name: "Prefrontal Lesion Novel Object Recognition" },
  { id: "proj-5", name: "Working Memory Spontaneous Alternation (Y-Maze)" },
];

export default function SaveTrialDialog({ s, summary, info, open, onOpenChange }: Props) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const paramProjectId = searchParams.get("projectId");

  const [projectsList, setProjectsList] = useState<Array<{ id: string; name: string }>>(DEFAULT_PROJECTS);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(paramProjectId || "proj-1");
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newProjectName, setNewProjectName] = useState(info.experimentNo || "");

  const [animalNumber, setAnimalNumber] = useState(info.animalNo || "M-01");
  const [groupNumber, setGroupNumber] = useState(info.group || "Control");
  const [trialSession, setTrialSession] = useState("Trial 1");
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        const raw = localStorage.getItem("amaze:projects");
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setProjectsList(parsed.map((p: ProjectItem) => ({ id: p.id, name: p.name })));
            if (paramProjectId && parsed.some((p: ProjectItem) => p.id === paramProjectId)) {
              setSelectedProjectId(paramProjectId);
            }
          }
        }
      }
    } catch {}
  }, [paramProjectId]);

  const handleSave = () => {
    if (!s.arena) {
      toast.error("Please configure arena before saving trial");
      return;
    }

    setIsSaving(true);
    try {
      let finalProjectId = selectedProjectId;
      let finalProjectName = "Research Project";

      if (isCreatingNew) {
        finalProjectId = `proj-${Date.now()}`;
        finalProjectName = newProjectName.trim() || `Experiment ${new Date().toLocaleDateString()}`;
        
        // Add new project to storage
        const newProj: ProjectItem = {
          id: finalProjectId,
          name: finalProjectName,
          description: notes.trim() || "Automated tracking project session",
          templateId: s.templateId,
          templateName: getTemplate(s.templateId).name,
          templateShort: s.templateId.substring(0, 3).toUpperCase(),
          templateColor: "bg-teal-500/15 text-teal-600 border-teal-500/30",
          investigator: info.investigator || "Dr. Alex Morgan",
          institution: "Neuroscience Institute",
          strain: "C57BL/6J (n=1)",
          trialCount: 1,
          subjectCount: 1,
          totalDuration: `${Math.round(summary.duration)}s`,
          lastModified: "Just now",
          createdAt: new Date().toISOString().split("T")[0],
          status: "completed",
          confidence: 99.2,
          tags: ["Locomotion", "Automated Tracking"],
          metricsSummary: [
            { label: "Total Distance", value: `${(summary.totalDistance / 100).toFixed(1)}`, unit: "m" },
            { label: "Mean Speed", value: `${summary.meanSpeed.toFixed(1)}`, unit: "cm/s" },
            { label: "Immobile Time", value: `${summary.immobileTime.toFixed(1)}`, unit: "s" },
          ],
        };

        const existingRaw = localStorage.getItem("amaze:projects");
        const existingProjects = existingRaw ? JSON.parse(existingRaw) : DEFAULT_PROJECTS;
        localStorage.setItem("amaze:projects", JSON.stringify([newProj, ...existingProjects]));
      } else {
        const found = projectsList.find((p) => p.id === selectedProjectId);
        if (found) finalProjectName = found.name;
      }

      // Convert zones to ZoneRecords
      const zoneRecords: ZoneRecord[] = summary.zones.map((z) => ({
        id: z.id,
        name: z.name,
        color: z.color,
        entries: z.entries,
        timeSeconds: Number(z.time.toFixed(1)),
        dwellPercent: summary.duration > 0 ? Number(((z.time / summary.duration) * 100).toFixed(1)) : 0,
        firstEntryLatency: z.latency !== null ? Number(z.latency.toFixed(1)) : null,
        distanceCm: Number(z.distance.toFixed(1)),
      }));

      // Calculate speed series and bouts
      const series = speedSeries(s.track, s.pxPerCm, 3);
      const bouts = immobilityBouts(series, 2.0, 1.0);
      const measures = testMeasures(s.templateId, { summary, zones: s.zones, track: s.track });

      const centerZone = summary.zones.find((z) => z.id === "center" || z.id === "target");
      const primaryMeasure = measures[0];

      const trialRecord: TrialRecord = {
        id: `trial-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        trialNumber: 1,
        projectId: finalProjectId,
        projectName: finalProjectName,
        animalNumber: animalNumber.trim() || "M-01",
        groupNumber: groupNumber.trim() || "Group A",
        strain: "C57BL/6J WT",
        mazeName: getTemplate(s.templateId).name,
        mazeId: s.templateId,
        templateId: s.templateId,
        createdAt: new Date().toISOString(),
        durationSeconds: Math.round(summary.duration),
        initialDuration: Math.round(summary.duration),
        experimentalSettings: {
          mazeName: getTemplate(s.templateId).name,
          mazeId: s.templateId,
          templateId: s.templateId,
          arena: s.arena,
          zones: s.zones.map((z) => ({ id: z.id, name: z.name, color: z.color, polygon: z.polygon })),
          settings: s.settings,
          contrastMode: s.settings.mode,
          videoSource: s.source?.kind || "video",
          uploadedFileName: s.source?.name || null,
          habituationDelay: 0,
          scaleCmPerPx: 1 / s.pxPerCm,
          notes: notes.trim() || undefined,
        },
        metrics: {
          totalDistanceCm: Number(summary.totalDistance.toFixed(1)),
          totalDistanceM: Number((summary.totalDistance / 100).toFixed(2)),
          meanSpeedCmS: Number(summary.meanSpeed.toFixed(1)),
          maxSpeedCmS: Number(summary.maxSpeed.toFixed(1)),
          immobilitySeconds: Number(summary.immobileTime.toFixed(1)),
          immobilityPercent: summary.duration > 0 ? Number(((summary.immobileTime / summary.duration) * 100).toFixed(1)) : 0,
          mobileSeconds: Number(Math.max(0, summary.duration - summary.immobileTime).toFixed(1)),
          boutsCount: bouts.length,
          latencyToCenterFirstEntry: centerZone?.latency ?? null,
          latencyToTargetFirstEntry: centerZone?.latency ?? null,
          timeInCenterSeconds: centerZone ? Number(centerZone.time.toFixed(1)) : 0,
          timeInTargetSeconds: centerZone ? Number(centerZone.time.toFixed(1)) : 0,
          percentInCenter: centerZone && summary.duration > 0 ? Number(((centerZone.time / summary.duration) * 100).toFixed(1)) : 0,
          percentInTarget: centerZone && summary.duration > 0 ? Number(((centerZone.time / summary.duration) * 100).toFixed(1)) : 0,
          zoneEntriesTotal: summary.zones.reduce((acc, z) => acc + z.entries, 0),
          latencyToFirstZone: summary.zones.length > 0 ? (summary.zones[0].latency ?? 1.2) : 1.2,
          primaryIndexLabel: primaryMeasure?.label || "Key Behavioral Index",
          primaryIndexValue: primaryMeasure && primaryMeasure.value !== null ? `${primaryMeasure.value.toFixed(primaryMeasure.digits)} ${primaryMeasure.unit}`.trim() : "Optimal",
        },
        zones: zoneRecords,
        trajectory: s.track
          .filter((p) => p.found)
          .map((p) => ({
            x: Number(p.x.toFixed(1)),
            y: Number(p.y.toFixed(1)),
            t: Number(p.t.toFixed(2)),
            speed: 0,
          })),
        speedSeries: series.map((s) => ({
          t: Number(s.t.toFixed(2)),
          speed: Number(s.speed.toFixed(2)),
          isMoving: s.speed >= 2.0,
        })),
        paradigmEndpoints: measures.map((m) => ({
          label: m.label,
          value: m.value,
          unit: m.unit,
          hint: m.hint,
        })),
      };

      saveTrialToProject(trialRecord);

      toast.success("Trial successfully saved to project!", {
        description: `Trial recorded under ${finalProjectName}`,
      });

      onOpenChange(false);
      navigate(`/project/${encodeURIComponent(finalProjectId)}`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to save trial to project. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-semibold text-[#153438] dark:text-[#ecf7f5]">
            <CheckCircle2 className="size-5 text-[#08796f] dark:text-[#52d8c4]" />
            Save Trial to Project
          </DialogTitle>
          <DialogDescription className="text-xs text-[#4f6c69] dark:text-[#8ea9a6]">
            Save full behavioral endpoints, 2D trajectory track, velocity timeline, and zones under your research project.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3.5 py-2 text-sm">
          {/* Target Project */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium text-foreground">Target Project</Label>
              <button
                type="button"
                onClick={() => setIsCreatingNew(!isCreatingNew)}
                className="text-[11px] font-semibold text-[#08796f] hover:underline dark:text-[#52d8c4]"
              >
                {isCreatingNew ? "Select existing project" : "+ Create new project"}
              </button>
            </div>
            {isCreatingNew ? (
              <Input
                placeholder="Enter new project name (e.g. Chronic Stress Locomotion)"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                className="h-8.5 text-xs"
              />
            ) : (
              <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                <SelectTrigger className="h-8.5 text-xs">
                  <SelectValue placeholder="Choose project" />
                </SelectTrigger>
                <SelectContent>
                  {projectsList.map((p) => (
                    <SelectItem key={p.id} value={p.id} className="text-xs">
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Animal Number & Group ID */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="save-animal-no" className="text-xs font-medium text-foreground">
                Animal ID / No.
              </Label>
              <Input
                id="save-animal-no"
                placeholder="M-01"
                value={animalNumber}
                onChange={(e) => setAnimalNumber(e.target.value)}
                className="h-8.5 font-mono text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="save-group-no" className="text-xs font-medium text-foreground">
                Cohort / Group ID
              </Label>
              <Input
                id="save-group-no"
                placeholder="Control"
                value={groupNumber}
                onChange={(e) => setGroupNumber(e.target.value)}
                className="h-8.5 text-xs"
              />
            </div>
          </div>

          {/* Trial / Session Name */}
          <div className="space-y-1">
            <Label htmlFor="save-session" className="text-xs font-medium text-foreground">
              Trial / Session Name
            </Label>
            <Input
              id="save-session"
              placeholder="Trial 1 (Baseline)"
              value={trialSession}
              onChange={(e) => setTrialSession(e.target.value)}
              className="h-8.5 text-xs"
            />
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <Label htmlFor="save-notes" className="text-xs font-medium text-foreground">
              Notes (Optional)
            </Label>
            <Textarea
              id="save-notes"
              placeholder="Experimental observations, lighting conditions, or behavior notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="h-16 text-xs resize-none"
            />
          </div>

          {/* Summary Preview */}
          <div className="rounded-lg border border-[#c9dcd9] bg-[#f8fbfa] p-2.5 dark:border-white/[0.08] dark:bg-white/[0.02]">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Metrics Snapshot</p>
            <div className="mt-1.5 grid grid-cols-3 gap-2 font-mono text-xs">
              <div>
                <span className="text-[10px] text-muted-foreground block">Distance</span>
                <span className="font-bold text-foreground">{(summary.totalDistance / 100).toFixed(2)} m</span>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground block">Mean Speed</span>
                <span className="font-bold text-foreground">{summary.meanSpeed.toFixed(1)} cm/s</span>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground block">Immobile</span>
                <span className="font-bold text-foreground">{summary.immobileTime.toFixed(1)} s</span>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
            className="text-xs"
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            disabled={isSaving}
            className="bg-[#08796f] hover:bg-[#0a8b80] text-white text-xs font-semibold gap-1.5 dark:bg-[#52d8c4] dark:text-[#041614] dark:hover:bg-[#44cbb9]"
          >
            <Save className="size-3.5" />
            {isSaving ? "Saving..." : "Save & Open Project Details"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
