import { Move, RotateCcw, ScanSearch, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group.tsx";
import { getTemplate, TEMPLATES } from "@/lib/tracking/templates.ts";
import type { ArenaShape, TemplateId } from "@/lib/tracking/types.ts";
import { cn } from "@/lib/utils.ts";
import { MAZE_LABELS } from "@/lib/tracking/maze-detect.ts";
import { clampScale, isDraggableZone, NO_EDIT } from "@/lib/tracking/zone-edits.ts";
import type { TrackingSession } from "../_hooks/use-tracking-session.ts";
import PanelSection from "@/components/tracking/panel-section.tsx";
import SliderRow from "@/components/tracking/slider-row.tsx";

export default function ArenaPanel({ s, disabled }: { s: TrackingSession; disabled: boolean }) {
  const template = getTemplate(s.templateId);
  const selectedZone = s.zones.find((z) => z.id === s.selectedZoneId);
  const selectedEdit = (s.selectedZoneId && s.zoneEdits[s.selectedZoneId]) || NO_EDIT;
  const hasEdits = Object.keys(s.zoneEdits).length > 0;
  const canDragAny = s.zones.some(isDraggableZone);
  const setShape = (shape: ArenaShape) => {
    if (!s.arena) return;
    const r = s.arena.rect;
    const side = Math.min(r.w, r.h);
    const rect = shape === "circle" ? { x: r.x + (r.w - side) / 2, y: r.y + (r.h - side) / 2, w: side, h: side } : r;
    s.setArenaManual({ ...s.arena, shape, rect });
  };

  return (
    <>
      <PanelSection
        step="01"
        collapsible
        title="Arena"
        action={
          <Button size="xs" variant="secondary" onClick={s.redetectArena} disabled={disabled || !s.hasBackground}>
            <ScanSearch /> Auto-detect
          </Button>
        }
      >
        {s.mazeDetection && (
          <div className="flex items-center gap-2 rounded-md border border-primary/30 bg-primary/5 px-2.5 py-2 text-xs">
            <Sparkles className="size-3.5 shrink-0 text-primary" />
            <span className="min-w-0 flex-1 truncate">
              Detected: <span className="font-medium">{MAZE_LABELS[s.mazeDetection.kind]}</span>
            </span>
            <span className="font-mono text-[11px] text-muted-foreground">{Math.round(s.mazeDetection.confidence * 100)}%</span>
          </div>
        )}
        <div className="flex items-center justify-between gap-3">
          <Label className="text-xs text-muted-foreground">Shape</Label>
          <ToggleGroup
            type="single"
            size="sm"
            variant="outline"
            value={s.arena?.shape ?? "rect"}
            onValueChange={(v) => v && setShape(v as ArenaShape)}
            disabled={disabled}
          >
            <ToggleGroupItem value="rect" className="cursor-pointer px-3 text-xs">Square</ToggleGroupItem>
            <ToggleGroupItem value="circle" className="cursor-pointer px-3 text-xs">Round</ToggleGroupItem>
          </ToggleGroup>
        </div>
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="arena-cm" className="text-xs text-muted-foreground">
            Real width (cm)
          </Label>
          <Input
            id="arena-cm"
            type="number"
            min={1}
            step={0.5}
            value={s.arenaCm}
            onChange={(e) => s.setArenaCm(Number(e.target.value) || 1)}
            className="h-8 w-24 font-mono text-right"
            disabled={disabled}
          />
        </div>
        <SliderRow
          label="Arena rotation"
          value={s.arena?.rotation ?? 0}
          min={-180}
          max={180}
          step={0.5}
          format={(v) => `${v}°`}
          onChange={(rotation) => s.arena && s.setArenaManual({ ...s.arena, rotation })}
          disabled={disabled || !s.arena}
        />
        {!!s.arena?.rotation && (
          <Button size="xs" variant="ghost" className="w-full" disabled={disabled} onClick={() => s.arena && s.setArenaManual({ ...s.arena, rotation: 0 })}>
            <RotateCcw /> Straighten arena
          </Button>
        )}
        <p className="font-mono text-[11px] text-muted-foreground">
          scale {s.pxPerCm.toFixed(2)} px/cm, drag the outline, inside or corners to adjust, and the round top handle to rotate
        </p>
      </PanelSection>

      <PanelSection step="02" title="Test and zones" collapsible>
        <div className="grid grid-cols-4 gap-1.5">
          {TEMPLATES.map((t) => (
            <button
              key={t.id}
              type="button"
              disabled={disabled}
              title={t.name}
              onClick={() => {
                s.setTemplateId(t.id as TemplateId);
                if (s.arena && t.shape !== s.arena.shape && t.id !== "custom") setShape(t.shape);
              }}
              className={cn(
                "cursor-pointer rounded-md border px-1 py-2 font-mono text-[11px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                s.templateId === t.id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "bg-background hover:border-primary/60",
              )}
            >
              {t.short}
            </button>
          ))}
        </div>
        <div>
          <p className="text-sm font-medium">{template.name}</p>
          <p className="text-xs text-muted-foreground">{template.description}</p>
        </div>
        {template.variants.length > 1 && (
          <Select
            value={s.params.variant}
            onValueChange={(variant) => s.setParams({ ...s.params, variant })}
            disabled={disabled}
          >
            <SelectTrigger size="sm" className="w-full cursor-pointer">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {template.variants.map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  {v.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {template.sizeLabel && (
          <SliderRow
            label={template.sizeLabel}
            value={s.params.size}
            min={template.sizeRange[0]}
            max={template.sizeRange[1]}
            step={0.01}
            format={(v) => `${Math.round(v * 100)}%`}
            onChange={(size) => s.setParams({ ...s.params, size })}
            disabled={disabled}
          />
        )}
        <SliderRow
          label="Rotation"
          value={s.params.rotation}
          min={-180}
          max={180}
          step={1}
          format={(v) => `${v}°`}
          onChange={(rotation) => s.setParams({ ...s.params, rotation })}
          disabled={disabled}
        />
        <ul className="flex flex-wrap gap-1.5 pt-1">
          {s.zones.map((z) => {
            const draggable = isDraggableZone(z);
            return (
              <li key={z.id}>
                <button
                  type="button"
                  disabled={disabled || !draggable}
                  onClick={() => s.setSelectedZoneId(z.id === s.selectedZoneId ? null : z.id)}
                  title={draggable ? "Select to adjust" : "Follows the other zones"}
                  className={cn(
                    "flex cursor-pointer items-center gap-1.5 rounded border px-1.5 py-0.5 text-[11px] transition-colors disabled:cursor-default",
                    z.id === s.selectedZoneId ? "border-primary bg-accent text-accent-foreground" : "hover:border-primary/60",
                  )}
                >
                  <span className="size-2 rounded-sm" style={{ backgroundColor: z.color }} />
                  {z.name}
                  {s.zoneEdits[z.id] && <span className="text-primary">*</span>}
                </button>
              </li>
            );
          })}
        </ul>
        {selectedZone ? (
          <div className="space-y-2 rounded-md border bg-muted/40 p-2.5">
            <div className="flex items-center justify-between gap-2">
              <p className="flex min-w-0 items-center gap-1.5 text-xs font-medium">
                <span className="size-2 shrink-0 rounded-sm" style={{ backgroundColor: selectedZone.color }} />
                <span className="truncate">{selectedZone.name}</span>
              </p>
              <Button
                size="xs"
                variant="ghost"
                disabled={disabled || !s.zoneEdits[selectedZone.id]}
                onClick={() => s.setZoneEdit(selectedZone.id, NO_EDIT)}
              >
                <RotateCcw /> Reset zone
              </Button>
            </div>
            <SliderRow
              label="Zone size"
              value={selectedEdit.scale}
              min={0.2}
              max={4}
              step={0.01}
              format={(v) => `${Math.round(v * 100)}%`}
              onChange={(scale) => s.setZoneEdit(selectedZone.id, { ...selectedEdit, scale: clampScale(scale) })}
              disabled={disabled}
            />
          </div>
        ) : (
          canDragAny && (
            <p className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
              <Move className="mt-px size-3 shrink-0" />
              Click a zone on the video to select it, drag it to move, or drag its round handle to resize.
            </p>
          )
        )}
        {hasEdits && (
          <Button size="xs" variant="secondary" className="w-full" onClick={s.resetZoneEdits} disabled={disabled}>
            <RotateCcw /> Reset all zones to template
          </Button>
        )}
      </PanelSection>
    </>
  );
}
