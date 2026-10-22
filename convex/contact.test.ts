/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
import { modules } from "./test.setup";

const validSubmission = {
  name: "Research User",
  email: "researcher@example.org",
  subject: "Technical Support" as const,
  message: "Please help me with an analysis issue.",
  website: "",
};

describe("contact form", () => {
  const send = vi.fn<typeof fetch>(
    async () => new Response(null, { status: 202 }),
  );

  beforeEach(() => {
    send.mockClear();
    vi.stubEnv("RESEND_API_KEY", "test-api-key");
    vi.stubEnv("AUTH_EMAIL_FROM", "aMaze <contact@example.org>");
    vi.stubGlobal("fetch", send);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("sends a validated contact message through the configured email service", async () => {
    const t = convexTest(schema, modules);
    await expect(
      t.action(api.contact.submit, {
        ...validSubmission,
        name: "  Research\nUser ",
        email: " Researcher@Example.org ",
      }),
    ).resolves.toBeNull();

    expect(send).toHaveBeenCalledTimes(1);
    const [, init] = send.mock.calls[0]!;
    const payload = JSON.parse(String(init?.body)) as {
      to: string[];
      reply_to: string;
      text: string;
    };
    expect(payload.to).toEqual(["vaaroninnovations@gmail.com"]);
    expect(payload.reply_to).toBe("researcher@example.org");
    expect(payload.text).toContain("From: Research User");
    expect(payload.text).toContain("Please help me with an analysis issue.");
  });

  it("rejects invalid email addresses and honeypot submissions", async () => {
    const t = convexTest(schema, modules);
    await expect(
      t.action(api.contact.submit, {
        ...validSubmission,
        email: "not-an-email",
      }),
    ).rejects.toThrow(/valid email address/);
    await expect(
      t.action(api.contact.submit, {
        ...validSubmission,
        website: "filled-by-bot",
      }),
    ).rejects.toThrow(/Could not process/);
    expect(send).not.toHaveBeenCalled();
  });

  it("limits submissions per email and does not store message content", async () => {
    const t = convexTest(schema, modules);
    for (let attempt = 0; attempt < 3; attempt++) {
      await t.action(api.contact.submit, {
        ...validSubmission,
        message: `Contact message number ${attempt}`,
      });
    }
    await expect(t.action(api.contact.submit, validSubmission)).rejects.toThrow(
      /wait before sending/,
    );
    expect(send).toHaveBeenCalledTimes(3);
    const rateLimits = await t.run((ctx) =>
      ctx.db.query("contactRateLimits").collect(),
    );
    expect(rateLimits).toHaveLength(3);
    expect(rateLimits[0]).not.toHaveProperty("message");
    expect(rateLimits[0]).not.toHaveProperty("email");
  });

  it("does not claim success when the email service rejects delivery", async () => {
    send.mockResolvedValueOnce(new Response(null, { status: 503 }));
    const t = convexTest(schema, modules);
    await expect(t.action(api.contact.submit, validSubmission)).rejects.toThrow(
      /Email delivery failed/,
    );
  });
});
