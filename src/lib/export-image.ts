import { toJpeg, toPng } from "html-to-image";

export type ImageFormat = "png" | "jpeg";

/** Renders an element to an image data URL, with a solid background so JPEG has no black fill. */
export async function elementToDataUrl(el: HTMLElement, format: ImageFormat): Promise<string> {
  const backgroundColor = getComputedStyle(document.body).backgroundColor;
  const options = { backgroundColor, pixelRatio: 2, cacheBust: true };
  return format === "png" ? toPng(el, options) : toJpeg(el, { ...options, quality: 0.92 });
}

export function downloadDataUrl(filename: string, dataUrl: string) {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export async function downloadElementImage(el: HTMLElement, filename: string, format: ImageFormat) {
  const dataUrl = await elementToDataUrl(el, format);
  downloadDataUrl(`${filename}.${format === "png" ? "png" : "jpg"}`, dataUrl);
}
