/**
 * ThinkSpace — Freehand Stroke Renderer
 *
 * Integrates `perfect-freehand` to generate smooth stroke outlines
 * from sampled world-space points, then renders them via Canvas 2D.
 */

import getStroke from "perfect-freehand";
import { Point } from "@/types/canvas";

export interface FreehandRenderOptions {
  strokeColor: string;
  strokeWidth: number;
  opacity: number;
}

/**
 * Converts perfect-freehand stroke output into a 2D SVG-style path
 * drawn on a Canvas 2D context.
 */
function strokeToPath(points: number[][]): Path2D {
  if (points.length === 0) return new Path2D();

  const path = new Path2D();
  const [first] = points;
  path.moveTo(first[0], first[1]);

  for (let i = 1; i < points.length - 1; i++) {
    const [x0, y0] = points[i];
    const [x1, y1] = points[i + 1];
    path.quadraticCurveTo(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2);
  }

  const [last] = points.slice(-1);
  path.lineTo(last[0], last[1]);
  path.closePath();

  return path;
}

/**
 * Renders a smooth freehand stroke from raw world-space points.
 * Called once per frame during preview and once at commit.
 */
export function renderFreehandStroke(
  ctx: CanvasRenderingContext2D,
  points: Point[],
  options: FreehandRenderOptions
): void {
  if (points.length === 0) return;

  const { strokeColor, strokeWidth, opacity } = options;

  const inputPoints: number[][] = points.map((p) => [p.x, p.y, 0.5]);

  const strokePoints = getStroke(inputPoints, {
    size: strokeWidth * 2.5,
    thinning: 0.5,
    smoothing: 0.5,
    streamline: 0.5,
    simulatePressure: true,
  });

  const path = strokeToPath(strokePoints);

  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.fillStyle = strokeColor;
  ctx.fill(path);
  ctx.restore();
}
