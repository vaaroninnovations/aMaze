import { Crosshair, Play, Square } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Progress } from "@/components/ui/progress.tsx";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group.tsx";
import type { DetectionMode } from "@/lib/tracking/types.ts";
import type { TrackingSession } from "../_hooks/use-tracking-session.ts";
import SliderRow from "@/components/tracking/slider-row.tsx";
import PanelSection from "@/components/tracking/panel-section.tsx";

const MODES: { id: DetectionMode; label: string; hint: string }[] = [
  { id: "background", label: "Subtract", hint: "Compares each frame with the empty arena. Best for most videos." },
  { id: "dark", label: "Dark animal", hint: "Animal darker than the floor (e.g. black mouse on white)." },
  { id: "light", label: "Light animal", hint: "Animal lighter than the floor (e.g. white rat on black)." },
];

type Props = { s: TrackingSession; onProbe: () => void };

export default function DetectionPanel({ s, onProbe }: Props) {
  const busy = s.status === "tracking";
  const mode = MODES.find((m) => m.id === s.settings.mode) ?? MODES[0];
  const set = (patch: Partial<typeof s.settings>) => s.setSettings({ ...s.settings, ...patch });

  return (
    <PanelSection step="03" title="Detection" collapsible>
      <ToggleGroup
        type="single"
        size="sm"
        variant="outline"
        className="w-full"
        value={s.settings.mode}
        onValueChange={(v) => {
          if (!v) return;
          const m = v as DetectionMode;
          set({ mode: m, threshold: m === "background" ? 35 : m === "dark" ? 70 : 180 });
        }}
        disabled={busy}
      >
        {MODES.map((m) => (
          <ToggleGroupItem key={m.id} value={m.id} className="flex-1 cursor-pointer text-xs">
            {m.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <p className="text-xs text-muted-foreground">{mode.hint}</p>
      <SliderRow
        label={s.settings.mode === "background" ? "Sensitivity (difference)" : "Intensity threshold"}
        value={s.settings.threshold}
        min={5}
        max={250}
        step={1}
        format={(v) => String(v)}
        onChange={(threshold) => set({ threshold })}
        disabled={busy}
      />
      <SliderRow
        label="Minimum animal size"
        value={s.settings.minArea}
        min={4}
        max={400}
        step={1}
        format={(v) => `${v} px`}
        onChange={(minArea) => set({ minArea })}
        disabled={busy}
      />
      <SliderRow
        label="Sampling rate"
        value={s.settings.fps}
        min={2}
        max={s.isLive ? 20 : 30}
        step={1}
        format={(v) => `${v} fps`}
        onChange={(fps) => set({ fps })}
        disabled={busy}
      />
      <div className="flex gap-2 pt-1">
        <Button size="sm" variant="secondary" onClick={onProbe} disabled={busy} className="flex-1">
          <Crosshair /> Test frame
        </Button>
        {s.isLive ? null : busy ? (
          <Button size="sm" variant="destructive" onClick={s.stopTracking} className="flex-1">
            <Square /> Stop
          </Button>
        ) : (
          <Button size="sm" onClick={s.runTracking} className="flex-1">
            <Play /> {s.status === "done" ? "Re-run" : "Start tracking"}
          </Button>
        )}
      </div>
      {busy && !s.isLive && (
        <div className="space-y-1">
          <Progress value={s.progress * 100} />
          <p className="font-mono text-[11px] text-muted-foreground">
            {Math.round(s.progress * 100)}% · {s.track.length} samples
          </p>
        </div>
      )}
    </PanelSection>
  );
}
