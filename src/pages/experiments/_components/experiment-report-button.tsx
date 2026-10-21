import { useState } from "react";
import { useConvex } from "convex/react";
import { FileText } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api.js";
import type { Doc, Id } from "@/convex/_generated/dataModel.d.ts";
import { getAnonymousSessionId } from "@/lib/anonymous-session.ts";
import { Button } from "@/components/ui/button.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import { getTemplate } from "@/lib/tracking/templates.ts";
import type { TemplateId } from "@/lib/tracking/types.ts";
import { baseFilename } from "@/lib/tracking/export.ts";

type Props = {
  experiment: Doc<"experiments">;
  groups: Doc<"groups">[];
  subjects: Doc<"subjects">[];
};

/** Fetches the trials once on click, then builds the PDF (jsPDF is loaded only at that point). */
export default function ExperimentReportButton({ experiment, groups, subjects }: Props) {
  const convex = useConvex();
  const [busy, setBusy] = useState(false);

  const generate = async () => {
    setBusy(true);
    try {
      const experimentId: Id<"experiments"> = experiment._id;
      const { rows, truncated } = await convex.query(
        api.experiments.trials.statsData,
        { experimentId, ownerKey: getAnonymousSessionId() },
      );
      const { buildExperimentReport } = await import("@/lib/reports/experiment-report.ts");
      const doc = buildExperimentReport({
        name: experiment.name,
        description: experiment.description,
        testName: getTemplate(experiment.templateId as TemplateId).name,
        groups,
        subjects,
        trials: rows,
        truncated,
      });
      doc.save(`${baseFilename(experiment.name)}-report.pdf`);
    } catch {
      toast.error("Could not create the PDF report. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button size="sm" variant="secondary" onClick={generate} disabled={busy}>
      {busy ? <Spinner /> : <FileText />} <span className="hidden sm:inline">PDF report</span>
    </Button>
  );
}
