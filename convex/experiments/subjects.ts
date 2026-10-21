import { ConvexError, v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { mutation } from "../_generated/server";
import { cleanText, deleteTrialDoc, optionalText, requireExperiment, requireGroup, requireSubject } from "../helpers/access.ts";
import { sexValidator } from "../schema/experiments.ts";

const MAX_SUBJECT_TRIALS = 200;

async function assertUniqueCode(ctx: MutationCtx, experimentId: Id<"experiments">, code: string, self?: Id<"subjects">) {
  const existing = await ctx.db
    .query("subjects")
    .withIndex("by_experiment_and_code", (q) => q.eq("experimentId", experimentId).eq("code", code))
    .first();
  if (existing && existing._id !== self) {
    throw new ConvexError({ code: "CONFLICT", message: `A subject called "${code}" already exists.` });
  }
}

async function assertGroupInExperiment(
  ctx: MutationCtx,
  groupId: Id<"groups"> | null,
  experimentId: Id<"experiments">,
  ownerKey?: string,
) {
  if (!groupId) return;
  const { group } = await requireGroup(ctx, groupId, ownerKey);
  if (group.experimentId !== experimentId) {
    throw new ConvexError({ code: "BAD_REQUEST", message: "That group belongs to another experiment." });
  }
}

const subjectFields = {
  code: v.string(),
  groupId: v.union(v.id("groups"), v.null()),
  sex: sexValidator,
  notes: v.optional(v.string()),
};

export const create = mutation({
  args: {
    experimentId: v.id("experiments"),
    ...subjectFields,
    ownerKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const experiment = await requireExperiment(ctx, args.experimentId, args.ownerKey);
    const code = cleanText(args.code, "Subject ID", 60);
    await assertUniqueCode(ctx, experiment._id, code);
    await assertGroupInExperiment(ctx, args.groupId, experiment._id, args.ownerKey);
    const id = await ctx.db.insert("subjects", {
      experimentId: experiment._id,
      code,
      groupId: args.groupId,
      sex: args.sex,
      notes: optionalText(args.notes),
      trialCount: 0,
    });
    await ctx.db.patch("experiments", experiment._id, { subjectCount: experiment.subjectCount + 1 });
    return id;
  },
});

export const update = mutation({
  args: {
    subjectId: v.id("subjects"),
    ...subjectFields,
    ownerKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { subject } = await requireSubject(ctx, args.subjectId, args.ownerKey);
    const code = cleanText(args.code, "Subject ID", 60);
    await assertUniqueCode(ctx, subject.experimentId, code, subject._id);
    await assertGroupInExperiment(ctx, args.groupId, subject.experimentId, args.ownerKey);
    await ctx.db.patch("subjects", subject._id, {
      code,
      groupId: args.groupId,
      sex: args.sex,
      notes: optionalText(args.notes),
    });
    return null;
  },
});

/** Deletes a subject together with its saved trials. */
export const remove = mutation({
  args: { subjectId: v.id("subjects"), ownerKey: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const { subject, experiment } = await requireSubject(ctx, args.subjectId, args.ownerKey);
    const trials = await ctx.db
      .query("trials")
      .withIndex("by_subject", (q) => q.eq("subjectId", subject._id))
      .take(MAX_SUBJECT_TRIALS + 1);
    if (trials.length > MAX_SUBJECT_TRIALS) {
      throw new ConvexError({ code: "BAD_REQUEST", message: "This subject has too many trials to delete at once. Delete some trials first." });
    }
    for (const t of trials) await deleteTrialDoc(ctx, t);
    await ctx.db.delete("subjects", subject._id);
    await ctx.db.patch("experiments", experiment._id, {
      subjectCount: Math.max(experiment.subjectCount - 1, 0),
      trialCount: Math.max(experiment.trialCount - trials.length, 0),
    });
    return null;
  },
});
