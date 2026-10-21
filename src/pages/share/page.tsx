import { Link, useParams } from "react-router-dom";
import { useQuery } from "convex/react";
import { ArrowLeft, FlaskConical } from "lucide-react";
import { api } from "@/convex/_generated/api.js";
import AppHeader from "@/components/app-header.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { getTemplate } from "@/lib/tracking/templates.ts";
import type { TemplateId } from "@/lib/tracking/types.ts";

function formatValue(value: number | null, digits: number) {
  return value === null ? "—" : value.toFixed(digits);
}

export default function SharedProjectPage() {
  const { shareToken = "" } = useParams();
  const shared = useQuery(api.experiments.sharing.sharedView, { shareToken });

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-6xl space-y-6 p-4 py-8">
        <Button size="sm" variant="ghost" className="-ml-2" asChild>
          <Link to="/">
            <ArrowLeft /> aMaze
          </Link>
        </Button>
        {shared === undefined ? (
          <div className="space-y-4">
            <Skeleton className="h-10 w-72" />
            <Skeleton className="h-48 w-full" />
          </div>
        ) : shared === null ? (
          <div className="rounded-xl border border-dashed p-8 text-center">
            <FlaskConical className="mx-auto size-8 text-muted-foreground" />
            <h1 className="mt-3 text-xl font-semibold">
              Share link unavailable
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              The project owner may have disabled this link.
            </p>
          </div>
        ) : (
          <>
            <header className="space-y-1">
              <p className="font-mono text-[11px] uppercase tracking-wider text-primary">
                {getTemplate(shared.experiment.templateId as TemplateId).name} ·
                Read-only shared project
              </p>
              <h1 className="text-2xl font-semibold tracking-tight">
                {shared.experiment.name}
              </h1>
              {shared.experiment.description && (
                <p className="max-w-3xl text-sm text-muted-foreground">
                  {shared.experiment.description}
                </p>
              )}
            </header>

            <section className="grid gap-3 sm:grid-cols-3">
              {[
                ["Subjects", shared.subjects.length],
                ["Groups", shared.groups.length],
                ["Saved trials", shared.trials.length],
              ].map(([label, count]) => (
                <div key={label} className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">{label}</p>
                  <p className="mt-1 text-2xl font-semibold">{count}</p>
                </div>
              ))}
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold">Results</h2>
              {shared.trials.length === 0 ? (
                <p className="rounded-lg border p-5 text-sm text-muted-foreground">
                  No saved results in this project yet.
                </p>
              ) : (
                <div className="overflow-x-auto rounded-lg border">
                  <table className="w-full min-w-[720px] text-left text-sm">
                    <thead className="bg-muted/60 text-xs text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2 font-medium">Subject</th>
                        <th className="px-3 py-2 font-medium">Session</th>
                        <th className="px-3 py-2 font-medium">Recorded</th>
                        <th className="px-3 py-2 font-medium">Duration (s)</th>
                        <th className="px-3 py-2 font-medium">Distance (cm)</th>
                        <th className="px-3 py-2 font-medium">
                          Mean speed (cm/s)
                        </th>
                        <th className="px-3 py-2 font-medium">Measures</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {shared.trials.map((trial, index) => (
                        <tr
                          key={`${trial.subjectCode}-${trial.session}-${index}`}
                        >
                          <td className="px-3 py-2 font-mono">
                            {trial.subjectCode}
                          </td>
                          <td className="px-3 py-2">{trial.session}</td>
                          <td className="px-3 py-2">
                            {new Date(trial.recordedAt).toLocaleDateString()}
                          </td>
                          <td className="px-3 py-2 tabular-nums">
                            {trial.summary.duration.toFixed(1)}
                          </td>
                          <td className="px-3 py-2 tabular-nums">
                            {trial.summary.totalDistance.toFixed(2)}
                          </td>
                          <td className="px-3 py-2 tabular-nums">
                            {trial.summary.meanSpeed.toFixed(2)}
                          </td>
                          <td className="px-3 py-2">
                            {trial.measures.map((measure) => (
                              <span
                                key={measure.label}
                                className="mr-2 whitespace-nowrap text-xs"
                              >
                                {measure.label}:{" "}
                                {formatValue(measure.value, measure.digits)}{" "}
                                {measure.unit}
                              </span>
                            ))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {shared.truncated && (
                <p className="text-xs text-muted-foreground">
                  Showing the latest 1,000 results.
                </p>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
