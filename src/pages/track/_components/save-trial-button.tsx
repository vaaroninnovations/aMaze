import { useState } from "react";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import type { TrialInfo } from "@/lib/experiments/trial-info.ts";
import type { TrackSummary } from "@/lib/tracking/metrics.ts";
import type { TrackingSession } from "../_hooks/use-tracking-session.ts";
import SaveTrialDialog from "./save-trial-dialog.tsx";

type Props = {
  s: TrackingSession;
  summary: TrackSummary;
  info: TrialInfo;
  disabled: boolean;
};

/** Prominent button to save the current trial with experimental settings and metrics to a project */
export default function SaveTrialButton({ s, summary, info, disabled }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        size="sm"
        onClick={() => setOpen(true)}
        disabled={disabled}
        className="gap-1.5 bg-[#08796f] text-xs font-semibold text-white shadow-2xs hover:bg-[#0a8b80] dark:bg-[#52d8c4] dark:text-[#041614] dark:hover:bg-[#44cbb9]"
      >
        <Save className="size-3.5" />
        <span>Save Trial to Project</span>
      </Button>
      {open && (
        <SaveTrialDialog
          s={s}
          summary={summary}
          info={info}
          open={open}
          onOpenChange={setOpen}
        />
      )}
    </>
  );
}
