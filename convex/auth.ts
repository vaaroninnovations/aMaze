import Google from "@auth/core/providers/google";
import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import { Email } from "@convex-dev/auth/providers/Email";
import { sendEmail } from "./email";

const TERMS_VERSION = "2026-10-22";

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character]!;
  });
}

const passwordResetEmail = Email({
  id: "password-reset",
  maxAge: 60 * 60,
  async sendVerificationRequest({ identifier, url, expires }) {
    await sendEmail({
      to: identifier,
      subject: "Reset your aMaze password",
      text: `Use this link to reset your aMaze password: ${url}\n\nThis link expires at ${expires.toUTCString()}. If you did not request a reset, you can ignore this email.`,
      html: `<p>We received a request to reset your aMaze password.</p><p><a href="${escapeHtml(url)}">Reset password</a></p><p>This link expires at ${escapeHtml(expires.toUTCString())}. If you did not request a reset, you can ignore this email.</p>`,
    });
  },
});

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Google,
    Password({
      reset: passwordResetEmail,
      profile(params) {
        const email = params.email;
        const name = params.name;
        const institution = params.institution;
        if (
          typeof email !== "string" ||
          email.length > 254 ||
          !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
        ) {
          throw new Error("Enter a valid email address.");
        }
        if (
          params.flow === "signUp" &&
          (typeof name !== "string" || !name.trim() || name.length > 120)
        ) {
          throw new Error("Enter a name up to 120 characters.");
        }
        if (
          params.flow === "signUp" &&
          params.acceptedTermsVersion !== TERMS_VERSION
        ) {
          throw new Error("You must accept the Terms of Service to sign up.");
        }
        if (
          typeof institution === "string" &&
          institution.trim().length > 160
        ) {
          throw new Error("Institution must be 160 characters or fewer.");
        }
        if (typeof name === "string" && name.length > 120) {
          throw new Error("Enter a name up to 120 characters.");
        }
        return {
          email: email.trim().toLowerCase(),
          ...(typeof name === "string" ? { name: name.trim() } : {}),
          ...(typeof institution === "string" && institution.trim()
            ? { institution: institution.trim() }
            : {}),
          ...(params.flow === "signUp"
            ? {
                acceptedTermsVersion: TERMS_VERSION,
                acceptedTermsAt: Date.now(),
              }
            : {}),
        };
      },
    }),
  ],
  callbacks: {
    async afterUserCreatedOrUpdated(ctx, { userId, existingUserId, type, provider }) {
      if (
        type === "oauth" &&
        provider.id === "google" &&
        existingUserId === null
      ) {
        await ctx.db.patch("users", userId, {
          acceptedTermsVersion: TERMS_VERSION,
          acceptedTermsAt: Date.now(),
        });
      }
    },
  },
});
