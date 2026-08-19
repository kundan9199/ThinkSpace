/**
 * ThinkSpace — Canvas Geometry Utilities
 *
 * Hit testing, bounding boxes, and geometric helpers.
 * All coordinates are in WORLD space.
 */

import { CanvasElement, Point } from "@/types/canvas";
import { measureText } from "./text-measurement";

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Bounding Box Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns the axis-aligned bounding box for any canvas element.
 */
export function getElementBounds(element: CanvasElement): BoundingBox {
  if (element.type === "line" || element.type === "arrow") {
    const minX = Math.min(element.x, element.x2);
    const minY = Math.min(element.y, element.y2);
    const maxX = Math.max(element.x, element.x2);
    const maxY = Math.max(element.y, element.y2);
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
  }

  if (element.type === "freehand" && element.points.length > 0) {
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    for (const pt of element.points) {
      minX = Math.min(minX, pt.x);
      minY = Math.min(minY, pt.y);
      maxX = Math.max(maxX, pt.x);
      maxY = Math.max(maxY, pt.y);
    }
    return {
      x: minX,
      y: minY,
      width: maxX - minX || 1,
      height: maxY - minY || 1,
    };
  }

  return { x: element.x, y: element.y, width: element.width, height: element.height };
}

/**
 * Returns the unified bounding box encompassing all provided elements.
 */
export function getUnionBounds(elements: CanvasElement[]): BoundingBox | null {
  if (elements.length === 0) return null;

  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;

  for (const el of elements) {
    const b = getElementBounds(el);
    minX = Math.min(minX, b.x);
    minY = Math.min(minY, b.y);
    maxX = Math.max(maxX, b.x + b.width);
    maxY = Math.max(maxY, b.y + b.height);
  }

  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

// ─────────────────────────────────────────────────────────────────────────────
// Hit Testing
// ─────────────────────────────────────────────────────────────────────────────

const CLICK_TOLERANCE = 6; // world-space px tolerance for line/arrow/freehand

/** Distance from a point to a line segment. */
function pointToSegmentDist(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number
): number {
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - ax, py - ay);
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/**
 * Tests whether a world-space point hits a canvas element.
 */
export function hitTest(element: CanvasElement, worldX: number, worldY: number): boolean {
  // For rotated elements we transform the test point into the element's local space
  if (element.rotation && element.rotation !== 0) {
    const bounds = getElementBounds(element);
    const cx = bounds.x + bounds.width / 2;
    const cy = bounds.y + bounds.height / 2;
    const rad = (-element.rotation * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const tx = worldX - cx;
    const ty = worldY - cy;
    const localX = cx + tx * cos - ty * sin;
    const localY = cy + tx * sin + ty * cos;
    return hitTestLocal({ ...element, rotation: 0 }, localX, localY);
  }

  return hitTestLocal(element, worldX, worldY);
}

function hitTestLocal(element: CanvasElement, wx: number, wy: number): boolean {
  switch (element.type) {
    case "rectangle": {
      return (
        wx >= element.x &&
        wx <= element.x + element.width &&
        wy >= element.y &&
        wy <= element.y + element.height
      );
    }

    case "ellipse": {
      const rx = Math.abs(element.width) / 2;
      const ry = Math.abs(element.height) / 2;
      if (rx === 0 || ry === 0) return false;
      const cx = element.x + rx;
      const cy = element.y + ry;
      const dx = (wx - cx) / rx;
      const dy = (wy - cy) / ry;
      return dx * dx + dy * dy <= 1;
    }

    case "line":
    case "arrow": {
      return (
        pointToSegmentDist(wx, wy, element.x, element.y, element.x2, element.y2) <=
        CLICK_TOLERANCE + element.strokeWidth
      );
    }

    case "freehand": {
      if (element.points.length === 0) return false;
      for (let i = 0; i < element.points.length - 1; i++) {
        const d = pointToSegmentDist(
          wx,
          wy,
          element.points[i].x,
          element.points[i].y,
          element.points[i + 1].x,
          element.points[i + 1].y
        );
        if (d <= CLICK_TOLERANCE + element.strokeWidth) return true;
      }
      return false;
    }

    case "text": {
      return (
        wx >= element.x &&
        wx <= element.x + element.width &&
        wy >= element.y &&
        wy <= element.y + element.height
      );
    }
  }
}

/**
 * Returns the topmost element (highest zIndex) that the given world-space
 * point hits, or null if nothing is hit.
 */
export function hitTestAll(
  elements: CanvasElement[],
  worldX: number,
  worldY: number
): CanvasElement | null {
  // Iterate from highest to lowest zIndex
  const sorted = [...elements].sort((a, b) => b.zIndex - a.zIndex);
  for (const el of sorted) {
    if (hitTest(el, worldX, worldY)) return el;
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Selection Handle Geometry
// ─────────────────────────────────────────────────────────────────────────────

export const HANDLE_SIZE = 8; // world-space handle half-size
export const ROTATION_HANDLE_OFFSET = 28; // world-space distance above selection box

/** Corner/edge handles in normalised [0-1, 0-1] space relative to the bounding box. */
export type HandleId =
  | "tl"
  | "tm"
  | "tr"
  | "ml"
  | "mr"
  | "bl"
  | "bm"
  | "br"
  | "rotate";

export interface SelectionHandle {
  id: HandleId;
  x: number; // world x centre of handle
  y: number; // world y centre of handle
}

/**
 * Computes selection handles for a bounding box (in world space).
 */
export function getSelectionHandles(bounds: BoundingBox): SelectionHandle[] {
  const { x, y, width, height } = bounds;
  const cx = x + width / 2;
  const r = x + width;
  const b = y + height;
  const cy_mid = y + height / 2;

  return [
    { id: "tl", x, y },
    { id: "tm", x: cx, y },
    { id: "tr", x: r, y },
    { id: "ml", x, y: cy_mid },
    { id: "mr", x: r, y: cy_mid },
    { id: "bl", x, y: b },
    { id: "bm", x: cx, y: b },
    { id: "br", x: r, y: b },
    { id: "rotate", x: cx, y: y - ROTATION_HANDLE_OFFSET },
  ];
}

/**
 * Returns the handle that was hit, or null.
 */
export function hitTestHandles(
  handles: SelectionHandle[],
  worldX: number,
  worldY: number,
  handleSize: number = HANDLE_SIZE
): SelectionHandle | null {
  for (const h of handles) {
    if (Math.abs(worldX - h.x) <= handleSize && Math.abs(worldY - h.y) <= handleSize) {
      return h;
    }
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Transform Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns a new element translated by (dx, dy) in world space.
 */
export function translateElement(el: CanvasElement, dx: number, dy: number): CanvasElement {
  if (el.type === "line" || el.type === "arrow") {
    return { ...el, x: el.x + dx, y: el.y + dy, x2: el.x2 + dx, y2: el.y2 + dy };
  }
  if (el.type === "freehand") {
    return {
      ...el,
      x: el.x + dx,
      y: el.y + dy,
      points: el.points.map((p) => ({ x: p.x + dx, y: p.y + dy })),
    };
  }
  return { ...el, x: el.x + dx, y: el.y + dy };
}

/**
 * Returns a new element resized to the given bounding box, for resize handle drag.
 */
export function resizeElement(
  el: CanvasElement,
  handleId: HandleId,
  currentWorld: Point,
  originalBounds: BoundingBox,
  originalElements: Map<string, CanvasElement>
): CanvasElement {
  const orig = originalElements.get(el.id);
  if (!orig) return el;

  const { x: ox, y: oy, width: ow, height: oh } = originalBounds;

  // Compute new bounding box from handle drag
  let nx = ox,
    ny = oy,
    nw = ow,
    nh = oh;

  switch (handleId) {
    case "tl":
      nx = Math.min(currentWorld.x, ox + ow - 1);
      ny = Math.min(currentWorld.y, oy + oh - 1);
      nw = ox + ow - nx;
      nh = oy + oh - ny;
      break;
    case "tm":
      ny = Math.min(currentWorld.y, oy + oh - 1);
      nh = oy + oh - ny;
      break;
    case "tr":
      ny = Math.min(currentWorld.y, oy + oh - 1);
      nw = Math.max(1, currentWorld.x - ox);
      nh = oy + oh - ny;
      break;
    case "ml":
      nx = Math.min(currentWorld.x, ox + ow - 1);
      nw = ox + ow - nx;
      break;
    case "mr":
      nw = Math.max(1, currentWorld.x - ox);
      break;
    case "bl":
      nx = Math.min(currentWorld.x, ox + ow - 1);
      nw = ox + ow - nx;
      nh = Math.max(1, currentWorld.y - oy);
      break;
    case "bm":
      nh = Math.max(1, currentWorld.y - oy);
      break;
    case "br":
      nw = Math.max(1, currentWorld.x - ox);
      nh = Math.max(1, currentWorld.y - oy);
      break;
  }

  // Scale element within new bounding box
  const scaleX = ow > 0 ? nw / ow : 1;
  const scaleY = oh > 0 ? nh / oh : 1;

  if (orig.type === "line" || orig.type === "arrow") {
    // Scale endpoints relative to original bounding box origin
    const relX1 = orig.x - ox;
    const relY1 = orig.y - oy;
    const relX2 = orig.x2 - ox;
    const relY2 = orig.y2 - oy;
    return {
      ...orig,
      x: nx + relX1 * scaleX,
      y: ny + relY1 * scaleY,
      x2: nx + relX2 * scaleX,
      y2: ny + relY2 * scaleY,
      width: nw,
      height: nh,
    };
  }

  if (orig.type === "freehand") {
    const scaledPoints = orig.points.map((p) => ({
      x: nx + (p.x - ox) * scaleX,
      y: ny + (p.y - oy) * scaleY,
    }));
    return {
      ...orig,
      x: nx,
      y: ny,
      width: nw,
      height: nh,
      points: scaledPoints,
    };
  }

  if (orig.type === "text") {
    const scale = (scaleX + scaleY) / 2;
    const newFontSize = Math.max(8, Math.round(orig.fontSize * scale));
    const measured = measureText(
      orig.text,
      newFontSize,
      orig.fontFamily,
      orig.fontWeight
    );
    return {
      ...orig,
      x: nx,
      y: ny,
      fontSize: newFontSize,
      width: measured.width,
      height: measured.height,
      lineHeight: measured.lineHeight,
    };
  }

  return { ...orig, x: nx, y: ny, width: nw, height: nh };
}
