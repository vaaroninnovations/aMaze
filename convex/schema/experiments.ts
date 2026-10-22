import { defineTable } from "convex/server";
import { v } from "convex/values";

const pointValidator = v.object({ x: v.number(), y: v.number() });

export const arenaValidator = v.object({
  rect: v.object({
    x: v.number(),
    y: v.number(),
    w: v.number(),
    h: v.number(),
  }),
  shape: v.union(v.literal("rect"), v.literal("circle")),
  rotation: v.optional(v.number()),
});

export const zoneValidator = v.object({
  id: v.string(),
  name: v.string(),
  color: v.string(),
  polygon: v.array(pointValidator),
  excludes: v.optional(v.array(v.string())),
});

export const summaryValidator = v.object({
  duration: v.number(),
  detectedPct: v.number(),
  totalDistance: v.number(),
  meanSpeed: v.number(),
  maxSpeed: v.number(),
  mobileTime: v.number(),
  immobileTime: v.number(),
  zones: v.array(
    v.object({
      id: v.string(),
      name: v.string(),
      color: v.string(),
      time: v.number(),
      entries: v.number(),
      latency: v.union(v.number(), v.null()),
      distance: v.number(),
    }),
  ),
});

export const measureValidator = v.object({
  label: v.string(),
  value: v.union(v.number(), v.null()),
  unit: v.string(),
  digits: v.number(),
});

export const sexValidator = v.union(
  v.literal("male"),
  v.literal("female"),
  v.literal("unknown"),
);

/** Bench-sheet details typed in the workspace (all free text, date is local `YYYY-MM-DD`). */
export const trialInfoValidator = v.object({
  experimentNo: v.string(),
  date: v.string(),
  animalNo: v.string(),
  group: v.string(),
  investigator: v.string(),
});

export const trackingSettingsValidator = v.object({
  mode: v.union(
    v.literal("background"),
    v.literal("dark"),
    v.literal("light"),
  ),
  threshold: v.number(),
  minArea: v.number(),
  fps: v.number(),
});

export const templateParamsValidator = v.object({
  size: v.number(),
  rotation: v.number(),
  variant: v.string(),
});

export const experimentTables = {
  experiments: defineTable({
    ownerId: v.id("users"),
    name: v.string(),
    description: v.optional(v.string()),
    /** Behavioral test template (open-field, y-maze...). */
    templateId: v.string(),
    shareToken: v.optional(v.string()),
    updatedAt: v.optional(v.number()),
    // Denormalized counters so the experiment list never scans child tables.
    subjectCount: v.number(),
    trialCount: v.number(),
  })
    .index("by_owner", ["ownerId"])
    .index("by_share_token", ["shareToken"]),

  groups: defineTable({
    experimentId: v.id("experiments"),
    name: v.string(),
    color: v.string(),
  }).index("by_experiment", ["experimentId"]),

  subjects: defineTable({
    experimentId: v.id("experiments"),
    code: v.string(),
    groupId: v.union(v.id("groups"), v.null()),
    sex: sexValidator,
    notes: v.optional(v.string()),
    trialCount: v.number(),
  }).index("by_experiment_and_code", ["experimentId", "code"]),

  trials: defineTable({
    experimentId: v.id("experiments"),
    subjectId: v.id("subjects"),
    session: v.string(),
    notes: v.optional(v.string()),
    info: v.optional(trialInfoValidator),
    /** ISO 8601 UTC time the trial was saved. */
    recordedAt: v.string(),
    templateId: v.string(),
    sourceName: v.string(),
    live: v.boolean(),
    arena: arenaValidator,
    zones: v.array(zoneValidator),
    dims: v.object({ w: v.number(), h: v.number() }),
    pxPerCm: v.number(),
    arenaCm: v.number(),
    fps: v.number(),
    settings: v.optional(trackingSettingsValidator),
    templateParams: v.optional(templateParamsValidator),
    summary: summaryValidator,
    measures: v.array(measureValidator),
    /** Frame-by-frame track as compact JSON in file storage (too large for a document). */
    trackStorageId: v.id("_storage"),
    /** Clean background image of the arena, for revisiting the trial without the video. */
    snapshotStorageId: v.union(v.id("_storage"), v.null()),
    /** Original clip, retained only when attached to a saved trial. */
    videoStorageId: v.optional(v.id("_storage")),
  })
    .index("by_experiment_and_recorded_at", ["experimentId", "recordedAt"])
    .index("by_subject", ["subjectId"]),
};
