import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { cleanText, requireExperiment, requireGroup } from "../helpers/access.ts";

const MAX_SUBJECTS = 1000;

export const create = mutation({
  args: {
    experimentId: v.id("experiments"),
    name: v.string(),
    color: v.string(),
    ownerKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const experiment = await requireExperiment(
      ctx,
      args.experimentId,
      args.ownerKey,
    );
    const groupId = await ctx.db.insert("groups", {
      experimentId: args.experimentId,
      name: cleanText(args.name, "Group name", 60),
      color: cleanText(args.color, "Color", 32),
    });
    await ctx.db.patch("experiments", experiment._id, {
      updatedAt: Date.now(),
    });
    return groupId;
  },
});

export const update = mutation({
  args: {
    groupId: v.id("groups"),
    name: v.string(),
    color: v.string(),
    ownerKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { group, experiment } = await requireGroup(
      ctx,
      args.groupId,
      args.ownerKey,
    );
    await ctx.db.patch("groups", args.groupId, {
      name: cleanText(args.name, "Group name", 60),
      color: cleanText(args.color, "Color", 32),
    });
    await ctx.db.patch("experiments", experiment._id, {
      updatedAt: Date.now(),
    });
    return null;
  },
});

/** Deletes a group; its subjects stay in the experiment without a group. */
export const remove = mutation({
  args: { groupId: v.id("groups"), ownerKey: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const { group, experiment } = await requireGroup(
      ctx,
      args.groupId,
      args.ownerKey,
    );
    const subjects = await ctx.db
      .query("subjects")
      .withIndex("by_experiment_and_code", (q) => q.eq("experimentId", group.experimentId))
      .take(MAX_SUBJECTS);
    for (const s of subjects) {
      if (s.groupId === group._id) await ctx.db.patch("subjects", s._id, { groupId: null });
    }
    await ctx.db.delete("groups", group._id);
    await ctx.db.patch("experiments", experiment._id, {
      updatedAt: Date.now(),
    });
    return null;
  },
});
