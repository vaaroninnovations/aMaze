import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { initDatabase } from "./db.mjs";
import { authRouter, authMiddleware } from "./auth.mjs";
import { apiRouter } from "./api.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize database & directories
initDatabase();

const app = express();
const PORT = parseInt(process.env.PORT || "3000", 10);
const HOST = process.env.HOST || "0.0.0.0";
const IS_PROD = process.env.NODE_ENV === "production";
const SESSION_SECRET = process.env.SESSION_SECRET || "amaze-production-secret-session-key";

// Security & Parsing Middlewares
app.use(
  cors({
    origin: true,
    credentials: true,
  }),
);
app.use(cookieParser(SESSION_SECRET));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Security Headers
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  next();
});

// Request Logging
app.use((req, _res, next) => {
  if (!req.path.startsWith("/assets") && !req.path.startsWith("/api/uploads")) {
    const timestamp = new Date().toISOString().split("T")[1].slice(0, 8);
    console.log(`[${timestamp}] ${req.method} ${req.path}`);
  }
  next();
});

// Attach authenticated researcher profile if session token exists
app.use(authMiddleware);

// API Routers
app.use("/api/auth", authRouter);
app.use("/api", apiRouter);

// Serve Frontend Static Bundle in Production
const DIST_PATH = path.resolve(__dirname, "../dist");
const INDEX_HTML = path.join(DIST_PATH, "index.html");

if (fs.existsSync(DIST_PATH)) {
  // Cache static assets (JS, CSS, images) aggressively for 1 year
  app.use(
    "/assets",
    express.static(path.join(DIST_PATH, "assets"), {
      maxAge: "1y",
      immutable: true,
    }),
  );

  // Serve other static assets from dist
  app.use(express.static(DIST_PATH, { maxAge: "1h" }));

  // Single Page Application (SPA) catch-all route
  app.use((req, res, next) => {
    if (req.method !== "GET") return next();
    if (req.path.startsWith("/api")) {
      return res.status(404).json({ error: "API endpoint not found" });
    }
    res.sendFile(INDEX_HTML);
  });
} else {
  // In development before build, provide informative landing page
  app.use((req, res, next) => {
    if (req.method !== "GET") return next();
    if (req.path.startsWith("/api")) {
      return res.status(404).json({ error: "API endpoint not found" });
    }
    res.status(200).send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>aMaze Server Ready</title>
          <style>
            body { font-family: system-ui, sans-serif; background: #0b1b20; color: #ecf7f5; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
            .card { background: #153438; padding: 2rem 2.5rem; border-radius: 12px; border: 1px solid rgba(82,216,196,0.2); max-width: 520px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
            h1 { color: #52d8c4; margin-top: 0; font-size: 1.5rem; }
            code { background: rgba(0,0,0,0.4); padding: 0.2rem 0.4rem; border-radius: 4px; font-family: monospace; color: #fde047; }
            a { color: #52d8c4; text-decoration: none; font-weight: bold; }
            a:hover { text-decoration: underline; }
            .btn { display: inline-block; background: #08796f; color: white; padding: 0.5rem 1rem; border-radius: 6px; margin-top: 1rem; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>aMaze Backend Running</h1>
            <p>The production server is active on <strong>port ${PORT}</strong>.</p>
            <p>To serve the frontend user interface, run the production build:</p>
            <p><code>npm run build</code></p>
            <p>Or verify the backend endpoints:</p>
            <p><a href="/api/health" class="btn">View System Health API &rarr;</a></p>
          </div>
        </body>
      </html>
    `);
  });
}

// 404 handler for unmatched non-GET API requests
app.use("/api", (_req, res) => {
  res.status(404).json({ error: "API endpoint not found" });
});

// Global Error Handler
app.use((err, _req, res, _next) => {
  console.error("Unhandled Server Error:", err);
  res.status(500).json({
    error: "Internal Server Error",
    message: IS_PROD ? "An unexpected error occurred." : err.message,
  });
});

// Start Server
const server = app.listen(PORT, HOST, () => {
  console.log(`
=============================================================
  aMaze Behavioral Neuroscience Suite - Production Server
=============================================================
  Server listening on: http://${HOST}:${PORT}
  Environment:        ${process.env.NODE_ENV || "development"}
  Data Directory:     ${path.resolve(__dirname, "../data")}
  Google OAuth:       ${process.env.GOOGLE_CLIENT_ID ? "Configured" : "Not configured (set in .env)"}
  ORCID OAuth:        ${process.env.ORCID_CLIENT_ID ? "Configured" : "Not configured (set in .env)"}
=============================================================
  `);
});

// Graceful Shutdown Handlers
process.on("SIGTERM", () => {
  console.log("SIGTERM received. Gracefully shutting down...");
  server.close(() => {
    console.log("Server closed successfully.");
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  console.log("SIGINT received. Shutting down...");
  server.close(() => {
    console.log("Server closed.");
    process.exit(0);
  });
});
