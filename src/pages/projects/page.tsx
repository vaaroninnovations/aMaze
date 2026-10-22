import { useMemo, useState, type FormEvent } from "react";
import { useConvexAuth } from "@convex-dev/auth/react";
import { useConvex, useMutation, usePaginatedQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { format, formatDistanceToNow } from "date-fns";
import {
  Activity,
  ArrowUpDown,
  CalendarDays,
  FileDown,
  FlaskConical,
  Pencil,
  Plus,
  Search,
  Trash2,
  Video,
} from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api.js";
import type { Doc, Id } from "@/convex/_generated/dataModel.d.ts";
import AccountAuthDialog from "@/components/account-auth-dialog.tsx";
import AppHeader from "@/components/app-header.tsx";
import ConfirmDialog from "@/components/confirm-dialog.tsx";
import { Badge } from "@/components/ui/badge.tsx";
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
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { TEMPLATES, getTemplate } from "@/lib/tracking/templates.ts";
import type { TemplateId } from "@/lib/tracking/types.ts";
import { errorMessage } from "@/lib/errors.ts";
import { decodeTrack } from "@/lib/experiments/track-codec.ts";

type Project = Doc<"experiments"> & {
  lastModified: number;
  investigator: string;
  lastSourceName: string | null;
  lastRecordedAt: string | null;
  hasVideo: boolean;
};

function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function ProjectCard({
  project,
  onRename,
}: {
  project: Project;
  onRename: (project: Project) => void;
}) {
  const remove = useMutation(api.experiments.experiments.remove);
  const convex = useConvex();
  const [exporting, setExporting] = useState(false);
  const template = getTemplate(project.templateId as TemplateId);

  const exportProject = async () => {
    setExporting(true);
    try {
      const details = await convex.query(api.experiments.experiments.get, {
        experimentId: project._id,
      });
      const trials: unknown[] = [];
      let cursor: string | null = null;
      let totalTrackBytes = 0;
      let totalPoints = 0;
      let isDone = false;
      while (!isDone) {
        const resultPage: FunctionReturnType<
          typeof api.experiments.trials.listByExperiment
        > = await convex.query(
          api.experiments.trials.listByExperiment,
          {
            experimentId: project._id,
            paginationOpts: { numItems: 25, cursor },
          },
        );
        for (
          let offset = 0;
          offset < resultPage.page.length;
          offset += 5
        ) {
          const batch = resultPage.page.slice(offset, offset + 5);
          const exported = await Promise.all(
            batch.map(async (row) => {
              const saved = await convex.query(api.experiments.trials.get, {
                trialId: row._id,
              });
              if (!saved?.trackUrl) {
                throw new Error(
                  `The tracking file for trial ${row.session} is unavailable.`,
                );
              }
              const response = await fetch(saved.trackUrl);
              if (!response.ok) {
                throw new Error(
                  `Could not download tracking data for trial ${row.session}.`,
                );
              }
              const text = await response.text();
              totalTrackBytes += new Blob([text]).size;
              if (totalTrackBytes > 100 * 1024 * 1024) {
                throw new Error(
                  "This project exceeds the 100 MB JSON export limit. Download individual trials from their analysis pages.",
                );
              }
              const track = decodeTrack(JSON.parse(text));
              totalPoints += track.length;
              if (totalPoints > 500_000) {
                throw new Error(
                  "This project exceeds the 500,000-sample JSON export limit. Download individual trials from their analysis pages.",
                );
              }
              const trial = saved.trial;
              return {
                trial: {
                  id: trial._id,
                  experimentId: trial.experimentId,
                  subjectId: trial.subjectId,
                  session: trial.session,
                  notes: trial.notes,
                  info: trial.info,
                  recordedAt: trial.recordedAt,
                  templateId: trial.templateId,
                  sourceName: trial.sourceName,
                  live: trial.live,
                  arena: trial.arena,
                  zones: trial.zones,
                  dims: trial.dims,
                  pxPerCm: trial.pxPerCm,
                  arenaCm: trial.arenaCm,
                  fps: trial.fps,
                  settings: trial.settings,
                  templateParams: trial.templateParams,
                  summary: trial.summary,
                  measures: trial.measures,
                },
                subject: saved.subject,
                group: saved.group,
                videoAttached: Boolean(saved.videoUrl),
                track,
              };
            }),
          );
          trials.push(...exported);
          if (trials.length > 1000) {
            throw new Error(
              "This project exceeds the 1,000-trial JSON export limit. Use the paginated project analysis pages to export smaller sets.",
            );
          }
        }
        cursor = resultPage.continueCursor;
        isDone = resultPage.isDone;
      }
      const experiment = {
        id: details.experiment._id,
        name: details.experiment.name,
        description: details.experiment.description,
        templateId: details.experiment.templateId,
        subjectCount: details.experiment.subjectCount,
        trialCount: details.experiment.trialCount,
        createdAt: details.experiment._creationTime,
        lastModified: details.experiment.updatedAt,
      };
      downloadJson(
        project.name.trim().replace(/[^a-z0-9-_]+/gi, "-").toLowerCase() ||
          "project",
        {
          exportedAt: new Date().toISOString(),
          experiment,
          groups: details.groups,
          subjects: details.subjects,
          trials,
        },
      );
      toast.success("Complete project backup downloaded.");
    } catch (error) {
      toast.error(errorMessage(error, "Could not export the project."));
    } finally {
      setExporting(false);
    }
  };

  return (
    <article className="flex min-w-0 flex-col justify-between gap-5 rounded-xl border bg-card p-5 transition-colors hover:border-primary/40">
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1.5">
            <p className="font-mono text-[11px] uppercase tracking-wider text-primary">
              {template.name}
            </p>
            <h2 className="truncate text-lg font-semibold">{project.name}</h2>
            {project.description && (
              <p className="line-clamp-2 text-sm text-muted-foreground">
                {project.description}
              </p>
            )}
          </div>
          <Badge variant={project.trialCount > 0 ? "default" : "secondary"}>
            <Activity />
            {project.trialCount > 0 ? "Analyzed" : "Not analyzed"}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">Investigator</p>
            <p className="truncate">{project.investigator || "Not specified"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Trials</p>
            <p>{project.trialCount}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Created</p>
            <p>{format(new Date(project._creationTime), "MMM d, yyyy")}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Last modified</p>
            <p title={format(new Date(project.lastModified), "PPpp")}>
              {formatDistanceToNow(project.lastModified, { addSuffix: true })}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          {project.lastSourceName ? (
            <Badge variant="outline" className="max-w-full truncate">
              {project.hasVideo ? <Video /> : <FlaskConical />}
              <span className="truncate">{project.lastSourceName}</span>
            </Badge>
          ) : (
            <Badge variant="outline">No saved video</Badge>
          )}
          {project.lastRecordedAt && (
            <Badge variant="outline">
              <CalendarDays />
              Latest trial {format(new Date(project.lastRecordedAt), "PP")}
            </Badge>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t pt-4">
        <Button size="sm" asChild>
          <Link to={`/experiments/${project._id}`}>Open project</Link>
        </Button>
        <Button
          size="sm"
          variant="secondary"
          disabled={exporting}
          onClick={() => void exportProject()}
        >
          <FileDown /> {exporting ? "Preparing…" : "JSON backup"}
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="ml-auto size-8"
          aria-label={`Rename ${project.name}`}
          onClick={() => onRename(project)}
        >
          <Pencil />
        </Button>
        <ConfirmDialog
          title={`Delete "${project.name}"?`}
          description={`This permanently deletes this project, its ${project.trialCount} saved trials, tracking coordinates, results, and any attached videos.`}
          onConfirm={async () => {
            try {
              await remove({ experimentId: project._id });
              toast.success("Project deleted.");
            } catch (error) {
              toast.error(errorMessage(error, "Could not delete the project."));
            }
          }}
          trigger={
            <Button
              size="icon"
              variant="ghost"
              className="size-8 text-muted-foreground hover:text-destructive"
              aria-label={`Delete ${project.name}`}
            >
              <Trash2 />
            </Button>
          }
        />
      </div>
    </article>
  );
}

export default function ProjectsPage() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const {
    results: projects,
    status: projectStatus,
    loadMore,
  } = usePaginatedQuery(
    api.experiments.experiments.listOwned,
    isAuthenticated ? {} : "skip",
    { initialNumItems: 30 },
  );
  const renameProject = useMutation(api.experiments.experiments.rename);
  const [search, setSearch] = useState("");
  const [type, setType] = useState("all");
  const [sort, setSort] = useState("modified");
  const [selected, setSelected] = useState<Project | null>(null);
  const [name, setName] = useState("");
  const [savingName, setSavingName] = useState(false);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return [...(projects ?? [])]
      .filter(
        (project) =>
          (type === "all" || project.templateId === type) &&
          (!needle ||
            project.name.toLowerCase().includes(needle) ||
            project.investigator.toLowerCase().includes(needle)),
      )
      .sort((a, b) => {
        if (sort === "title") return a.name.localeCompare(b.name);
        if (sort === "created") return b._creationTime - a._creationTime;
        return b.lastModified - a.lastModified;
      });
  }, [projects, search, sort, type]);

  const openRename = (project: Project) => {
    setSelected(project);
    setName(project.name);
  };

  const saveRename = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selected) return;
    setSavingName(true);
    try {
      await renameProject({
        experimentId: selected._id as Id<"experiments">,
        name,
      });
      toast.success("Project renamed.");
      setSelected(null);
    } catch (error) {
      toast.error(errorMessage(error, "Could not rename the project."));
    } finally {
      setSavingName(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-6xl space-y-6 p-4 py-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-wider text-primary">
              Workspace
            </p>
            <h1 className="text-2xl font-semibold tracking-tight">
              My Projects
            </h1>
            <p className="text-sm text-muted-foreground">
              Saved experiments, videos, tracking data, and analysis results.
            </p>
          </div>
          {isAuthenticated && (
            <Button size="sm" asChild>
              <Link to="/experiments">
                <Plus /> Create new project
              </Link>
            </Button>
          )}
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Checking account…</p>
        ) : !isAuthenticated ? (
          <section className="space-y-4 rounded-xl border border-dashed p-8 text-center">
            <FlaskConical className="mx-auto size-8 text-primary" />
            <h2 className="font-semibold">Sign in to manage projects</h2>
            <p className="text-sm text-muted-foreground">
              Your saved experiments and analyses are tied to your account.
            </p>
            <AccountAuthDialog
              redirectTo={new URL("/projects", window.location.origin).toString()}
              trigger={<Button>Sign in or create account</Button>}
            />
          </section>
        ) : projectStatus === "LoadingFirstPage" ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-64" />
            ))}
          </div>
        ) : projectStatus === "Exhausted" && projects.length === 0 ? (
          <section className="space-y-4 rounded-xl border border-dashed p-10 text-center">
            <FlaskConical className="mx-auto size-8 text-primary" />
            <h2 className="font-semibold">No projects saved yet</h2>
            <p className="text-sm text-muted-foreground">
              Create an experiment and save tracking trials from the workspace.
            </p>
            <Button asChild>
              <Link to="/experiments">
                <Plus /> Create your first project
              </Link>
            </Button>
          </section>
        ) : (
          <>
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px_200px]">
              <div className="relative">
                <Search className="pointer-events-none absolute top-2.5 left-3 size-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search title or investigator…"
                  aria-label="Search projects"
                  className="pl-9"
                />
              </div>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="w-full" aria-label="Filter by maze type">
                  <SelectValue placeholder="All experiment types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All experiment types</SelectItem>
                  {TEMPLATES.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={sort} onValueChange={setSort}>
                <SelectTrigger className="w-full" aria-label="Sort projects">
                  <ArrowUpDown />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="modified">Recently modified</SelectItem>
                  <SelectItem value="created">Date created</SelectItem>
                  <SelectItem value="title">Title</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {filtered.length ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map((project) => (
                  <ProjectCard
                    key={project._id}
                    project={project}
                    onRename={openRename}
                  />
                ))}
              </div>
            ) : (
              <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                No projects match those filters.
              </p>
            )}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                Showing {filtered.length} of {projects.length} loaded projects.
              </p>
              {(projectStatus === "CanLoadMore" ||
                projectStatus === "LoadingMore") && (
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={projectStatus === "LoadingMore"}
                  onClick={() => loadMore(30)}
                >
                  {projectStatus === "LoadingMore" && <Spinner />}
                  Load more projects
                </Button>
              )}
            </div>
          </>
        )}
      </main>

      <Dialog
        open={selected !== null}
        onOpenChange={(open) => !open && setSelected(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename project</DialogTitle>
            <DialogDescription>
              Choose a clear name for this saved experiment.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(event) => void saveRename(event)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="project-name">Project title</Label>
              <Input
                id="project-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={120}
                required
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setSelected(null)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={savingName || !name.trim()}>
                {savingName ? "Saving…" : "Save name"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
