import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import Fastify, { type FastifyRequest } from "fastify";
import sharp from "sharp";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { createWriteStream } from "node:fs";
import { mkdir, readdir, rm } from "node:fs/promises";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import type { Gray, TrackPoint } from "../../src/lib/tracking/types.ts";
import {
  arenaPolygon,
  pointInPolygon,
} from "../../src/lib/tracking/geometry.ts";
import {
  heatmapGrid,
  immobilityBouts,
  speedSeries,
  summarizeBouts,
  zoneOccupancy,
} from "../../src/lib/tracking/analytics.ts";
import { summarize } from "../../src/lib/tracking/metrics.ts";
import { testMeasures } from "../../src/lib/tracking/test-measures.ts";
import { detectMaze } from "../../src/lib/tracking/maze-detect.ts";
import {
  arenaMask,
  detectAnimal,
  detectArena,
  medianBackground,
} from "../../src/lib/tracking/vision.ts";

declare module "fastify" {
  interface FastifyRequest {
    authSubject: string | null;
  }
}

type Session = {
  owner: string;
  path: string;
  name: string;
  width: number;
  height: number;
  duration: number;
  lastAccessedAt: number;
  background?: Gray;
  preparing?: Promise<Gray>;
};

type LiveSession = {
  owner: string;
  width: number;
  height: number;
  lastAccessedAt: number;
  backgroundFrames: Gray[];
  background?: Gray;
  points: TrackPoint[];
  previous: { x: number; y: number } | null;
};

const allowedOrigins = (process.env.TRACKING_ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const dataDirectory = path.resolve(
  process.env.TRACKING_DATA_DIR ?? "./.tracking-data",
);
const port = Number(process.env.PORT ?? 8080);
const maxUploadBytes = Number(
  process.env.TRACKING_MAX_UPLOAD_BYTES ?? 1_073_741_824,
);
const maxDurationSeconds = Number(
  process.env.TRACKING_MAX_DURATION_SECONDS ?? 7_200,
);
const maxConcurrentPerUser = Number(
  process.env.TRACKING_MAX_CONCURRENT_JOBS_PER_USER ?? 1,
);
const maxConcurrentJobs = Number(process.env.TRACKING_MAX_CONCURRENT_JOBS ?? 2);
const maxActiveSessions = Number(
  process.env.TRACKING_MAX_ACTIVE_SESSIONS ?? 20,
);
const SESSION_TTL_MS = 3 * 60 * 60 * 1000;
const ANALYSIS_WIDTH = 480;
const BACKGROUND_SAMPLES = 15;
const sessions = new Map<string, Session>();
const liveSessions = new Map<string, LiveSession>();
const activeJobs = new Map<string, number>();

const arenaSchema = z.object({
  rect: z.object({
    x: z.number().finite(),
    y: z.number().finite(),
    w: z.number().finite().positive(),
    h: z.number().finite().positive(),
  }),
  shape: z.enum(["rect", "circle"]),
  rotation: z.number().finite().optional(),
});

const trackRequestSchema = z.object({
  arena: arenaSchema,
  zones: z
    .array(
      z.object({
        id: z.string().min(1).max(100),
        name: z.string().max(120),
        color: z.string().max(40),
        polygon: z
          .array(
            z.object({
              x: z.number().finite(),
              y: z.number().finite(),
            }),
          )
          .max(256),
        excludes: z.array(z.string().max(100)).max(64).optional(),
      }),
    )
    .max(64),
  pxPerCm: z.number().finite().positive().max(100_000),
  templateId: z.enum([
    "open-field",
    "elevated-plus",
    "y-maze",
    "water-maze",
    "barnes-maze",
    "radial-arm",
    "novel-object",
    "light-dark",
    "three-chamber",
    "custom",
  ]),
  settings: z.object({
    mode: z.enum(["background", "dark", "light"]),
    threshold: z.number().int().min(0).max(255),
    minArea: z.number().finite().positive().max(100_000),
    fps: z.number().int().min(1).max(30),
  }),
});

const testRequestSchema = z.object({
  time: z.number().finite().min(0),
  arena: arenaSchema,
  settings: z.object({
    mode: z.enum(["background", "dark", "light"]),
    threshold: z.number().int().min(0).max(255),
    minArea: z.number().finite().positive().max(100_000),
    fps: z.number().int().min(1).max(30),
  }),
});

const liveFrameRequestSchema = z.object({
  time: z.number().finite().min(0),
  arena: arenaSchema,
  record: z.boolean().default(true),
  settings: z.object({
    mode: z.enum(["background", "dark", "light"]),
    threshold: z.number().int().min(0).max(255),
    minArea: z.number().finite().positive().max(100_000),
    fps: z.number().int().min(1).max(30),
  }),
});

const liveFinalizeSchema = z.object({
  zones: trackRequestSchema.shape.zones,
  pxPerCm: z.number().finite().positive().max(100_000),
  templateId: trackRequestSchema.shape.templateId,
});

const analyticsRequestSchema = z.object({
  track: z
    .array(
      z.object({
        t: z.number().finite().min(0),
        x: z.number().finite(),
        y: z.number().finite(),
        found: z.boolean(),
        area: z.number().finite().min(0),
      }),
    )
    .max(100_000),
  zones: trackRequestSchema.shape.zones,
  pxPerCm: z.number().finite().positive().max(100_000),
  dims: z.object({
    w: z.number().int().positive().max(4096),
    h: z.number().int().positive().max(4096),
  }),
  threshold: z.number().finite().min(0).max(100_000),
  minBout: z.number().finite().min(0).max(100_000),
  smooth: z.number().int().min(1).max(31),
  heatCols: z.union([z.literal(24), z.literal(40), z.literal(64)]),
});

const app = Fastify({
  bodyLimit: 2 * 1024 * 1024,
  logger: {
    redact: ["req.headers.authorization"],
  },
});

app.decorateRequest("authSubject", null);

function normalizeOrigin(value: string): string {
  const url = new URL(value);
  if (
    url.protocol !== "https:" &&
    !(url.protocol === "http:" && url.hostname === "localhost")
  ) {
    throw new Error(`Origin must use HTTPS: ${value}`);
  }
  return url.origin;
}

function sendError(
  reply: { code: (status: number) => { send: (body: unknown) => unknown } },
  status: number,
  message: string,
) {
  return reply.code(status).send({ error: message });
}

async function runBuffer(
  command: string,
  args: string[],
  maxBytes: number,
  timeoutMs: number,
): Promise<Buffer> {
  return await new Promise<Buffer>((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] });
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    let size = 0;
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error(`${command} timed out.`));
    }, timeoutMs);
    child.stdout.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > maxBytes) {
        child.kill("SIGKILL");
        return;
      }
      stdout.push(chunk);
    });
    child.stderr.on("data", (chunk: Buffer) => {
      if (stderr.reduce((total, item) => total + item.length, 0) < 64 * 1024) {
        stderr.push(chunk);
      }
    });
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (size > maxBytes) {
        reject(new Error(`${command} output exceeded its limit.`));
      } else if (code !== 0) {
        reject(
          new Error(
            `${command} failed: ${Buffer.concat(stderr).toString("utf8").trim() || `exit code ${code}`}`,
          ),
        );
      } else {
        resolve(Buffer.concat(stdout));
      }
    });
  });
}

async function probeVideo(filePath: string) {
  const output = await runBuffer(
    "ffprobe",
    [
      "-v",
      "error",
      "-select_streams",
      "v:0",
      "-show_entries",
      "stream=width,height:format=duration",
      "-of",
      "json",
      filePath,
    ],
    1024 * 1024,
    15_000,
  );
  const result: unknown = JSON.parse(output.toString("utf8"));
  const probe = z
    .object({
      streams: z
        .array(
          z.object({
            width: z.number().int().positive(),
            height: z.number().int().positive(),
          }),
        )
        .min(1),
      format: z
        .object({
          duration: z.string().optional(),
        })
        .optional(),
    })
    .parse(result);
  const sourceWidth = probe.streams[0].width;
  const sourceHeight = probe.streams[0].height;
  const duration = Number(probe.format?.duration);
  if (
    sourceWidth > 16_384 ||
    sourceHeight > 16_384 ||
    !Number.isFinite(duration) ||
    duration <= 0 ||
    duration > maxDurationSeconds
  ) {
    throw new Error(
      `Video dimensions or duration exceed the configured limit (${maxDurationSeconds} seconds).`,
    );
  }
  const scale = Math.min(1, ANALYSIS_WIDTH / sourceWidth);
  return {
    width: Math.max(1, Math.round(sourceWidth * scale)),
    height: Math.max(1, Math.round(sourceHeight * scale)),
    duration,
  };
}

async function extractGrayFrame(
  filePath: string,
  time: number,
  width: number,
  height: number,
): Promise<Gray> {
  const png = await runBuffer(
    "ffmpeg",
    [
      "-hide_banner",
      "-loglevel",
      "error",
      "-ss",
      String(Math.max(0, time)),
      "-i",
      filePath,
      "-frames:v",
      "1",
      "-vf",
      `scale=${width}:${height}:flags=fast_bilinear`,
      "-f",
      "image2pipe",
      "-vcodec",
      "png",
      "pipe:1",
    ],
    16 * 1024 * 1024,
    30_000,
  );
  const decoded = await sharp(png)
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });
  if (decoded.info.width !== width || decoded.info.height !== height) {
    throw new Error("Video frame dimensions changed during processing.");
  }
  return {
    data: new Uint8ClampedArray(decoded.data),
    width,
    height,
  };
}

async function extractPreviewFrame(
  filePath: string,
  time: number,
  width: number,
  height: number,
): Promise<Buffer> {
  const image = await runBuffer(
    "ffmpeg",
    [
      "-hide_banner",
      "-loglevel",
      "error",
      "-ss",
      String(Math.max(0, time)),
      "-i",
      filePath,
      "-frames:v",
      "1",
      "-vf",
      `scale=${width}:${height}:flags=fast_bilinear`,
      "-f",
      "image2pipe",
      "-vcodec",
      "mjpeg",
      "pipe:1",
    ],
    16 * 1024 * 1024,
    30_000,
  );
  return await sharp(image).jpeg({ quality: 82 }).toBuffer();
}

function getOwnedSession(id: string, owner: string): Session | null {
  const session = sessions.get(id);
  if (
    !session ||
    session.owner !== owner ||
    Date.now() - session.lastAccessedAt > SESSION_TTL_MS
  ) {
    return null;
  }
  session.lastAccessedAt = Date.now();
  return session;
}

function getOwnedLiveSession(id: string, owner: string): LiveSession | null {
  const session = liveSessions.get(id);
  if (
    !session ||
    session.owner !== owner ||
    Date.now() - session.lastAccessedAt > SESSION_TTL_MS
  ) {
    return null;
  }
  session.lastAccessedAt = Date.now();
  return session;
}

async function decodeLiveFrame(
  image: Buffer,
  width: number,
  height: number,
): Promise<Gray> {
  const decoded = await sharp(image, { limitInputPixels: width * height * 4 })
    .resize(width, height, { fit: "fill" })
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });
  if (decoded.info.width !== width || decoded.info.height !== height) {
    throw new Error("Camera frame dimensions are invalid.");
  }
  return {
    data: new Uint8ClampedArray(decoded.data),
    width,
    height,
  };
}

async function removeSession(id: string) {
  const session = sessions.get(id);
  if (!session) return;
  sessions.delete(id);
  await rm(session.path, { force: true });
}

async function prepareSession(session: Session) {
  if (session.background) return session.background;
  if (!session.preparing) {
    session.preparing = (async () => {
      const frames: Gray[] = [];
      for (let i = 0; i < BACKGROUND_SAMPLES; i++) {
        const t = (session.duration * (i + 0.5)) / BACKGROUND_SAMPLES;
        frames.push(
          await extractGrayFrame(
            session.path,
            t,
            session.width,
            session.height,
          ),
        );
      }
      session.background = medianBackground(frames);
      return session.background;
    })().finally(() => {
      session.preparing = undefined;
    });
  }
  return await session.preparing;
}

async function main() {
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error("PORT must be a valid TCP port.");
  }
  if (allowedOrigins.length === 0) {
    throw new Error(
      "TRACKING_ALLOWED_ORIGINS must list at least one app origin.",
    );
  }
  if (!Number.isSafeInteger(maxUploadBytes) || maxUploadBytes <= 0) {
    throw new Error("TRACKING_MAX_UPLOAD_BYTES must be a positive integer.");
  }
  if (!Number.isFinite(maxDurationSeconds) || maxDurationSeconds <= 0) {
    throw new Error("TRACKING_MAX_DURATION_SECONDS must be positive.");
  }
  if (!Number.isSafeInteger(maxConcurrentPerUser) || maxConcurrentPerUser < 1) {
    throw new Error(
      "TRACKING_MAX_CONCURRENT_JOBS_PER_USER must be a positive integer.",
    );
  }
  if (!Number.isSafeInteger(maxConcurrentJobs) || maxConcurrentJobs < 1) {
    throw new Error("TRACKING_MAX_CONCURRENT_JOBS must be a positive integer.");
  }
  if (!Number.isSafeInteger(maxActiveSessions) || maxActiveSessions < 1) {
    throw new Error("TRACKING_MAX_ACTIVE_SESSIONS must be a positive integer.");
  }
  const origins = new Set(allowedOrigins.map(normalizeOrigin));
  await mkdir(dataDirectory, { recursive: true });
  for (const file of await readdir(dataDirectory)) {
    await rm(path.join(dataDirectory, file), { recursive: true, force: true });
  }

  await app.register(cors, {
    origin(origin, callback) {
      if (origin && origins.has(origin)) callback(null, true);
      else callback(new Error("Origin is not allowed."), false);
    },
    methods: ["GET", "POST", "DELETE", "OPTIONS"],
    allowedHeaders: ["content-type", "x-anonymous-session"],
    maxAge: 600,
  });
  await app.register(multipart, {
    limits: { fileSize: maxUploadBytes, files: 1, parts: 1 },
  });
  app.addContentTypeParser(
    "application/octet-stream",
    { parseAs: "buffer", bodyLimit: 2 * 1024 * 1024 },
    (_request, body, done) => done(null, body),
  );

  app.addHook("onRequest", async (request, reply) => {
    if (request.url === "/healthz") return;
    const sessionId = request.headers["x-anonymous-session"];
    if (
      typeof sessionId !== "string" ||
      !z.string().uuid().safeParse(sessionId).success
    ) {
      sendError(reply, 400, "A valid anonymous session ID is required.");
      return;
    }
    request.authSubject = sessionId;
  });

  app.setErrorHandler((error, request, reply) => {
    request.log.error({ err: error }, "Tracking request failed");
    const statusCode =
      error instanceof Error &&
      "statusCode" in error &&
      typeof error.statusCode === "number"
        ? error.statusCode
        : 500;
    const status = statusCode >= 400 ? statusCode : 500;
    reply.code(status).send({
      error:
        status < 500
          ? error instanceof Error
            ? error.message
            : "The request is invalid."
          : "The tracking service could not complete the request.",
    });
  });

  app.get("/healthz", async () => ({ status: "ok" }));

  app.post(
    "/v1/analytics",
    { bodyLimit: 24 * 1024 * 1024 },
    async (request, reply) => {
      const parsed = analyticsRequestSchema.safeParse(request.body);
      if (!parsed.success) {
        return sendError(reply, 400, "The analytics request is invalid.");
      }
      const {
        track,
        zones,
        pxPerCm,
        dims,
        threshold,
        minBout,
        smooth,
        heatCols,
      } = parsed.data;
      const zoneVertices = zones.reduce(
        (sum, zone) => sum + zone.polygon.length,
        0,
      );
      if (zoneVertices > 1024) {
        return sendError(reply, 413, "The analytics geometry is too complex.");
      }
      let previousTime = -1;
      for (const point of track) {
        if (
          point.t < previousTime ||
          point.x < 0 ||
          point.x > dims.w ||
          point.y < 0 ||
          point.y > dims.h
        ) {
          return sendError(reply, 400, "The track contains invalid points.");
        }
        previousTime = point.t;
      }
      const series = speedSeries(track, pxPerCm, smooth);
      const bouts = immobilityBouts(series, threshold, minBout);
      const grid = heatmapGrid(track, dims.w, dims.h, heatCols);
      return {
        series,
        bouts,
        boutStats: summarizeBouts(bouts, track[0]?.t ?? 0),
        occupancy: zoneOccupancy(track, zones),
        grid: {
          ...grid,
          data: Array.from(grid.data),
        },
      };
    },
  );

  app.post("/v1/live-sessions", async (request, reply) => {
    if (!request.authSubject)
      return sendError(reply, 401, "Authentication is required.");
    const parsed = z
      .object({
        width: z.number().int().positive().max(ANALYSIS_WIDTH),
        height: z.number().int().positive().max(16_384),
      })
      .safeParse(request.body);
    if (!parsed.success) {
      return sendError(reply, 400, "Live session dimensions are invalid.");
    }
    if (
      [...liveSessions.values()].filter(
        (session) => session.owner === request.authSubject,
      ).length >= 3
    ) {
      return sendError(
        reply,
        429,
        "You already have the maximum number of active live sessions.",
      );
    }
    if (liveSessions.size + sessions.size >= maxActiveSessions) {
      return sendError(
        reply,
        503,
        "The tracking service is at capacity. Try again later.",
      );
    }
    const id = randomUUID();
    liveSessions.set(id, {
      owner: request.authSubject,
      ...parsed.data,
      lastAccessedAt: Date.now(),
      backgroundFrames: [],
      points: [],
      previous: null,
    });
    return reply.code(201).send({ sessionId: id });
  });

  app.post<{ Params: { id: string } }>(
    "/v1/live-sessions/:id/background",
    async (request, reply) => {
      if (!request.authSubject)
        return sendError(reply, 401, "Authentication is required.");
      const session = getOwnedLiveSession(
        request.params.id,
        request.authSubject,
      );
      if (!session)
        return sendError(reply, 404, "Live session not found or expired.");
      if (session.backgroundFrames.length >= BACKGROUND_SAMPLES) {
        return sendError(
          reply,
          409,
          "The background sample limit was reached.",
        );
      }
      if (!Buffer.isBuffer(request.body) || request.body.length === 0) {
        return sendError(reply, 400, "A camera frame is required.");
      }
      session.backgroundFrames.push(
        await decodeLiveFrame(request.body, session.width, session.height),
      );
      return { received: session.backgroundFrames.length };
    },
  );

  app.post<{ Params: { id: string } }>(
    "/v1/live-sessions/:id/prepare",
    async (request, reply) => {
      if (!request.authSubject)
        return sendError(reply, 401, "Authentication is required.");
      const session = getOwnedLiveSession(
        request.params.id,
        request.authSubject,
      );
      if (!session)
        return sendError(reply, 404, "Live session not found or expired.");
      if (session.backgroundFrames.length !== BACKGROUND_SAMPLES) {
        return sendError(reply, 409, "Collect all background frames first.");
      }
      session.background = medianBackground(session.backgroundFrames);
      session.backgroundFrames = [];
      const detection = detectMaze(session.background);
      const arena = detection?.arena ?? detectArena(session.background);
      return {
        width: session.width,
        height: session.height,
        duration: 1,
        background: Buffer.from(session.background.data).toString("base64"),
        arena,
        templateId:
          detection?.kind ??
          (arena.shape === "circle" ? "water-maze" : "open-field"),
        size: detection?.size,
      };
    },
  );

  app.post<{ Params: { id: string } }>(
    "/v1/live-sessions/:id/arena",
    async (request, reply) => {
      if (!request.authSubject)
        return sendError(reply, 401, "Authentication is required.");
      const session = getOwnedLiveSession(
        request.params.id,
        request.authSubject,
      );
      if (!session)
        return sendError(reply, 404, "Live session not found or expired.");
      if (!Buffer.isBuffer(request.body) || request.body.length === 0) {
        return sendError(reply, 400, "A camera frame is required.");
      }
      const frame = await decodeLiveFrame(
        request.body,
        session.width,
        session.height,
      );
      const detection = detectMaze(frame);
      const arena = detection?.arena ?? detectArena(frame);
      return { detection, arena };
    },
  );

  app.post<{
    Params: { id: string };
    Querystring: { config?: string; time?: string };
  }>("/v1/live-sessions/:id/frame", async (request, reply) => {
    if (!request.authSubject)
      return sendError(reply, 401, "Authentication is required.");
    const session = getOwnedLiveSession(request.params.id, request.authSubject);
    if (!session)
      return sendError(reply, 404, "Live session not found or expired.");
    if (!session.background) {
      return sendError(reply, 409, "Prepare the live session first.");
    }
    let config: unknown;
    try {
      config = JSON.parse(request.query.config ?? "");
    } catch {
      return sendError(reply, 400, "The live detection settings are invalid.");
    }
    const parsed = liveFrameRequestSchema.safeParse({
      ...(typeof config === "object" && config !== null ? config : {}),
      time: Number(request.query.time),
    });
    if (
      !parsed.success ||
      !Buffer.isBuffer(request.body) ||
      request.body.length === 0
    ) {
      return sendError(reply, 400, "The live detection request is invalid.");
    }
    if (
      parsed.data.record &&
      (session.points.length >= 100_000 ||
        parsed.data.time < (session.points.at(-1)?.t ?? -1))
    ) {
      return sendError(
        reply,
        413,
        "The live track reached its sample limit or time moved backwards.",
      );
    }
    const frame = await decodeLiveFrame(
      request.body,
      session.width,
      session.height,
    );
    const polygon = arenaPolygon(parsed.data.arena);
    const mask = arenaMask(polygon, session.width, session.height, (point) =>
      pointInPolygon(point, polygon),
    );
    const detection = detectAnimal(
      frame,
      session.background,
      mask,
      parsed.data.settings,
      session.previous,
    );
    if (detection.found) {
      session.previous = { x: detection.x, y: detection.y };
    }
    if (parsed.data.record) {
      session.points.push({ t: parsed.data.time, ...detection });
    }
    return detection;
  });

  app.post<{ Params: { id: string } }>(
    "/v1/live-sessions/:id/finalize",
    async (request, reply) => {
      if (!request.authSubject)
        return sendError(reply, 401, "Authentication is required.");
      const session = getOwnedLiveSession(
        request.params.id,
        request.authSubject,
      );
      if (!session)
        return sendError(reply, 404, "Live session not found or expired.");
      const parsed = liveFinalizeSchema.safeParse(request.body);
      if (!parsed.success) {
        return sendError(reply, 400, "The live summary request is invalid.");
      }
      if (
        parsed.data.zones.reduce((sum, zone) => sum + zone.polygon.length, 0) >
        1024
      ) {
        return sendError(
          reply,
          413,
          "The live tracking geometry is too complex.",
        );
      }
      const summary = summarize(
        session.points,
        parsed.data.zones,
        parsed.data.pxPerCm,
      );
      const measures = testMeasures(parsed.data.templateId, {
        summary,
        zones: parsed.data.zones,
        track: session.points,
      }).map(({ label, value, unit, digits }) => ({
        label,
        value: value !== null && Number.isFinite(value) ? value : null,
        unit,
        digits,
      }));
      return { track: session.points, summary, measures };
    },
  );

  app.post("/v1/sessions", async (request, reply) => {
    if (!request.authSubject)
      return sendError(reply, 401, "Authentication is required.");
    const contentLength = Number(request.headers["content-length"]);
    if (Number.isFinite(contentLength) && contentLength > maxUploadBytes) {
      return sendError(
        reply,
        413,
        "The uploaded video exceeds the size limit.",
      );
    }
    if (
      [...sessions.values()].filter(
        (session) => session.owner === request.authSubject,
      ).length >= 3
    ) {
      return sendError(
        reply,
        429,
        "You already have the maximum number of active uploads.",
      );
    }
    if (sessions.size >= maxActiveSessions) {
      return sendError(
        reply,
        503,
        "The tracking service is at capacity. Try again later.",
      );
    }
    const file = await request.file();
    if (!file) return sendError(reply, 400, "A video file is required.");
    const id = randomUUID();
    const extension = path.extname(file.filename).toLowerCase();
    const safeExtension = /^\.[a-z0-9]{1,8}$/.test(extension)
      ? extension
      : ".video";
    const filePath = path.join(dataDirectory, `${id}${safeExtension}`);
    try {
      await pipeline(file.file, createWriteStream(filePath, { flags: "wx" }));
    } catch (error) {
      await rm(filePath, { force: true });
      throw error;
    }
    if (file.file.truncated) {
      await rm(filePath, { force: true });
      return sendError(
        reply,
        413,
        "The uploaded video exceeds the size limit.",
      );
    }
    try {
      const metadata = await probeVideo(filePath);
      const session: Session = {
        owner: request.authSubject,
        path: filePath,
        name: path.basename(file.filename).slice(0, 200),
        ...metadata,
        lastAccessedAt: Date.now(),
      };
      sessions.set(id, session);
      return reply.code(201).send({
        sessionId: id,
        name: session.name,
        width: session.width,
        height: session.height,
        duration: session.duration,
      });
    } catch (error) {
      await rm(filePath, { force: true });
      throw error;
    }
  });

  app.post<{ Params: { id: string } }>(
    "/v1/sessions/:id/prepare",
    async (request, reply) => {
      if (!request.authSubject)
        return sendError(reply, 401, "Authentication is required.");
      const session = getOwnedSession(request.params.id, request.authSubject);
      if (!session)
        return sendError(reply, 404, "Video session not found or expired.");
      const background = await prepareSession(session);
      const detection = detectMaze(background);
      const arena = detection?.arena ?? detectArena(background);
      const templateId =
        detection?.kind ??
        (arena.shape === "circle" ? "water-maze" : "open-field");
      return {
        width: session.width,
        height: session.height,
        duration: session.duration,
        background: Buffer.from(background.data).toString("base64"),
        arena,
        templateId,
        size: detection?.size,
      };
    },
  );

  app.post<{ Params: { id: string } }>(
    "/v1/sessions/:id/arena",
    async (request, reply) => {
      if (!request.authSubject)
        return sendError(reply, 401, "Authentication is required.");
      const session = getOwnedSession(request.params.id, request.authSubject);
      if (!session)
        return sendError(reply, 404, "Video session not found or expired.");
      if (!session.background) {
        return sendError(
          reply,
          409,
          "Prepare the video before arena detection.",
        );
      }
      const detection = detectMaze(session.background);
      return {
        detection,
        arena: detection?.arena ?? detectArena(session.background),
      };
    },
  );

  app.get<{ Params: { id: string }; Querystring: { time?: string } }>(
    "/v1/sessions/:id/frame",
    async (request, reply) => {
      if (!request.authSubject)
        return sendError(reply, 401, "Authentication is required.");
      const session = getOwnedSession(request.params.id, request.authSubject);
      if (!session)
        return sendError(reply, 404, "Video session not found or expired.");
      const time = Number(request.query.time);
      if (!Number.isFinite(time) || time < 0 || time > session.duration) {
        return sendError(reply, 400, "The requested frame time is invalid.");
      }
      const frame = await extractPreviewFrame(
        session.path,
        time,
        session.width,
        session.height,
      );
      reply.header("content-type", "image/jpeg");
      reply.header("cache-control", "private, no-store");
      return reply.send(frame);
    },
  );

  app.post<{ Params: { id: string } }>(
    "/v1/sessions/:id/test",
    async (request, reply) => {
      if (!request.authSubject)
        return sendError(reply, 401, "Authentication is required.");
      const session = getOwnedSession(request.params.id, request.authSubject);
      if (!session)
        return sendError(reply, 404, "Video session not found or expired.");
      if (!session.background) {
        return sendError(
          reply,
          409,
          "Prepare the video before testing detection.",
        );
      }
      const parsed = testRequestSchema.safeParse(request.body);
      if (!parsed.success) {
        return sendError(reply, 400, "The detection settings are invalid.");
      }
      const frame = await extractGrayFrame(
        session.path,
        Math.min(parsed.data.time, session.duration),
        session.width,
        session.height,
      );
      const polygon = arenaPolygon(parsed.data.arena);
      const mask = arenaMask(polygon, session.width, session.height, (point) =>
        pointInPolygon(point, polygon),
      );
      return detectAnimal(
        frame,
        session.background,
        mask,
        parsed.data.settings,
        null,
      );
    },
  );

  app.post<{ Params: { id: string } }>(
    "/v1/sessions/:id/track",
    async (request, reply) => {
      if (!request.authSubject)
        return sendError(reply, 401, "Authentication is required.");
      const session = getOwnedSession(request.params.id, request.authSubject);
      if (!session)
        return sendError(reply, 404, "Video session not found or expired.");
      if (!session.background) {
        return sendError(reply, 409, "Prepare the video before tracking.");
      }
      const parsed = trackRequestSchema.safeParse(request.body);
      if (!parsed.success) {
        return sendError(reply, 400, "The tracking settings are invalid.");
      }
      if (
        parsed.data.zones.reduce((sum, zone) => sum + zone.polygon.length, 0) >
        1024
      ) {
        return sendError(reply, 413, "The tracking geometry is too complex.");
      }
      if ((activeJobs.get(request.authSubject) ?? 0) >= maxConcurrentPerUser) {
        return sendError(
          reply,
          429,
          "You already have a tracking job in progress.",
        );
      }
      const totalActiveJobs = [...activeJobs.values()].reduce(
        (total, count) => total + count,
        0,
      );
      if (totalActiveJobs >= maxConcurrentJobs) {
        return sendError(
          reply,
          503,
          "The tracking service is at capacity. Try again later.",
        );
      }
      if (session.duration * parsed.data.settings.fps > 100_000) {
        return sendError(
          reply,
          413,
          "The selected frame rate would exceed the 100,000-sample limit.",
        );
      }
      const { arena, zones, pxPerCm, templateId, settings } = parsed.data;
      const polygon = arenaPolygon(arena);
      const mask = arenaMask(polygon, session.width, session.height, (point) =>
        pointInPolygon(point, polygon),
      );
      const frameSize = session.width * session.height;
      const child = spawn(
        "ffmpeg",
        [
          "-hide_banner",
          "-loglevel",
          "error",
          "-i",
          session.path,
          "-vf",
          `fps=${settings.fps},scale=${session.width}:${session.height}:flags=fast_bilinear,format=gray`,
          "-f",
          "rawvideo",
          "pipe:1",
        ],
        { stdio: ["ignore", "pipe", "pipe"] },
      );
      activeJobs.set(
        request.authSubject,
        (activeJobs.get(request.authSubject) ?? 0) + 1,
      );
      reply.hijack();
      reply.raw.writeHead(200, {
        "content-type": "application/x-ndjson; charset=utf-8",
        "cache-control": "no-cache, no-transform",
        "x-content-type-options": "nosniff",
      });
      const send = (value: unknown) =>
        reply.raw.write(`${JSON.stringify(value)}\n`);
      let pending = Buffer.alloc(0);
      let frameCount = 0;
      let previous: { x: number; y: number } | null = null;
      const points: TrackPoint[] = [];
      let stderr = "";
      const exitPromise = new Promise<number | null>((resolve, reject) => {
        child.once("error", reject);
        child.once("close", resolve);
      });
      child.stderr.on("data", (chunk: Buffer) => {
        if (stderr.length < 64 * 1024) stderr += chunk.toString("utf8");
      });
      const cancel = () => child.kill("SIGTERM");
      reply.raw.once("close", cancel);
      try {
        for await (const chunk of child.stdout) {
          pending = Buffer.concat([pending, chunk as Buffer]);
          while (pending.length >= frameSize) {
            const pixels = pending.subarray(0, frameSize);
            pending = pending.subarray(frameSize);
            const frame: Gray = {
              data: new Uint8ClampedArray(
                pixels.buffer,
                pixels.byteOffset,
                pixels.byteLength,
              ),
              width: session.width,
              height: session.height,
            };
            const t = frameCount / settings.fps;
            const detection = detectAnimal(
              frame,
              session.background,
              mask,
              settings,
              previous,
            );
            if (detection.found) previous = { x: detection.x, y: detection.y };
            points.push({ t, ...detection });
            frameCount++;
            if (frameCount % Math.max(1, settings.fps * 2) === 0) {
              send({
                type: "progress",
                value: Math.min(1, t / session.duration),
                currentTime: t,
              });
            }
          }
        }
        const exitCode = await exitPromise;
        if (exitCode !== 0) {
          throw new Error(
            stderr.trim() || `ffmpeg exited with code ${exitCode}.`,
          );
        }
        const summary = summarize(points, zones, pxPerCm);
        const measures = testMeasures(templateId, {
          summary,
          zones,
          track: points,
        }).map(({ label, value, unit, digits }) => ({
          label,
          value: value !== null && Number.isFinite(value) ? value : null,
          unit,
          digits,
        }));
        send({ type: "complete", track: points, summary, measures });
      } catch (error) {
        request.log.error({ err: error }, "Video tracking failed");
        send({
          type: "error",
          error:
            "The video could not be processed. Check the file and settings.",
        });
      } finally {
        reply.raw.off("close", cancel);
        activeJobs.set(
          request.authSubject,
          Math.max(0, (activeJobs.get(request.authSubject) ?? 1) - 1),
        );
        reply.raw.end();
      }
    },
  );

  app.delete<{ Params: { id: string } }>(
    "/v1/live-sessions/:id",
    async (request, reply) => {
      if (!request.authSubject)
        return sendError(reply, 401, "Authentication is required.");
      const session = getOwnedLiveSession(
        request.params.id,
        request.authSubject,
      );
      if (!session) return reply.code(204).send();
      liveSessions.delete(request.params.id);
      return reply.code(204).send();
    },
  );

  app.delete<{ Params: { id: string } }>(
    "/v1/sessions/:id",
    async (request, reply) => {
      if (!request.authSubject)
        return sendError(reply, 401, "Authentication is required.");
      const session = getOwnedSession(request.params.id, request.authSubject);
      if (!session) return reply.code(204).send();
      await removeSession(request.params.id);
      return reply.code(204).send();
    },
  );

  const cleanupTimer = setInterval(() => {
    for (const [id, session] of sessions) {
      if (Date.now() - session.lastAccessedAt > SESSION_TTL_MS) {
        void removeSession(id).catch((error: unknown) => {
          app.log.error({ err: error }, "Expired upload cleanup failed");
        });
      }
    }
    for (const [id, session] of liveSessions) {
      if (Date.now() - session.lastAccessedAt > SESSION_TTL_MS) {
        liveSessions.delete(id);
      }
    }
  }, 60_000);
  cleanupTimer.unref();

  await app.listen({ host: "0.0.0.0", port });
}

main().catch((error: unknown) => {
  app.log.fatal({ err: error }, "Tracking service startup failed");
  process.exitCode = 1;
});
