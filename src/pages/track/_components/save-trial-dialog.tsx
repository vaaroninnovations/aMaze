import { useState } from "react";
import {
  useSessionAction as useAction,
  useSessionMutation as useMutation,
  useSessionQuery as useQuery,
} from "@/lib/session-convex.ts";
import { useNavigate } from "react-router-dom";
import { CloudUpload, Plus } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
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
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { encodeTrack, grayToJpeg } from "@/lib/experiments/trial-data.ts";
import { hasTrialInfo, type TrialInfo } from "@/lib/experiments/trial-info.ts";
import { errorMessage } from "@/lib/errors.ts";
import type { TrackingSession } from "../_hooks/use-tracking-session.ts";

type Props = {
  s: TrackingSession;
  info: TrialInfo;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  videoFile?: File;
};

const NEW = "new";

async function upload(url: string, body: Blob): Promise<Id<"_storage">> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": body.type },
    body,
  });
  if (!res.ok) throw new Error("Upload failed");
  const { storageId } = (await res.json()) as { storageId: Id<"_storage"> };
  return storageId;
}

/** Saves the current trial (summary, measures, zones and track) to an experiment in the cloud. */
export default function SaveTrialDialog({
  s,
  info,
  open,
  onOpenChange,
  videoFile,
}: Props) {
  const navigate = useNavigate();
  const experiments = useQuery(
    api.experiments.experiments.list,
    open ? {} : "skip",
  );
  const [pickedExperimentId, setExperimentId] = useState<string>("");
  const [newExperiment, setNewExperiment] = useState(info.experimentNo.trim());
  const [pickedSubjectId, setSubjectId] = useState<string>("");
  const [newSubject, setNewSubject] = useState(info.animalNo.trim());
  const [session, setSession] = useState("Trial 1");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const matchingExperiment = experiments?.find(
    (e) =>
      e.name.trim().toLowerCase() === info.experimentNo.trim().toLowerCase(),
  );
  const experimentId = pickedExperimentId || (matchingExperiment?._id ?? "");
  const selectedExperiment =
    experimentId && experimentId !== NEW
      ? (experimentId as Id<"experiments">)
      : null;
  const detail = useQuery(
    api.experiments.experiments.get,
    open && selectedExperiment ? { experimentId: selectedExperiment } : "skip",
  );

  // Preselect the subject whose ID matches the animal number from Experiment details.
  const matchingSubject = detail?.subjects.find(
    (sub) => sub.code === info.animalNo.trim(),
  );
  const subjectId = pickedSubjectId || (matchingSubject?._id ?? "");

  const createExperiment = useMutation(api.experiments.experiments.create);
  const createSubject = useMutation(api.experiments.subjects.create);
  const generateUploadUrl = useMutation(
    api.experiments.trials.generateUploadUrl,
  );
  const saveTrial = useAction(api.experiments.trials.save);

  const isNewExperiment =
    experimentId === NEW || (experiments?.length === 0 && experimentId === "");
  const isNewSubject =
    isNewExperiment ||
    subjectId === NEW ||
    (detail?.subjects.length === 0 && subjectId === "");
  const canSave =
    !saving &&
    s.arena !== null &&
    session.trim() !== "" &&
    (isNewExperiment
      ? newExperiment.trim() !== ""
      : selectedExperiment !== null) &&
    (isNewSubject ? newSubject.trim() !== "" : subjectId !== "");

  const handleSave = async () => {
    if (!s.arena || !canSave) return;
    setSaving(true);
    try {
      const expId = isNewExperiment
        ? await createExperiment({
            name: newExperiment,
            templateId: s.templateId,
          })
        : (selectedExperiment as Id<"experiments">);
      const subId = isNewSubject
        ? await createSubject({
            experimentId: expId,
            code: newSubject,
            groupId: null,
            sex: "unknown",
          })
        : (subjectId as Id<"subjects">);

      const trackBlob = new Blob([encodeTrack(s.track)], {
        type: "application/json",
      });
      const trackStorageId = await upload(await generateUploadUrl(), trackBlob);
      const snapshot = s.background ? await grayToJpeg(s.background) : null;
      const snapshotStorageId = snapshot
        ? await upload(await generateUploadUrl(), snapshot)
        : null;
      if (videoFile && videoFile.size > 1_073_741_824) {
        throw new Error("The video exceeds the 1 GB saved-trial limit.");
      }
      const videoStorageId = videoFile
        ? await upload(await generateUploadUrl(), videoFile)
        : undefined;

      const trialId = await saveTrial({
        subjectId: subId,
        session,
        notes: notes || undefined,
        info: hasTrialInfo(info) ? info : undefined,
        templateId: s.templateId,
        sourceName: s.source?.name ?? "Untitled",
        live: s.isLive,
        arena: s.arena,
        zones: s.zones,
        dims: s.dims,
        pxPerCm: s.pxPerCm,
        arenaCm: s.arenaCm,
        fps: s.settings.fps,
        trackStorageId,
        snapshotStorageId,
        videoStorageId,
      });
      onOpenChange(false);
      toast.success("Trial saved", {
        action: {
          label: "View",
          onClick: () => navigate(`/experiments/${expId}/trials/${trialId}`),
        },
      });
    } catch (e) {
      toast.error(
        errorMessage(
          e,
          "Could not save the trial. Check your connection and try again.",
        ),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Save trial to experiment</DialogTitle>
          <DialogDescription>
            Saves the results and track
            {videoFile
              ? " and uploads the source video with the saved trial."
              : ". No source video is attached to this trial."}
          </DialogDescription>
        </DialogHeader>

        {experiments === undefined ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Experiment</Label>
              {experiments.length > 0 && (
                <Select
                  value={experimentId}
                  onValueChange={(v) => {
                    setExperimentId(v);
                    setSubjectId("");
                  }}
                >
                  <SelectTrigger className="w-full cursor-pointer">
                    <SelectValue placeholder="Choose experiment" />
                  </SelectTrigger>
                  <SelectContent>
                    {experiments.map((e) => (
                      <SelectItem
                        key={e._id}
                        value={e._id}
                        className="cursor-pointer"
                      >
                        {e.name}
                      </SelectItem>
                    ))}
                    <SelectItem value={NEW} className="cursor-pointer">
                      <Plus /> New experiment
                    </SelectItem>
                  </SelectContent>
                </Select>
              )}
              {isNewExperiment && (
                <Input
                  value={newExperiment}
                  onChange={(e) => setNewExperiment(e.target.value)}
                  placeholder="Anxiety cohort A"
                  maxLength={120}
                />
              )}
            </div>

            <div className="space-y-2">
              <Label>Subject</Label>
              {!isNewExperiment &&
                selectedExperiment &&
                detail === undefined && <Skeleton className="h-9 w-full" />}
              {!isNewExperiment && detail && detail.subjects.length > 0 && (
                <Select value={subjectId} onValueChange={setSubjectId}>
                  <SelectTrigger className="w-full cursor-pointer">
                    <SelectValue placeholder="Choose subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {detail.subjects.map((sub) => (
                      <SelectItem
                        key={sub._id}
                        value={sub._id}
                        className="cursor-pointer"
                      >
                        {sub.code}
                        {sub.groupId && (
                          <span className="text-muted-foreground">
                            ·{" "}
                            {
                              detail.groups.find((g) => g._id === sub.groupId)
                                ?.name
                            }
                          </span>
                        )}
                      </SelectItem>
                    ))}
                    <SelectItem value={NEW} className="cursor-pointer">
                      <Plus /> New subject
                    </SelectItem>
                  </SelectContent>
                </Select>
              )}
              {isNewSubject && (isNewExperiment || detail) && (
                <Input
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  placeholder="M01"
                  maxLength={60}
                />
              )}
              {!isNewExperiment && !selectedExperiment && (
                <p className="text-xs text-muted-foreground">
                  Choose an experiment first.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="trial-session">Session</Label>
              <Input
                id="trial-session"
                value={session}
                onChange={(e) => setSession(e.target.value)}
                placeholder="Day 1"
                maxLength={60}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="trial-notes">Notes</Label>
              <Textarea
                id="trial-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional"
                rows={2}
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button onClick={() => void handleSave()} disabled={!canSave}>
            {saving ? <Spinner /> : <CloudUpload />} Save trial
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
