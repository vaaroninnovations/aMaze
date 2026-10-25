import { Router } from "express";
import fs from "fs";
import path from "path";
import multer from "multer";
import {
  getAllProjects,
  getProjectById,
  saveProject,
  deleteProject,
  getTrialsForProject,
  getTrialById,
  saveTrial,
  UPLOADS_DIR,
} from "./db.mjs";

export const apiRouter = Router();

// Configure Multer for video file uploads
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const safeName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, "_");
    cb(null, `${safeName}-${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 1024 * 1024 * 500, // 500 MB max upload limit for behavioral videos
  },
});

// -------------------------------------------------------------------------
// HEALTH & SYSTEM STATUS
// -------------------------------------------------------------------------
apiRouter.get("/health", (_req, res) => {
  const memory = process.memoryUsage();
  res.json({
    status: "ok",
    app: "aMaze Behavioral Neuroscience Suite",
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
    nodeVersion: process.version,
    environment: process.env.NODE_ENV || "development",
    memory: {
      rssMb: (memory.rss / 1024 / 1024).toFixed(1),
      heapUsedMb: (memory.heapUsed / 1024 / 1024).toFixed(1),
      heapTotalMb: (memory.heapTotal / 1024 / 1024).toFixed(1),
    },
  });
});

// -------------------------------------------------------------------------
// PROJECTS
// -------------------------------------------------------------------------
apiRouter.get("/projects", (_req, res) => {
  try {
    const projects = getAllProjects();
    res.json(projects);
  } catch (err) {
    res.status(500).json({ error: "Failed to read projects", details: err.message });
  }
});

apiRouter.get("/projects/:id", (req, res) => {
  try {
    const project = getProjectById(req.params.id);
    if (!project) return res.status(404).json({ error: "Project not found" });
    const trials = getTrialsForProject(req.params.id);
    res.json({ ...project, trials });
  } catch (err) {
    res.status(500).json({ error: "Failed to read project", details: err.message });
  }
});

apiRouter.post("/projects", (req, res) => {
  try {
    const saved = saveProject(req.body);
    res.status(201).json(saved);
  } catch (err) {
    res.status(500).json({ error: "Failed to save project", details: err.message });
  }
});

apiRouter.delete("/projects/:id", (req, res) => {
  try {
    const success = deleteProject(req.params.id);
    res.json({ success, id: req.params.id });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete project", details: err.message });
  }
});

// -------------------------------------------------------------------------
// TRIALS
// -------------------------------------------------------------------------
apiRouter.get("/projects/:id/trials", (req, res) => {
  try {
    const trials = getTrialsForProject(req.params.id);
    res.json(trials);
  } catch (err) {
    res.status(500).json({ error: "Failed to read trials", details: err.message });
  }
});

apiRouter.post("/projects/:id/trials", (req, res) => {
  try {
    const trialData = { ...req.body, projectId: req.params.id };
    const saved = saveTrial(trialData);
    res.status(201).json(saved);
  } catch (err) {
    res.status(500).json({ error: "Failed to save trial", details: err.message });
  }
});

apiRouter.get("/trials/:id", (req, res) => {
  try {
    const trial = getTrialById(req.params.id);
    if (!trial) return res.status(404).json({ error: "Trial not found" });
    res.json(trial);
  } catch (err) {
    res.status(500).json({ error: "Failed to read trial", details: err.message });
  }
});

// -------------------------------------------------------------------------
// VIDEO & ASSET UPLOADS
// -------------------------------------------------------------------------

/**
 * Handle multipart video upload
 */
apiRouter.post("/upload", upload.single("video"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No video file provided" });
  }

  const fileUrl = `/api/uploads/${req.file.filename}`;
  res.status(201).json({
    success: true,
    filename: req.file.filename,
    originalName: req.file.originalname,
    sizeBytes: req.file.size,
    url: fileUrl,
  });
});

/**
 * Stream video with HTTP 206 Partial Content support (crucial for video scrub/seek in browsers)
 */
apiRouter.get("/uploads/:filename", (req, res) => {
  const filePath = path.join(UPLOADS_DIR, path.basename(req.params.filename));
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "Video file not found" });
  }

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.range;

  if (range) {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunksize = end - start + 1;
    const file = fs.createReadStream(filePath, { start, end });
    const head = {
      "Content-Range": `bytes ${start}-${end}/${fileSize}`,
      "Accept-Ranges": "bytes",
      "Content-Length": chunksize,
      "Content-Type": "video/mp4",
    };
    res.writeHead(206, head);
    file.pipe(res);
  } else {
    const head = {
      "Content-Length": fileSize,
      "Content-Type": "video/mp4",
    };
    res.writeHead(200, head);
    fs.createReadStream(filePath).pipe(res);
  }
});
