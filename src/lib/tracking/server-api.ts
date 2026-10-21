import { z } from "zod";
import type {
  Arena,
  DetectionSettings,
  TemplateId,
  TrackPoint,
  Zone,
} from "./types.ts";
import type { TrackSummary } from "./metrics.ts";
import type { Detection } from "./vision.ts";
import type { MazeDetection } from "./maze-detect.ts";

const pointSchema = z.object({
  t: z.number().finite(),
  x: z.number().finite(),
  y: z.number().finite(),
  found: z.boolean(),
  area: z.number().finite(),
});

const summarySchema = z.object({
  duration: z.number().finite(),
  detectedPct: z.number().finite(),
  totalDistance: z.number().finite(),
  meanSpeed: z.number().finite(),
  maxSpeed: z.number().finite(),
  mobileTime: z.number().finite(),
  immobileTime: z.number().finite(),
  zones: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      color: z.string(),
      time: z.number().finite(),
      entries: z.number().finite(),
      latency: z.number().finite().nullable(),
      distance: z.number().finite(),
    }),
  ),
});

const measureSchema = z.object({
  label: z.string(),
  value: z.number().finite().nullable(),
  unit: z.string(),
  digits: z.number().int(),
});

const preparedSchema = z.object({
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  duration: z.number().finite().positive(),
  background: z.string(),
  arena: z.object({
    rect: z.object({
      x: z.number().finite(),
      y: z.number().finite(),
      w: z.number().finite().positive(),
      h: z.number().finite().positive(),
    }),
    shape: z.enum(["rect", "circle"]),
    rotation: z.number().finite().optional(),
  }),
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
  size: z.number().finite().positive().optional(),
});

const sessionSchema = z.object({
  sessionId: z.string().uuid(),
  name: z.string(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  duration: z.number().finite().positive(),
});

const eventSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("progress"),
    value: z.number().finite().min(0).max(1),
    currentTime: z.number().finite().min(0),
  }),
  z.object({
    type: z.literal("complete"),
    track: z.array(pointSchema),
    summary: summarySchema,
    measures: z.array(measureSchema),
  }),
  z.object({
    type: z.literal("error"),
    error: z.string(),
  }),
]);

export type PreparedVideo = z.infer<typeof preparedSchema>;
export type UploadedVideo = z.infer<typeof sessionSchema>;
export type ServerTrack = {
  track: TrackPoint[];
  summary: TrackSummary;
  measures: z.infer<typeof measureSchema>[];
};

const analyticsSchema = z.object({
  series: z.array(
    z.object({ t: z.number().finite(), speed: z.number().finite() }),
  ),
  bouts: z.array(
    z.object({
      start: z.number().finite(),
      end: z.number().finite(),
      duration: z.number().finite(),
    }),
  ),
  boutStats: z.object({
    count: z.number().int(),
    total: z.number().finite(),
    mean: z.number().finite(),
    longest: z.number().finite(),
    latency: z.number().finite().nullable(),
  }),
  occupancy: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      color: z.string(),
      intervals: z.array(
        z.object({
          start: z.number().finite(),
          end: z.number().finite(),
        }),
      ),
    }),
  ),
  grid: z.object({
    cols: z.number().int(),
    rows: z.number().int(),
    cell: z.number().finite(),
    data: z.array(z.number().finite()),
    max: z.number().finite(),
  }),
});

export type ServerAnalytics = z.infer<typeof analyticsSchema>;

export async function calculateServerAnalytics(
  anonymousSessionId: string,
  args: {
    track: TrackPoint[];
    zones: Zone[];
    pxPerCm: number;
    dims: { w: number; h: number };
    threshold: number;
    minBout: number;
    smooth: number;
    heatCols: 24 | 40 | 64;
  },
  signal?: AbortSignal,
): Promise<ServerAnalytics> {
  return await requestJson(anonymousSessionId, "/v1/analytics", analyticsSchema, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(args),
    signal,
  });
}

export async function createLiveSession(
  width: number,
  height: number,
  anonymousSessionId: string,
): Promise<string> {
  const result = await requestJson(
    anonymousSessionId,
    "/v1/live-sessions",
    z.object({ sessionId: z.string().uuid() }),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ width, height }),
    },
  );
  return result.sessionId;
}

export async function uploadLiveBackgroundFrame(
  sessionId: string,
  frame: Blob,
  anonymousSessionId: string,
): Promise<void> {
  const response = await fetch(
    `${apiUrl()}/v1/live-sessions/${sessionId}/background`,
    {
      method: "POST",
      headers: {
        "X-Anonymous-Session": anonymousSessionId,
        "Content-Type": "application/octet-stream",
      },
      body: frame,
    },
  );
  if (!response.ok) throw new Error(await parseError(response));
}

export async function prepareLiveSession(
  sessionId: string,
  anonymousSessionId: string,
): Promise<PreparedVideo> {
  return await requestJson(
    anonymousSessionId,
    `/v1/live-sessions/${sessionId}/prepare`,
    preparedSchema,
    { method: "POST" },
  );
}

export async function detectLiveArena(
  sessionId: string,
  frame: Blob,
  anonymousSessionId: string,
): Promise<{ detection: MazeDetection | null; arena: Arena }> {
  return await requestJson(
    anonymousSessionId,
    `/v1/live-sessions/${sessionId}/arena`,
    z.object({
      detection: z
        .object({
          kind: z.enum(["open-field", "water-maze", "elevated-plus", "y-maze"]),
          arena: preparedSchema.shape.arena,
          size: z.number().finite().optional(),
          confidence: z.number().finite(),
        })
        .nullable(),
      arena: preparedSchema.shape.arena,
    }),
    {
      method: "POST",
      headers: { "Content-Type": "application/octet-stream" },
      body: frame,
    },
  );
}

export async function detectVideoArena(
  sessionId: string,
  anonymousSessionId: string,
): Promise<{ detection: MazeDetection | null; arena: Arena }> {
  return await requestJson(
    anonymousSessionId,
    `/v1/sessions/${sessionId}/arena`,
    z.object({
      detection: z
        .object({
          kind: z.enum(["open-field", "water-maze", "elevated-plus", "y-maze"]),
          arena: preparedSchema.shape.arena,
          size: z.number().finite().optional(),
          confidence: z.number().finite(),
        })
        .nullable(),
      arena: preparedSchema.shape.arena,
    }),
    { method: "POST" },
  );
}

export async function trackLiveFrame(
  sessionId: string,
  frame: Blob,
  time: number,
  arena: Arena,
  settings: DetectionSettings,
  anonymousSessionId: string,
  record = true,
): Promise<Detection> {
  const config = encodeURIComponent(
    JSON.stringify({ arena, settings, record }),
  );
  return await requestJson(
    anonymousSessionId,
    `/v1/live-sessions/${sessionId}/frame?time=${encodeURIComponent(time)}&config=${config}`,
    z.object({
      found: z.boolean(),
      x: z.number().finite(),
      y: z.number().finite(),
      area: z.number().finite(),
    }),
    {
      method: "POST",
      headers: { "Content-Type": "application/octet-stream" },
      body: frame,
    },
  );
}

export async function finalizeLiveSession(
  sessionId: string,
  anonymousSessionId: string,
  options: {
    zones: Zone[];
    pxPerCm: number;
    templateId: TemplateId;
  },
): Promise<ServerTrack> {
  return await requestJson(
    anonymousSessionId,
    `/v1/live-sessions/${sessionId}/finalize`,
    z.object({
      track: z.array(pointSchema),
      summary: summarySchema,
      measures: z.array(measureSchema),
    }),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(options),
    },
  );
}

export async function deleteLiveSession(
  sessionId: string,
  anonymousSessionId: string,
): Promise<void> {
  const response = await fetch(`${apiUrl()}/v1/live-sessions/${sessionId}`, {
    method: "DELETE",
    headers: { "X-Anonymous-Session": anonymousSessionId },
  });
  if (!response.ok) throw new Error(await parseError(response));
}

function apiUrl(): string {
  const configured = import.meta.env.VITE_TRACKING_API_URL;
  if (!configured) {
    throw new Error(
      "VITE_TRACKING_API_URL must be configured for server-side tracking.",
    );
  }
  const url = new URL(configured);
  if (!import.meta.env.DEV && url.protocol !== "https:") {
    throw new Error("VITE_TRACKING_API_URL must use HTTPS in production.");
  }
  return url.href.replace(/\/+$/, "");
}

async function parseError(response: Response): Promise<string> {
  const payload: unknown = await response.json().catch(() => null);
  const message =
    typeof payload === "object" &&
    payload !== null &&
    "error" in payload &&
    typeof payload.error === "string"
      ? payload.error
      : response.statusText || `Request failed with status ${response.status}.`;
  return message;
}

async function requestJson<T>(
  anonymousSessionId: string,
  endpoint: string,
  schema: z.ZodType<T>,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`${apiUrl()}${endpoint}`, {
    ...init,
    headers: {
      ...init?.headers,
      "X-Anonymous-Session": anonymousSessionId,
    },
  });
  if (!response.ok) throw new Error(await parseError(response));
  return schema.parse(await response.json());
}

export function uploadVideo(
  file: File,
  anonymousSessionId: string,
  onProgress: (progress: number) => void,
  signal?: AbortSignal,
): Promise<UploadedVideo> {
  const form = new FormData();
  form.append("video", file, file.name);
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("POST", `${apiUrl()}/v1/sessions`);
    request.setRequestHeader("X-Anonymous-Session", anonymousSessionId);
    request.responseType = "json";
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(event.loaded / event.total);
    };
    request.onload = () => {
      if (request.status < 200 || request.status >= 300) {
        const message =
          request.response && typeof request.response.error === "string"
            ? request.response.error
            : `Video upload failed with status ${request.status}.`;
        reject(new Error(message));
        return;
      }
      const parsed = sessionSchema.safeParse(request.response);
      if (!parsed.success) {
        reject(
          new Error("The tracking service returned invalid upload metadata."),
        );
        return;
      }
      resolve(parsed.data);
    };
    request.onerror = () =>
      reject(
        new Error("Video upload failed. Check your connection and try again."),
      );
    request.onabort = () =>
      reject(new DOMException("Video upload was cancelled.", "AbortError"));
    signal?.addEventListener("abort", () => request.abort(), { once: true });
    request.send(form);
  });
}

export async function prepareVideo(
  sessionId: string,
  anonymousSessionId: string,
): Promise<PreparedVideo> {
  return await requestJson(
    anonymousSessionId,
    `/v1/sessions/${sessionId}/prepare`,
    preparedSchema,
    {
      method: "POST",
    },
  );
}

export async function fetchVideoFrame(
  sessionId: string,
  time: number,
  anonymousSessionId: string,
): Promise<ImageBitmap> {
  const response = await fetch(
    `${apiUrl()}/v1/sessions/${sessionId}/frame?time=${encodeURIComponent(time)}`,
    { headers: { "X-Anonymous-Session": anonymousSessionId } },
  );
  if (!response.ok) throw new Error(await parseError(response));
  return await createImageBitmap(await response.blob());
}

export async function testVideoDetection(
  sessionId: string,
  time: number,
  arena: Arena,
  settings: DetectionSettings,
  anonymousSessionId: string,
) {
  return await requestJson(
    anonymousSessionId,
    `/v1/sessions/${sessionId}/test`,
    z.object({
      found: z.boolean(),
      x: z.number().finite(),
      y: z.number().finite(),
      area: z.number().finite(),
    }),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ time, arena, settings }),
    },
  );
}

export async function trackVideo(
  sessionId: string,
  anonymousSessionId: string,
  options: {
    arena: Arena;
    zones: Zone[];
    pxPerCm: number;
    templateId: TemplateId;
    settings: DetectionSettings;
  },
  onProgress: (progress: number, currentTime: number) => void,
  signal: AbortSignal,
): Promise<ServerTrack> {
  const response = await fetch(`${apiUrl()}/v1/sessions/${sessionId}/track`, {
    method: "POST",
    headers: {
      "X-Anonymous-Session": anonymousSessionId,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(options),
    signal,
  });
  if (!response.ok) throw new Error(await parseError(response));
  if (!response.body)
    throw new Error("Tracking service returned an empty response.");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let pending = "";
  let result: ServerTrack | null = null;
  const consume = (line: string) => {
    if (!line.trim()) return;
    const event = eventSchema.parse(JSON.parse(line));
    if (event.type === "progress") {
      onProgress(event.value, event.currentTime);
    } else if (event.type === "error") {
      throw new Error(event.error);
    } else {
      result = {
        track: event.track,
        summary: event.summary,
        measures: event.measures,
      };
    }
  };

  try {
    while (true) {
      const { value, done } = await reader.read();
      pending += decoder.decode(value, { stream: !done });
      const lines = pending.split("\n");
      pending = lines.pop() ?? "";
      for (const line of lines) consume(line);
      if (done) break;
    }
    consume(pending);
  } catch (error) {
    await reader.cancel().catch(() => undefined);
    throw error;
  } finally {
    reader.releaseLock();
  }
  if (!result)
    throw new Error("Tracking service ended before returning results.");
  return result;
}

export async function deleteVideoSession(
  sessionId: string,
  anonymousSessionId: string,
): Promise<void> {
  const response = await fetch(`${apiUrl()}/v1/sessions/${sessionId}`, {
    method: "DELETE",
    headers: { "X-Anonymous-Session": anonymousSessionId },
  });
  if (!response.ok) throw new Error(await parseError(response));
}
