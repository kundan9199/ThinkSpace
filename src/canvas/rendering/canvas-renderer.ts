import { CanvasElement, ViewportState } from "@/types/canvas";
import { applyCameraTransform } from "../core/camera";
import { renderElement, renderSelectionBounds } from "./element-renderers";

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
   * Adjusts the canvas backing store resolution to match physical device pixels,
   * keeping the CSS display size sharp on Retina / High-DPI screens.
   */
  public resize(cssWidth: number, cssHeight: number, dpr: number): void {
    if (!this.canvas) return;

    // Set backing store dimensions in physical device pixels
    this.canvas.width = Math.floor(cssWidth * dpr);
    this.canvas.height = Math.floor(cssHeight * dpr);

    // Set CSS display style dimensions
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
    previewElement?: CanvasElement | null
  ): void {
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
    }

    this.animFrameId = requestAnimationFrame(() => {
      this.animFrameId = null;
      this.renderImmediate(elements, selectedIds, viewport, cssWidth, cssHeight, previewElement);
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
    previewElement?: CanvasElement | null
  ): void {
    if (!this.canvas || !this.ctx) return;

    const ctx = this.ctx;
    const { dpr } = viewport;

    // Clear entire backing canvas
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, cssWidth * dpr, cssHeight * dpr);

    // Draw background grid surface
    ctx.fillStyle = "#090d16"; // Dark background
    ctx.fillRect(0, 0, cssWidth * dpr, cssHeight * dpr);

    // Apply Camera Transform Matrix (DPR + Pan + Zoom)
    applyCameraTransform(ctx, viewport);

    // Sort elements by zIndex ascending
    const sortedElements = [...elements].sort((a, b) => a.zIndex - b.zIndex);

    // Render Scene Elements
    for (const element of sortedElements) {
      renderElement(ctx, element);
    }

    // Render Temporary Drag Preview Element if present
    if (previewElement) {
      renderElement(ctx, previewElement);
    }

    // Render Selection Bounds for selected elements
    if (selectedIds.length > 0) {
      const selectedSet = new Set(selectedIds);
      for (const element of sortedElements) {
        if (selectedSet.has(element.id)) {
          renderSelectionBounds(ctx, element);
        }
      }
    }
  }
}
