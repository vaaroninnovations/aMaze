import { useState } from "react";
import { useSessionMutation as useMutation } from "@/lib/anonymous-convex.ts";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import PanelSection from "@/components/tracking/panel-section.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { errorMessage } from "@/lib/errors.ts";
import { hasTrialInfo, TRIAL_INFO_FIELDS, type TrialInfo } from "@/lib/experiments/trial-info.ts";

type Props = { trialId: Id<"trials">; session: string; notes: string; info?: TrialInfo };

export default function TrialNotes({ trialId, session: initialSession, notes: initialNotes, info }: Props) {
  const update = useMutation(api.experiments.trials.update);
  const [session, setSession] = useState(initialSession);
  const [notes, setNotes] = useState(initialNotes);
  const [saving, setSaving] = useState(false);
  const dirty = session !== initialSession || notes !== initialNotes;

  const save = async () => {
    setSaving(true);
    try {
      await update({ trialId, session, notes: notes || undefined });
      toast.success("Trial updated");
    } catch (e) {
      toast.error(errorMessage(e, "Could not update the trial."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <PanelSection step="01" title="Trial details">
      {info && hasTrialInfo(info) && (
        <dl className="grid grid-cols-2 gap-x-3 gap-y-2 rounded-md bg-muted/60 p-3 text-xs">
          {TRIAL_INFO_FIELDS.map((f) => (
            <div key={f.key} className="min-w-0">
              <dt className="text-muted-foreground">{f.label}</dt>
              <dd className="truncate font-mono">{info[f.key] || "n/a"}</dd>
            </div>
          ))}
        </dl>
      )}
      <div className="space-y-2">
        <Label htmlFor="trial-session-edit" className="text-xs text-muted-foreground">
          Session
        </Label>
        <Input id="trial-session-edit" value={session} onChange={(e) => setSession(e.target.value)} maxLength={60} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="trial-notes-edit" className="text-xs text-muted-foreground">
          Notes
        </Label>
        <Textarea id="trial-notes-edit" value={notes} onChange={(e) => setNotes(e.target.value)} rows={5} placeholder="Observations, exclusions, conditions" />
      </div>
      <Button size="sm" className="w-full" onClick={() => void save()} disabled={!dirty || saving || !session.trim()}>
        {saving ? <Spinner /> : <Check />} Save changes
      </Button>
      <p className="text-[11px] text-muted-foreground">Results are recalculated from the saved track each time you open the trial.</p>
    </PanelSection>
  );
}
