import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip.tsx";
import type { Measure } from "@/lib/tracking/test-measures.ts";

export default function MeasureGrid({ measures }: { measures: Measure[] }) {
  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-md border bg-border sm:grid-cols-3 xl:grid-cols-6">
      {measures.map((m) => {
        const cell = (
          <div className="h-full bg-card p-3">
            <p className="truncate text-[11px] uppercase tracking-wider text-muted-foreground">{m.label}</p>
            <p className="font-mono text-lg font-semibold tabular-nums">
              {m.value === null ? "n/a" : m.value.toFixed(m.digits)}
              {m.unit && <span className="pl-1 text-xs font-normal text-muted-foreground">{m.unit}</span>}
            </p>
          </div>
        );
        if (!m.hint) return <div key={m.label}>{cell}</div>;
        return (
          <Tooltip key={m.label}>
            <TooltipTrigger asChild>
              <div className="cursor-help">{cell}</div>
            </TooltipTrigger>
            <TooltipContent className="max-w-60">{m.hint}</TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}
