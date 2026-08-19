/**
 * ThinkSpace — Deterministic Sketch & Rough Drawing Engine
 *
 * Provides hand-drawn sketch effects (precise, normal, sketchy) and
 * stroke style patterns (solid, dashed, dotted) using standard Canvas 2D.
 */

import { Sloppiness, StrokeStyle } from "@/types/canvas";

/**
 * Applies the stroke dash pattern based on the element's stroke style.
 */
export function applyStrokeStyle(
  ctx: CanvasRenderingContext2D,
  strokeStyle?: StrokeStyle,
  strokeWidth: number = 2
): void {
  switch (strokeStyle) {
    case "dashed": {
      const dash = Math.max(6, strokeWidth * 3 + 2);
      const gap = Math.max(4, strokeWidth * 2);
      ctx.setLineDash([dash, gap]);
      break;
    }
    case "dotted": {
      const dot = Math.max(2, strokeWidth);
      const gap = Math.max(4, strokeWidth * 2);
      ctx.setLineDash([dot, gap]);
      break;
    }
    case "solid":
    default: {
      ctx.setLineDash([]);
      break;
    }
  }
}

/**
 * Creates a fast, deterministic pseudo-random number generator from a seed number.
 */
export function createPRNG(seed: number): () => number {
  let s = Math.abs(seed | 0) % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/**
 * Computes a deterministic integer seed from an element id or coordinates.
 */
export function getSeedFromId(id: string, extra: number = 0): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash << 5) - hash + id.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) + extra || 12345;
}

/**
 * Draws a single or double sketchy line segment.
 */
export function drawSketchLine(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  sloppiness: Sloppiness = "normal",
  rand: () => number = Math.random
): void {
  if (sloppiness === "precise") {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    return;
  }

  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  if (len < 0.5) return;

  const nx = -dy / len;
  const ny = dx / len;

  const passes = sloppiness === "sketchy" ? 2 : 1;
  const maxWobble = sloppiness === "sketchy" ? 2.5 : 1.2;
  const overshoot = sloppiness === "sketchy" ? 3.0 : 1.0;

  for (let p = 0; p < passes; p++) {
    const startOvershoot = (rand() - 0.5) * overshoot;
    const endOvershoot = (rand() - 0.5) * overshoot;

    const sx = x1 - (dx / len) * startOvershoot;
    const sy = y1 - (dy / len) * startOvershoot;
    const ex = x2 + (dx / len) * endOvershoot;
    const ey = y2 + (dy / len) * endOvershoot;

    // Intermediate wobble control point
    const t = 0.3 + rand() * 0.4;
    const mx = sx + dx * t + nx * (rand() - 0.5) * maxWobble;
    const my = sy + dy * t + ny * (rand() - 0.5) * maxWobble;

    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.quadraticCurveTo(mx, my, ex, ey);
    ctx.stroke();
  }
}

/**
 * Draws a sketchy rectangle with optional corner radius.
 */
export function drawSketchRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  cornerRadius: number = 0,
  sloppiness: Sloppiness = "normal",
  rand: () => number = Math.random
): void {
  if (sloppiness === "precise" || (cornerRadius > 0 && typeof ctx.roundRect === "function")) {
    ctx.beginPath();
    if (cornerRadius > 0 && typeof ctx.roundRect === "function") {
      ctx.roundRect(x, y, width, height, cornerRadius);
    } else {
      ctx.rect(x, y, width, height);
    }
    ctx.stroke();
    return;
  }

  // Draw 4 rough sides with slight corner overshoots
  const x2 = x + width;
  const y2 = y + height;

  // Top side
  drawSketchLine(ctx, x, y, x2, y, sloppiness, rand);
  // Right side
  drawSketchLine(ctx, x2, y, x2, y2, sloppiness, rand);
  // Bottom side
  drawSketchLine(ctx, x2, y2, x, y2, sloppiness, rand);
  // Left side
  drawSketchLine(ctx, x, y2, x, y, sloppiness, rand);
}

/**
 * Draws a sketchy ellipse.
 */
export function drawSketchEllipse(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  sloppiness: Sloppiness = "normal",
  rand: () => number = Math.random
): void {
  if (rx <= 0 || ry <= 0) return;

  if (sloppiness === "precise") {
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.stroke();
    return;
  }

  const passes = sloppiness === "sketchy" ? 2 : 1;
  const jitter = sloppiness === "sketchy" ? 1.8 : 0.8;

  for (let p = 0; p < passes; p++) {
    const ocx = cx + (rand() - 0.5) * jitter;
    const ocy = cy + (rand() - 0.5) * jitter;
    const orx = Math.max(1, rx + (rand() - 0.5) * jitter);
    const ory = Math.max(1, ry + (rand() - 0.5) * jitter);
    const startAngle = (rand() - 0.5) * 0.3;
    const endAngle = Math.PI * 2 + (rand() - 0.2) * 0.35;

    ctx.beginPath();
    ctx.ellipse(ocx, ocy, orx, ory, 0, startAngle, endAngle);
    ctx.stroke();
  }
}
