import { useAnonymousPaginatedQuery as usePaginatedQuery } from "@/lib/anonymous-convex.ts";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { Activity, Radio, Video } from "lucide-react";
import { api } from "@/convex/_generated/api.js";
import type { Doc, Id } from "@/convex/_generated/dataModel.d.ts";
import { Button } from "@/components/ui/button.tsx";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table.tsx";
import GroupBadge from "./group-badge.tsx";

type Props = { experimentId: Id<"experiments">; groups: Doc<"groups">[] };

const PAGE = 50;
/** First few test measures shown as columns; all of them are on the trial page. */
const MEASURE_COLS = 2;

export default function TrialsTable({ experimentId, groups }: Props) {
  const { results, status, loadMore } = usePaginatedQuery(
    api.experiments.trials.listByExperiment,
    { experimentId },
    { initialNumItems: PAGE },
  );
  const groupById = new Map(groups.map((g) => [g._id, g]));

  if (status === "LoadingFirstPage") {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (results.length === 0 && status === "Exhausted") {
    return (
      <Empty className="rounded-lg border border-dashed py-10">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Activity />
          </EmptyMedia>
          <EmptyTitle>No trials saved yet</EmptyTitle>
          <EmptyDescription>Track a video or live session in the workspace, then choose Save to experiment.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button size="sm" asChild>
            <Link to="/track">Open workspace</Link>
          </Button>
        </EmptyContent>
      </Empty>
    );
  }

  const measureHeaders = results[0]?.measures.slice(0, MEASURE_COLS) ?? [];

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Subject</TableHead>
              <TableHead>Group</TableHead>
              <TableHead>Session</TableHead>
              <TableHead className="hidden md:table-cell">Recorded</TableHead>
              <TableHead className="text-right">Distance (cm)</TableHead>
              <TableHead className="text-right">Mean speed</TableHead>
              {measureHeaders.map((m) => (
                <TableHead key={m.label} className="hidden text-right lg:table-cell">
                  {m.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {results.map((t) => {
              const group = t.groupId ? groupById.get(t.groupId) : undefined;
              return (
                <TableRow key={t._id} className="cursor-pointer">
                  <TableCell className="font-mono font-medium">
                    <Link to={`/experiments/${experimentId}/trials/${t._id}`} className="flex cursor-pointer items-center gap-2 hover:text-primary">
                      {t.live ? <Radio className="size-3.5 text-destructive" /> : <Video className="size-3.5 text-muted-foreground" />}
                      {t.subjectCode}
                    </Link>
                  </TableCell>
                  <TableCell>{group ? <GroupBadge group={group} /> : <span className="text-muted-foreground">None</span>}</TableCell>
                  <TableCell className="max-w-40 truncate">{t.session}</TableCell>
                  <TableCell className="hidden font-mono text-xs text-muted-foreground md:table-cell">
                    {format(new Date(t.recordedAt), "MMM d, yyyy HH:mm")}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">{t.totalDistance.toFixed(1)}</TableCell>
                  <TableCell className="text-right font-mono tabular-nums">{t.meanSpeed.toFixed(2)}</TableCell>
                  {measureHeaders.map((h) => {
                    const m = t.measures.find((x) => x.label === h.label);
                    return (
                      <TableCell key={h.label} className="hidden text-right font-mono tabular-nums lg:table-cell">
                        {m?.value == null ? "n/a" : `${m.value.toFixed(m.digits)}${m.unit === "%" ? "%" : ""}`}
                      </TableCell>
                    );
                  })}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      {(status === "CanLoadMore" || status === "LoadingMore") && (
        <div className="flex justify-center">
          <Button size="sm" variant="secondary" onClick={() => loadMore(PAGE)} disabled={status === "LoadingMore"}>
            {status === "LoadingMore" && <Spinner />} Load more trials
          </Button>
        </div>
      )}
    </div>
  );
}
