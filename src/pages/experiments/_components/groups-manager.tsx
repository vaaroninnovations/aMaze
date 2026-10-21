import { useState } from "react";
import { useSessionMutation as useMutation } from "@/lib/anonymous-convex.ts";
import { Check, Pencil, Plus, Trash2, Users, X } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api.js";
import type { Doc, Id } from "@/convex/_generated/dataModel.d.ts";
import ConfirmDialog from "@/components/confirm-dialog.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty.tsx";
import { Input } from "@/components/ui/input.tsx";
import { errorMessage } from "@/lib/errors.ts";
import { cn } from "@/lib/utils.ts";
import { GROUP_COLORS } from "../_lib/group-colors.ts";

type Props = { experimentId: Id<"experiments">; groups: Doc<"groups">[]; subjects: Doc<"subjects">[] };

function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="flex gap-1">
      {GROUP_COLORS.map((c) => (
        <button
          key={c}
          type="button"
          aria-label={`Color ${c}`}
          onClick={() => onChange(c)}
          className={cn("size-5 cursor-pointer rounded-full border-2 border-transparent", value === c && "border-foreground")}
          style={{ backgroundColor: c }}
        />
      ))}
    </div>
  );
}

function GroupRow({ group, count }: { group: Doc<"groups">; count: number }) {
  const update = useMutation(api.experiments.groups.update);
  const remove = useMutation(api.experiments.groups.remove);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(group.name);
  const [color, setColor] = useState(group.color);

  const save = async () => {
    try {
      await update({ groupId: group._id, name, color });
      setEditing(false);
    } catch (e) {
      toast.error(errorMessage(e, "Could not update the group."));
    }
  };

  if (editing) {
    return (
      <div className="flex flex-wrap items-center gap-3 rounded-md border bg-card p-3">
        <Input value={name} onChange={(e) => setName(e.target.value)} className="h-8 w-48" maxLength={60} autoFocus />
        <ColorPicker value={color} onChange={setColor} />
        <div className="ml-auto flex gap-1">
          <Button size="icon" variant="ghost" className="size-8" onClick={() => setEditing(false)} aria-label="Cancel">
            <X />
          </Button>
          <Button size="icon" className="size-8" onClick={() => void save()} disabled={!name.trim()} aria-label="Save">
            <Check />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-md border bg-card p-3">
      <span className="size-3 shrink-0 rounded-full" style={{ backgroundColor: group.color }} />
      <span className="min-w-0 flex-1 truncate font-medium">{group.name}</span>
      <span className="font-mono text-xs text-muted-foreground">
        {count} {count === 1 ? "subject" : "subjects"}
      </span>
      <Button size="icon" variant="ghost" className="size-8" onClick={() => setEditing(true)} aria-label="Edit group">
        <Pencil />
      </Button>
      <ConfirmDialog
        title={`Delete group "${group.name}"?`}
        description="Subjects in this group are kept but will no longer belong to a group."
        onConfirm={async () => {
          try {
            await remove({ groupId: group._id });
          } catch (e) {
            toast.error(errorMessage(e, "Could not delete the group."));
          }
        }}
        trigger={
          <Button size="icon" variant="ghost" className="size-8 text-muted-foreground hover:text-destructive" aria-label="Delete group">
            <Trash2 />
          </Button>
        }
      />
    </div>
  );
}

export default function GroupsManager({ experimentId, groups, subjects }: Props) {
  const create = useMutation(api.experiments.groups.create);
  const [name, setName] = useState("");
  const [color, setColor] = useState<string>(GROUP_COLORS[groups.length % GROUP_COLORS.length]);
  const [busy, setBusy] = useState(false);

  const add = async () => {
    if (!name.trim()) return;
    setBusy(true);
    try {
      await create({ experimentId, name, color });
      setName("");
      setColor(GROUP_COLORS[(groups.length + 1) % GROUP_COLORS.length]);
    } catch (e) {
      toast.error(errorMessage(e, "Could not create the group."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <form
        className="flex flex-wrap items-center gap-3 rounded-lg border border-dashed p-3"
        onSubmit={(e) => {
          e.preventDefault();
          void add();
        }}
      >
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Control" className="h-8 w-48" maxLength={60} />
        <ColorPicker value={color} onChange={setColor} />
        <Button size="sm" type="submit" className="ml-auto" disabled={busy || !name.trim()}>
          <Plus /> Add group
        </Button>
      </form>
      {groups.length === 0 ? (
        <Empty className="rounded-lg border border-dashed py-10">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Users />
            </EmptyMedia>
            <EmptyTitle>No groups yet</EmptyTitle>
            <EmptyDescription>Add groups such as Control and Treatment, then assign subjects to them.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="space-y-2">
          {groups.map((g) => (
            <GroupRow key={g._id} group={g} count={subjects.filter((s) => s.groupId === g._id).length} />
          ))}
        </div>
      )}
    </div>
  );
}
