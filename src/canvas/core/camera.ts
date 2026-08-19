import { Point, ViewportState } from "@/types/canvas";

/**
 * Converts screen coordinates (mouse pointer/touch on canvas element)
 * to world coordinates in the canvas scene model.
 */
export function screenToWorld(
  screenX: number,
  screenY: number,
  viewport: ViewportState
): Point {
  const { zoom, panX, panY } = viewport;
  return {
    x: (screenX - panX) / zoom,
    y: (screenY - panY) / zoom,
  };
}

/**
 * Converts world coordinates in the scene model to screen pixel coordinates.
 */
export function worldToScreen(
  worldX: number,
  worldY: number,
  viewport: ViewportState
): Point {
  const { zoom, panX, panY } = viewport;
  return {
    x: worldX * zoom + panX,
    y: worldY * zoom + panY,
  };
}

/**
 * Applies the camera matrix (devicePixelRatio scaling, pan offset, zoom)
 * to the Canvas 2D rendering context.
 */
export function applyCameraTransform(
  ctx: CanvasRenderingContext2D,
  viewport: ViewportState
): void {
  const { zoom, panX, panY, dpr } = viewport;

  // Clear transformation matrix to identity
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  // Scale for high-DPI retina screens
  ctx.scale(dpr, dpr);

  // Translate pan offset and scale by zoom level
  ctx.translate(panX, panY);
  ctx.scale(zoom, zoom);
}
