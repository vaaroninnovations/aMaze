import { internal } from "./_generated/api";
import { ConvexError, v } from "convex/values";
import { action, internalMutation } from "./_generated/server";
import { sendEmail } from "./email";

const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_EMAIL = 3;
const MAX_GLOBAL = 60;
const RETAIN_MS = 24 * WINDOW_MS;

const subjectValidator = v.union(
  v.literal("General Inquiry"),
  v.literal("Technical Support"),
  v.literal("Bug Report"),
  v.literal("Feature Request"),
  v.literal("Research Collaboration"),
  v.literal("Account & Privacy"),
  v.literal("Other"),
);

function cleanText(value: string, multiline = false) {
  const normalized = value.replace(/\r\n?/g, "\n");
  const withoutControls = Array.from(normalized, (character) => {
    const code = character.charCodeAt(0);
    const isControl = code < 32 || code === 127;
    if (!isControl || (multiline && (code === 9 || code === 10))) {
      return character;
    }
    return multiline ? "" : " ";
  }).join("");
  return multiline
    ? withoutControls.trim()
    : withoutControls.trim().replace(/\s+/g, " ");
}

function badRequest(message: string): never {
  throw new ConvexError({ code: "BAD_REQUEST", message });
}

export const submit = action({
  args: {
    name: v.string(),
    email: v.string(),
    subject: subjectValidator,
    message: v.string(),
    website: v.string(),
  },
  handler: async (ctx, args) => {
    if (args.website.length > 0) {
      badRequest("Could not process this request.");
    }

    const name = cleanText(args.name);
    const email = cleanText(args.email).toLowerCase();
    const message = cleanText(args.message, true);
    if (name.length < 2 || name.length > 120) {
      badRequest("Enter a name between 2 and 120 characters.");
    }
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      badRequest("Enter a valid email address.");
    }
    if (message.length < 10 || message.length > 5000) {
      badRequest("Enter a message between 10 and 5,000 characters.");
    }

    const digest = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(email),
    );
    const emailHash = Array.from(new Uint8Array(digest), (byte) =>
      byte.toString(16).padStart(2, "0"),
    ).join("");

    await ctx.runMutation(internal.contact.registerSubmission, { emailHash });
    await sendEmail({
      to: "vaaroninnovations@gmail.com",
      replyTo: email,
      subject: `aMaze contact: ${args.subject}`,
      text: [
        `From: ${name}`,
        `Email: ${email}`,
        `Subject: ${args.subject}`,
        "",
        message,
      ].join("\n"),
    });
    return null;
  },
});

export const registerSubmission = internalMutation({
  args: { emailHash: v.string() },
  handler: async (ctx, { emailHash }) => {
    const now = Date.now();
    const windowStart = now - WINDOW_MS;
    const perEmail = await ctx.db
      .query("contactRateLimits")
      .withIndex("by_email_and_time", (q) =>
        q.eq("emailHash", emailHash).gte("createdAt", windowStart),
      )
      .order("desc")
      .take(MAX_PER_EMAIL);
    const global = await ctx.db
      .query("contactRateLimits")
      .withIndex("by_time", (q) => q.gte("createdAt", windowStart))
      .take(MAX_GLOBAL);
    if (perEmail.length >= MAX_PER_EMAIL || global.length >= MAX_GLOBAL) {
      throw new ConvexError({
        code: "TOO_MANY_REQUESTS",
        message: "Please wait before sending another message.",
      });
    }

    const rateLimitId = await ctx.db.insert("contactRateLimits", {
      emailHash,
      createdAt: now,
    });
    await ctx.scheduler.runAfter(RETAIN_MS, internal.contact.cleanupRateLimit, {
      rateLimitId,
    });
    return null;
  },
});

export const cleanupRateLimit = internalMutation({
  args: { rateLimitId: v.id("contactRateLimits") },
  handler: async (ctx, { rateLimitId }) => {
    if (await ctx.db.get("contactRateLimits", rateLimitId)) {
      await ctx.db.delete("contactRateLimits", rateLimitId);
    }
    return null;
  },
});
