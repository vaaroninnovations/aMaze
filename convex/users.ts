import { ConvexError, v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, query } from "./_generated/server";

export const updateCurrentUser = mutation({
  args: {},
  handler: async (ctx) => {
    const authUserId = await getAuthUserId(ctx);
    if (authUserId) {
      const authUser = await ctx.db.get(authUserId);
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
    if (authUserId) {
      const authUser = await ctx.db.get(authUserId);
      if (authUser) return authUser;
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
    return user;
  },
});

export const updateProfile = mutation({
  args: {
    name: v.string(),
    institution: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
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
    await ctx.db.patch(userId, {
      name,
      institution: institution || undefined,
    });
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
      await ctx.db.patch(project._id, { ownerId: userId });
    }
    if (projects.length < 200) {
      await ctx.db.delete(anonymousUser._id);
    }
    return projects.length;
  },
});
