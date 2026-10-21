import type { FrameSource } from "./frame-source.ts";

export type CameraDevice = { deviceId: string; label: string };

export function isCameraSupported(): boolean {
  return typeof navigator !== "undefined" && typeof navigator.mediaDevices?.getUserMedia === "function";
}

/** Friendly message for getUserMedia failures, including how to recover from a denied permission. */
export function describeCameraError(error: unknown): string {
  const name = error instanceof Error ? error.name : "";
  if (name === "NotAllowedError" || name === "PermissionDeniedError") {
    return "Camera access is blocked. Click the camera icon in your browser's address bar, allow access, then try again.";
  }
  if (name === "NotFoundError" || name === "DevicesNotFoundError" || name === "OverconstrainedError") {
    return "No camera was found. Connect a webcam or USB camera and try again.";
  }
  if (name === "NotReadableError" || name === "TrackStartError") {
    return "The camera is being used by another application. Close it and try again.";
  }
  return error instanceof Error && error.message ? error.message : "Could not start the camera.";
}

export async function listCameras(): Promise<CameraDevice[]> {
  const all = await navigator.mediaDevices.enumerateDevices();
  return all
    .filter((d) => d.kind === "videoinput")
    .map((d, i) => ({ deviceId: d.deviceId, label: d.label || `Camera ${i + 1}` }));
}

/** Live camera as a FrameSource: `seek` is a no-op and `draw` always paints the newest frame. */
export async function createCameraSource(deviceId?: string): Promise<FrameSource> {
  if (!isCameraSupported()) throw new Error("This browser does not support camera access. Try a recent Chrome, Edge, Firefox or Safari.");
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { ...(deviceId ? { deviceId: { exact: deviceId } } : {}), width: { ideal: 1280 }, height: { ideal: 720 } },
    audio: false,
  });
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.srcObject = stream;
  try {
    await video.play();
    if (video.videoWidth === 0) {
      await new Promise<void>((resolve) => video.addEventListener("loadedmetadata", () => resolve(), { once: true }));
    }
  } catch (e) {
    stream.getTracks().forEach((t) => t.stop());
    throw e;
  }
  const track = stream.getVideoTracks()[0];
  return {
    kind: "camera",
    name: track?.label || "Live camera",
    deviceId: track?.getSettings().deviceId,
    stream,
    width: video.videoWidth,
    height: video.videoHeight,
    duration: 0,
    seek: async () => undefined,
    draw: (ctx, w, h) => ctx.drawImage(video, 0, 0, w, h),
    dispose: () => {
      stream.getTracks().forEach((t) => t.stop());
      video.srcObject = null;
    },
  };
}

export function formatClock(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

const MIME_CANDIDATES = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm", "video/mp4"];

export type Recorder = { stop: () => Promise<File> };

/** Records the camera stream; `stop` resolves with the finished clip as a File. */
export function startRecorder(stream: MediaStream): Recorder {
  const mimeType = MIME_CANDIDATES.find((m) => MediaRecorder.isTypeSupported(m));
  const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };
  recorder.start(1000);
  return {
    stop: () =>
      new Promise<File>((resolve) => {
        recorder.onstop = () => {
          const type = recorder.mimeType || "video/webm";
          const ext = type.includes("mp4") ? "mp4" : "webm";
          const stamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, "-");
          resolve(new File(chunks, `live-${stamp}.${ext}`, { type }));
        };
        recorder.stop();
      }),
  };
}
