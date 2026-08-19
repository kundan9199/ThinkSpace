import {
  CanvasElement,
  RectangleElement,
  EllipseElement,
  LineElement,
  ArrowElement,
  FreehandElement,
  TextElement,
} from "@/types/canvas";
import { renderFreehandStroke } from "./freehand-renderer";

export function renderRectangle(
  ctx: CanvasRenderingContext2D,
  element: RectangleElement
): void {
  const { x, y, width, height, cornerRadius, strokeColor, backgroundColor, strokeWidth, opacity } = element;

  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.strokeStyle = strokeColor;
  ctx.fillStyle = backgroundColor;
  ctx.lineWidth = strokeWidth;

  ctx.beginPath();
  if (cornerRadius && cornerRadius > 0 && typeof ctx.roundRect === "function") {
    ctx.roundRect(x, y, width, height, cornerRadius);
  } else {
    ctx.rect(x, y, width, height);
  }

  if (backgroundColor && backgroundColor !== "transparent") {
    ctx.fill();
  }
  if (strokeWidth > 0 && strokeColor && strokeColor !== "transparent") {
    ctx.stroke();
  }

  ctx.restore();
}

export function renderEllipse(
  ctx: CanvasRenderingContext2D,
  element: EllipseElement
): void {
  const { x, y, width, height, strokeColor, backgroundColor, strokeWidth, opacity } = element;

  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.strokeStyle = strokeColor;
  ctx.fillStyle = backgroundColor;
  ctx.lineWidth = strokeWidth;

  const rx = Math.abs(width) / 2;
  const ry = Math.abs(height) / 2;
  const cx = x + rx;
  const cy = y + ry;

  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, 2 * Math.PI);

  if (backgroundColor && backgroundColor !== "transparent") {
    ctx.fill();
  }
  if (strokeWidth > 0 && strokeColor && strokeColor !== "transparent") {
    ctx.stroke();
  }

  ctx.restore();
}

export function renderLine(
  ctx: CanvasRenderingContext2D,
  element: LineElement
): void {
  const { x, y, x2, y2, strokeColor, strokeWidth, opacity } = element;

  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = strokeWidth;
  ctx.lineCap = "round";

  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x2, y2);
  ctx.stroke();

  ctx.restore();
}

export function renderArrow(
  ctx: CanvasRenderingContext2D,
  element: ArrowElement
): void {
  const { x, y, x2, y2, strokeColor, strokeWidth, opacity, headSize = 12 } = element;

  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.strokeStyle = strokeColor;
  ctx.fillStyle = strokeColor;
  ctx.lineWidth = strokeWidth;
  ctx.lineCap = "round";

  // Draw main shaft
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x2, y2);
  ctx.stroke();

  // Draw arrowhead
  const angle = Math.atan2(y2 - y, x2 - x);
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(
    x2 - headSize * Math.cos(angle - Math.PI / 6),
    y2 - headSize * Math.sin(angle - Math.PI / 6)
  );
  ctx.lineTo(
    x2 - headSize * Math.cos(angle + Math.PI / 6),
    y2 - headSize * Math.sin(angle + Math.PI / 6)
  );
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

export function renderFreehand(
  ctx: CanvasRenderingContext2D,
  element: FreehandElement
): void {
  if (!element.points || element.points.length === 0) return;

  renderFreehandStroke(ctx, element.points, {
    strokeColor: element.strokeColor,
    strokeWidth: element.strokeWidth,
    opacity: element.opacity,
  });
}

export function renderText(
  ctx: CanvasRenderingContext2D,
  element: TextElement
): void {
  const { x, y, text, fontSize, fontFamily, strokeColor, opacity, textAlign = "left" } = element;

  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.fillStyle = strokeColor;
  ctx.font = `${fontSize}px ${fontFamily}`;
  ctx.textAlign = textAlign;
  ctx.textBaseline = "top";

  ctx.fillText(text, x, y);
  ctx.restore();
}

export function renderElement(
  ctx: CanvasRenderingContext2D,
  element: CanvasElement
): void {
  // Apply rotation if non-zero
  if (element.rotation && element.rotation !== 0) {
    ctx.save();
    const cx = element.x + element.width / 2;
    const cy = element.y + element.height / 2;
    ctx.translate(cx, cy);
    ctx.rotate((element.rotation * Math.PI) / 180);
    ctx.translate(-cx, -cy);
  }

  switch (element.type) {
    case "rectangle":
      renderRectangle(ctx, element);
      break;
    case "ellipse":
      renderEllipse(ctx, element);
      break;
    case "line":
      renderLine(ctx, element);
      break;
    case "arrow":
      renderArrow(ctx, element);
      break;
    case "freehand":
      renderFreehand(ctx, element);
      break;
    case "text":
      renderText(ctx, element);
      break;
  }

  if (element.rotation && element.rotation !== 0) {
    ctx.restore();
  }
}

/**
 * Draws selection bounding box and handles for selected elements.
 */
export function renderSelectionBounds(
  ctx: CanvasRenderingContext2D,
  element: CanvasElement
): void {
  const padding = 6;
  const { x, y, width, height } = element;

  ctx.save();
  ctx.strokeStyle = "#3b82f6"; // ThinkSpace accent blue
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 4]);

  ctx.strokeRect(
    x - padding,
    y - padding,
    width + padding * 2,
    height + padding * 2
  );

  ctx.restore();
}
