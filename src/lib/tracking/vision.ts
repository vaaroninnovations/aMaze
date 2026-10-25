import type { Arena, DetectionSettings, Gray, Point, Rect } from "./types.ts";

export function toGray(img: ImageData): Gray {
  const { data, width, height } = img;
  const out = new Uint8ClampedArray(width * height);
  for (let i = 0, j = 0; i < data.length; i += 4, j++) {
    out[j] = (data[i] * 77 + data[i + 1] * 150 + data[i + 2] * 29) >> 8;
  }
  return { data: out, width, height };
}

/** Per-pixel median of several frames: a clean "empty arena" image even if the animal moves. */
export function medianBackground(frames: Gray[]): Gray {
  const { width, height } = frames[0];
  const n = frames.length;
  const out = new Uint8ClampedArray(width * height);
  const buf = new Uint8Array(n);
  for (let i = 0; i < out.length; i++) {
    for (let k = 0; k < n; k++) buf[k] = frames[k].data[i];
    buf.sort();
    out[i] = buf[n >> 1];
  }
  return { data: out, width, height };
}

export function otsuThreshold(values: Uint8ClampedArray, mask?: Uint8Array): number {
  const hist = new Array<number>(256).fill(0);
  let total = 0;
  for (let i = 0; i < values.length; i++) {
    if (mask && !mask[i]) continue;
    hist[values[i]]++;
    total++;
  }
  let sum = 0;
  for (let i = 0; i < 256; i++) sum += i * hist[i];
  let sumB = 0;
  let wB = 0;
  let best = 0;
  let threshold = 127;
  for (let t = 0; t < 256; t++) {
    wB += hist[t];
    if (wB === 0) continue;
    const wF = total - wB;
    if (wF === 0) break;
    sumB += t * hist[t];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const between = wB * wF * (mB - mF) ** 2;
    if (between > best) {
      best = between;
      threshold = t;
    }
  }
  return threshold;
}

export type Blob = {
  label: number;
  area: number;
  cx: number;
  cy: number;
  bbox: Rect;
  touchesBorder: number;
  theta?: number;
  majorR?: number;
  minorR?: number;
  mu20?: number;
  mu02?: number;
  mu11?: number;
};

/** Connected components (4-neighbour) over a binary mask. Pass `labels` to read back each pixel's blob label. */
export function findBlobs(
  mask: Uint8Array,
  width: number,
  height: number,
  minArea: number,
  labels: Int32Array = new Int32Array(width * height),
): Blob[] {
  const blobs: Blob[] = [];
  const stack: number[] = [];
  let label = 0;
  for (let start = 0; start < mask.length; start++) {
    if (!mask[start] || labels[start]) continue;
    label++;
    labels[start] = label;
    stack.push(start);
    let area = 0;
    let sx = 0;
    let sy = 0;
    let sx2 = 0;
    let sy2 = 0;
    let sxy = 0;
    let minX = width;
    let minY = height;
    let maxX = 0;
    let maxY = 0;
    let border = 0;
    while (stack.length) {
      const idx = stack.pop() as number;
      const x = idx % width;
      const y = (idx - x) / width;
      area++;
      sx += x;
      sy += y;
      sx2 += x * x;
      sy2 += y * y;
      sxy += x * y;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      if (x === 0 || y === 0 || x === width - 1 || y === height - 1) border++;
      const neighbours = [
        x > 0 ? idx - 1 : -1,
        x < width - 1 ? idx + 1 : -1,
        y > 0 ? idx - width : -1,
        y < height - 1 ? idx + width : -1,
      ];
      for (const nb of neighbours) {
        if (nb >= 0 && mask[nb] && !labels[nb]) {
          labels[nb] = label;
          stack.push(nb);
        }
      }
    }
    if (area >= minArea) {
      const cx = sx / area;
      const cy = sy / area;
      const mu20 = Math.max(0, sx2 / area - cx * cx);
      const mu02 = Math.max(0, sy2 / area - cy * cy);
      const mu11 = sxy / area - cx * cy;
      const diff = mu20 - mu02;
      const disc = Math.hypot(diff, 2 * mu11);
      const lambda1 = Math.max(0, (mu20 + mu02 + disc) / 2);
      const lambda2 = Math.max(0, (mu20 + mu02 - disc) / 2);
      const theta = 0.5 * Math.atan2(2 * mu11, diff);
      const majorR = Math.max(2, 2 * Math.sqrt(lambda1));
      const minorR = Math.max(1.5, 2 * Math.sqrt(lambda2));

      blobs.push({
        label,
        area,
        cx,
        cy,
        bbox: { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 },
        touchesBorder: border,
        theta,
        majorR,
        minorR,
        mu20,
        mu02,
        mu11,
      });
    }
  }
  return blobs;
}

/** Morphological opening-lite: remove isolated pixels with fewer than 2 set neighbours. */
function denoise(mask: Uint8Array, width: number, height: number): Uint8Array {
  const out = new Uint8Array(mask.length);
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x;
      if (!mask[i]) continue;
      const n = mask[i - 1] + mask[i + 1] + mask[i - width] + mask[i + width];
      if (n >= 2) out[i] = 1;
    }
  }
  return out;
}

export type ArenaRegion = { mask: Uint8Array; blob: Blob; width: number; height: number };

/**
 * Finds the arena region in an image: tries both polarities of an Otsu split and keeps the
 * large, central, compact region (the surroundings form a ring hugging the frame edge).
 */
export function segmentArena(img: Gray): ArenaRegion | null {
  const { data, width, height } = img;
  const t = otsuThreshold(data);
  const imgArea = width * height;
  let best: { score: number; blob: Blob; labels: Int32Array } | null = null;
  for (const brightArena of [true, false]) {
    const mask = new Uint8Array(data.length);
    for (let i = 0; i < data.length; i++) mask[i] = (brightArena ? data[i] > t : data[i] <= t) ? 1 : 0;
    const labels = new Int32Array(data.length);
    for (const blob of findBlobs(denoise(mask, width, height), width, height, imgArea * 0.04, labels)) {
      const boxArea = blob.bbox.w * blob.bbox.h;
      if (boxArea > imgArea * 0.97) continue;
      const cxOff = Math.abs(blob.bbox.x + blob.bbox.w / 2 - width / 2) / width;
      const cyOff = Math.abs(blob.bbox.y + blob.bbox.h / 2 - height / 2) / height;
      // Surroundings form a hollow ring hugging the frame edge: low fill and edge contact.
      const fill = blob.area / boxArea;
      const m = 3;
      const hugsEdge =
        blob.bbox.x <= m || blob.bbox.y <= m || blob.bbox.x + blob.bbox.w >= width - m || blob.bbox.y + blob.bbox.h >= height - m;
      const score = (blob.area / imgArea) * fill * fill * (1 - cxOff - cyOff) * (hugsEdge ? 0.5 : 1);
      if (!best || score > best.score) best = { score, blob, labels };
    }
  }
  if (!best) return null;
  const region = new Uint8Array(data.length);
  const { label } = best.blob;
  for (let i = 0; i < region.length; i++) if (best.labels[i] === label) region[i] = 1;
  return { mask: region, blob: best.blob, width, height };
}

/** Axis-aligned arena guess from the background (bounding box of the arena region; round if disc-like). */
export function detectArena(bg: Gray): Arena {
  const { width, height } = bg;
  const best = segmentArena(bg);
  if (!best) {
    const m = 0.1;
    return { shape: "rect", rect: { x: width * m, y: height * m, w: width * (1 - 2 * m), h: height * (1 - 2 * m) } };
  }
  const { bbox, area } = best.blob;
  const fill = area / (bbox.w * bbox.h);
  const aspect = bbox.w / bbox.h;
  // A disc fills ~78.5% of its bounding square; a filled rectangle close to 100%.
  const round = fill > 0.68 && fill < 0.86 && aspect > 0.85 && aspect < 1.15;
  if (round) {
    const side = Math.max(bbox.w, bbox.h);
    const cx = bbox.x + bbox.w / 2;
    const cy = bbox.y + bbox.h / 2;
    return { shape: "circle", rect: { x: cx - side / 2, y: cy - side / 2, w: side, h: side } };
  }
  return { shape: "rect", rect: bbox };
}

export function arenaMask(arenaPoly: Point[], width: number, height: number, contains: (p: Point) => boolean): Uint8Array {
  const mask = new Uint8Array(width * height);
  const xs = arenaPoly.map((p) => p.x);
  const ys = arenaPoly.map((p) => p.y);
  const x0 = Math.max(0, Math.floor(Math.min(...xs)));
  const x1 = Math.min(width - 1, Math.ceil(Math.max(...xs)));
  const y0 = Math.max(0, Math.floor(Math.min(...ys)));
  const y1 = Math.min(height - 1, Math.ceil(Math.max(...ys)));
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) if (contains({ x, y })) mask[y * width + x] = 1;
  }
  return mask;
}

export type Detection = {
  found: boolean;
  x: number;
  y: number;
  area: number;
  theta?: number;
  majorR?: number;
  minorR?: number;
  bbox?: Rect;
};

/** Locates the animal in one frame; prefers the blob nearest the previous position. */
export function detectAnimal(
  frame: Gray,
  bg: Gray | null,
  mask: Uint8Array,
  settings: DetectionSettings,
  prev: Point | null,
): Detection {
  const { data, width, height } = frame;
  const fg = new Uint8Array(data.length);
  for (let i = 0; i < data.length; i++) {
    if (!mask[i]) continue;
    const v = data[i];
    if (settings.mode === "background") fg[i] = bg && Math.abs(v - bg.data[i]) > settings.threshold ? 1 : 0;
    else if (settings.mode === "dark") fg[i] = v < settings.threshold ? 1 : 0;
    else fg[i] = v > settings.threshold ? 1 : 0;
  }
  let blobs = findBlobs(denoise(fg, width, height), width, height, settings.minArea);

  // Fallback: If no blob found at user threshold, attempt automatic Otsu split on masked pixels
  if (blobs.length === 0 && settings.mode !== "background") {
    const t = otsuThreshold(data, mask);
    const adaptiveFg = new Uint8Array(data.length);
    for (let i = 0; i < data.length; i++) {
      if (!mask[i]) continue;
      const v = data[i];
      if (settings.mode === "dark") adaptiveFg[i] = v < Math.max(30, t - 10) ? 1 : 0;
      else adaptiveFg[i] = v > Math.min(225, t + 10) ? 1 : 0;
    }
    const fallbackBlobs = findBlobs(denoise(adaptiveFg, width, height), width, height, Math.max(8, Math.floor(settings.minArea / 2)));
    if (fallbackBlobs.length > 0) {
      blobs = fallbackBlobs;
    }
  }

  if (blobs.length === 0) return { found: false, x: prev?.x ?? 0, y: prev?.y ?? 0, area: 0 };
  const largest = blobs.reduce((a, b) => (b.area > a.area ? b : a));
  let pick = largest;
  if (prev) {
    // Keep identity: a nearby blob of reasonable size beats a slightly larger distant one.
    const scored = blobs
      .filter((b) => b.area > largest.area * 0.4)
      .map((b) => ({ b, d: Math.hypot(b.cx - prev.x, b.cy - prev.y) }));
    pick = scored.reduce((a, c) => (c.d < a.d ? c : a)).b;
  }
  return {
    found: true,
    x: pick.cx,
    y: pick.cy,
    area: pick.area,
    theta: pick.theta,
    majorR: pick.majorR,
    minorR: pick.minorR,
    bbox: pick.bbox,
  };
}
