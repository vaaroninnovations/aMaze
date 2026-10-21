import { useSessionMutation as useMutation } from "@/lib/session-convex.ts";
import { Pencil, PawPrint, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api.js";
import type { Doc, Id } from "@/convex/_generated/dataModel.d.ts";
import ConfirmDialog from "@/components/confirm-dialog.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty.tsx";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table.tsx";
import { errorMessage } from "@/lib/errors.ts";
import SubjectFormDialog, { NO_GROUP, type SubjectSubmitValues as SubmitValues } from "./subject-form-dialog.tsx";
import GroupBadge from "./group-badge.tsx";

type Props = { experimentId: Id<"experiments">; groups: Doc<"groups">[]; subjects: Doc<"subjects">[] };

const SEX_LABEL = { male: "M", female: "F", unknown: "–" } as const;

export default function SubjectsManager({ experimentId, groups, subjects }: Props) {
  const create = useMutation(api.experiments.subjects.create);
  const update = useMutation(api.experiments.subjects.update);
  const remove = useMutation(api.experiments.subjects.remove);
  const groupById = new Map(groups.map((g) => [g._id, g]));
  const sorted = [...subjects].sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));

  // The form works with plain strings; ids are validated again on the server.
  const toArgs = (v: SubmitValues) => ({
    code: v.code,
    groupId: v.groupId as Id<"groups"> | null,
    sex: v.sex,
    notes: v.notes || undefined,
  });

  const onCreate = async (v: SubmitValues) => {
    try {
      await create({ experimentId, ...toArgs(v) });
      toast.success(`Added ${v.code.trim()}`);
      return true;
    } catch (e) {
      toast.error(errorMessage(e, "Could not add the subject."));
      return false;
    }
  };

  const addButton = (
    <SubjectFormDialog
      title="Add subject"
      submitLabel="Add subject"
      groups={groups}
      onSubmit={onCreate}
      trigger={
        <Button size="sm">
          <Plus /> Add subject
        </Button>
      }
    />
  );

  if (subjects.length === 0) {
    return (
      <Empty className="rounded-lg border border-dashed py-10">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <PawPrint />
          </EmptyMedia>
          <EmptyTitle>No subjects yet</EmptyTitle>
          <EmptyDescription>Add each animal with its ID, group and sex. You can also add subjects while saving a trial.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>{addButton}</EmptyContent>
      </Empty>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">{addButton}</div>
      <div className="overflow-x-auto rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Subject</TableHead>
              <TableHead>Group</TableHead>
              <TableHead>Sex</TableHead>
              <TableHead className="text-right">Trials</TableHead>
              <TableHead className="hidden md:table-cell">Notes</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((s) => {
              const group = s.groupId ? groupById.get(s.groupId) : undefined;
              return (
                <TableRow key={s._id}>
                  <TableCell className="font-mono font-medium">{s.code}</TableCell>
                  <TableCell>{group ? <GroupBadge group={group} /> : <span className="text-muted-foreground">None</span>}</TableCell>
                  <TableCell className="font-mono">{SEX_LABEL[s.sex]}</TableCell>
                  <TableCell className="text-right font-mono tabular-nums">{s.trialCount}</TableCell>
                  <TableCell className="hidden max-w-60 truncate text-muted-foreground md:table-cell">{s.notes}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <SubjectFormDialog
                        title={`Edit ${s.code}`}
                        submitLabel="Save"
                        groups={groups}
                        initial={{ code: s.code, groupId: s.groupId ?? NO_GROUP, sex: s.sex, notes: s.notes ?? "" }}
                        onSubmit={async (v) => {
                          try {
                            await update({ subjectId: s._id, ...toArgs(v) });
                            return true;
                          } catch (e) {
                            toast.error(errorMessage(e, "Could not update the subject."));
                            return false;
                          }
                        }}
                        trigger={
                          <Button size="icon" variant="ghost" className="size-8" aria-label={`Edit ${s.code}`}>
                            <Pencil />
                          </Button>
                        }
                      />
                      <ConfirmDialog
                        title={`Delete subject ${s.code}?`}
                        description={
                          s.trialCount > 0
                            ? `This also deletes ${s.trialCount} saved ${s.trialCount === 1 ? "trial" : "trials"}. This can't be undone.`
                            : "This can't be undone."
                        }
                        onConfirm={async () => {
                          try {
                            await remove({ subjectId: s._id });
                          } catch (e) {
                            toast.error(errorMessage(e, "Could not delete the subject."));
                          }
                        }}
                        trigger={
                          <Button size="icon" variant="ghost" className="size-8 text-muted-foreground hover:text-destructive" aria-label={`Delete ${s.code}`}>
                            <Trash2 />
                          </Button>
                        }
                      />
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
