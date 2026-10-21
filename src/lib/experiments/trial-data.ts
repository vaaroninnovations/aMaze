import type { Gray } from "@/lib/tracking/types.ts";
export { decodeTrack, encodeTrack } from "./track-codec.ts";

/** Converts the clean grayscale background to a small JPEG for revisiting trials without the video. */
export function grayToJpeg(gray: Gray): Promise<Blob | null> {
  const canvas = document.createElement("canvas");
  canvas.width = gray.width;
  canvas.height = gray.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.resolve(null);
  const img = ctx.createImageData(gray.width, gray.height);
  for (let i = 0; i < gray.data.length; i++) {
    const v = gray.data[i];
    img.data[i * 4] = v;
    img.data[i * 4 + 1] = v;
    img.data[i * 4 + 2] = v;
    img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.8));
}
