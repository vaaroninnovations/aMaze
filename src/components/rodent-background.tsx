import { useEffect, useRef } from "react";
import {
  DARK_PALETTE,
  LIGHT_PALETTE,
  drawRodent,
  drawTail,
  drawTrail,
  type RodentPose,
  type Vec,
} from "@/lib/rodent/draw-rodent.ts";

const TRAIL_FRAMES = 30;
const TAIL_SEGMENTS = 16;
const TAIL_SEG_LEN = 3.6;
const STOP_RADIUS = 36;
const MAX_SPEED = 6.5;
const MAX_TURN = 0.11;
const SCROLL_GAIN = 2.2;
const SCROLL_LIMIT = 360;
/** With no pointer activity for this long (or on touch screens), the rat explores on its own. */
const IDLE_MS = 3500;

const angleDiff = (a: number, b: number) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * Full-screen background canvas: a top-down rat that scurries toward the cursor, nudged
 * along the scroll direction, leaving a short fading trail. Purely decorative and click-through.
 */
export default function RodentBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Animation loop driving an external system (canvas + window events), so an effect is the right tool.
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let width = window.innerWidth;
    let height = window.innerHeight;
    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const cursor: Vec = { x: width * 0.5, y: height * 0.5 };
    let lastPointer = -Infinity;
    const wander: Vec = { x: width * 0.55, y: height * 0.8 };
    let nextWander = 0;
    let scrollOffset = 0;
    let lastScrollY = window.scrollY;
    const pose: RodentPose = {
      pos: { x: width * 0.2, y: height * 0.7 },
      heading: -0.4,
      speed: 0,
      gait: 0,
      headYaw: 0,
      twitch: 0,
      scale: width < 640 ? 0.85 : 1.1,
    };
    const trail: Vec[] = [];
    const tail: Vec[] = Array.from({ length: TAIL_SEGMENTS }, () => ({ ...pose.pos }));

    const onMove = (e: PointerEvent) => {
      cursor.x = e.clientX;
      cursor.y = e.clientY;
      lastPointer = performance.now();
    };
    const onScroll = () => {
      // Scrolling down pushes the target down (and vice versa) so the rat runs with the scroll.
      const dy = window.scrollY - lastScrollY;
      lastScrollY = window.scrollY;
      scrollOffset = clamp(scrollOffset + dy * SCROLL_GAIN, -SCROLL_LIMIT, SCROLL_LIMIT);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", resize);

    const step = (dt: number, now: number) => {
      scrollOffset *= Math.pow(0.93, dt);
      const idle = now - lastPointer > IDLE_MS;
      if (idle && now > nextWander) {
        wander.x = width * (0.08 + Math.random() * 0.84);
        wander.y = height * (0.12 + Math.random() * 0.8);
        nextWander = now + 2500 + Math.random() * 3000;
      }
      const goal = idle ? wander : cursor;
      const target = { x: goal.x, y: clamp(goal.y + scrollOffset, 24, height - 24) };
      const dx = target.x - pose.pos.x;
      const dy = target.y - pose.pos.y;
      const dist = Math.hypot(dx, dy);
      const moving = dist > STOP_RADIUS;
      if (moving) {
        const turn = angleDiff(Math.atan2(dy, dx), pose.heading);
        pose.heading += clamp(turn, -MAX_TURN * dt, MAX_TURN * dt);
        // Ease off on sharp turns so it arcs around instead of spinning on the spot.
        const wanted = Math.min(MAX_SPEED, 0.9 + (dist - STOP_RADIUS) * 0.05) * (1 - Math.min(Math.abs(turn) / Math.PI, 0.7));
        pose.speed += (wanted - pose.speed) * 0.12 * dt;
      } else {
        pose.speed *= Math.pow(0.82, dt);
      }
      if (reducedMotion) pose.speed = 0;
      pose.pos.x += Math.cos(pose.heading) * pose.speed * dt;
      pose.pos.y += Math.sin(pose.heading) * pose.speed * dt;
      pose.gait += pose.speed * 0.3 * dt;
      // Sniffs around while idle; head steadies when running.
      const resting = 1 - Math.min(pose.speed / 2, 1);
      pose.headYaw = Math.sin(now * 0.004) * 0.22 * resting + Math.sin(pose.gait * 0.5) * 0.05;
      pose.twitch = Math.sin(now * 0.03) * (0.4 + resting * 0.6);

      trail.push({ ...pose.pos });
      if (trail.length > TRAIL_FRAMES) trail.shift();

      // Tail: anchored at the rump, each segment follows the previous one at fixed length.
      const rump = 22 * pose.scale;
      const wag = Math.sin(pose.gait * 0.5) * 0.25;
      tail[0] = {
        x: pose.pos.x - Math.cos(pose.heading + wag * 0.2) * rump,
        y: pose.pos.y - Math.sin(pose.heading + wag * 0.2) * rump,
      };
      for (let i = 1; i < tail.length; i++) {
        const prev = tail[i - 1];
        const vx = tail[i].x - prev.x;
        const vy = tail[i].y - prev.y;
        const len = Math.hypot(vx, vy) || 1;
        const seg = TAIL_SEG_LEN * pose.scale;
        tail[i] = { x: prev.x + (vx / len) * seg, y: prev.y + (vy / len) * seg };
      }
    };

    let raf = 0;
    let last = performance.now();
    const frame = (now: number) => {
      const dt = Math.min((now - last) / 16.67, 3);
      last = now;
      step(dt, now);
      const palette = document.documentElement.classList.contains("dark") ? DARK_PALETTE : LIGHT_PALETTE;
      ctx.clearRect(0, 0, width, height);
      drawTrail(ctx, trail, palette);
      drawTail(ctx, tail, palette, pose.scale);
      drawRodent(ctx, pose, palette);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 h-full w-full" />;
}
