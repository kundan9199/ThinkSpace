/**
 * ThinkSpace — Canvas 2D High-Resolution PNG Export Engine
 *
 * Renders visible canvas content or selected elements into an offscreen canvas
 * at high DPI without capturing UI overlays, selection handles, or HUD controls.
 */

import { CanvasElement } from "@/types/canvas";
import { getUnionBounds } from "../geometry/geometry";
import { renderElement } from "../rendering/element-renderers";

export interface ExportCanvasOptions {
  elements: CanvasElement[];
  selectedIds?: string[];
  canvasBackgroundColor: string;
  onlySelected?: boolean;
  boardTitle?: string;
  scale?: number;
}

/**
 * Exports full canvas or selected elements as a high-resolution PNG image download.
 */
export async function exportCanvasToPng(options: ExportCanvasOptions): Promise<void> {
  const {
    elements,
    selectedIds = [],
    canvasBackgroundColor = "#090d16",
    onlySelected = false,
    boardTitle = "thinkspace",
    scale = 2,
  } = options;

  if (typeof document === "undefined") return;

  // Filter elements if exporting selection only
  const targetElements = onlySelected
    ? elements.filter((el) => selectedIds.includes(el.id))
    : elements;

  if (targetElements.length === 0) return;

  // Compute bounding box encompassing target elements
  const bounds = getUnionBounds(targetElements) || {
    x: 0,
    y: 0,
    width: 800,
    height: 600,
  };

  const PADDING = 48; // Padding around elements in world pixels
  const worldWidth = bounds.width + PADDING * 2;
  const worldHeight = bounds.height + PADDING * 2;

  // Enforce reasonable maximum canvas dimensions to prevent browser memory exhaustion
  const MAX_DIMENSION = 4096;
  const pixelWidth = Math.min(MAX_DIMENSION, Math.max(100, Math.round(worldWidth * scale)));
  const pixelHeight = Math.min(MAX_DIMENSION, Math.max(100, Math.round(worldHeight * scale)));

  // Actual scale used based on dimension clamping
  const actualScaleX = pixelWidth / worldWidth;
  const actualScaleY = pixelHeight / worldHeight;
  const effectiveScale = Math.min(actualScaleX, actualScaleY);

  const canvas = document.createElement("canvas");
  canvas.width = pixelWidth;
  canvas.height = pixelHeight;

  const ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) return;

  // 1. Fill canvas background
  ctx.fillStyle = canvasBackgroundColor || "#090d16";
  ctx.fillRect(0, 0, pixelWidth, pixelHeight);

  // 2. Set export transform (Scale + Translation relative to content bounds with padding)
  ctx.save();
  ctx.scale(effectiveScale, effectiveScale);
  ctx.translate(-bounds.x + PADDING, -bounds.y + PADDING);

  // 3. Sort elements by zIndex ascending
  const sorted = [...targetElements].sort((a, b) => a.zIndex - b.zIndex);

  // 4. Render elements cleanly using Canvas 2D renderers
  for (const element of sorted) {
    renderElement(ctx, element);
  }

  ctx.restore();

  // 5. Trigger download as PNG
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        resolve();
        return;
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const cleanTitle = (boardTitle || "thinkspace")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");

      link.download = `${cleanTitle || "thinkspace"}-${
        onlySelected ? "selection" : "canvas"
      }-${Date.now()}.png`;
      link.href = url;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setTimeout(() => {
        URL.revokeObjectURL(url);
        resolve();
      }, 1000);
    }, "image/png");
  });
}
