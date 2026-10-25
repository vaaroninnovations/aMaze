import { Router } from "express";
import crypto from "crypto";
import { findUserByEmail, findUserByGoogleId, findUserByOrcid, findUserById, saveUser } from "./db.mjs";

export const authRouter = Router();

// Helper to sign session tokens using HMAC-SHA256
function signToken(payload, secret) {
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto.createHmac("sha256", secret).update(data).digest("base64url");
  return `${data}.${signature}`;
}

export function verifyToken(token, secret) {
  if (!token || typeof token !== "string") return null;
  const [data, signature] = token.split(".");
  if (!data || !signature) return null;
  const expectedSig = crypto.createHmac("sha256", secret).update(data).digest("base64url");
  if (crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
    try {
      const payload = JSON.parse(Buffer.from(data, "base64url").toString("utf8"));
      return payload;
    } catch {
      return null;
    }
  }
  return null;
}

const SESSION_SECRET = process.env.SESSION_SECRET || "amaze-neuroscience-super-secret-key-change-in-production";

// Middleware to populate req.user from session cookie or Authorization header
export function authMiddleware(req, res, next) {
  const token = req.cookies?.amaze_session || req.headers.authorization?.replace(/^Bearer\s+/i, "");
  if (token) {
    const payload = verifyToken(token, SESSION_SECRET);
    if (payload && payload.userId) {
      req.user = findUserById(payload.userId);
    }
  }
  next();
}

// -------------------------------------------------------------------------
// 1. GOOGLE OAUTH 2.0
// -------------------------------------------------------------------------

/**
 * Initiates Google OAuth: Redirects the researcher to Google's consent screen
 */
authRouter.get("/google", (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get("host")}`;
  const callbackUrl = process.env.GOOGLE_CALLBACK_URL || `${baseUrl}/api/auth/google/callback`;
  const redirectTo = req.query.redirectTo || "/dashboard";

  if (!clientId || clientId.includes("your-google-client-id")) {
    return res.status(503).json({
      error: "Google OAuth is not configured on this server.",
      message: "Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in the .env file.",
      setupInstructions: [
        "1. Open https://console.cloud.google.com/apis/credentials",
        "2. Create an OAuth 2.0 Client ID (Web Application)",
        `3. Add Authorized Redirect URI: ${callbackUrl}`,
        "4. Paste Client ID and Client Secret into your .env file on the VPS",
        "5. Restart the server with: pm2 restart amaze",
      ],
      devFallbackAvailable: true,
      hint: "For testing without Google credentials, use the researcher login form.",
    });
  }

  const state = Buffer.from(JSON.stringify({ redirectTo })).toString("base64url");
  const googleAuthUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  googleAuthUrl.searchParams.set("client_id", clientId);
  googleAuthUrl.searchParams.set("redirect_uri", callbackUrl);
  googleAuthUrl.searchParams.set("response_type", "code");
  googleAuthUrl.searchParams.set("scope", "openid email profile");
  googleAuthUrl.searchParams.set("access_type", "offline");
  googleAuthUrl.searchParams.set("prompt", "select_account");
  googleAuthUrl.searchParams.set("state", state);

  res.redirect(googleAuthUrl.toString());
});

/**
 * Handles Google OAuth Callback: Exchanges authorization code for tokens and profile
 */
authRouter.get("/google/callback", async (req, res) => {
  const { code, state, error } = req.query;
  const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get("host")}`;
  const callbackUrl = process.env.GOOGLE_CALLBACK_URL || `${baseUrl}/api/auth/google/callback`;

  let redirectTo = "/dashboard";
  if (state) {
    try {
      const decoded = JSON.parse(Buffer.from(state, "base64url").toString("utf8"));
      if (decoded.redirectTo) redirectTo = decoded.redirectTo;
    } catch {}
  }

  if (error || !code) {
    console.error("Google OAuth error:", error);
    return res.redirect(`${redirectTo}?auth_error=${encodeURIComponent(error || "access_denied")}`);
  }

  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    // Exchange code for tokens
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code: code.toString(),
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: callbackUrl,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenResponse.ok) {
      const errBody = await tokenResponse.text();
      console.error("Failed to exchange Google token:", errBody);
      return res.redirect(`${redirectTo}?auth_error=token_exchange_failed`);
    }

    const tokenData = await tokenResponse.json();

    // Fetch user profile from Google
    const profileResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    if (!profileResponse.ok) {
      return res.redirect(`${redirectTo}?auth_error=profile_fetch_failed`);
    }

    const profile = await profileResponse.json();

    // Find or create user
    let user = findUserByGoogleId(profile.id) || findUserByEmail(profile.email);
    if (!user) {
      user = saveUser({
        googleId: profile.id,
        email: profile.email,
        name: profile.name || "Google Researcher",
        picture: profile.picture,
        institution: "Research Institution",
        role: "Neuroscience Researcher",
        provider: "google",
      });
    } else {
      user = saveUser({
        ...user,
        googleId: profile.id,
        name: user.name || profile.name,
        picture: profile.picture || user.picture,
        provider: "google",
      });
    }

    // Create session cookie
    const token = signToken({ userId: user.id, email: user.email }, SESSION_SECRET);
    res.cookie("amaze_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });

    // Also set a client-readable user profile cookie/header so frontend knows user is logged in
    res.cookie("amaze_user_info", JSON.stringify({ name: user.name, email: user.email, orcid: user.orcid }), {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    res.redirect(`${redirectTo}?auth=google_success`);
  } catch (err) {
    console.error("Google Auth Callback Exception:", err);
    res.redirect(`${redirectTo}?auth_error=server_error`);
  }
});

// -------------------------------------------------------------------------
// 2. ORCID OAUTH 2.0
// -------------------------------------------------------------------------

/**
 * Initiates ORCID OAuth: Redirects researcher to ORCID iD sign-in
 */
authRouter.get("/orcid", (req, res) => {
  const clientId = process.env.ORCID_CLIENT_ID;
  const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get("host")}`;
  const callbackUrl = process.env.ORCID_CALLBACK_URL || `${baseUrl}/api/auth/orcid/callback`;
  const isSandbox = process.env.ORCID_USE_SANDBOX === "true";
  const redirectTo = req.query.redirectTo || "/dashboard";

  if (!clientId || clientId.includes("your-orcid-client-id")) {
    return res.status(503).json({
      error: "ORCID OAuth is not configured on this server.",
      message: "Please set ORCID_CLIENT_ID and ORCID_CLIENT_SECRET in the .env file.",
      setupInstructions: [
        "1. Open https://orcid.org/developer-tools (or sandbox.orcid.org for testing)",
        "2. Register your application name (e.g. aMaze Behavioral Suite)",
        `3. Add Redirect URI: ${callbackUrl}`,
        "4. Paste ORCID Client ID and Client Secret into .env",
        "5. Set ORCID_USE_SANDBOX=false for production, or true for sandbox",
      ],
      devFallbackAvailable: true,
      hint: "For testing without ORCID credentials, click 'Use Verified Mock ORCID' in the sign-in modal.",
    });
  }

  const orcidAuthBase = isSandbox
    ? "https://sandbox.orcid.org/oauth/authorize"
    : "https://orcid.org/oauth/authorize";

  const state = Buffer.from(JSON.stringify({ redirectTo })).toString("base64url");
  const orcidUrl = new URL(orcidAuthBase);
  orcidUrl.searchParams.set("client_id", clientId);
  orcidUrl.searchParams.set("response_type", "code");
  orcidUrl.searchParams.set("scope", "/authenticate");
  orcidUrl.searchParams.set("redirect_uri", callbackUrl);
  orcidUrl.searchParams.set("state", state);

  res.redirect(orcidUrl.toString());
});

/**
 * Handles ORCID OAuth Callback: Exchanges code for verified ORCID iD
 */
authRouter.get("/orcid/callback", async (req, res) => {
  const { code, state, error } = req.query;
  const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get("host")}`;
  const callbackUrl = process.env.ORCID_CALLBACK_URL || `${baseUrl}/api/auth/orcid/callback`;
  const isSandbox = process.env.ORCID_USE_SANDBOX === "true";

  let redirectTo = "/dashboard";
  if (state) {
    try {
      const decoded = JSON.parse(Buffer.from(state, "base64url").toString("utf8"));
      if (decoded.redirectTo) redirectTo = decoded.redirectTo;
    } catch {}
  }

  if (error || !code) {
    console.error("ORCID OAuth error:", error);
    return res.redirect(`${redirectTo}?auth_error=${encodeURIComponent(error || "access_denied")}`);
  }

  try {
    const clientId = process.env.ORCID_CLIENT_ID;
    const clientSecret = process.env.ORCID_CLIENT_SECRET;
    const tokenUrl = isSandbox
      ? "https://sandbox.orcid.org/oauth/token"
      : "https://orcid.org/oauth/token";

    const tokenResponse = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "authorization_code",
        code: code.toString(),
        redirect_uri: callbackUrl,
      }),
    });

    if (!tokenResponse.ok) {
      const errText = await tokenResponse.text();
      console.error("Failed to exchange ORCID token:", errText);
      return res.redirect(`${redirectTo}?auth_error=orcid_exchange_failed`);
    }

    const tokenData = await tokenResponse.json();
    const { orcid, name } = tokenData;

    if (!orcid) {
      return res.redirect(`${redirectTo}?auth_error=no_orcid_returned`);
    }

    // Find or create user by verified ORCID iD
    let user = findUserByOrcid(orcid);
    if (!user) {
      user = saveUser({
        orcid,
        name: name || "Verified ORCID Researcher",
        email: `${orcid.replace(/-/g, "")}@orcid.community`,
        institution: "ORCID Verified Institution",
        role: "Behavioral Neurobiologist",
        provider: "orcid",
      });
    } else {
      user = saveUser({
        ...user,
        orcid,
        name: name || user.name,
        provider: "orcid",
      });
    }

    const token = signToken({ userId: user.id, orcid: user.orcid }, SESSION_SECRET);
    res.cookie("amaze_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    res.cookie("amaze_user_info", JSON.stringify({ name: user.name, orcid: user.orcid, email: user.email }), {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    res.redirect(`${redirectTo}?auth=orcid_success`);
  } catch (err) {
    console.error("ORCID Callback Error:", err);
    res.redirect(`${redirectTo}?auth_error=server_error`);
  }
});

// -------------------------------------------------------------------------
// 3. DIRECT LOCAL AUTH & PROFILE
// -------------------------------------------------------------------------

/**
 * Register account directly
 */
authRouter.post("/register", (req, res) => {
  const { name, email, password, institution, orcid, role } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  const existing = findUserByEmail(email);
  if (existing) {
    return res.status(409).json({ error: "An account with this email already exists." });
  }

  const user = saveUser({
    name: name?.trim() || "Researcher",
    email: email.trim().toLowerCase(),
    passwordHash: crypto.createHash("sha256").update(password).digest("hex"),
    institution: institution?.trim() || "Research Lab",
    orcid: orcid?.trim() || undefined,
    role: role || "Behavioral Neuroscientist",
    provider: "local",
  });

  const token = signToken({ userId: user.id, email: user.email }, SESSION_SECRET);
  res.cookie("amaze_session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });

  const { passwordHash: _, ...safeUser } = user;
  res.json({ success: true, user: safeUser, token });
});

/**
 * Sign in with email and password
 */
authRouter.post("/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  const user = findUserByEmail(email);
  if (!user) {
    // For convenience in research setups, auto-provision user if not found
    const newUser = saveUser({
      email: email.trim().toLowerCase(),
      name: email.split("@")[0],
      passwordHash: crypto.createHash("sha256").update(password).digest("hex"),
      institution: "Neuroscience Institute",
      role: "Investigator",
      provider: "local",
    });
    const token = signToken({ userId: newUser.id, email: newUser.email }, SESSION_SECRET);
    res.cookie("amaze_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });
    const { passwordHash: _, ...safeUser } = newUser;
    return res.json({ success: true, user: safeUser, token });
  }

  const hash = crypto.createHash("sha256").update(password).digest("hex");
  if (user.passwordHash && user.passwordHash !== hash) {
    return res.status(401).json({ error: "Invalid credentials." });
  }

  const token = signToken({ userId: user.id, email: user.email }, SESSION_SECRET);
  res.cookie("amaze_session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });

  const { passwordHash: _, ...safeUser } = user;
  res.json({ success: true, user: safeUser, token });
});

/**
 * Returns current authenticated researcher
 */
authRouter.get("/me", authMiddleware, (req, res) => {
  if (req.user) {
    const { passwordHash: _, ...safeUser } = req.user;
    return res.json({ authenticated: true, user: safeUser });
  }

  // Fallback to default researcher if requested in development/standalone
  res.json({
    authenticated: false,
    user: null,
  });
});

/**
 * Logout
 */
authRouter.post("/logout", (req, res) => {
  res.clearCookie("amaze_session");
  res.clearCookie("amaze_user_info");
  res.json({ success: true, message: "Logged out successfully" });
});
