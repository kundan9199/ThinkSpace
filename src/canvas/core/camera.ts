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
 * Calculates new zoom and pan offsets so that zooming occurs
 * around the specified screen cursor coordinate.
 */
export function zoomAtPoint(
  screenX: number,
  screenY: number,
  zoomFactor: number,
  viewport: ViewportState,
  minZoom = 0.1,
  maxZoom = 10.0
): { zoom: number; panX: number; panY: number } {
  const { zoom: currentZoom } = viewport;
  const worldPoint = screenToWorld(screenX, screenY, viewport);
  const targetZoom = currentZoom * zoomFactor;
  const newZoom = Math.min(maxZoom, Math.max(minZoom, targetZoom));

  const newPanX = screenX - worldPoint.x * newZoom;
  const newPanY = screenY - worldPoint.y * newZoom;

  return {
    zoom: newZoom,
    panX: newPanX,
    panY: newPanY,
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
