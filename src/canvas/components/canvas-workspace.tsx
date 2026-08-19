"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { useCanvasStore } from "@/store/canvas/canvas-store";
import { CanvasRenderer } from "../rendering/canvas-renderer";
import { screenToWorld, zoomAtPoint } from "../core/camera";
import { ToolType, CanvasElement, Point } from "@/types/canvas";
import { BoardDetails } from "@/lib/board/actions";
import {
  MousePointer,
  Hand,
  Square,
  Circle,
  Minus,
  ArrowUpRight,
  Pencil,
  Type,
  Eraser,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Layers,
} from "lucide-react";

export interface CanvasWorkspaceProps {
  board: BoardDetails;
}

const TOOLS: Array<{ type: ToolType; label: string; icon: React.ReactNode }> = [
  { type: "select", label: "Select (V)", icon: <MousePointer className="h-4 w-4" /> },
  { type: "hand", label: "Hand / Pan (H)", icon: <Hand className="h-4 w-4" /> },
  { type: "rectangle", label: "Rectangle (R)", icon: <Square className="h-4 w-4" /> },
  { type: "ellipse", label: "Ellipse (E)", icon: <Circle className="h-4 w-4" /> },
  { type: "line", label: "Line (L)", icon: <Minus className="h-4 w-4" /> },
  { type: "arrow", label: "Arrow (A)", icon: <ArrowUpRight className="h-4 w-4" /> },
  { type: "freehand", label: "Pencil (P)", icon: <Pencil className="h-4 w-4" /> },
  { type: "text", label: "Text (T)", icon: <Type className="h-4 w-4" /> },
  { type: "eraser", label: "Eraser (E)", icon: <Eraser className="h-4 w-4" /> },
];

export function CanvasWorkspace({ board }: CanvasWorkspaceProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<CanvasRenderer | null>(null);

  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });

  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [isPanning, setIsPanning] = useState(false);

  // Interaction Refs (decoupled from React render cycles for 60fps performance)
  const isDrawingRef = useRef(false);
  const isPanningRef = useRef(false);
  const panStartRef = useRef<{ pointerX: number; pointerY: number; panX: number; panY: number }>({
    pointerX: 0,
    pointerY: 0,
    panX: 0,
    panY: 0,
  });
  const dragStartWorldRef = useRef<Point | null>(null);
  const previewElementRef = useRef<CanvasElement | null>(null);

  // Canvas Store State & Actions
  const elements = useCanvasStore((s) => s.elements);
  const selectedElementIds = useCanvasStore((s) => s.selectedElementIds);
  const activeTool = useCanvasStore((s) => s.activeTool);
  const viewport = useCanvasStore((s) => s.viewport);

  const addElement = useCanvasStore((s) => s.addElement);
  const setActiveTool = useCanvasStore((s) => s.setActiveTool);
  const setViewport = useCanvasStore((s) => s.setViewport);
  const resetViewport = useCanvasStore((s) => s.resetViewport);

  // 1. Attach/detach Canvas Renderer instance on mount/unmount
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const renderer = new CanvasRenderer();
    renderer.attach(canvas);
    rendererRef.current = renderer;

    return () => {
      renderer.detach();
      rendererRef.current = null;
    };
  }, []);

  // 2. Container ResizeObserver: Updates dimensions and DPR only when values actually change
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleResize = () => {
      const rect = container.getBoundingClientRect();
      const newWidth = Math.floor(rect.width);
      const newHeight = Math.floor(rect.height);
      const dpr = window.devicePixelRatio || 1;

      if (newWidth <= 0 || newHeight <= 0) return;

      // Only update dimensions state if actually changed
      setDimensions((prev) => {
        if (prev.width === newWidth && prev.height === newHeight) {
          return prev;
        }
        return { width: newWidth, height: newHeight };
      });

      // Only update dpr in store if changed
      if (useCanvasStore.getState().viewport.dpr !== dpr) {
        setViewport({ dpr });
      }

      // Resize backing canvas buffer
      if (rendererRef.current) {
        rendererRef.current.resize(newWidth, newHeight, dpr);
        rendererRef.current.requestRender(
          useCanvasStore.getState().elements,
          useCanvasStore.getState().selectedElementIds,
          useCanvasStore.getState().viewport,
          newWidth,
          newHeight,
          previewElementRef.current
        );
      }
    };

    handleResize();

    const observer = new ResizeObserver(() => {
      handleResize();
    });

    observer.observe(container);

    return () => {
      observer.disconnect();
    };
  }, [setViewport]);

  // 3. Render Trigger Effect: Re-render when elements, selection, viewport, or dimensions change
  useEffect(() => {
    if (rendererRef.current && dimensions.width > 0 && dimensions.height > 0) {
      rendererRef.current.requestRender(
        elements,
        selectedElementIds,
        viewport,
        dimensions.width,
        dimensions.height,
        previewElementRef.current
      );
    }
  }, [elements, selectedElementIds, viewport, dimensions]);

  // 4. Spacebar Key Listeners for Quick Pan Toggle
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && !isSpacePressed && document.activeElement?.tagName !== "INPUT") {
        e.preventDefault();
        setIsSpacePressed(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        setIsSpacePressed(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [isSpacePressed]);

  // 5. Wheel Zoom Listener (Cursor-centered zoom)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();

      const rect = canvas.getBoundingClientRect();
      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;

      const currentViewport = useCanvasStore.getState().viewport;
      const zoomFactor = e.deltaY < 0 ? 1.1 : 1 / 1.1;

      const updatedViewport = zoomAtPoint(
        screenX,
        screenY,
        zoomFactor,
        currentViewport,
        0.1,
        10.0
      );

      setViewport(updatedViewport);
    };

    canvas.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      canvas.removeEventListener("wheel", handleWheel);
    };
  }, [setViewport]);

  // Helper to trigger direct canvas render pass during drag interactions
  const triggerImmediateRender = useCallback(() => {
    if (rendererRef.current && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      rendererRef.current.requestRender(
        useCanvasStore.getState().elements,
        useCanvasStore.getState().selectedElementIds,
        useCanvasStore.getState().viewport,
        rect.width,
        rect.height,
        previewElementRef.current
      );
    }
  }, []);

  // 6. Pointer Event Handlers for Panning & Shape Tool Drawing
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const isMiddleButton = e.button === 1;
    const isHandTool = activeTool === "hand" || isSpacePressed;
    const isPrimaryButton = e.button === 0;

    // Pan Initiation
    if (isMiddleButton || (isHandTool && isPrimaryButton)) {
      e.preventDefault();
      canvas.setPointerCapture(e.pointerId);

      isPanningRef.current = true;
      setIsPanning(true);
      panStartRef.current = {
        pointerX: e.clientX,
        pointerY: e.clientY,
        panX: viewport.panX,
        panY: viewport.panY,
      };
      return;
    }

    // Shape Tool Initiation
    if (isPrimaryButton && ["rectangle", "ellipse", "line", "arrow"].includes(activeTool)) {
      e.preventDefault();
      canvas.setPointerCapture(e.pointerId);

      const rect = canvas.getBoundingClientRect();
      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;
      const startWorld = screenToWorld(screenX, screenY, viewport);

      isDrawingRef.current = true;
      dragStartWorldRef.current = startWorld;
      previewElementRef.current = null;
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Active Panning Drag
    if (isPanningRef.current) {
      const dx = e.clientX - panStartRef.current.pointerX;
      const dy = e.clientY - panStartRef.current.pointerY;

      setViewport({
        panX: panStartRef.current.panX + dx,
        panY: panStartRef.current.panY + dy,
      });
      return;
    }

    // Active Shape Drawing Drag
    if (isDrawingRef.current && dragStartWorldRef.current) {
      const rect = canvas.getBoundingClientRect();
      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;
      const currentWorld = screenToWorld(screenX, screenY, viewport);
      const startWorld = dragStartWorldRef.current;

      const strokeColor = "#3b82f6"; // ThinkSpace accent blue
      const backgroundColor = "rgba(59, 130, 246, 0.12)";
      const strokeWidth = 2;
      const now = Date.now();
      const nextZIndex = elements.length + 1;

      if (activeTool === "rectangle") {
        const x = Math.min(startWorld.x, currentWorld.x);
        const y = Math.min(startWorld.y, currentWorld.y);
        const width = Math.abs(currentWorld.x - startWorld.x);
        const height = Math.abs(currentWorld.y - startWorld.y);

        previewElementRef.current = {
          id: "preview-temp",
          type: "rectangle",
          x,
          y,
          width,
          height,
          rotation: 0,
          strokeColor,
          backgroundColor,
          strokeWidth,
          opacity: 1,
          zIndex: nextZIndex,
          cornerRadius: 8,
          createdAt: now,
          updatedAt: now,
        };
      } else if (activeTool === "ellipse") {
        const x = Math.min(startWorld.x, currentWorld.x);
        const y = Math.min(startWorld.y, currentWorld.y);
        const width = Math.abs(currentWorld.x - startWorld.x);
        const height = Math.abs(currentWorld.y - startWorld.y);

        previewElementRef.current = {
          id: "preview-temp",
          type: "ellipse",
          x,
          y,
          width,
          height,
          rotation: 0,
          strokeColor,
          backgroundColor,
          strokeWidth,
          opacity: 1,
          zIndex: nextZIndex,
          createdAt: now,
          updatedAt: now,
        };
      } else if (activeTool === "line") {
        const width = Math.abs(currentWorld.x - startWorld.x);
        const height = Math.abs(currentWorld.y - startWorld.y);

        previewElementRef.current = {
          id: "preview-temp",
          type: "line",
          x: startWorld.x,
          y: startWorld.y,
          x2: currentWorld.x,
          y2: currentWorld.y,
          width,
          height,
          rotation: 0,
          strokeColor,
          backgroundColor: "transparent",
          strokeWidth,
          opacity: 1,
          zIndex: nextZIndex,
          createdAt: now,
          updatedAt: now,
        };
      } else if (activeTool === "arrow") {
        const width = Math.abs(currentWorld.x - startWorld.x);
        const height = Math.abs(currentWorld.y - startWorld.y);

        previewElementRef.current = {
          id: "preview-temp",
          type: "arrow",
          x: startWorld.x,
          y: startWorld.y,
          x2: currentWorld.x,
          y2: currentWorld.y,
          width,
          height,
          rotation: 0,
          strokeColor,
          backgroundColor: strokeColor,
          strokeWidth,
          opacity: 1,
          zIndex: nextZIndex,
          headSize: 12,
          createdAt: now,
          updatedAt: now,
        };
      }

      triggerImmediateRender();
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;

    // End Panning Drag
    if (isPanningRef.current) {
      if (canvas && canvas.hasPointerCapture(e.pointerId)) {
        canvas.releasePointerCapture(e.pointerId);
      }
      isPanningRef.current = false;
      setIsPanning(false);
      return;
    }

    // Commit Drawn Shape Element
    if (isDrawingRef.current) {
      if (canvas && canvas.hasPointerCapture(e.pointerId)) {
        canvas.releasePointerCapture(e.pointerId);
      }

      const preview = previewElementRef.current;
      if (preview) {
        // Only add element if it has a non-trivial dimension (> 2px)
        let isValid = false;
        if (preview.type === "line" || preview.type === "arrow") {
          isValid = Math.hypot(preview.x2 - preview.x, preview.y2 - preview.y) > 2;
        } else {
          isValid = preview.width > 2 || preview.height > 2;
        }

        if (isValid) {
          const finalElement: CanvasElement = {
            ...preview,
            id: `el-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          };
          addElement(finalElement);
        }
      }

      isDrawingRef.current = false;
      dragStartWorldRef.current = null;
      previewElementRef.current = null;
      triggerImmediateRender();
    }
  };

  // Determine dynamic cursor based on state & active tool
  let cursorClass = "cursor-default";
  if (isPanning) {
    cursorClass = "cursor-grabbing";
  } else if (activeTool === "hand" || isSpacePressed) {
    cursorClass = "cursor-grab";
  } else if (["rectangle", "ellipse", "line", "arrow"].includes(activeTool)) {
    cursorClass = "cursor-crosshair";
  }

  return (
    <div
      ref={containerRef}
      className="relative flex-1 h-full w-full overflow-hidden bg-bg-primary select-none"
    >
      {/* Radial Grid Background Surface */}
      <div className="absolute inset-0 bg-[radial-gradient(hsla(0,0%,100%,0.05)_1px,transparent_1px)] [background-size:32px_32px] pointer-events-none" />

      {/* HTML5 2D Canvas Surface */}
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className={`absolute inset-0 block touch-none ${cursorClass}`}
      />

      {/* Floating Glassmorphism Main Toolbar HUD */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 rounded-2xl border border-border/80 bg-bg-secondary/80 backdrop-blur-xl p-1.5 shadow-2xl shadow-black/50">
        {TOOLS.map((tool) => {
          const isActive = activeTool === tool.type;
          return (
            <button
              key={tool.type}
              onClick={() => setActiveTool(tool.type)}
              title={tool.label}
              className={`flex h-9 w-9 items-center justify-center rounded-xl transition-all ${
                isActive
                  ? "bg-accent/20 text-accent border border-accent/40 shadow-accent shadow-sm"
                  : "text-text-secondary hover:bg-surface-glass-hover hover:text-text-primary"
              }`}
            >
              {tool.icon}
            </button>
          );
        })}
      </div>

      {/* Bottom Left: Board & Scene Info HUD */}
      <div className="absolute bottom-4 left-4 z-20 flex items-center gap-3">
        <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-bg-secondary/70 backdrop-blur-md px-3 py-1.5 text-xs text-text-muted font-mono shadow-lg">
          <Layers className="h-3.5 w-3.5 text-accent" />
          <span>{elements.length} {elements.length === 1 ? "Element" : "Elements"}</span>
          <span className="text-border">|</span>
          <span className="text-text-secondary">{board.title}</span>
        </div>
      </div>

      {/* Bottom Right: Zoom & Viewport Controls HUD */}
      <div className="absolute bottom-4 right-4 z-20 flex items-center gap-1.5 rounded-2xl border border-border/80 bg-bg-secondary/80 backdrop-blur-xl p-1.5 shadow-2xl shadow-black/50">
        <button
          onClick={() =>
            setViewport(
              zoomAtPoint(
                dimensions.width / 2,
                dimensions.height / 2,
                1 / 1.1,
                viewport,
                0.1,
                10.0
              )
            )
          }
          title="Zoom Out"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary hover:bg-surface-glass-hover hover:text-text-primary transition-all"
        >
          <ZoomOut className="h-4 w-4" />
        </button>

        <span className="w-12 text-center text-xs font-mono font-semibold text-text-primary">
          {Math.round(viewport.zoom * 100)}%
        </span>

        <button
          onClick={() =>
            setViewport(
              zoomAtPoint(
                dimensions.width / 2,
                dimensions.height / 2,
                1.1,
                viewport,
                0.1,
                10.0
              )
            )
          }
          title="Zoom In"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary hover:bg-surface-glass-hover hover:text-text-primary transition-all"
        >
          <ZoomIn className="h-4 w-4" />
        </button>

        <div className="h-4 w-px bg-border my-auto mx-0.5" />

        <button
          onClick={() => resetViewport()}
          title="Reset Viewport (Zoom 100%, Pan 0, 0)"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary hover:bg-surface-glass-hover hover:text-text-primary transition-all"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
