import { ConvexError, v } from "convex/values";
import {
  getAuthSessionId,
  getAuthUserId,
} from "@convex-dev/auth/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import {
  action,
  internalMutation,
  mutation,
  query,
  type MutationCtx,
} from "./_generated/server";

const preferencesValidator = v.object({
  theme: v.union(v.literal("light"), v.literal("dark"), v.literal("system")),
  landingPage: v.union(
    v.literal("/"),
    v.literal("/track"),
    v.literal("/projects"),
    v.literal("/experiments"),
  ),
  defaultMazeType: v.string(),
  measurementUnits: v.union(v.literal("metric"), v.literal("imperial")),
  notifications: v.boolean(),
});

async function authenticatedUserId(
  ctx: MutationCtx,
): Promise<Id<"users"> | null> {
  const authUserId = await getAuthUserId(ctx);
  const normalizedId = authUserId
    ? ctx.db.normalizeId("users", authUserId)
    : null;
  if (normalizedId && (await ctx.db.get("users", normalizedId))) {
    return normalizedId;
  }
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  const user = await ctx.db
    .query("users")
    .withIndex("by_token", (q) =>
      q.eq("tokenIdentifier", identity.tokenIdentifier),
    )
    .unique();
  return user?._id ?? null;
}

export const updateCurrentUser = mutation({
  args: {},
  handler: async (ctx) => {
    const authUserId = await getAuthUserId(ctx);
    const normalizedUserId = authUserId
      ? ctx.db.normalizeId("users", authUserId)
      : null;
    if (normalizedUserId) {
      const authUser = await ctx.db.get("users", normalizedUserId);
      if (authUser) return authUser._id;
    }

    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        code: "UNAUTHENTICATED",
        message: "User not logged in",
      });
    }

    // Check if we've already stored this identity before.
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier),
      )
      .unique();
    if (user !== null) {
      return user._id;
    }
    // If it's a new identity, create a new User.
    return await ctx.db.insert("users", {
      name: identity.name,
      email: identity.email,
      tokenIdentifier: identity.tokenIdentifier,
    });
  },
});

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const authUserId = await getAuthUserId(ctx);
    const normalizedUserId = authUserId
      ? ctx.db.normalizeId("users", authUserId)
      : null;
    if (normalizedUserId) {
      const authUser = await ctx.db.get("users", normalizedUserId);
      if (authUser) {
        const accounts = await ctx.db
          .query("authAccounts")
          .withIndex("userIdAndProvider", (q) =>
            q.eq("userId", normalizedUserId),
          )
          .take(10);
        return {
          name: authUser.name,
          email: authUser.email,
          image: authUser.image,
          institution: authUser.institution,
          preferences: authUser.preferences,
          authenticationProvider:
            accounts.map((account) => account.provider).join(", ") || "Unknown",
          imageUrl: authUser.profileImageStorageId
            ? await ctx.storage.getUrl(authUser.profileImageStorageId)
            : authUser.image ?? null,
        };
      }
    }

    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        code: "UNAUTHENTICATED",
        message: "Called getCurrentUser without authentication present",
      });
    }
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier),
      )
      .unique();
    if (!user) return null;
    return {
      name: user.name,
      email: user.email,
      image: user.image,
      institution: user.institution,
      preferences: user.preferences,
      authenticationProvider: "Unknown",
      imageUrl: user.profileImageStorageId
        ? await ctx.storage.getUrl(user.profileImageStorageId)
        : user.image ?? null,
    };
  },
});

export const updateProfile = mutation({
  args: {
    name: v.string(),
    institution: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await authenticatedUserId(ctx);
    if (!userId) {
      throw new ConvexError({
        code: "UNAUTHENTICATED",
        message: "Sign in before updating your profile.",
      });
    }
    const name = args.name.trim();
    const institution = args.institution?.trim();
    if (!name || name.length > 120 || (institution?.length ?? 0) > 160) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "Enter a name up to 120 characters and institution up to 160 characters.",
      });
    }
    await ctx.db.patch("users", userId, {
      name,
      institution: institution || undefined,
    });
    return null;
  },
});

export const updatePreferences = mutation({
  args: { preferences: preferencesValidator },
  handler: async (ctx, args) => {
    const userId = await authenticatedUserId(ctx);
    if (!userId) {
      throw new ConvexError({
        code: "UNAUTHENTICATED",
        message: "Sign in before updating preferences.",
      });
    }
    if (args.preferences.defaultMazeType.length > 40) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "The default maze type is invalid.",
      });
    }
    await ctx.db.patch("users", userId, { preferences: args.preferences });
    return null;
  },
});

export const generateProfileImageUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    if (!(await authenticatedUserId(ctx))) {
      throw new ConvexError({
        code: "UNAUTHENTICATED",
        message: "Sign in before uploading a profile image.",
      });
    }
    return await ctx.storage.generateUploadUrl();
  },
});

export const saveProfileImage = action({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new ConvexError({
        code: "UNAUTHENTICATED",
        message: "Sign in before updating your profile image.",
      });
    }
    const metadata = await ctx.runQuery(
      internal.experiments.trials.assertStorageFile,
      { storageId: args.storageId },
    );
    const contentType = metadata?.contentType ?? "";
    if (
      !metadata ||
      metadata.size > 5 * 1024 * 1024 ||
      !["image/jpeg", "image/png", "image/webp"].includes(contentType)
    ) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "Choose a JPEG, PNG, or WebP image up to 5 MB.",
      });
    }
    const file = await ctx.storage.get(args.storageId);
    if (!file) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "The uploaded image could not be found.",
      });
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    const hasJpegSignature =
      contentType === "image/jpeg" &&
      bytes[0] === 0xff &&
      bytes[1] === 0xd8 &&
      bytes[2] === 0xff;
    const hasPngSignature =
      contentType === "image/png" &&
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47 &&
      bytes[4] === 0x0d &&
      bytes[5] === 0x0a &&
      bytes[6] === 0x1a &&
      bytes[7] === 0x0a;
    const hasWebpSignature =
      contentType === "image/webp" &&
      String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
      String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
    if (!hasJpegSignature && !hasPngSignature && !hasWebpSignature) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "The uploaded file is not a valid JPEG, PNG, or WebP image.",
      });
    }
    await ctx.runMutation(internal.users.saveProfileImageRecord, {
      userId,
      storageId: args.storageId,
    });
    return null;
  },
});

export const saveProfileImageRecord = internalMutation({
  args: { userId: v.id("users"), storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    const previous = await ctx.db.get("users", args.userId);
    if (!previous) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Account not found.",
      });
    }
    await ctx.db.patch("users", args.userId, {
      profileImageStorageId: args.storageId,
    });
    if (previous.profileImageStorageId) {
      await ctx.storage.delete(previous.profileImageStorageId);
    }
    return null;
  },
});

export const deleteAccount = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await authenticatedUserId(ctx);
    const sessionId = await getAuthSessionId(ctx);
    if (!userId || !sessionId) {
      throw new ConvexError({
        code: "UNAUTHENTICATED",
        message: "Sign in before deleting your account.",
      });
    }
    const session = await ctx.db.get("authSessions", sessionId);
    if (!session || Date.now() - session._creationTime > 15 * 60 * 1000) {
      throw new ConvexError({
        code: "UNAUTHENTICATED",
        message:
          "For your security, sign in again before deleting your account.",
      });
    }
    const user = await ctx.db.get("users", userId);
    if (!user) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Account not found.",
      });
    }

    const sessions = await ctx.db
      .query("authSessions")
      .withIndex("userId", (q) => q.eq("userId", userId))
      .take(100);
    for (const authSession of sessions) {
      const refreshTokens = await ctx.db
        .query("authRefreshTokens")
        .withIndex("sessionId", (q) =>
          q.eq("sessionId", authSession._id),
        )
        .take(1000);
      for (const token of refreshTokens) {
        await ctx.db.delete("authRefreshTokens", token._id);
      }
      await ctx.db.delete("authSessions", authSession._id);
    }

    const accounts = await ctx.db
      .query("authAccounts")
      .withIndex("userIdAndProvider", (q) => q.eq("userId", userId))
      .take(20);
    for (const account of accounts) {
      const codes = await ctx.db
        .query("authVerificationCodes")
        .withIndex("accountId", (q) => q.eq("accountId", account._id))
        .take(100);
      for (const code of codes) {
        await ctx.db.delete("authVerificationCodes", code._id);
      }
      await ctx.db.delete("authAccounts", account._id);
    }

    await ctx.scheduler.runAfter(
      0,
      internal.users.purgeDeletedAccount,
      {
        userId,
        email: user.email ?? "",
        profileImageStorageId: user.profileImageStorageId,
      },
    );
    await ctx.db.delete("users", userId);
    return null;
  },
});

export const purgeDeletedAccount = internalMutation({
  args: {
    userId: v.id("users"),
    email: v.string(),
    profileImageStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const experiments = await ctx.db
      .query("experiments")
      .withIndex("by_owner", (q) => q.eq("ownerId", args.userId))
      .take(25);
    for (const experiment of experiments) {
      await ctx.db.delete("experiments", experiment._id);
      const members = await ctx.db
        .query("experimentMembers")
        .withIndex("by_experiment", (q) =>
          q.eq("experimentId", experiment._id),
        )
        .take(1000);
      for (const member of members) {
        await ctx.db.delete("experimentMembers", member._id);
      }
      await ctx.scheduler.runAfter(
        0,
        internal.experiments.experiments.purge,
        { experimentId: experiment._id },
      );
    }
    if (experiments.length === 25) {
      await ctx.scheduler.runAfter(
        0,
        internal.users.purgeDeletedAccount,
        args,
      );
      return null;
    }

    const memberships = await ctx.db
      .query("experimentMembers")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .take(1000);
    for (const member of memberships) {
      await ctx.db.delete("experimentMembers", member._id);
    }
    const authoredInvitations = await ctx.db
      .query("experimentMembers")
      .withIndex("by_invited_by", (q) => q.eq("invitedBy", args.userId))
      .take(1000);
    for (const invitation of authoredInvitations) {
      await ctx.db.delete("experimentMembers", invitation._id);
    }
    if (authoredInvitations.length === 1000) {
      await ctx.scheduler.runAfter(
        0,
        internal.users.purgeDeletedAccount,
        args,
      );
      return null;
    }
    if (args.email) {
      const invitations = await ctx.db
        .query("experimentMembers")
        .withIndex("by_email", (q) => q.eq("email", args.email))
        .take(1000);
      for (const invitation of invitations) {
        if (invitation.status === "pending") {
          await ctx.db.delete("experimentMembers", invitation._id);
        }
      }
    }
    if (args.profileImageStorageId) {
      await ctx.storage.delete(args.profileImageStorageId);
    }
    return null;
  },
});

export const claimAnonymousProjects = mutation({
  args: { ownerKey: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new ConvexError({
        code: "UNAUTHENTICATED",
        message: "Sign in before claiming anonymous projects.",
      });
    }
    if (!/^[0-9a-f-]{36}$/i.test(args.ownerKey)) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "The anonymous session ID is invalid.",
      });
    }
    const anonymousUser = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", `anonymous:${args.ownerKey}`),
      )
      .unique();
    if (!anonymousUser || anonymousUser._id === userId) return 0;

    const projects = await ctx.db
      .query("experiments")
      .withIndex("by_owner", (q) => q.eq("ownerId", anonymousUser._id))
      .take(200);
    for (const project of projects) {
      await ctx.db.patch("experiments", project._id, { ownerId: userId });
    }
    if (projects.length < 200) {
      await ctx.db.delete("users", anonymousUser._id);
    }
    return projects.length;
  },
});
