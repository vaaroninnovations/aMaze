import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";
import { experimentTables } from "./schema/experiments.ts";

export default defineSchema({
  ...authTables,
  users: defineTable({
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    profileImageStorageId: v.optional(v.id("_storage")),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
    tokenIdentifier: v.optional(v.string()),
    institution: v.optional(v.string()),
    acceptedTermsVersion: v.optional(v.string()),
    acceptedTermsAt: v.optional(v.number()),
    preferences: v.optional(
      v.object({
        theme: v.union(
          v.literal("light"),
          v.literal("dark"),
          v.literal("system"),
        ),
        landingPage: v.union(
          v.literal("/"),
          v.literal("/track"),
          v.literal("/projects"),
          v.literal("/experiments"),
        ),
        defaultMazeType: v.string(),
        measurementUnits: v.union(v.literal("metric"), v.literal("imperial")),
        notifications: v.boolean(),
      }),
    ),
  })
    .index("email", ["email"])
    .index("phone", ["phone"])
    .index("by_token", ["tokenIdentifier"]),
  experimentMembers: defineTable({
    experimentId: v.id("experiments"),
    userId: v.optional(v.id("users")),
    email: v.string(),
    role: v.union(v.literal("viewer"), v.literal("editor")),
    status: v.union(v.literal("pending"), v.literal("accepted")),
    invitedBy: v.id("users"),
    inviteToken: v.string(),
  })
    .index("by_experiment", ["experimentId"])
    .index("by_user", ["userId"])
    .index("by_email", ["email"])
    .index("by_invited_by", ["invitedBy"])
    .index("by_invite_token", ["inviteToken"]),
  contactRateLimits: defineTable({
    emailHash: v.string(),
    createdAt: v.number(),
  })
    .index("by_email_and_time", ["emailHash", "createdAt"])
    .index("by_time", ["createdAt"]),
  ...experimentTables,
});
