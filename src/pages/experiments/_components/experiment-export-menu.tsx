import { useConvex } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Doc, Id } from "@/convex/_generated/dataModel.d.ts";
import { useSessionOwnerKey } from "@/lib/session-convex.ts";
import DataExportMenu, {
  type ExportDataset,
} from "@/components/data-export-menu.tsx";
import {
  groupExportRows,
  subjectExportRows,
  trialExportRows,
} from "@/lib/experiments/experiment-export.ts";
import { baseFilename } from "@/lib/tracking/export.ts";

type Props = {
  experimentId: Id<"experiments">;
  experimentName: string;
  groups: Doc<"groups">[];
  subjects: Doc<"subjects">[];
};

/** Trials are fetched once on click (not subscribed), so the menu costs nothing while closed. */
export default function ExperimentExportMenu({
  experimentId,
  experimentName,
  groups,
  subjects,
}: Props) {
  const convex = useConvex();
  const { ownerKey, isLoading } = useSessionOwnerKey();
  const base = baseFilename(experimentName);

  const datasets: ExportDataset[] = [
    {
      label: "Trials",
      filename: `${base}-trials`,
      rows: async () => {
        if (isLoading) throw new Error("Authentication is still loading.");
        const { rows } = await convex.query(api.experiments.trials.statsData, {
          experimentId,
          ...(ownerKey ? { ownerKey } : {}),
        });
        return trialExportRows(rows, subjects, groups);
      },
    },
    {
      label: "Subjects",
      filename: `${base}-subjects`,
      rows: () => subjectExportRows(subjects, groups),
    },
    {
      label: "Groups",
      filename: `${base}-groups`,
      rows: () => groupExportRows(subjects, groups),
    },
  ];

  return (
    <DataExportMenu datasets={datasets} workbookName={`${base}-experiment`} />
  );
}
