import { ConvexError, v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { internal } from "../_generated/api";
import { internalMutation, mutation, query } from "../_generated/server";
import {
  cleanText,
  canEditExperiment,
  deleteTrialDoc,
  findUser,
  getOrCreateAnonymousUser,
  isExperimentOwner,
  optionalText,
  requireExperiment,
  requireUser,
} from "../helpers/access.ts";

const MAX_EXPERIMENTS = 200;
const MAX_CHILDREN = 1000;
const PURGE_BATCH = 50;

export const list = query({
  args: { ownerKey: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = args.ownerKey
      ? await findUser(ctx, args.ownerKey)
      : await requireUser(ctx);
    if (!user) return [];
    const owned = await ctx.db
      .query("experiments")
      .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
      .order("desc")
      .take(MAX_EXPERIMENTS);
    if (args.ownerKey) return owned;

    const memberships = await ctx.db
      .query("experimentMembers")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .take(MAX_EXPERIMENTS);
    const shared = await Promise.all(
      memberships
        .filter((member) => member.status === "accepted")
        .map((member) => ctx.db.get("experiments", member.experimentId)),
    );
    return [...owned, ...shared.filter((item) => item !== null)]
      .filter(
        (experiment, index, all) =>
          all.findIndex((item) => item?._id === experiment?._id) === index,
      )
      .sort((a, b) => b._creationTime - a._creationTime)
      .slice(0, MAX_EXPERIMENTS);
  },
});

/** Account dashboard listing: only experiments owned by the authenticated user. */
export const listOwned = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const result = await ctx.db
      .query("experiments")
      .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
      .order("desc")
      .paginate(args.paginationOpts);
    const page = await Promise.all(
      result.page.map(async (experiment) => {
        const latestTrial = await ctx.db
          .query("trials")
          .withIndex("by_experiment_and_recorded_at", (q) =>
            q.eq("experimentId", experiment._id),
          )
          .order("desc")
          .first();
        return {
          ...experiment,
          lastModified:
            experiment.updatedAt ??
            latestTrial?._creationTime ??
            experiment._creationTime,
          investigator: latestTrial?.info?.investigator ?? "",
          lastSourceName: latestTrial?.sourceName ?? null,
          lastRecordedAt: latestTrial?.recordedAt ?? null,
          hasVideo: Boolean(latestTrial?.videoStorageId),
        };
      }),
    );
    return { ...result, page };
  },
});

/** Experiment with its groups and subjects (both bounded, small per experiment). */
export const get = query({
  args: { experimentId: v.id("experiments"), ownerKey: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const experiment = await requireExperiment(
      ctx,
      args.experimentId,
      args.ownerKey,
      "view",
    );
    const groups = await ctx.db
      .query("groups")
      .withIndex("by_experiment", (q) => q.eq("experimentId", experiment._id))
      .take(MAX_CHILDREN);
    const subjects = await ctx.db
      .query("subjects")
      .withIndex("by_experiment_and_code", (q) =>
        q.eq("experimentId", experiment._id),
      )
      .take(MAX_CHILDREN);
    return {
      experiment,
      groups,
      subjects,
      canEdit: await canEditExperiment(ctx, experiment, args.ownerKey),
      isOwner:
        !args.ownerKey &&
        (await isExperimentOwner(ctx, experiment, args.ownerKey)),
    };
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    templateId: v.string(),
    ownerKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = args.ownerKey
      ? await getOrCreateAnonymousUser(ctx, args.ownerKey)
      : await requireUser(ctx);
    return await ctx.db.insert("experiments", {
      ownerId: user._id,
      name: cleanText(args.name, "Name"),
      description: optionalText(args.description),
      templateId: args.templateId,
      subjectCount: 0,
      trialCount: 0,
      updatedAt: Date.now(),
    });
  },
});

export const update = mutation({
  args: {
    experimentId: v.id("experiments"),
    name: v.string(),
    description: v.optional(v.string()),
    templateId: v.string(),
    ownerKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireExperiment(ctx, args.experimentId, args.ownerKey);
    await ctx.db.patch("experiments", args.experimentId, {
      name: cleanText(args.name, "Name"),
      description: optionalText(args.description),
      templateId: args.templateId,
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const rename = mutation({
  args: { experimentId: v.id("experiments"), name: v.string() },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const experiment = await ctx.db.get("experiments", args.experimentId);
    if (!experiment) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Project not found.",
      });
    }
    if (experiment.ownerId !== user._id) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "Only the project owner can rename this project.",
      });
    }
    await ctx.db.patch("experiments", experiment._id, {
      name: cleanText(args.name, "Name"),
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const remove = mutation({
  args: { experimentId: v.id("experiments"), ownerKey: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const experiment = await requireExperiment(
      ctx,
      args.experimentId,
      args.ownerKey,
    );
    const user = await requireUser(ctx, args.ownerKey);
    if (experiment.ownerId !== user._id) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "Only the project owner can delete this project.",
      });
    }
    await ctx.db.delete("experiments", args.experimentId);
    const memberships = await ctx.db
      .query("experimentMembers")
      .withIndex("by_experiment", (q) => q.eq("experimentId", experiment._id))
      .take(MAX_CHILDREN);
    for (const membership of memberships) {
      await ctx.db.delete("experimentMembers", membership._id);
    }
    // Children can outnumber one transaction's limits, so clean them up in batches.
    await ctx.scheduler.runAfter(0, internal.experiments.experiments.purge, {
      experimentId: args.experimentId,
    });
    return null;
  },
});

/** Deletes trials, then subjects, then groups of a deleted experiment, one batch per run. */
export const purge = internalMutation({
  args: { experimentId: v.id("experiments") },
  handler: async (ctx, args) => {
    if (await ctx.db.get("experiments", args.experimentId)) {
      throw new ConvexError({
        code: "CONFLICT",
        message: "Experiment still exists.",
      });
    }
    const trials = await ctx.db
      .query("trials")
      .withIndex("by_experiment_and_recorded_at", (q) =>
        q.eq("experimentId", args.experimentId),
      )
      .take(PURGE_BATCH);
    for (const trial of trials) await deleteTrialDoc(ctx, trial);

    const subjects =
      trials.length < PURGE_BATCH
        ? await ctx.db
            .query("subjects")
            .withIndex("by_experiment_and_code", (q) =>
              q.eq("experimentId", args.experimentId),
            )
            .take(PURGE_BATCH)
        : [];
    for (const s of subjects) await ctx.db.delete("subjects", s._id);

    const groups =
      trials.length < PURGE_BATCH && subjects.length < PURGE_BATCH
        ? await ctx.db
            .query("groups")
            .withIndex("by_experiment", (q) =>
              q.eq("experimentId", args.experimentId),
            )
            .take(PURGE_BATCH)
        : [];
    for (const g of groups) await ctx.db.delete("groups", g._id);

    // Terminates once every child table returns an empty batch.
    if (trials.length + subjects.length + groups.length > 0) {
      await ctx.scheduler.runAfter(
        0,
        internal.experiments.experiments.purge,
        args,
      );
    }
    return null;
  },
});
