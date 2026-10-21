import Google from "@auth/core/providers/google";
import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Google,
    Password({
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
        };
      },
    }),
  ],
});
