"use client";

import React, { useEffect, useRef, useState } from "react";
import { useCanvasStore } from "@/store/canvas/canvas-store";
import { CanvasRenderer } from "../rendering/canvas-renderer";
import { ToolType, CanvasElement } from "@/types/canvas";
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

  // Canvas Store State
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

  // 2. Initialize test element on mount if store is empty
  useEffect(() => {
    if (useCanvasStore.getState().elements.length === 0) {
      const testRectangle: CanvasElement = {
        id: "test-rect-1",
        type: "rectangle",
        x: 150,
        y: 120,
        width: 280,
        height: 180,
        rotation: 0,
        strokeColor: "#3b82f6", // ThinkSpace accent blue
        backgroundColor: "rgba(59, 130, 246, 0.12)",
        strokeWidth: 2,
        opacity: 1,
        zIndex: 1,
        cornerRadius: 12,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      addElement(testRectangle);
    }
  }, [addElement]);

  // 3. Container ResizeObserver: Updates dimensions and DPR only when values actually change
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
          newHeight
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

  // 4. Render Trigger Effect: Re-render when elements, selection, viewport, or dimensions change
  useEffect(() => {
    if (rendererRef.current && dimensions.width > 0 && dimensions.height > 0) {
      rendererRef.current.requestRender(
        elements,
        selectedElementIds,
        viewport,
        dimensions.width,
        dimensions.height
      );
    }
  }, [elements, selectedElementIds, viewport, dimensions]);

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
        className="absolute inset-0 block touch-none cursor-default"
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
          onClick={() => setViewport({ zoom: Math.max(0.2, viewport.zoom - 0.1) })}
          title="Zoom Out"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary hover:bg-surface-glass-hover hover:text-text-primary transition-all"
        >
          <ZoomOut className="h-4 w-4" />
        </button>

        <span className="w-12 text-center text-xs font-mono font-semibold text-text-primary">
          {Math.round(viewport.zoom * 100)}%
        </span>

        <button
          onClick={() => setViewport({ zoom: Math.min(5, viewport.zoom + 0.1) })}
          title="Zoom In"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary hover:bg-surface-glass-hover hover:text-text-primary transition-all"
        >
          <ZoomIn className="h-4 w-4" />
        </button>

        <div className="h-4 w-px bg-border my-auto mx-0.5" />

        <button
          onClick={() => resetViewport()}
          title="Reset Zoom & Pan"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary hover:bg-surface-glass-hover hover:text-text-primary transition-all"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
