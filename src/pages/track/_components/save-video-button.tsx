import { Download } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import type { Recording } from "../_hooks/use-live-tracking.ts";

/** Download button for the video recorded during a live session; hidden when nothing was recorded. */
export default function SaveVideoButton({ recording }: { recording: Recording | null }) {
  if (!recording) return null;
  return (
    <Button size="sm" variant="secondary" asChild>
      <a href={recording.url} download={recording.file.name} title={`${recording.file.name} (${(recording.file.size / 1e6).toFixed(1)} MB)`}>
        <Download /> <span className="hidden sm:inline">Download video</span>
      </a>
    </Button>
  );
}
