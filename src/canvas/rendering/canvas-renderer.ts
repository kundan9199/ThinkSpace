import { CanvasElement, ViewportState } from "@/types/canvas";
import { applyCameraTransform } from "../core/camera";
import { renderElement } from "./element-renderers";
import {
  BoundingBox,
  SelectionHandle,
  HANDLE_SIZE,
  ROTATION_HANDLE_OFFSET,
} from "../geometry/geometry";
import { renderFreehandStroke } from "./freehand-renderer";
import { Point } from "@/types/canvas";

export class CanvasRenderer {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private animFrameId: number | null = null;

  public attach(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d", { alpha: true });
  }

  public detach(): void {
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    this.canvas = null;
    this.ctx = null;
  }

  /**
   * Adjusts the canvas backing store resolution to match physical device pixels.
   */
  public resize(cssWidth: number, cssHeight: number, dpr: number): void {
    if (!this.canvas) return;
    this.canvas.width = Math.floor(cssWidth * dpr);
    this.canvas.height = Math.floor(cssHeight * dpr);
    this.canvas.style.width = `${cssWidth}px`;
    this.canvas.style.height = `${cssHeight}px`;
  }

  /**
   * Triggers a non-blocking redraw using requestAnimationFrame.
   */
  public requestRender(
    elements: CanvasElement[],
    selectedIds: string[],
    viewport: ViewportState,
    cssWidth: number,
    cssHeight: number,
    previewElement?: CanvasElement | null,
    selectionBounds?: BoundingBox | null,
    selectionHandles?: SelectionHandle[] | null,
    freehandPreviewPoints?: Point[] | null
  ): void {
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
    }

    this.animFrameId = requestAnimationFrame(() => {
      this.animFrameId = null;
      this.renderImmediate(
        elements,
        selectedIds,
        viewport,
        cssWidth,
        cssHeight,
        previewElement,
        selectionBounds,
        selectionHandles,
        freehandPreviewPoints
      );
    });
  }

  /**
   * Performs the immediate 2D render loop execution.
   */
  public renderImmediate(
    elements: CanvasElement[],
    selectedIds: string[],
    viewport: ViewportState,
    cssWidth: number,
    cssHeight: number,
    previewElement?: CanvasElement | null,
    selectionBounds?: BoundingBox | null,
    selectionHandles?: SelectionHandle[] | null,
    freehandPreviewPoints?: Point[] | null
  ): void {
    if (!this.canvas || !this.ctx) return;

    const ctx = this.ctx;
    const { dpr } = viewport;

    // Clear entire backing canvas
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, cssWidth * dpr, cssHeight * dpr);

    // Fill background
    ctx.fillStyle = "#090d16";
    ctx.fillRect(0, 0, cssWidth * dpr, cssHeight * dpr);

    // Apply Camera Transform Matrix (DPR + Pan + Zoom)
    applyCameraTransform(ctx, viewport);

    // Sort elements by zIndex ascending
    const sortedElements = [...elements].sort((a, b) => a.zIndex - b.zIndex);

    // Render Scene Elements
    for (const element of sortedElements) {
      renderElement(ctx, element);
    }

    // Render Temporary Drag Preview Element
    if (previewElement) {
      renderElement(ctx, previewElement);
    }

    // Render Freehand Stroke Preview (live during drawing)
    if (freehandPreviewPoints && freehandPreviewPoints.length > 1) {
      renderFreehandStroke(ctx, freehandPreviewPoints, {
        strokeColor: "#3b82f6",
        strokeWidth: 3,
        opacity: 1,
      });
    }

    // Render Selection Bounds and Handles
    if (selectedIds.length > 0 && selectionBounds) {
      this.renderSelectionOverlay(ctx, selectionBounds, selectionHandles ?? []);
    }
  }

  private renderSelectionOverlay(
    ctx: CanvasRenderingContext2D,
    bounds: BoundingBox,
    handles: SelectionHandle[]
  ): void {
    const { x, y, width, height } = bounds;
    const PADDING = 6;

    // Selection bounding box
    ctx.save();
    ctx.strokeStyle = "#3b82f6";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 4]);
    ctx.strokeRect(x - PADDING, y - PADDING, width + PADDING * 2, height + PADDING * 2);
    ctx.restore();

    // Handles
    for (const handle of handles) {
      ctx.save();
      if (handle.id === "rotate") {
        // Rotation handle: filled circle
        ctx.beginPath();
        ctx.arc(handle.x, handle.y, HANDLE_SIZE * 0.7, 0, Math.PI * 2);
        ctx.fillStyle = "#3b82f6";
        ctx.fill();
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Connector line from top edge to rotation handle
        ctx.setLineDash([3, 3]);
        ctx.strokeStyle = "#3b82f680";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(handle.x, y - PADDING);
        ctx.lineTo(handle.x, handle.y + HANDLE_SIZE * 0.7);
        ctx.stroke();
      } else {
        // Resize handle: square
        ctx.fillStyle = "#fff";
        ctx.strokeStyle = "#3b82f6";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([]);
        ctx.fillRect(
          handle.x - HANDLE_SIZE,
          handle.y - HANDLE_SIZE,
          HANDLE_SIZE * 2,
          HANDLE_SIZE * 2
        );
        ctx.strokeRect(
          handle.x - HANDLE_SIZE,
          handle.y - HANDLE_SIZE,
          HANDLE_SIZE * 2,
          HANDLE_SIZE * 2
        );
      }
      ctx.restore();
    }

    // Reference to suppress unused import warning
    void ROTATION_HANDLE_OFFSET;
  }
}
