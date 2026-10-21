import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { mutation, query, type MutationCtx, type QueryCtx } from "../_generated/server";

const MAX_MEMBERS = 1000;
const MAX_SHARED_TRIALS = 1000;

async function requireOwner(
  ctx: QueryCtx | MutationCtx,
  experimentId: Id<"experiments">,
) {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new ConvexError({
      code: "UNAUTHENTICATED",
      message: "Sign in to manage project sharing.",
    });
  }
  const experiment = await ctx.db.get(experimentId);
  if (!experiment) {
    throw new ConvexError({ code: "NOT_FOUND", message: "Project not found." });
  }
  if (experiment.ownerId !== userId) {
    throw new ConvexError({
      code: "FORBIDDEN",
      message: "Only the project owner can manage sharing.",
    });
  }
  return { userId, experiment };
}

export const updateShareLink = mutation({
  args: {
    experimentId: v.id("experiments"),
    enabled: v.boolean(),
  },
  handler: async (ctx, args) => {
    const { experiment } = await requireOwner(ctx, args.experimentId);
    const shareToken = args.enabled ? crypto.randomUUID() : undefined;
    await ctx.db.patch(experiment._id, { shareToken });
    return shareToken ?? null;
  },
});

export const listMembers = query({
  args: { experimentId: v.id("experiments") },
  handler: async (ctx, args) => {
    const { experiment } = await requireOwner(ctx, args.experimentId);
    const members = await ctx.db
      .query("experimentMembers")
      .withIndex("by_experiment", (q) =>
        q.eq("experimentId", experiment._id),
      )
      .take(MAX_MEMBERS);
    return members.map(({ _id, email, role, status, inviteToken }) => ({
      _id,
      email,
      role,
      status,
      inviteToken,
    }));
  },
});

export const invite = mutation({
  args: {
    experimentId: v.id("experiments"),
    email: v.string(),
    role: v.union(v.literal("viewer"), v.literal("editor")),
  },
  handler: async (ctx, args) => {
    const { userId, experiment } = await requireOwner(ctx, args.experimentId);
    const email = args.email.trim().toLowerCase();
    if (
      email.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "Enter a valid email address.",
      });
    }
    if (email === (await ctx.db.get(userId))?.email?.toLowerCase()) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "You already own this project.",
      });
    }
    const members = await ctx.db
      .query("experimentMembers")
      .withIndex("by_experiment", (q) =>
        q.eq("experimentId", experiment._id),
      )
      .take(MAX_MEMBERS);
    const existing = members.find((member) => member.email === email);
    const inviteToken = crypto.randomUUID();
    if (existing) {
      await ctx.db.patch(existing._id, {
        role: args.role,
        status: "pending",
        userId: undefined,
        invitedBy: userId,
        inviteToken,
      });
    } else {
      if (members.length >= MAX_MEMBERS) {
        throw new ConvexError({
          code: "RESOURCE_EXHAUSTED",
          message: "This project has reached its collaborator limit.",
        });
      }
      await ctx.db.insert("experimentMembers", {
        experimentId: experiment._id,
        email,
        role: args.role,
        status: "pending",
        invitedBy: userId,
        inviteToken,
      });
    }
    return {
      inviteToken,
      projectName: experiment.name,
      email,
      role: args.role,
    };
  },
});

export const removeMember = mutation({
  args: {
    experimentId: v.id("experiments"),
    memberId: v.id("experimentMembers"),
  },
  handler: async (ctx, args) => {
    const { experiment } = await requireOwner(ctx, args.experimentId);
    const member = await ctx.db.get(args.memberId);
    if (!member || member.experimentId !== experiment._id) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Invitation or collaborator not found.",
      });
    }
    await ctx.db.delete(member._id);
    return null;
  },
});

export const getInvitation = query({
  args: { inviteToken: v.string() },
  handler: async (ctx, args) => {
    const member = await ctx.db
      .query("experimentMembers")
      .withIndex("by_invite_token", (q) =>
        q.eq("inviteToken", args.inviteToken),
      )
      .unique();
    if (!member || member.status !== "pending") return null;
    const experiment = await ctx.db.get(member.experimentId);
    return experiment
      ? {
          email: member.email,
          role: member.role,
          projectName: experiment.name,
        }
      : null;
  },
});

export const acceptInvitation = mutation({
  args: { inviteToken: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new ConvexError({
        code: "UNAUTHENTICATED",
        message: "Sign in with the invited Google account to accept.",
      });
    }
    const user = await ctx.db.get(userId);
    if (!user?.email) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "Your account has no email address to match this invitation.",
      });
    }
    const member = await ctx.db
      .query("experimentMembers")
      .withIndex("by_invite_token", (q) =>
        q.eq("inviteToken", args.inviteToken),
      )
      .unique();
    if (
      !member ||
      member.status !== "pending" ||
      member.email !== user.email.toLowerCase()
    ) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "This invitation is invalid or belongs to another email.",
      });
    }
    await ctx.db.patch(member._id, { userId, status: "accepted" });
    return member.experimentId;
  },
});

export const sharedView = query({
  args: { shareToken: v.string() },
  handler: async (ctx, args) => {
    const experiment = await ctx.db
      .query("experiments")
      .withIndex("by_share_token", (q) =>
        q.eq("shareToken", args.shareToken),
      )
      .unique();
    if (!experiment) return null;

    const [groups, subjects, trials] = await Promise.all([
      ctx.db
        .query("groups")
        .withIndex("by_experiment", (q) =>
          q.eq("experimentId", experiment._id),
        )
        .take(MAX_SHARED_TRIALS),
      ctx.db
        .query("subjects")
        .withIndex("by_experiment_and_code", (q) =>
          q.eq("experimentId", experiment._id),
        )
        .take(MAX_SHARED_TRIALS),
      ctx.db
        .query("trials")
        .withIndex("by_experiment_and_recorded_at", (q) =>
          q.eq("experimentId", experiment._id),
        )
        .order("desc")
        .take(MAX_SHARED_TRIALS),
    ]);
    const subjectById = new Map(subjects.map((subject) => [subject._id, subject]));
    return {
      experiment: {
        name: experiment.name,
        description: experiment.description,
        templateId: experiment.templateId,
      },
      groups: groups.map(({ name, color }) => ({ name, color })),
      subjects: subjects.map(({ code, sex, groupId }) => ({
        code,
        sex,
        groupName:
          groups.find((group) => group._id === groupId)?.name ?? null,
      })),
      trials: trials.map((trial) => {
        const subject = subjectById.get(trial.subjectId);
        return {
          subjectCode: subject?.code ?? "Deleted subject",
          session: trial.session,
          recordedAt: trial.recordedAt,
          summary: trial.summary,
          measures: trial.measures,
        };
      }),
      truncated: trials.length === MAX_SHARED_TRIALS,
    };
  },
});
