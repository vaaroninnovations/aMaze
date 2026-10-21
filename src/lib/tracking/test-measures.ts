import { alternation, entrySequence } from "./analytics.ts";
import type { TrackSummary, ZoneStats } from "./metrics.ts";
import type { TemplateId, TrackPoint, Zone } from "./types.ts";

export type Measure = { label: string; value: number | null; unit: string; digits: number; hint: string };

type Ctx = { summary: TrackSummary; zones: Zone[]; track: TrackPoint[] };

const pct = (part: number, whole: number) => (whole > 0 ? (part / whole) * 100 : null);
const index = (a: number, b: number) => (a + b > 0 ? (a - b) / (a + b) : null);
const sum = (zs: ZoneStats[], key: "time" | "entries") => zs.reduce((a, z) => a + z[key], 0);
const byId = (s: TrackSummary, id: string) => s.zones.find((z) => z.id === id);
const m = (label: string, value: number | null, unit: string, hint: string, digits = 1): Measure => ({
  label,
  value,
  unit,
  digits,
  hint,
});

const BUILDERS: Partial<Record<TemplateId, (c: Ctx) => Measure[]>> = {
  "open-field": ({ summary: s }) => {
    const center = byId(s, "center");
    const periphery = byId(s, "periphery");
    return [
      m("Center time", pct(center?.time ?? 0, s.duration), "%", "Higher values suggest lower anxiety-like behavior."),
      m("Center entries", center?.entries ?? 0, "", "Number of times the animal entered the center.", 0),
      m("Thigmotaxis", pct(periphery?.time ?? 0, s.duration), "%", "Time spent near the walls."),
      m("Center latency", center?.latency ?? null, "s", "Time until the first center entry."),
    ];
  },
  "elevated-plus": ({ summary: s }) => {
    const open = s.zones.filter((z) => z.name.startsWith("Open"));
    const closed = s.zones.filter((z) => z.name.startsWith("Closed"));
    const openT = sum(open, "time");
    const openE = sum(open, "entries");
    const closedE = sum(closed, "entries");
    const closedT = sum(closed, "time");
    return [
      m("Open arm time", openT, "s", "Seconds spent in the open arms.", 1),
      m("Open arm entries", openE, "n", "Number of entries into the open arms.", 0),
      m("Closed arm time", closedT, "s", "Seconds spent in the closed arms.", 1),
      m("Closed arm entries", closedE, "n", "Number of entries into the closed arms. Often used as a locomotion control.", 0),
      m("Total arm entries", openE + closedE, "n", "General activity measure.", 0),
    ];
  },
  "y-maze": ({ summary: s, zones, track }) => {
    const arms = zones.filter((z) => z.id.startsWith("arm-")).map((z) => z.id);
    const seq = entrySequence(track, zones, arms);
    const alt = alternation(seq);
    return [
      m("Spontaneous alternation", alt.possible ? alt.pct : null, "%", "Triplets visiting three different arms. Chance is about 22%."),
      m("Alternations", alt.alternations, "", "Consecutive entries into all three arms.", 0),
      m("Arm entries", seq.length, "", "Total arm entries used for the calculation.", 0),
      m("Center time", pct(byId(s, "center")?.time ?? 0, s.duration), "%", "Time spent in the hub."),
    ];
  },
  "water-maze": ({ summary: s }) => {
    const quads = s.zones.filter((z) => z.id.startsWith("quad-"));
    const target = quads.find((z) => z.name.includes("target"));
    const platform = byId(s, "platform");
    return [
      m("Target quadrant", pct(target?.time ?? 0, sum(quads, "time")), "%", "Chance level is 25%."),
      m("Platform latency", platform?.latency ?? null, "s", "Time until the animal first reached the platform zone."),
      m("Platform crossings", platform?.entries ?? 0, "", "Entries into the platform zone.", 0),
    ];
  },
  "barnes-maze": ({ summary: s }) => {
    const escape = byId(s, "escape");
    const wrong = s.zones.filter((z) => z.id.startsWith("hole-"));
    const quadrant = byId(s, "target-quadrant");
    return [
      m("Escape latency", escape?.latency ?? null, "s", "Time until the animal first reached the escape hole."),
      m("Primary errors", sum(wrong, "entries"), "n", "Entries into holes other than the escape hole.", 0),
      m("Wrong holes visited", wrong.filter((z) => z.entries > 0).length, "n", "Distinct incorrect holes visited.", 0),
      m("Escape hole entries", escape?.entries ?? 0, "n", "Entries into the escape hole zone.", 0),
      m("Target quadrant", pct(quadrant?.time ?? 0, s.duration), "%", "Chance level is 25%. Useful for probe trials."),
    ];
  },
  "radial-arm": ({ summary: s, zones, track }) => {
    const arms = zones.filter((z) => z.id.startsWith("arm-")).map((z) => z.id);
    const seq = entrySequence(track, zones, arms);
    const seen = new Set<string>();
    let firstRepeat: number | null = null;
    seq.forEach((id, i) => {
      if (seen.has(id) && firstRepeat === null) firstRepeat = i;
      seen.add(id);
    });
    return [
      m("Arm entries", seq.length, "n", "Total arm entries.", 0),
      m("Unique arms visited", seen.size, `of ${arms.length}`, "Distinct arms entered.", 0),
      m("Re-entries", seq.length - seen.size, "n", "Entries into an already visited arm (working memory errors).", 0),
      m("Choices to first error", firstRepeat ?? (seq.length ? seq.length : null), "n", "Correct entries before the first repeat.", 0),
      m("Hub time", pct(byId(s, "center")?.time ?? 0, s.duration), "%", "Time spent in the central hub."),
    ];
  },
  "novel-object": ({ summary: s }) => {
    const fam = byId(s, "object-a")?.time ?? 0;
    const nov = byId(s, "object-b")?.time ?? 0;
    return [
      m("Discrimination index", index(nov, fam), "", "(novel - familiar) / total. Above 0 means novel preference.", 2),
      m("Novel preference", pct(nov, nov + fam), "%", "Share of exploration spent at the novel object."),
      m("Total exploration", nov + fam, "s", "Time spent in either object zone."),
      m("Novel latency", byId(s, "object-b")?.latency ?? null, "s", "Time until first approach to the novel object."),
    ];
  },
  "light-dark": ({ summary: s }) => {
    const light = byId(s, "light");
    const dark = byId(s, "dark");
    const transitions = Math.max((light?.entries ?? 0) + (dark?.entries ?? 0) - 1, 0);
    return [
      m("Light time", pct(light?.time ?? 0, (light?.time ?? 0) + (dark?.time ?? 0)), "%", "Higher values suggest lower anxiety-like behavior."),
      m("Transitions", transitions, "", "Crossings between compartments.", 0),
      m("Dark latency", dark?.latency ?? null, "s", "Time until first entry into the dark side."),
    ];
  },
  "three-chamber": ({ summary: s }) => {
    const left = byId(s, "cup-left")?.time ?? 0;
    const right = byId(s, "cup-right")?.time ?? 0;
    const lc = byId(s, "chamber-left")?.time ?? 0;
    const rc = byId(s, "chamber-right")?.time ?? 0;
    return [
      m("Cup preference index", index(left, right), "", "(left - right) / total cup time. Positive favors the left cup.", 2),
      m("Chamber preference index", index(lc, rc), "", "(left - right) / total side-chamber time.", 2),
      m("Total cup time", left + right, "s", "Time spent close to either cup."),
    ];
  },
};

export function testMeasures(templateId: TemplateId, ctx: Ctx): Measure[] {
  return BUILDERS[templateId]?.(ctx) ?? [];
}
