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
import {
  applyStrokeStyle,
  createPRNG,
  getSeedFromId,
  drawSketchRect,
  drawSketchEllipse,
  drawSketchLine,
} from "./sketch-renderer";

export function renderRectangle(
  ctx: CanvasRenderingContext2D,
  element: RectangleElement
): void {
  const {
    id,
    x,
    y,
    width,
    height,
    cornerRadius: rawRadius,
    roundness,
    strokeColor,
    backgroundColor,
    strokeWidth,
    strokeStyle,
    sloppiness = "normal",
    opacity,
  } = element;

  ctx.save();
  ctx.globalAlpha = opacity;

  // Determine actual corner radius based on roundness/cornerRadius
  const cornerRadius =
    roundness === "sharp"
      ? 0
      : roundness === "rounded"
      ? (rawRadius && rawRadius > 0 ? rawRadius : 12)
      : (rawRadius ?? 0);

  // 1. Render Fill
  if (backgroundColor && backgroundColor !== "transparent") {
    ctx.fillStyle = backgroundColor;
    ctx.beginPath();
    if (cornerRadius > 0 && typeof ctx.roundRect === "function") {
      ctx.roundRect(x, y, width, height, cornerRadius);
    } else {
      ctx.rect(x, y, width, height);
    }
    ctx.fill();
  }

  // 2. Render Stroke Outline
  if (strokeWidth > 0 && strokeColor && strokeColor !== "transparent") {
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = strokeWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    applyStrokeStyle(ctx, strokeStyle, strokeWidth);

    const rand = createPRNG(getSeedFromId(id));
    drawSketchRect(ctx, x, y, width, height, cornerRadius, sloppiness, rand);
  }

  ctx.restore();
}

export function renderEllipse(
  ctx: CanvasRenderingContext2D,
  element: EllipseElement
): void {
  const {
    id,
    x,
    y,
    width,
    height,
    strokeColor,
    backgroundColor,
    strokeWidth,
    strokeStyle,
    sloppiness = "normal",
    opacity,
  } = element;

  ctx.save();
  ctx.globalAlpha = opacity;

  const rx = Math.abs(width) / 2;
  const ry = Math.abs(height) / 2;
  const cx = x + rx;
  const cy = y + ry;

  if (rx > 0 && ry > 0) {
    // 1. Render Fill
    if (backgroundColor && backgroundColor !== "transparent") {
      ctx.fillStyle = backgroundColor;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, 2 * Math.PI);
      ctx.fill();
    }

    // 2. Render Stroke
    if (strokeWidth > 0 && strokeColor && strokeColor !== "transparent") {
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = strokeWidth;
      applyStrokeStyle(ctx, strokeStyle, strokeWidth);

      const rand = createPRNG(getSeedFromId(id));
      drawSketchEllipse(ctx, cx, cy, rx, ry, sloppiness, rand);
    }
  }

  ctx.restore();
}

export function renderLine(
  ctx: CanvasRenderingContext2D,
  element: LineElement
): void {
  const {
    id,
    x,
    y,
    x2,
    y2,
    strokeColor,
    strokeWidth,
    strokeStyle,
    sloppiness = "normal",
    opacity,
  } = element;

  if (strokeWidth <= 0 || !strokeColor || strokeColor === "transparent") return;

  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = strokeWidth;
  ctx.lineCap = "round";
  applyStrokeStyle(ctx, strokeStyle, strokeWidth);

  const rand = createPRNG(getSeedFromId(id));
  drawSketchLine(ctx, x, y, x2, y2, sloppiness, rand);

  ctx.restore();
}

export function renderArrow(
  ctx: CanvasRenderingContext2D,
  element: ArrowElement
): void {
  const {
    id,
    x,
    y,
    x2,
    y2,
    strokeColor,
    strokeWidth,
    strokeStyle,
    sloppiness = "normal",
    opacity,
    headSize = 14,
  } = element;

  if (strokeWidth <= 0 || !strokeColor || strokeColor === "transparent") return;

  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.strokeStyle = strokeColor;
  ctx.fillStyle = strokeColor;
  ctx.lineWidth = strokeWidth;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  applyStrokeStyle(ctx, strokeStyle, strokeWidth);

  const rand = createPRNG(getSeedFromId(id));

  // Draw main shaft
  drawSketchLine(ctx, x, y, x2, y2, sloppiness, rand);

  // Draw arrowhead
  const angle = Math.atan2(y2 - y, x2 - x);
  const fin1X = x2 - headSize * Math.cos(angle - Math.PI / 6);
  const fin1Y = y2 - headSize * Math.sin(angle - Math.PI / 6);
  const fin2X = x2 - headSize * Math.cos(angle + Math.PI / 6);
  const fin2Y = y2 - headSize * Math.sin(angle + Math.PI / 6);

  if (sloppiness === "precise") {
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(fin1X, fin1Y);
    ctx.lineTo(fin2X, fin2Y);
    ctx.closePath();
    ctx.fill();
  } else {
    // Sketchy arrowhead
    drawSketchLine(ctx, x2, y2, fin1X, fin1Y, sloppiness, rand);
    drawSketchLine(ctx, x2, y2, fin2X, fin2Y, sloppiness, rand);
  }

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
  const {
    x,
    y,
    width,
    height,
    text,
    fontSize = 20,
    fontFamily = "Inter, sans-serif",
    fontWeight = "normal",
    italic = false,
    underline = false,
    strokeColor = "#f8fafc",
    backgroundColor,
    opacity = 1,
    textAlign = "left",
    lineHeight: customLineHeight,
  } = element;

  if (!text) return;

  ctx.save();
  ctx.globalAlpha = opacity;

  // 1. Render Background Box behind text (if specified and not transparent)
  if (backgroundColor && backgroundColor !== "transparent") {
    const PADDING = 4;
    ctx.fillStyle = backgroundColor;
    ctx.beginPath();
    if (typeof ctx.roundRect === "function") {
      ctx.roundRect(
        x - PADDING,
        y - PADDING,
        width + PADDING * 2,
        height + PADDING * 2,
        4
      );
    } else {
      ctx.rect(x - PADDING, y - PADDING, width + PADDING * 2, height + PADDING * 2);
    }
    ctx.fill();
  }

  // 2. Setup Font & Alignment
  const fontStyle = italic ? "italic" : "normal";
  ctx.fillStyle = strokeColor;
  ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;
  ctx.textAlign = textAlign;
  ctx.textBaseline = "top";

  const lineHeight = customLineHeight || Math.round(fontSize * 1.25);
  const lines = text.split("\n");

  // Calculate base X coordinate for each alignment mode
  let baseLineX = x;
  if (textAlign === "center") {
    baseLineX = x + width / 2;
  } else if (textAlign === "right") {
    baseLineX = x + width;
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineY = y + i * lineHeight;
    ctx.fillText(line, baseLineX, lineY);

    // 3. Draw Underline if enabled
    if (underline && line.length > 0) {
      const metrics = ctx.measureText(line);
      const lineWidth = metrics.width;
      let lineStartX = baseLineX;
      if (textAlign === "center") {
        lineStartX = baseLineX - lineWidth / 2;
      } else if (textAlign === "right") {
        lineStartX = baseLineX - lineWidth;
      }

      ctx.save();
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = Math.max(1, Math.round(fontSize / 15));
      ctx.beginPath();
      const underlineY = lineY + fontSize + 2;
      ctx.moveTo(lineStartX, underlineY);
      ctx.lineTo(lineStartX + lineWidth, underlineY);
      ctx.stroke();
      ctx.restore();
    }
  }

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
