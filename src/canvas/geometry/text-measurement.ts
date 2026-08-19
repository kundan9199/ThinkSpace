/**
 * ThinkSpace — Text Measurement Utility
 *
 * Measures multiline text dimensions using an offscreen Canvas 2D context.
 * Provides accurate bounding boxes for text rendering, selection, and hit testing.
 */

export interface TextDimensions {
  width: number;
  height: number;
  lines: string[];
  lineHeight: number;
}

let offscreenCtx: CanvasRenderingContext2D | null = null;

function getOffscreenContext(): CanvasRenderingContext2D | null {
  if (typeof window === "undefined") return null;
  if (!offscreenCtx) {
    const canvas = document.createElement("canvas");
    offscreenCtx = canvas.getContext("2d");
  }
  return offscreenCtx;
}

/**
 * Calculates line height, line widths, total width, and total height
 * for single or multiline text.
 */
export function measureText(
  text: string,
  fontSize: number = 20,
  fontFamily: string = "Inter, sans-serif",
  fontWeight: string = "normal",
  italic: boolean = false
): TextDimensions {
  const lines = text.split("\n");
  const lineHeight = Math.round(fontSize * 1.25);
  const minWidth = 24;
  const minHeight = lineHeight;
  const fontStyle = italic ? "italic" : "normal";

  const ctx = getOffscreenContext();
  if (!ctx) {
    // Fallback if canvas context is not available
    const estimatedWidth = Math.max(
      minWidth,
      ...lines.map((line) => line.length * fontSize * 0.6)
    );
    const estimatedHeight = Math.max(minHeight, lines.length * lineHeight);
    return {
      width: estimatedWidth,
      height: estimatedHeight,
      lines,
      lineHeight,
    };
  }

  ctx.save();
  ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;

  let maxWidth = 0;
  for (const line of lines) {
    const metrics = ctx.measureText(line);
    if (metrics.width > maxWidth) {
      maxWidth = metrics.width;
    }
  }

  ctx.restore();

  const finalWidth = Math.max(minWidth, Math.ceil(maxWidth));
  const finalHeight = Math.max(minHeight, lines.length * lineHeight);

  return {
    width: finalWidth,
    height: finalHeight,
    lines,
    lineHeight,
  };
}
