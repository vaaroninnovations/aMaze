import { useMutation, useQuery } from "convex/react";
import { Link, useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { ArrowRight, FlaskConical, Plus } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api.js";
import { useSessionOwnerKey } from "@/lib/session-convex.ts";
import AppHeader from "@/components/app-header.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { errorMessage } from "@/lib/errors.ts";
import { getTemplate } from "@/lib/tracking/templates.ts";
import type { TemplateId } from "@/lib/tracking/types.ts";
import ExperimentFormDialog, {
  type ExperimentFormValues,
} from "./_components/experiment-form-dialog.tsx";

function useCreateExperiment() {
  const navigate = useNavigate();
  const create = useMutation(api.experiments.experiments.create);
  const { ownerKey, isLoading } = useSessionOwnerKey();
  return async (values: ExperimentFormValues) => {
    if (isLoading) throw new Error("Authentication is still loading.");
    try {
      const id = await create({
        ...values,
        ...(ownerKey ? { ownerKey } : {}),
      });
      navigate(`/experiments/${id}`);
    } catch (e) {
      toast.error(errorMessage(e, "Could not create the experiment."));
      throw e;
    }
  };
}

function NewExperimentButton() {
  const onCreate = useCreateExperiment();
  return (
    <ExperimentFormDialog
      title="New experiment"
      submitLabel="Create experiment"
      onSubmit={onCreate}
      trigger={
        <Button size="sm">
          <Plus /> New experiment
        </Button>
      }
    />
  );
}

function ExperimentList() {
  const { ownerKey, isLoading } = useSessionOwnerKey();
  const experiments = useQuery(
    api.experiments.experiments.list,
    isLoading ? "skip" : ownerKey ? { ownerKey } : {},
  );

  if (experiments === undefined) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-36 w-full" />
        ))}
      </div>
    );
  }

  if (experiments.length === 0) {
    return (
      <Empty className="rounded-xl border border-dashed">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <FlaskConical />
          </EmptyMedia>
          <EmptyTitle>No experiments yet</EmptyTitle>
          <EmptyDescription>
            Create an experiment, add subjects and groups, then save trials from
            the workspace.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <NewExperimentButton />
        </EmptyContent>
      </Empty>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {experiments.map((e) => (
        <Link
          key={e._id}
          to={`/experiments/${e._id}`}
          className="group flex cursor-pointer flex-col justify-between gap-4 rounded-lg border bg-card p-4 transition-colors hover:border-primary/60"
        >
          <div className="min-w-0 space-y-1.5">
            <p className="font-mono text-[11px] uppercase tracking-wider text-primary">
              {getTemplate(e.templateId as TemplateId).name}
            </p>
            <h2 className="truncate font-semibold">{e.name}</h2>
            {e.description && (
              <p className="line-clamp-2 text-sm text-muted-foreground">
                {e.description}
              </p>
            )}
          </div>
          <div className="flex items-end justify-between gap-2">
            <div className="flex gap-4 font-mono text-xs tabular-nums">
              <span>
                <span className="text-base font-semibold">
                  {e.subjectCount}
                </span>{" "}
                <span className="text-muted-foreground">subjects</span>
              </span>
              <span>
                <span className="text-base font-semibold">{e.trialCount}</span>{" "}
                <span className="text-muted-foreground">trials</span>
              </span>
            </div>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              {formatDistanceToNow(e._creationTime, { addSuffix: true })}
              <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}

export default function ExperimentsPage() {
  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-6xl space-y-6 p-4 py-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Experiments
            </h1>
            <p className="text-sm text-muted-foreground">
              Subjects, groups and saved trials for each study.
            </p>
          </div>
          <NewExperimentButton />
        </div>
        <ExperimentList />
      </main>
    </div>
  );
}
