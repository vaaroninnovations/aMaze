import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { experimentTables } from "./schema/experiments.ts";

export default defineSchema({
  users: defineTable({
    tokenIdentifier: v.string(),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
  }).index("by_token", ["tokenIdentifier"]),
  ...experimentTables,
});
