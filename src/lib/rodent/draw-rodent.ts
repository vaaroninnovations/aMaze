/** Drawing helpers for the top-down rodent background animation (plain canvas 2D). */

export type Vec = { x: number; y: number };

export type RodentPalette = {
  body: string;
  bodyShade: string;
  paw: string;
  earOuter: string;
  earInner: string;
  eye: string;
  eyeGlint: string;
  nose: string;
  whisker: string;
  tail: string;
  trail: string;
  trailGlow: number;
};

export const LIGHT_PALETTE: RodentPalette = {
  body: "#2b2a2d",
  bodyShade: "#1c1b1e",
  paw: "#121114",
  earOuter: "#38363a",
  earInner: "#4d4548",
  eye: "#050505",
  eyeGlint: "rgba(255,255,255,0.55)",
  nose: "#151315",
  whisker: "rgba(20,20,22,0.55)",
  tail: "#3a3538",
  trail: "120,122,130",
  trailGlow: 0,
};

export const DARK_PALETTE: RodentPalette = {
  body: "#f5f2ee",
  bodyShade: "#e3ddd7",
  paw: "#f2c3cb",
  earOuter: "#f6c9d1",
  earInner: "#ee9aab",
  eye: "#c8344a",
  eyeGlint: "rgba(255,220,225,0.7)",
  nose: "#ef9fae",
  whisker: "rgba(255,255,255,0.6)",
  tail: "#efc7ce",
  trail: "255,255,255",
  trailGlow: 8,
};

export type RodentPose = {
  pos: Vec;
  heading: number;
  speed: number;
  /** Gait phase in radians; advances with distance travelled. */
  gait: number;
  /** Head yaw relative to the body (sniffing). */
  headYaw: number;
  /** Whisker twitch, -1..1. */
  twitch: number;
  scale: number;
};

function ellipse(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, fill: string) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
}

/** Fading path of the last positions: oldest point transparent, newest most visible. */
export function drawTrail(ctx: CanvasRenderingContext2D, trail: Vec[], p: RodentPalette) {
  if (trail.length < 3) return;
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  if (p.trailGlow) {
    ctx.shadowColor = `rgba(${p.trail},0.6)`;
    ctx.shadowBlur = p.trailGlow;
  }
  for (let i = 1; i < trail.length - 1; i++) {
    const t = i / (trail.length - 1);
    const a = trail[i - 1];
    const b = trail[i];
    const c = trail[i + 1];
    // Midpoint quadratic segments give a smooth curve through the samples.
    ctx.beginPath();
    ctx.moveTo((a.x + b.x) / 2, (a.y + b.y) / 2);
    ctx.quadraticCurveTo(b.x, b.y, (b.x + c.x) / 2, (b.y + c.y) / 2);
    ctx.strokeStyle = `rgba(${p.trail},${(t * t * 0.45).toFixed(3)})`;
    ctx.lineWidth = 1 + t * 2.2;
    ctx.stroke();
  }
  ctx.restore();
}

/** Tapered tail through follow-the-leader chain points (world coordinates). */
export function drawTail(ctx: CanvasRenderingContext2D, tail: Vec[], p: RodentPalette, scale: number) {
  ctx.save();
  ctx.lineCap = "round";
  ctx.strokeStyle = p.tail;
  for (let i = 1; i < tail.length; i++) {
    ctx.beginPath();
    ctx.moveTo(tail[i - 1].x, tail[i - 1].y);
    ctx.lineTo(tail[i].x, tail[i].y);
    ctx.lineWidth = Math.max(0.6, (1 - i / tail.length) * 4.2 * scale);
    ctx.stroke();
  }
  ctx.restore();
}

function drawPaws(ctx: CanvasRenderingContext2D, pose: RodentPose, p: RodentPalette) {
  const stride = 3.2 * Math.min(pose.speed / 2.5, 1);
  // Diagonal pairs move together (trot): front-left with back-right.
  const paws = [
    { x: 13, y: -8.5, phase: 0 },
    { x: 13, y: 8.5, phase: Math.PI },
    { x: -12, y: -10.5, phase: Math.PI },
    { x: -12, y: 10.5, phase: 0 },
  ];
  for (const paw of paws) {
    const off = Math.sin(pose.gait + paw.phase) * stride;
    ellipse(ctx, paw.x + off, paw.y, 3.2, 2.1, p.paw);
  }
}

function drawHead(ctx: CanvasRenderingContext2D, pose: RodentPose, p: RodentPalette) {
  ctx.save();
  ctx.translate(9, 0);
  ctx.rotate(pose.headYaw);
  // Ears sit behind the head so the skull overlaps them slightly.
  for (const side of [-1, 1]) {
    ellipse(ctx, 1.5, side * 7, 4.8, 4.3, p.earOuter);
    ellipse(ctx, 1.9, side * 7.2, 3, 2.6, p.earInner);
  }
  ellipse(ctx, 7, 0, 10, 7.6, p.body);
  ellipse(ctx, 14.5, 0, 6.5, 4.4, p.body);
  // Whiskers fan out from the muzzle and twitch.
  ctx.strokeStyle = p.whisker;
  ctx.lineWidth = 0.6;
  for (const side of [-1, 1]) {
    for (let k = 0; k < 3; k++) {
      const spread = 6 + k * 3.5 + pose.twitch * 1.5;
      ctx.beginPath();
      ctx.moveTo(17, side * 2.4);
      ctx.quadraticCurveTo(22, side * (3 + k * 2), 27 - k * 1.5, side * (2.5 + spread));
      ctx.stroke();
    }
  }
  for (const side of [-1, 1]) {
    ellipse(ctx, 9.5, side * 4.3, 1.7, 1.5, p.eye);
    ellipse(ctx, 10, side * 4.3 - 0.5, 0.55, 0.5, p.eyeGlint);
  }
  ellipse(ctx, 20.5, 0, 1.7, 1.5, p.nose);
  ctx.restore();
}

/** Body, paws and head in the rodent's local frame (x points forward). */
export function drawRodent(ctx: CanvasRenderingContext2D, pose: RodentPose, p: RodentPalette) {
  ctx.save();
  ctx.translate(pose.pos.x, pose.pos.y);
  ctx.rotate(pose.heading);
  ctx.scale(pose.scale, pose.scale);
  ctx.shadowColor = "rgba(0,0,0,0.18)";
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 3;
  drawPaws(ctx, pose, p);
  ctx.shadowColor = "transparent";
  // Slight lateral sway while running makes the gait read as scurrying.
  const sway = Math.sin(pose.gait) * 0.6 * Math.min(pose.speed / 2.5, 1);
  ellipse(ctx, -11, sway, 13.5, 12, p.bodyShade);
  ellipse(ctx, -2, 0, 19, 10.5, p.body);
  drawHead(ctx, pose, p);
  ctx.restore();
}
