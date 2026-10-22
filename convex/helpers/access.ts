import { ConvexError } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

type Ctx = QueryCtx | MutationCtx;

export async function requireUser(
  ctx: Ctx,
  ownerKey?: string,
): Promise<Doc<"users">> {
  const user = await findUser(ctx, ownerKey);
  if (!user)
    throw new ConvexError({
      code: "NOT_FOUND",
      message: "The data owner is not initialized. Create an experiment first.",
    });
  return user;
}

export async function findUser(
  ctx: Ctx,
  ownerKey?: string,
): Promise<Doc<"users"> | null> {
  if (ownerKey) {
    return await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", `anonymous:${ownerKey}`),
      )
      .unique();
  }

  const authUserId = await getAuthUserId(ctx);
  const normalizedUserId = authUserId
    ? ctx.db.normalizeId("users", authUserId)
    : null;
  if (normalizedUserId) {
    const authUser = await ctx.db.get("users", normalizedUserId);
    if (authUser) return authUser;
  }

  const identity = await ctx.auth.getUserIdentity();
  const tokenIdentifier = identity?.tokenIdentifier;
  if (!tokenIdentifier) return null;
  const user = await ctx.db
    .query("users")
    .withIndex("by_token", (q) => q.eq("tokenIdentifier", tokenIdentifier))
    .unique();
  return user;
}

export async function getOrCreateAnonymousUser(
  ctx: MutationCtx,
  ownerKey: string,
): Promise<Doc<"users">> {
  if (!/^[0-9a-f-]{36}$/i.test(ownerKey)) {
    throw new ConvexError({
      code: "BAD_REQUEST",
      message: "The anonymous session ID is invalid.",
    });
  }
  const tokenIdentifier = `anonymous:${ownerKey}`;
  const existing = await ctx.db
    .query("users")
    .withIndex("by_token", (q) => q.eq("tokenIdentifier", tokenIdentifier))
    .unique();
  if (existing) return existing;

  const userId = await ctx.db.insert("users", { tokenIdentifier });
  const user = await ctx.db.get("users", userId);
  if (!user)
    throw new ConvexError({
      code: "INTERNAL",
      message: "Could not initialize the anonymous data owner.",
    });
  return user;
}

/** Loads an experiment and verifies the anonymous session owns it. */
export async function requireExperiment(
  ctx: Ctx,
  experimentId: Id<"experiments">,
  ownerKey?: string,
  permission: "view" | "edit" = "edit",
): Promise<Doc<"experiments">> {
  const user = await requireUser(ctx, ownerKey);
  const experiment = await ctx.db.get("experiments", experimentId);
  if (!experiment)
    throw new ConvexError({
      code: "NOT_FOUND",
      message: "Experiment not found.",
    });
  if (experiment.ownerId === user._id) return experiment;

  const memberships = await ctx.db
    .query("experimentMembers")
    .withIndex("by_experiment", (q) => q.eq("experimentId", experiment._id))
    .take(1000);
  const membership = memberships.find(
    (member) => member.userId === user._id && member.status === "accepted",
  );
  if (membership && (permission === "view" || membership.role === "editor")) {
    return experiment;
  }

  throw new ConvexError({
    code: "FORBIDDEN",
    message: "You don't have access to this experiment.",
  });
}

export async function canEditExperiment(
  ctx: Ctx,
  experiment: Doc<"experiments">,
  ownerKey?: string,
): Promise<boolean> {
  const user = await findUser(ctx, ownerKey);
  if (!user) return false;
  if (experiment.ownerId === user._id) return true;
  const memberships = await ctx.db
    .query("experimentMembers")
    .withIndex("by_experiment", (q) => q.eq("experimentId", experiment._id))
    .take(1000);
  return memberships.some(
    (member) =>
      member.userId === user._id &&
      member.status === "accepted" &&
      member.role === "editor",
  );
}

export async function isExperimentOwner(
  ctx: Ctx,
  experiment: Doc<"experiments">,
  ownerKey?: string,
): Promise<boolean> {
  const user = await findUser(ctx, ownerKey);
  return user !== null && experiment.ownerId === user._id;
}

export async function requireSubject(
  ctx: Ctx,
  subjectId: Id<"subjects">,
  ownerKey?: string,
  permission: "view" | "edit" = "edit",
) {
  const subject = await ctx.db.get("subjects", subjectId);
  if (!subject)
    throw new ConvexError({ code: "NOT_FOUND", message: "Subject not found." });
  const experiment = await requireExperiment(
    ctx,
    subject.experimentId,
    ownerKey,
    permission,
  );
  return { subject, experiment };
}

export async function requireGroup(
  ctx: Ctx,
  groupId: Id<"groups">,
  ownerKey?: string,
  permission: "view" | "edit" = "edit",
) {
  const group = await ctx.db.get("groups", groupId);
  if (!group)
    throw new ConvexError({ code: "NOT_FOUND", message: "Group not found." });
  const experiment = await requireExperiment(
    ctx,
    group.experimentId,
    ownerKey,
    permission,
  );
  return { group, experiment };
}

export function cleanText(value: string, field: string, max = 120): string {
  const text = value.trim();
  if (!text)
    throw new ConvexError({
      code: "BAD_REQUEST",
      message: `${field} is required.`,
    });
  if (text.length > max)
    throw new ConvexError({
      code: "BAD_REQUEST",
      message: `${field} is too long.`,
    });
  return text;
}

export function optionalText(
  value: string | undefined,
  max = 2000,
): string | undefined {
  const text = value?.trim();
  return text ? text.slice(0, max) : undefined;
}

/** Deletes a trial's stored files and the trial document. */
export async function deleteTrialDoc(ctx: MutationCtx, trial: Doc<"trials">) {
  await ctx.storage.delete(trial.trackStorageId);
  if (trial.snapshotStorageId)
    await ctx.storage.delete(trial.snapshotStorageId);
  if (trial.videoStorageId) await ctx.storage.delete(trial.videoStorageId);
  await ctx.db.delete("trials", trial._id);
}
