import type { Doc } from "@/convex/_generated/dataModel.d.ts";

export default function GroupBadge({ group }: { group: Pick<Doc<"groups">, "name" | "color"> }) {
  return (
    <span className="inline-flex max-w-40 items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs">
      <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: group.color }} />
      <span className="truncate">{group.name}</span>
    </span>
  );
}
