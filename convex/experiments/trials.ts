import { ConvexError, v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import type { Doc, Id } from "../_generated/dataModel";
import {
  action,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "../_generated/server";
import { internal } from "../_generated/api";
import {
  cleanText,
  canEditExperiment,
  deleteTrialDoc,
  optionalText,
  requireExperiment,
  requireSubject,
  requireUser,
} from "../helpers/access.ts";
import { decodeTrack } from "../../src/lib/experiments/track-codec.ts";
import { summarize } from "../../src/lib/tracking/metrics.ts";
import { testMeasures } from "../../src/lib/tracking/test-measures.ts";
import type { TemplateId } from "../../src/lib/tracking/types.ts";
import {
  arenaValidator,
  measureValidator,
  summaryValidator,
  trialInfoValidator,
  zoneValidator,
} from "../schema/experiments.ts";

const MAX_TRACK_POINTS = 100_000;
const templateIds = new Set([
  "open-field",
  "elevated-plus",
  "y-maze",
  "water-maze",
  "barnes-maze",
  "radial-arm",
  "novel-object",
  "light-dark",
  "three-chamber",
  "custom",
]);

function isTemplateId(value: string): value is TemplateId {
  return templateIds.has(value);
}

export const generateUploadUrl = mutation({
  args: { ownerKey: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireUser(ctx, args.ownerKey);
    return await ctx.storage.generateUploadUrl();
  },
});

export const assertStorageFile = internalQuery({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    return await ctx.db.system.get("_storage", args.storageId);
  },
});

const saveArgs = {
  subjectId: v.id("subjects"),
  session: v.string(),
  notes: v.optional(v.string()),
  info: v.optional(trialInfoValidator),
  templateId: v.string(),
  sourceName: v.string(),
  live: v.boolean(),
  arena: arenaValidator,
  zones: v.array(zoneValidator),
  dims: v.object({ w: v.number(), h: v.number() }),
  pxPerCm: v.number(),
  arenaCm: v.number(),
  fps: v.number(),
  trackStorageId: v.id("_storage"),
  snapshotStorageId: v.union(v.id("_storage"), v.null()),
  videoStorageId: v.optional(v.id("_storage")),
  ownerKey: v.optional(v.string()),
};

export const assertSubjectAccess = internalQuery({
  args: { subjectId: v.id("subjects"), ownerKey: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireSubject(ctx, args.subjectId, args.ownerKey);
    return null;
  },
});

export const save = action({
  args: saveArgs,
  handler: async (ctx, args): Promise<Id<"trials">> => {
    await ctx.runQuery(internal.experiments.trials.assertSubjectAccess, {
      subjectId: args.subjectId,
      ownerKey: args.ownerKey,
    });
    if (args.videoStorageId) {
      const videoMetadata = await ctx.runQuery(
        internal.experiments.trials.assertStorageFile,
        { storageId: args.videoStorageId },
      );
      if (!videoMetadata || videoMetadata.size > 1_073_741_824) {
        throw new ConvexError({
          code: "BAD_REQUEST",
          message: "The video upload is missing or exceeds the 1 GB limit.",
        });
      }
    }
    const trackFile = await ctx.storage.get(args.trackStorageId);
    if (!trackFile) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "Track upload is missing. Please try saving again.",
      });
    }
    if (trackFile.size > 20 * 1024 * 1024) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "The track file is too large to save.",
      });
    }
    if (!isTemplateId(args.templateId)) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "The selected tracking template is invalid.",
      });
    }
    if (
      args.dims.w <= 0 ||
      args.dims.h <= 0 ||
      args.dims.w > 4096 ||
      args.dims.h > 4096 ||
      args.pxPerCm <= 0 ||
      args.arenaCm <= 0 ||
      args.fps <= 0 ||
      args.fps > 120
    ) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "The trial dimensions or calibration values are invalid.",
      });
    }

    let track: ReturnType<typeof decodeTrack>;
    try {
      track = decodeTrack(JSON.parse(await trackFile.text()));
    } catch (error) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message:
          error instanceof Error
            ? error.message
            : "The uploaded track file is invalid.",
      });
    }
    if (track.length === 0 || track.length > MAX_TRACK_POINTS) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message:
          "The trial must contain a valid track of at most 100,000 samples.",
      });
    }
    let previousTime = -1;
    for (const point of track) {
      if (
        point.t < 0 ||
        point.t < previousTime ||
        point.x < 0 ||
        point.x > args.dims.w ||
        point.y < 0 ||
        point.y > args.dims.h ||
        point.area < 0
      ) {
        throw new ConvexError({
          code: "BAD_REQUEST",
          message: "The uploaded track contains invalid sample values.",
        });
      }
      previousTime = point.t;
    }

    const summary = summarize(track, args.zones, args.pxPerCm);
    const measures = testMeasures(args.templateId, {
      summary,
      zones: args.zones,
      track,
    }).map((measure) => ({
      label: measure.label,
      value:
        measure.value !== null && Number.isFinite(measure.value)
          ? measure.value
          : null,
      unit: measure.unit,
      digits: measure.digits,
    }));
    return await ctx.runMutation(internal.experiments.trials.saveComputed, {
      ...args,
      summary,
      measures,
    });
  },
});

export const saveComputed = internalMutation({
  args: {
    ...saveArgs,
    summary: summaryValidator,
    measures: v.array(measureValidator),
  },
  handler: async (ctx, args) => {
    const { subject, experiment } = await requireSubject(
      ctx,
      args.subjectId,
      args.ownerKey,
    );
    const trackMetadata = await ctx.db.system.get(
      "_storage",
      args.trackStorageId,
    );
    if (!trackMetadata) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "Track upload is missing. Please try saving again.",
      });
    }
    if (trackMetadata.size > 20 * 1024 * 1024) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "The track file is too large to save.",
      });
    }
    if (
      args.snapshotStorageId &&
      !(await ctx.db.system.get("_storage", args.snapshotStorageId))
    ) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "The snapshot upload is missing. Please try saving again.",
      });
    }
    const { subjectId, session, notes, info, summary, measures, ...rest } =
      args;
    const id = await ctx.db.insert("trials", {
      ...rest,
      experimentId: experiment._id,
      subjectId,
      summary,
      measures,
      session: cleanText(session, "Session", 60),
      notes: optionalText(notes),
      info: info && {
        experimentNo: info.experimentNo.trim().slice(0, 80),
        date: info.date.trim().slice(0, 10),
        animalNo: info.animalNo.trim().slice(0, 80),
        group: info.group.trim().slice(0, 80),
        investigator: info.investigator.trim().slice(0, 80),
      },
      sourceName: rest.sourceName.slice(0, 200),
      recordedAt: new Date().toISOString(),
    });
    await ctx.db.patch("subjects", subject._id, {
      trialCount: subject.trialCount + 1,
    });
    await ctx.db.patch("experiments", experiment._id, {
      trialCount: experiment.trialCount + 1,
    });
    return id;
  },
});

/** Light row for trial tables: omits zones and geometry. */
function toRow(t: Doc<"trials">, subject: Doc<"subjects"> | null) {
  return {
    _id: t._id,
    subjectId: t.subjectId,
    subjectCode: subject?.code ?? "Deleted subject",
    groupId: subject?.groupId ?? null,
    session: t.session,
    recordedAt: t.recordedAt,
    templateId: t.templateId,
    sourceName: t.sourceName,
    live: t.live,
    duration: t.summary.duration,
    totalDistance: t.summary.totalDistance,
    meanSpeed: t.summary.meanSpeed,
    detectedPct: t.summary.detectedPct,
    measures: t.measures,
  };
}

export const listByExperiment = query({
  args: {
    experimentId: v.id("experiments"),
    paginationOpts: paginationOptsValidator,
    ownerKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireExperiment(
      ctx,
      args.experimentId,
      args.ownerKey,
      "view",
    );
    const result = await ctx.db
      .query("trials")
      .withIndex("by_experiment_and_recorded_at", (q) =>
        q.eq("experimentId", args.experimentId),
      )
      .order("desc")
      .paginate(args.paginationOpts);
    // Fetch each distinct subject once per page instead of once per trial.
    const ids = [...new Set(result.page.map((t) => t.subjectId))];
    const subjects = new Map<Id<"subjects">, Doc<"subjects"> | null>(
      await Promise.all(
        ids.map(async (id) => [id, await ctx.db.get("subjects", id)] as const),
      ),
    );
    return {
      ...result,
      page: result.page.map((t) => toRow(t, subjects.get(t.subjectId) ?? null)),
    };
  },
});

/** Upper bound for the statistics view; keeps the reactive read bounded. */
const MAX_STATS_TRIALS = 1000;

/**
 * Compact numbers for every trial in an experiment (no geometry), used by the group statistics tab.
 * Subjects come from the experiment's own bounded list, so there is no per-trial lookup.
 */
export const statsData = query({
  args: {
    experimentId: v.id("experiments"),
    ownerKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireExperiment(
      ctx,
      args.experimentId,
      args.ownerKey,
      "view",
    );
    const trials = await ctx.db
      .query("trials")
      .withIndex("by_experiment_and_recorded_at", (q) =>
        q.eq("experimentId", args.experimentId),
      )
      .order("asc")
      .take(MAX_STATS_TRIALS + 1);
    const rows = trials.slice(0, MAX_STATS_TRIALS).map((t) => ({
      _id: t._id,
      subjectId: t.subjectId,
      session: t.session,
      recordedAt: t.recordedAt,
      summary: {
        duration: t.summary.duration,
        detectedPct: t.summary.detectedPct,
        totalDistance: t.summary.totalDistance,
        meanSpeed: t.summary.meanSpeed,
        maxSpeed: t.summary.maxSpeed,
        mobileTime: t.summary.mobileTime,
        immobileTime: t.summary.immobileTime,
      },
      zones: t.summary.zones.map((z) => ({
        id: z.id,
        name: z.name,
        time: z.time,
        entries: z.entries,
        latency: z.latency,
      })),
      measures: t.measures.map((m) => ({
        label: m.label,
        value: m.value,
        unit: m.unit,
        digits: m.digits,
      })),
    }));
    return { rows, truncated: trials.length > MAX_STATS_TRIALS };
  },
});

export const get = query({
  args: { trialId: v.id("trials"), ownerKey: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const trial = await ctx.db.get("trials", args.trialId);
    if (!trial) return null;
    const experiment = await requireExperiment(
      ctx,
      trial.experimentId,
      args.ownerKey,
      "view",
    );
    const subject = await ctx.db.get("subjects", trial.subjectId);
    const group = subject?.groupId
      ? await ctx.db.get("groups", subject.groupId)
      : null;
    return {
      trial,
      experiment: { _id: experiment._id, name: experiment.name },
      canEdit: await canEditExperiment(ctx, experiment, args.ownerKey),
      subject,
      group,
      trackUrl: await ctx.storage.getUrl(trial.trackStorageId),
      snapshotUrl: trial.snapshotStorageId
        ? await ctx.storage.getUrl(trial.snapshotStorageId)
        : null,
      videoUrl: trial.videoStorageId
        ? await ctx.storage.getUrl(trial.videoStorageId)
        : null,
    };
  },
});

export const update = mutation({
  args: {
    trialId: v.id("trials"),
    session: v.string(),
    notes: v.optional(v.string()),
    ownerKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const trial = await ctx.db.get("trials", args.trialId);
    if (!trial)
      throw new ConvexError({ code: "NOT_FOUND", message: "Trial not found." });
    await requireExperiment(ctx, trial.experimentId, args.ownerKey);
    await ctx.db.patch("trials", trial._id, {
      session: cleanText(args.session, "Session", 60),
      notes: optionalText(args.notes),
    });
    return null;
  },
});

export const remove = mutation({
  args: { trialId: v.id("trials"), ownerKey: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const trial = await ctx.db.get("trials", args.trialId);
    if (!trial)
      throw new ConvexError({ code: "NOT_FOUND", message: "Trial not found." });
    const experiment = await requireExperiment(
      ctx,
      trial.experimentId,
      args.ownerKey,
    );
    const subject = await ctx.db.get("subjects", trial.subjectId);
    await deleteTrialDoc(ctx, trial);
    if (subject)
      await ctx.db.patch("subjects", subject._id, {
        trialCount: Math.max(subject.trialCount - 1, 0),
      });
    await ctx.db.patch("experiments", experiment._id, {
      trialCount: Math.max(experiment.trialCount - 1, 0),
    });
    return null;
  },
});
