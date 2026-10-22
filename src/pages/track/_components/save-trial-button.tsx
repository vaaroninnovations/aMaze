import { useState } from "react";
import { CloudUpload } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import type { TrialInfo } from "@/lib/experiments/trial-info.ts";
import type { TrackingSession } from "../_hooks/use-tracking-session.ts";
import SaveTrialDialog from "./save-trial-dialog.tsx";

type Props = {
  s: TrackingSession;
  info: TrialInfo;
  disabled: boolean;
  videoFile?: File;
  onSaveStatusChange: (status: "saving" | "saved" | "failed") => void;
};

/** Opens the dialog to save this trial to an experiment. */
export default function SaveTrialButton({
  s,
  info,
  disabled,
  videoFile,
  onSaveStatusChange,
}: Props) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)} disabled={disabled}>
        <CloudUpload />{" "}
        <span className="hidden sm:inline">Save to experiment</span>
      </Button>
      {open && (
        <SaveTrialDialog
          s={s}
          info={info}
          videoFile={videoFile}
          onSaveStatusChange={onSaveStatusChange}
          open={open}
          onOpenChange={setOpen}
        />
      )}
    </>
  );
}
