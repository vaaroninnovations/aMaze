import { useEffect, useRef, useState, type PointerEvent } from "react";
import { distance, normalizeDeg, polygonCentroid, polygonToPath, rectCenter, rotatePoint } from "@/lib/tracking/geometry.ts";
import { byAreaDescending, clampScale, isDraggableZone, NO_EDIT, polygonBounds, type ZoneEdit, type ZoneEdits } from "@/lib/tracking/zone-edits.ts";
import type { Arena, Point, Rect, TrackPoint, Zone } from "@/lib/tracking/types.ts";
import type { Detection } from "@/lib/tracking/vision.ts";

type Props = {
  dims: { w: number; h: number };
  frameVersion: number;
  drawCurrent: (ctx: CanvasRenderingContext2D, w: number, h: number) => void;
  arena: Arena | null;
  onArenaChange: (a: Arena) => void;
  zones: Zone[];
  track: TrackPoint[];
  currentTime: number;
  editable: boolean;
  probe: Detection | null;
  /** Live camera: when set, the canvas repaints every animation frame instead of on frameVersion. */
  liveDraw?: (ctx: CanvasRenderingContext2D, w: number, h: number) => void;
  /** Number of seconds of trail to show (live mode); omit for the full path. */
  trailSeconds?: number;
  /** Enables click-to-select and dragging of individual zones (ROIs). */
  zoneEditing?: {
    edits: ZoneEdits;
    onChange: (id: string, edit: ZoneEdit) => void;
    selectedId: string | null;
    onSelect: (id: string | null) => void;
  };
};

type ArenaDrag = { kind: "move" | "nw" | "ne" | "se" | "sw"; start: Point; rect: Rect; rotation: number };
type RotateDrag = { kind: "rotate"; startAngle: number; rotation: number; center: Point };
type ZoneDrag = { kind: "zone-move" | "zone-scale"; start: Point; zoneId: string; edit: ZoneEdit; center: Point };
type Drag = ArenaDrag | ZoneDrag | RotateDrag;

const angleDeg = (p: Point, c: Point) => (Math.atan2(p.y - c.y, p.x - c.x) * 180) / Math.PI;

const MIN_SIZE = 20;

function resize(d: ArenaDrag, p: Point, square: boolean): Rect {
  const dx = p.x - d.start.x;
  const dy = p.y - d.start.y;
  const r = d.rect;
  if (d.kind === "move") return { ...r, x: r.x + dx, y: r.y + dy };
  let x0 = r.x;
  let y0 = r.y;
  let x1 = r.x + r.w;
  let y1 = r.y + r.h;
  if (d.kind.includes("w")) x0 = Math.min(x0 + dx, x1 - MIN_SIZE);
  if (d.kind.includes("e")) x1 = Math.max(x1 + dx, x0 + MIN_SIZE);
  if (d.kind.includes("n")) y0 = Math.min(y0 + dy, y1 - MIN_SIZE);
  if (d.kind.includes("s")) y1 = Math.max(y1 + dy, y0 + MIN_SIZE);
  const next = { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  if (!square) return next;
  const side = Math.max(next.w, next.h);
  return {
    x: d.kind.includes("w") ? x1 - side : x0,
    y: d.kind.includes("n") ? y1 - side : y0,
    w: side,
    h: side,
  };
}

/** Resizes in the arena's own axes, then maps the new center back so the opposite corner stays put. */
function resizeRotated(d: ArenaDrag, p: Point, square: boolean): Rect {
  if (!d.rotation || d.kind === "move") return resize(d, p, square);
  const c0 = rectCenter(d.rect);
  const local = resize({ ...d, start: rotatePoint(d.start, c0, -d.rotation) }, rotatePoint(p, c0, -d.rotation), square);
  const lc = rectCenter(local);
  const c = rotatePoint(lc, c0, d.rotation);
  return { x: c.x - local.w / 2, y: c.y - local.h / 2, w: local.w, h: local.h };
}

export default function ArenaViewport(props: Props) {
  const { dims, frameVersion, drawCurrent, arena, onArenaChange, zones, track, currentTime, editable, probe, liveDraw, trailSeconds, zoneEditing } =
    props;
  const canEditZones = editable && !!zoneEditing && !!arena;
  const rotation = arena?.rotation ?? 0;
  const center = arena ? rectCenter(arena.rect) : { x: 0, y: 0 };
  const rotateTransform = `rotate(${rotation} ${center.x} ${center.y})`;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drag, setDrag] = useState<Drag | null>(null);

  // Repaint the frame whenever the session grabs a new one (canvas is an external system).
  useEffect(() => {
    if (liveDraw) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) drawCurrent(ctx, dims.w, dims.h);
  }, [frameVersion, dims, drawCurrent, liveDraw]);

  // Live camera: paint every animation frame so the preview stays smooth.
  useEffect(() => {
    if (!liveDraw) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    let raf = 0;
    const loop = () => {
      liveDraw(ctx, dims.w, dims.h);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [liveDraw, dims]);

  // Resolve the svg from the event (not a ref) so handlers can be created during render.
  const toLocal = (e: PointerEvent): Point => {
    const box = (e.currentTarget as Element).closest("svg")?.getBoundingClientRect();
    if (!box) return { x: 0, y: 0 };
    return { x: ((e.clientX - box.left) / box.width) * dims.w, y: ((e.clientY - box.top) / box.height) * dims.h };
  };

  const startDrag = (kind: ArenaDrag["kind"]) => (e: PointerEvent) => {
    if (!editable || !arena) return;
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    zoneEditing?.onSelect(null);
    setDrag({ kind, start: toLocal(e), rect: arena.rect, rotation: arena.rotation ?? 0 });
  };

  const startZoneDrag = (kind: ZoneDrag["kind"], z: Zone) => (e: PointerEvent) => {
    if (!canEditZones || !zoneEditing) return;
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    zoneEditing.onSelect(z.id);
    setDrag({ kind, start: toLocal(e), zoneId: z.id, edit: zoneEditing.edits[z.id] ?? NO_EDIT, center: polygonCentroid(z.polygon) });
  };

  const startRotate = (e: PointerEvent) => {
    if (!editable || !arena) return;
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    zoneEditing?.onSelect(null);
    const center = rectCenter(arena.rect);
    setDrag({ kind: "rotate", startAngle: angleDeg(toLocal(e), center), rotation: arena.rotation ?? 0, center });
  };

  const onMove = (e: PointerEvent) => {
    if (!drag || !arena) return;
    const p = toLocal(e);
    if (drag.kind === "rotate") {
      const raw = drag.rotation + angleDeg(p, drag.center) - drag.startAngle;
      // Hold Shift to snap to 15 degree steps.
      const next = e.shiftKey ? Math.round(raw / 15) * 15 : Math.round(raw * 2) / 2;
      onArenaChange({ ...arena, rotation: normalizeDeg(next) });
    } else if (drag.kind === "zone-move") {
      // Zone offsets live in the arena's own axes, so undo the arena rotation on the drag delta.
      const delta = rotatePoint({ x: p.x - drag.start.x, y: p.y - drag.start.y }, { x: 0, y: 0 }, -rotation);
      zoneEditing?.onChange(drag.zoneId, {
        ...drag.edit,
        dx: drag.edit.dx + delta.x / arena.rect.w,
        dy: drag.edit.dy + delta.y / arena.rect.h,
      });
    } else if (drag.kind === "zone-scale") {
      const factor = distance(p, drag.center) / Math.max(distance(drag.start, drag.center), 1);
      zoneEditing?.onChange(drag.zoneId, { ...drag.edit, scale: clampScale(drag.edit.scale * factor) });
    } else if ("rect" in drag) {
      onArenaChange({ ...arena, rect: resizeRotated(drag, p, arena.shape === "circle") });
    }
  };

  const selectedZone = canEditZones ? zones.find((z) => z.id === zoneEditing?.selectedId) : undefined;
  const selectedBox = selectedZone && polygonBounds(selectedZone.polygon);

  const minT = trailSeconds === undefined ? -Infinity : currentTime - trailSeconds;
  const visible = track.filter((p) => p.found && p.t <= currentTime + 1e-6 && p.t >= minT);
  const pathD = visible.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  const head = visible[visible.length - 1];
  const stroke = Math.max(dims.w / 320, 1);

  // Compute animal heading and pose landmarks (Nose, Body centroid, Tail)
  const prevPoint = visible.length >= 2 ? visible[visible.length - 2] : null;
  const heading =
    head && prevPoint && (head.x !== prevPoint.x || head.y !== prevPoint.y)
      ? Math.atan2(head.y - prevPoint.y, head.x - prevPoint.x)
      : 0;
  const headingDeg = (heading * 180) / Math.PI;
  const blobArea = head?.area && head.area > 0 ? head.area : 160;
  const rMajor = head ? Math.max(Math.sqrt(blobArea / Math.PI) * 1.35, stroke * 7.5) : 0;
  const rMinor = head ? Math.max(rMajor * 0.52, stroke * 4) : 0;
  const nose = head
    ? { x: head.x + Math.cos(heading) * (rMajor * 1.15), y: head.y + Math.sin(heading) * (rMajor * 1.15) }
    : null;
  const tail = head
    ? { x: head.x - Math.cos(heading) * (rMajor * 1.25), y: head.y - Math.sin(heading) * (rMajor * 1.25) }
    : null;

  return (
    <div
      className="relative mx-auto w-full overflow-hidden rounded-lg bg-black ring-1 ring-border"
      style={{ aspectRatio: `${dims.w} / ${dims.h}`, maxWidth: `calc(68vh * ${dims.w / dims.h})` }}
    >
      <canvas ref={canvasRef} width={dims.w} height={dims.h} className="absolute inset-0 size-full" />
      <svg
        viewBox={`0 0 ${dims.w} ${dims.h}`}
        className="absolute inset-0 size-full touch-none select-none"
        onPointerMove={onMove}
        onPointerDown={() => canEditZones && zoneEditing?.onSelect(null)}
        onPointerUp={() => setDrag(null)}
        onPointerCancel={() => setDrag(null)}
      >
        {/* Arena body sits under the zones: dragging empty arena space moves the whole arena. */}
        {arena && editable && (
          arena.shape === "circle" ? (
            <circle cx={rectCenter(arena.rect).x} cy={rectCenter(arena.rect).y} r={Math.min(arena.rect.w, arena.rect.h) / 2} fill="transparent" className="cursor-move" onPointerDown={startDrag("move")} />
          ) : (
            <rect x={arena.rect.x} y={arena.rect.y} width={arena.rect.w} height={arena.rect.h} transform={rotateTransform} fill="transparent" className="cursor-move" onPointerDown={startDrag("move")} />
          )
        )}
        {byAreaDescending(zones).map((z) => {
          const draggable = canEditZones && isDraggableZone(z);
          const selected = z.id === selectedZone?.id;
          return (
            <path
              key={z.id}
              d={polygonToPath(z.polygon)}
              fill={z.color}
              fillOpacity={selected ? 0.28 : 0.12}
              stroke={z.color}
              strokeWidth={selected ? stroke * 1.8 : stroke}
              strokeDasharray={selected ? undefined : `${stroke * 4} ${stroke * 2}`}
              pointerEvents={draggable ? "all" : "none"}
              className={draggable ? "cursor-grab active:cursor-grabbing" : undefined}
              onPointerDown={draggable ? startZoneDrag("zone-move", z) : undefined}
            />
          );
        })}
        {zones.map((z) => {
          // Ring-shaped zones (with exclusions) share a centroid with the inner zone, so label them near the top edge.
          const ys = z.polygon.map((p) => p.y);
          const avg = z.polygon.reduce((a, p) => ({ x: a.x + p.x / z.polygon.length, y: a.y + p.y / z.polygon.length }), { x: 0, y: 0 });
          const c = z.excludes?.length ? { x: avg.x, y: Math.min(...ys) + dims.h / 28 } : avg;
          return (
            <text
              key={`${z.id}-label`}
              x={c.x}
              y={c.y}
              fill={z.color}
              fontSize={Math.max(dims.w / 55, 7)}
              textAnchor="middle"
              dominantBaseline="middle"
              className="pointer-events-none font-mono"
              style={{ paintOrder: "stroke", stroke: "rgba(0,0,0,0.75)", strokeWidth: 2.5 }}
            >
              {z.name}
            </text>
          );
        })}

        {arena && (
          <g>
            {arena.shape === "circle" ? (
              <circle
                cx={rectCenter(arena.rect).x}
                cy={rectCenter(arena.rect).y}
                r={Math.min(arena.rect.w, arena.rect.h) / 2}
                fill="none"
                stroke="var(--primary)"
                strokeWidth={stroke * 1.5}
                pointerEvents={editable ? "stroke" : "none"}
                className={editable ? "cursor-move" : ""}
                onPointerDown={startDrag("move")}
              />
            ) : (
              <rect
                x={arena.rect.x}
                y={arena.rect.y}
                width={arena.rect.w}
                height={arena.rect.h}
                transform={rotateTransform}
                fill="none"
                stroke="var(--primary)"
                strokeWidth={stroke * 1.5}
                pointerEvents={editable ? "stroke" : "none"}
                className={editable ? "cursor-move" : ""}
                onPointerDown={startDrag("move")}
              />
            )}
            {editable &&
              (["nw", "ne", "se", "sw"] as const).map((k) => {
                const corner = rotatePoint(
                  { x: arena.rect.x + (k.includes("e") ? arena.rect.w : 0), y: arena.rect.y + (k.includes("s") ? arena.rect.h : 0) },
                  center,
                  rotation,
                );
                const s = stroke * 7;
                return (
                  <rect
                    key={k}
                    x={corner.x - s / 2}
                    y={corner.y - s / 2}
                    width={s}
                    height={s}
                    transform={`rotate(${rotation} ${corner.x} ${corner.y})`}
                    fill="var(--primary)"
                    stroke="black"
                    strokeWidth={stroke * 0.5}
                    className={k === "nw" || k === "se" ? "cursor-nwse-resize" : "cursor-nesw-resize"}
                    onPointerDown={startDrag(k)}
                  />
                );
              })}
            {editable && (
              <g transform={rotateTransform}>
                <line
                  x1={center.x}
                  x2={center.x}
                  y1={arena.rect.y}
                  y2={arena.rect.y - stroke * 18}
                  stroke="var(--primary)"
                  strokeWidth={stroke}
                  pointerEvents="none"
                />
                <circle
                  cx={center.x}
                  cy={arena.rect.y - stroke * 18}
                  r={stroke * 5}
                  fill="white"
                  stroke="var(--primary)"
                  strokeWidth={stroke * 1.5}
                  className={drag?.kind === "rotate" ? "cursor-grabbing" : "cursor-grab"}
                  onPointerDown={startRotate}
                >
                  <title>Drag to rotate the arena (hold Shift to snap)</title>
                </circle>
              </g>
            )}
            {drag?.kind === "rotate" && (
              <text
                x={center.x}
                y={center.y}
                fill="white"
                fontSize={Math.max(dims.w / 30, 10)}
                textAnchor="middle"
                dominantBaseline="middle"
                pointerEvents="none"
                className="font-mono"
                style={{ paintOrder: "stroke", stroke: "rgba(0,0,0,0.8)", strokeWidth: 3 }}
              >
                {rotation.toFixed(1)}°
              </text>
            )}
          </g>
        )}

        {selectedZone && selectedBox && (
          <g>
            <rect
              x={selectedBox.x}
              y={selectedBox.y}
              width={selectedBox.w}
              height={selectedBox.h}
              fill="none"
              stroke="white"
              strokeOpacity={0.8}
              strokeWidth={stroke * 0.8}
              strokeDasharray={`${stroke * 2} ${stroke * 2}`}
              pointerEvents="none"
            />
            <circle
              cx={selectedBox.x + selectedBox.w}
              cy={selectedBox.y + selectedBox.h}
              r={stroke * 4.5}
              fill={selectedZone.color}
              stroke="black"
              strokeWidth={stroke * 0.6}
              className="cursor-nwse-resize"
              onPointerDown={startZoneDrag("zone-scale", selectedZone)}
            />
          </g>
        )}

        {pathD && (
          <path d={pathD} pointerEvents="none" fill="none" stroke="#fde047" strokeWidth={stroke} strokeOpacity={0.85} strokeLinejoin="round" />
        )}
        {head && (
          <g pointerEvents="none">
            {/* Oriented Animal Blob / Outline */}
            <ellipse
              cx={head.x}
              cy={head.y}
              rx={rMajor}
              ry={rMinor}
              transform={`rotate(${headingDeg} ${head.x} ${head.y})`}
              fill="rgba(56, 189, 248, 0.22)"
              stroke="#0284c7"
              strokeWidth={stroke * 1.5}
              strokeDasharray={`${stroke * 3} ${stroke * 1.5}`}
            />
            {/* Animal Spine Skeleton: Tail -> Body -> Nose */}
            {tail && nose && (
              <line
                x1={tail.x}
                y1={tail.y}
                x2={nose.x}
                y2={nose.y}
                stroke="#0284c7"
                strokeWidth={stroke * 1.3}
                strokeOpacity={0.8}
              />
            )}
            {/* Nose landmark (Cyan) */}
            {nose && (
              <g>
                <circle cx={nose.x} cy={nose.y} r={stroke * 2.2} fill="#06b6d4" stroke="#ffffff" strokeWidth={stroke * 0.8} />
                <text
                  x={nose.x + (Math.cos(heading) >= 0 ? stroke * 4 : -stroke * 4)}
                  y={nose.y + (Math.sin(heading) >= 0 ? stroke * 4 : -stroke * 4)}
                  fill="#06b6d4"
                  fontSize={Math.max(dims.w / 65, 8.5)}
                  fontWeight="bold"
                  textAnchor={Math.cos(heading) >= 0 ? "start" : "end"}
                  className="font-mono drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]"
                >
                  Nose
                </text>
              </g>
            )}
            {/* Body Centroid landmark (Green) */}
            <circle cx={head.x} cy={head.y} r={stroke * 2.8} fill="#10b981" stroke="#ffffff" strokeWidth={stroke * 0.9} />
            <text
              x={head.x}
              y={head.y - rMinor - stroke * 3}
              fill="#10b981"
              fontSize={Math.max(dims.w / 65, 8.5)}
              fontWeight="bold"
              textAnchor="middle"
              className="font-mono drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]"
            >
              Body
            </text>
            {/* Tail landmark (Amber) */}
            {tail && (
              <g>
                <circle cx={tail.x} cy={tail.y} r={stroke * 2.0} fill="#f59e0b" stroke="#ffffff" strokeWidth={stroke * 0.8} />
                <text
                  x={tail.x - (Math.cos(heading) >= 0 ? stroke * 4 : -stroke * 4)}
                  y={tail.y - (Math.sin(heading) >= 0 ? stroke * 4 : -stroke * 4)}
                  fill="#f59e0b"
                  fontSize={Math.max(dims.w / 65, 8.5)}
                  fontWeight="bold"
                  textAnchor={Math.cos(heading) >= 0 ? "end" : "start"}
                  className="font-mono drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]"
                >
                  Tail
                </text>
              </g>
            )}
          </g>
        )}
        {probe && (
          <g pointerEvents="none">
            <circle
              cx={probe.x}
              cy={probe.y}
              r={Math.max(Math.sqrt(probe.area / Math.PI) * 1.4, stroke * 6)}
              fill="none"
              stroke={probe.found ? "#22c55e" : "#ef4444"}
              strokeWidth={stroke * 1.5}
            />
            <line x1={probe.x - stroke * 10} x2={probe.x + stroke * 10} y1={probe.y} y2={probe.y} stroke="#22c55e" strokeWidth={stroke} />
            <line y1={probe.y - stroke * 10} y2={probe.y + stroke * 10} x1={probe.x} x2={probe.x} stroke="#22c55e" strokeWidth={stroke} />
          </g>
        )}
      </svg>
    </div>
  );
}
