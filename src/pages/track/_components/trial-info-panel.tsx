import { CalendarClock } from "lucide-react";
import PanelSection from "@/components/tracking/panel-section.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { TRIAL_INFO_FIELDS, todayLocal } from "@/lib/experiments/trial-info.ts";
import type { TrialInfoState } from "../_hooks/use-trial-info.ts";

/** Bench-sheet details for the current trial; saved with the trial and added to CSV exports. */
export default function TrialInfoPanel({ state }: { state: TrialInfoState }) {
  const { info, update, resetDate } = state;
  return (
    <PanelSection step="EX" title="Experiment details" collapsible>
      <div className="grid grid-cols-2 gap-3">
        {TRIAL_INFO_FIELDS.map((f) => {
          const id = `trial-info-${f.key}`;
          const isDate = f.key === "date";
          return (
            <div key={f.key} className={isDate || f.key === "investigator" ? "col-span-2 space-y-1.5" : "space-y-1.5"}>
              <Label htmlFor={id} className="text-xs text-muted-foreground">
                {f.label}
              </Label>
              {isDate ? (
                <div className="flex gap-2">
                  <Input id={id} type="date" value={info.date} onChange={(e) => update({ date: e.target.value })} className="font-mono" />
                  <Button
                    size="icon"
                    variant="secondary"
                    onClick={resetDate}
                    disabled={info.date === todayLocal()}
                    aria-label="Set to today"
                    title="Set to today"
                  >
                    <CalendarClock />
                  </Button>
                </div>
              ) : (
                <Input id={id} value={info[f.key]} onChange={(e) => update({ [f.key]: e.target.value })} placeholder={f.placeholder} maxLength={80} />
              )}
            </div>
          );
        })}
      </div>
      <p className="text-[11px] text-muted-foreground">Saved with the trial and included in the CSV export. The date fills in automatically.</p>
    </PanelSection>
  );
}
