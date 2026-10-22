import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Pencil, ScanLine, Share2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { useSessionOwnerKey } from "@/lib/session-convex.ts";
import AppHeader from "@/components/app-header.tsx";
import ConfirmDialog from "@/components/confirm-dialog.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs.tsx";
import { errorMessage } from "@/lib/errors.ts";
import { getTemplate } from "@/lib/tracking/templates.ts";
import type { TemplateId } from "@/lib/tracking/types.ts";
import ExperimentFormDialog from "../_components/experiment-form-dialog.tsx";
import ExperimentExportMenu from "../_components/experiment-export-menu.tsx";
import ExperimentReportButton from "../_components/experiment-report-button.tsx";
import GroupsManager from "../_components/groups-manager.tsx";
import SubjectsManager from "../_components/subjects-manager.tsx";
import TrialsTable from "../_components/trials-table.tsx";
import GroupStats from "../_components/stats/group-stats.tsx";
import QueryBoundary from "../_components/query-boundary.tsx";
import NotAvailable from "../_components/not-available.tsx";
import SharingDialog from "../_components/sharing-dialog.tsx";

function ExperimentDetail({
  experimentId,
}: {
  experimentId: Id<"experiments">;
}) {
  const navigate = useNavigate();
  const { ownerKey, isLoading } = useSessionOwnerKey();
  const data = useQuery(
    api.experiments.experiments.get,
    isLoading ? "skip" : { experimentId, ...(ownerKey ? { ownerKey } : {}) },
  );
  const update = useMutation(api.experiments.experiments.update);
  const remove = useMutation(api.experiments.experiments.remove);
  const [sharingOpen, setSharingOpen] = useState(false);

  if (data === undefined) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-9 w-80" />
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  const { experiment, groups, subjects, canEdit, isOwner } = data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <p className="font-mono text-[11px] uppercase tracking-wider text-primary">
            {getTemplate(experiment.templateId as TemplateId).name}
          </p>
          <h1 className="truncate text-2xl font-semibold tracking-tight">
            {experiment.name}
          </h1>
          {experiment.description && (
            <p className="max-w-2xl text-sm text-muted-foreground">
              {experiment.description}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <ExperimentReportButton
            experiment={experiment}
            groups={groups}
            subjects={subjects}
          />
          <ExperimentExportMenu
            experimentId={experimentId}
            experimentName={experiment.name}
            groups={groups}
            subjects={subjects}
          />
          {canEdit && (
            <>
              <Button size="sm" variant="secondary" asChild>
                <Link to={`/track?experimentId=${experimentId}`}>
                  <ScanLine /> Track a trial
                </Link>
              </Button>
              <ExperimentFormDialog
                title="Edit experiment"
                submitLabel="Save"
                initial={{
                  name: experiment.name,
                  description: experiment.description ?? "",
                  templateId: experiment.templateId,
                }}
                onSubmit={async (v) => {
                  try {
                    await update({
                      experimentId,
                      ...v,
                      ...(ownerKey ? { ownerKey } : {}),
                    });
                  } catch (e) {
                    toast.error(
                      errorMessage(e, "Could not update the experiment."),
                    );
                    throw e;
                  }
                }}
                trigger={
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-8"
                    aria-label="Edit experiment"
                  >
                    <Pencil />
                  </Button>
                }
              />
              {isOwner && (
                <ConfirmDialog
                  title={`Delete "${experiment.name}"?`}
                  description={`This permanently deletes ${experiment.subjectCount} subjects and ${experiment.trialCount} saved trials.`}
                  onConfirm={async () => {
                    try {
                      await remove({
                        experimentId,
                        ...(ownerKey ? { ownerKey } : {}),
                      });
                      navigate("/experiments");
                    } catch (e) {
                      toast.error(
                        errorMessage(e, "Could not delete the experiment."),
                      );
                    }
                  }}
                  trigger={
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-8 text-muted-foreground hover:text-destructive"
                      aria-label="Delete experiment"
                    >
                      <Trash2 />
                    </Button>
                  }
                />
              )}
            </>
          )}
          {isOwner && (
            <>
              <Button
                size="icon"
                variant="ghost"
                className="size-8"
                aria-label="Share project"
                onClick={() => setSharingOpen(true)}
              >
                <Share2 />
              </Button>
              <SharingDialog
                experimentId={experimentId}
                experimentName={experiment.name}
                shareToken={experiment.shareToken}
                open={sharingOpen}
                onOpenChange={setSharingOpen}
              />
            </>
          )}
        </div>
      </div>

      <Tabs
        defaultValue={experiment.trialCount > 0 ? "trials" : "subjects"}
        className="gap-4"
      >
        <TabsList>
          <TabsTrigger value="trials" className="cursor-pointer">
            Trials{" "}
            <span className="font-mono text-xs text-muted-foreground">
              {experiment.trialCount}
            </span>
          </TabsTrigger>
          <TabsTrigger value="stats" className="cursor-pointer">
            Statistics
          </TabsTrigger>
          {canEdit && (
            <>
              <TabsTrigger value="subjects" className="cursor-pointer">
                Subjects{" "}
                <span className="font-mono text-xs text-muted-foreground">
                  {subjects.length}
                </span>
              </TabsTrigger>
              <TabsTrigger value="groups" className="cursor-pointer">
                Groups{" "}
                <span className="font-mono text-xs text-muted-foreground">
                  {groups.length}
                </span>
              </TabsTrigger>
            </>
          )}
        </TabsList>
        <TabsContent value="trials">
          <TrialsTable experimentId={experimentId} groups={groups} />
        </TabsContent>
        <TabsContent value="stats">
          <GroupStats
            experimentId={experimentId}
            experimentName={experiment.name}
            groups={groups}
            subjects={subjects}
          />
        </TabsContent>
        {canEdit && (
          <>
            <TabsContent value="subjects">
              <SubjectsManager
                experimentId={experimentId}
                groups={groups}
                subjects={subjects}
              />
            </TabsContent>
            <TabsContent value="groups">
              <GroupsManager
                experimentId={experimentId}
                groups={groups}
                subjects={subjects}
              />
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
}

export default function ExperimentPage() {
  const { experimentId } = useParams();
  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-6xl space-y-4 p-4 py-6">
        <Button size="sm" variant="ghost" className="-ml-2" asChild>
          <Link to="/experiments">
            <ArrowLeft /> Experiments
          </Link>
        </Button>
        <QueryBoundary
          key={experimentId}
          fallback={<NotAvailable what="Experiment" />}
        >
          <ExperimentDetail experimentId={experimentId as Id<"experiments">} />
        </QueryBoundary>
      </main>
    </div>
  );
}
