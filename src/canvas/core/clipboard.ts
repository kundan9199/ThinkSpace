/**
 * ThinkSpace — Canvas Clipboard & Element Cloning System
 *
 * Handles deep copying, duplicating, and pasting of canvas elements
 * with fresh unique IDs, translated positions, and preserved styles/metrics.
 */

import { CanvasElement, Point } from "@/types/canvas";

export interface CanvasClipboardData {
  type: "thinkspace/elements";
  version: 1;
  elements: CanvasElement[];
}

// In-memory clipboard store for guaranteed same-session copy/paste
let inMemoryClipboard: CanvasElement[] | null = null;
let pasteCount = 0;

/**
 * Generates a unique element ID.
 */
export function generateElementId(): string {
  return `el-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
}

/**
 * Validates if an object is a well-formed CanvasElement.
 */
function isValidCanvasElement(obj: unknown): obj is CanvasElement {
  if (!obj || typeof obj !== "object") return false;
  const el = obj as Record<string, unknown>;
  const validTypes = ["rectangle", "ellipse", "line", "arrow", "freehand", "text"];
  return (
    typeof el.type === "string" &&
    validTypes.includes(el.type) &&
    typeof el.x === "number" &&
    !isNaN(el.x) &&
    typeof el.y === "number" &&
    !isNaN(el.y)
  );
}

/**
 * Clones elements with fresh unique IDs, offset coordinates, and preserved zIndex relationships.
 */
export function cloneElementsWithNewIds(
  elements: CanvasElement[],
  offset: Point = { x: 20, y: 20 },
  baseZIndex?: number
): CanvasElement[] {
  const now = Date.now();
  // Sort elements by relative zIndex
  const sorted = [...elements].sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));

  return sorted.map((el, index) => {
    const assignedZIndex =
      baseZIndex !== undefined ? baseZIndex + index + 1 : el.zIndex ?? index + 1;

    const baseClone = {
      ...el,
      id: generateElementId(),
      x: el.x + offset.x,
      y: el.y + offset.y,
      zIndex: assignedZIndex,
      createdAt: now,
      updatedAt: now,
    };

    if (el.type === "line" || el.type === "arrow") {
      return {
        ...baseClone,
        x2: el.x2 + offset.x,
        y2: el.y2 + offset.y,
      } as CanvasElement;
    }

    if (el.type === "freehand") {
      return {
        ...baseClone,
        points: (el.points || []).map((p) => ({
          x: p.x + offset.x,
          y: p.y + offset.y,
        })),
      } as CanvasElement;
    }

    return baseClone as CanvasElement;
  });
}

/**
 * Copies elements to internal memory and system clipboard if available.
 */
export async function copyElementsToClipboard(elements: CanvasElement[]): Promise<void> {
  if (!elements || elements.length === 0) return;

  pasteCount = 0;
  // Deep clone to prevent direct object mutations
  inMemoryClipboard = JSON.parse(JSON.stringify(elements));

  const payload: CanvasClipboardData = {
    type: "thinkspace/elements",
    version: 1,
    elements: inMemoryClipboard!,
  };

  try {
    if (typeof navigator !== "undefined" && navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(JSON.stringify(payload));
    }
  } catch {
    // Ignore clipboard write errors; inMemoryClipboard remains available
  }
}

/**
 * Reads elements from system clipboard or internal memory fallback.
 */
export async function getElementsFromClipboard(
  baseZIndex?: number
): Promise<CanvasElement[] | null> {
  pasteCount += 1;
  const currentOffset: Point = { x: 20 * pasteCount, y: 20 * pasteCount };

  // Try reading from system clipboard first
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard && navigator.clipboard.readText) {
      const text = await navigator.clipboard.readText();
      if (text && text.trim().startsWith("{")) {
        const parsed = JSON.parse(text);
        if (
          parsed &&
          typeof parsed === "object" &&
          parsed.type === "thinkspace/elements" &&
          parsed.version === 1 &&
          Array.isArray(parsed.elements) &&
          parsed.elements.length > 0 &&
          parsed.elements.every(isValidCanvasElement)
        ) {
          return cloneElementsWithNewIds(parsed.elements, currentOffset, baseZIndex);
        }
      }
    }
  } catch {
    // Fall through to in-memory clipboard if system clipboard fails or is blocked
  }

  // Fallback to internal clipboard buffer
  if (inMemoryClipboard && inMemoryClipboard.length > 0) {
    return cloneElementsWithNewIds(inMemoryClipboard, currentOffset, baseZIndex);
  }

  return null;
}
