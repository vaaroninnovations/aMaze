import type { GroupSeries } from "@/lib/experiments/group-data.ts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table.tsx";
import GroupBadge from "../group-badge.tsx";

const COLUMNS = ["n", "Mean", "SD", "SEM", "Median", "Min", "Max"] as const;

export default function DescriptivesTable({ series, digits }: { series: GroupSeries[]; digits: number }) {
  const f = (v: number) => v.toFixed(digits);
  return (
    <div className="overflow-x-auto rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Group</TableHead>
            {COLUMNS.map((c) => (
              <TableHead key={c} className="text-right">
                {c}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {series.map(({ group, stats }) =>
            stats ? (
              <TableRow key={group._id}>
                <TableCell>
                  <GroupBadge group={group} />
                </TableCell>
                {[String(stats.n), f(stats.mean), f(stats.sd), f(stats.sem), f(stats.median), f(stats.min), f(stats.max)].map((v, i) => (
                  <TableCell key={COLUMNS[i]} className="text-right font-mono tabular-nums">
                    {v}
                  </TableCell>
                ))}
              </TableRow>
            ) : null,
          )}
        </TableBody>
      </Table>
    </div>
  );
}
