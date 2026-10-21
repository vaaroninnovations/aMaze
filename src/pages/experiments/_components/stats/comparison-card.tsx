import { CircleCheck, CircleSlash, Info } from "lucide-react";
import type { Comparison } from "@/lib/experiments/group-data.ts";
import { formatP, significanceStars } from "@/lib/experiments/stats.ts";
import { cn } from "@/lib/utils.ts";

const ALPHA = 0.05;

function Verdict({ p }: { p: number }) {
  const sig = p < ALPHA;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-xs",
        sig ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground",
      )}
    >
      {sig ? <CircleCheck className="size-3" /> : <CircleSlash className="size-3" />}
      {formatP(p)} {significanceStars(p)}
    </span>
  );
}

const Stat = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-md bg-muted/60 px-3 py-2">
    <p className="text-[11px] text-muted-foreground">{label}</p>
    <p className="font-mono text-sm tabular-nums">{value}</p>
  </div>
);

/** Plain-language result of the t-test or ANOVA, with the numbers a methods section needs. */
export default function ComparisonCard({ comparison, digits }: { comparison: Comparison; digits: number }) {
  if (comparison.kind === "none") {
    return (
      <div className="flex items-start gap-2 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
        <Info className="mt-0.5 size-4 shrink-0" />
        {comparison.reason}
      </div>
    );
  }

  if (comparison.kind === "t-test") {
    const { a, b, test } = comparison;
    return (
      <div className="space-y-3 rounded-lg border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-wider text-primary">Welch t-test, two-sided</p>
            <p className="text-sm font-medium">
              {a.name} vs {b.name}
            </p>
          </div>
          <Verdict p={test.p} />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat label="t" value={Number.isFinite(test.t) ? test.t.toFixed(3) : "n/a"} />
          <Stat label="df" value={test.df.toFixed(2)} />
          <Stat label="Mean difference" value={test.meanDiff.toFixed(digits)} />
          <Stat label="Cohen's d" value={test.cohensD.toFixed(2)} />
        </div>
        <p className="text-xs text-muted-foreground">
          {test.p < ALPHA ? "The groups differ significantly" : "No significant difference between the groups"} at α = {ALPHA}. Welch&apos;s test does not
          assume equal variances.
        </p>
      </div>
    );
  }

  const { anova, pairwise } = comparison;
  return (
    <div className="space-y-3 rounded-lg border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-wider text-primary">One-way ANOVA</p>
          <p className="text-sm font-medium">Differences across all groups</p>
        </div>
        <Verdict p={anova.p} />
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Stat label={`F(${anova.dfBetween}, ${anova.dfWithin})`} value={Number.isFinite(anova.f) ? anova.f.toFixed(3) : "n/a"} />
        <Stat label="η² (effect size)" value={anova.etaSquared.toFixed(3)} />
        <Stat label="Groups compared" value={String(anova.dfBetween + 1)} />
      </div>
      {pairwise.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">Pairwise Welch t-tests (Bonferroni corrected)</p>
          <div className="divide-y rounded-md border">
            {pairwise.map((p) => (
              <div key={`${p.a._id}-${p.b._id}`} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
                <span className="min-w-0 truncate">
                  {p.a.name} vs {p.b.name}
                </span>
                <span className="flex items-center gap-2">
                  <span className="hidden font-mono text-xs text-muted-foreground sm:inline">
                    Δ {p.test.meanDiff.toFixed(digits)} · d {p.test.cohensD.toFixed(2)}
                  </span>
                  <Verdict p={p.pAdjusted} />
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
