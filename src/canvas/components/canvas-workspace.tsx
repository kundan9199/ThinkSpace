"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { useCanvasStore } from "@/store/canvas/canvas-store";
import { CanvasRenderer } from "../rendering/canvas-renderer";
import { screenToWorld, zoomAtPoint } from "../core/camera";
import { ToolType, CanvasElement, Point } from "@/types/canvas";
import { BoardDetails } from "@/lib/board/actions";
import {
  getUnionBounds,
  getSelectionHandles,
  hitTestAll,
  hitTestHandles,
  translateElement,
  resizeElement,
  HANDLE_SIZE,
  type BoundingBox,
  type HandleId,
  type SelectionHandle,
} from "../geometry/geometry";
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

type InteractionMode =
  | "idle"
  | "drawing"
  | "freehand"
  | "panning"
  | "moving"
  | "resizing"
  | "rotating";

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

  // ── Interaction Refs (decoupled from React render for 60fps) ──────────────
  const interactionModeRef = useRef<InteractionMode>("idle");
  const panStartRef = useRef<{ pointerX: number; pointerY: number; panX: number; panY: number }>({
    pointerX: 0,
    pointerY: 0,
    panX: 0,
    panY: 0,
  });

  // Shape drawing refs
  const dragStartWorldRef = useRef<Point | null>(null);
  const previewElementRef = useRef<CanvasElement | null>(null);

  // Freehand refs
  const freehandPointsRef = useRef<Point[]>([]);

  // Selection / move / resize / rotate refs
  const moveStartWorldRef = useRef<Point | null>(null);
  const originalElementsRef = useRef<Map<string, CanvasElement>>(new Map());
  const activeHandleRef = useRef<SelectionHandle | null>(null);
  const rotateCenterRef = useRef<Point | null>(null);
  const rotateStartAngleRef = useRef<number>(0);
  const originalBoundsRef = useRef<BoundingBox | null>(null);

  // ── Zustand Store ─────────────────────────────────────────────────────────
  const elements = useCanvasStore((s) => s.elements);
  const selectedElementIds = useCanvasStore((s) => s.selectedElementIds);
  const activeTool = useCanvasStore((s) => s.activeTool);
  const viewport = useCanvasStore((s) => s.viewport);

  const addElement = useCanvasStore((s) => s.addElement);
  const removeElement = useCanvasStore((s) => s.removeElement);
  const setSelectedElementIds = useCanvasStore((s) => s.setSelectedElementIds);
  const clearSelection = useCanvasStore((s) => s.clearSelection);
  const setActiveTool = useCanvasStore((s) => s.setActiveTool);
  const setViewport = useCanvasStore((s) => s.setViewport);
  const resetViewport = useCanvasStore((s) => s.resetViewport);

  // ── Selection Geometry Helpers ────────────────────────────────────────────
  const getSelectionState = useCallback(
    (
      els: CanvasElement[],
      selIds: string[]
    ): {
      bounds: BoundingBox | null;
      handles: SelectionHandle[];
    } => {
      const selected = els.filter((e) => selIds.includes(e.id));
      const bounds = getUnionBounds(selected);
      const handles = bounds ? getSelectionHandles(bounds) : [];
      return { bounds, handles };
    },
    []
  );

  // ── Render Helper ─────────────────────────────────────────────────────────
  const triggerRender = useCallback(
    (
      previewEl?: CanvasElement | null,
      freehandPts?: Point[] | null
    ) => {
      if (!rendererRef.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const state = useCanvasStore.getState();
      const { bounds, handles } = getSelectionState(state.elements, state.selectedElementIds);
      rendererRef.current.requestRender(
        state.elements,
        state.selectedElementIds,
        state.viewport,
        rect.width,
        rect.height,
        previewEl ?? null,
        bounds,
        handles,
        freehandPts ?? null
      );
    },
    [getSelectionState]
  );

  // ── 1. Renderer mount/unmount ────────────────────────────────────────────
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

  // ── 2. ResizeObserver ─────────────────────────────────────────────────────
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleResize = () => {
      const rect = container.getBoundingClientRect();
      const newWidth = Math.floor(rect.width);
      const newHeight = Math.floor(rect.height);
      const dpr = window.devicePixelRatio || 1;
      if (newWidth <= 0 || newHeight <= 0) return;

      setDimensions((prev) => {
        if (prev.width === newWidth && prev.height === newHeight) return prev;
        return { width: newWidth, height: newHeight };
      });

      if (useCanvasStore.getState().viewport.dpr !== dpr) setViewport({ dpr });

      if (rendererRef.current) {
        rendererRef.current.resize(newWidth, newHeight, dpr);
        triggerRender();
      }
    };

    handleResize();
    const observer = new ResizeObserver(handleResize);
    observer.observe(container);
    return () => observer.disconnect();
  }, [setViewport, triggerRender]);

  // ── 3. Render Effect ──────────────────────────────────────────────────────
  useEffect(() => {
    if (dimensions.width > 0 && dimensions.height > 0) {
      const { bounds, handles } = getSelectionState(elements, selectedElementIds);
      rendererRef.current?.requestRender(
        elements,
        selectedElementIds,
        viewport,
        dimensions.width,
        dimensions.height,
        null,
        bounds,
        handles,
        null
      );
    }
  }, [elements, selectedElementIds, viewport, dimensions, getSelectionState]);

  // ── 4. Keyboard Shortcuts ─────────────────────────────────────────────────
  useEffect(() => {
    const isTyping = () => {
      const el = document.activeElement;
      if (!el) return false;
      const tag = el.tagName;
      return (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        (el as HTMLElement).contentEditable === "true"
      );
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isTyping()) return;

      if (e.code === "Space" && !isSpacePressed) {
        e.preventDefault();
        setIsSpacePressed(true);
        return;
      }

      switch (e.key) {
        case "v":
        case "V":
          setActiveTool("select");
          break;
        case "h":
        case "H":
          setActiveTool("hand");
          break;
        case "r":
        case "R":
          setActiveTool("rectangle");
          break;
        case "o":
        case "O":
          setActiveTool("ellipse");
          break;
        case "l":
        case "L":
          setActiveTool("line");
          break;
        case "a":
        case "A":
          setActiveTool("arrow");
          break;
        case "p":
        case "P":
          setActiveTool("freehand");
          break;
        case "Delete":
        case "Backspace": {
          const ids = useCanvasStore.getState().selectedElementIds;
          if (ids.length === 0) break;
          ids.forEach((id) => removeElement(id));
          clearSelection();
          break;
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") setIsSpacePressed(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [isSpacePressed, setActiveTool, removeElement, clearSelection]);

  // ── 5. Wheel zoom ─────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;
      const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
      const updated = zoomAtPoint(screenX, screenY, factor, useCanvasStore.getState().viewport, 0.1, 10.0);
      setViewport(updated);
    };

    canvas.addEventListener("wheel", handleWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", handleWheel);
  }, [setViewport]);

  // ── Pointer Handlers ──────────────────────────────────────────────────────
  const getCanvasWorld = (clientX: number, clientY: number): Point => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return screenToWorld(clientX - rect.left, clientY - rect.top, useCanvasStore.getState().viewport);
  };

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const { activeTool: tool, viewport: vp, elements: els, selectedElementIds: selIds } =
        useCanvasStore.getState();

      const isMiddle = e.button === 1;
      const isPrimary = e.button === 0;
      const isHandMode = tool === "hand" || isSpacePressed;

      // ── PAN ───────────────────────────────────────────────────────────────
      if (isMiddle || (isHandMode && isPrimary)) {
        e.preventDefault();
        canvas.setPointerCapture(e.pointerId);
        interactionModeRef.current = "panning";
        setIsPanning(true);
        panStartRef.current = { pointerX: e.clientX, pointerY: e.clientY, panX: vp.panX, panY: vp.panY };
        return;
      }

      if (!isPrimary) return;

      const worldPt = getCanvasWorld(e.clientX, e.clientY);

      // ── ERASER ────────────────────────────────────────────────────────────
      if (tool === "eraser") {
        const hit = hitTestAll(els, worldPt.x, worldPt.y);
        if (hit) {
          removeElement(hit.id);
          if (selIds.includes(hit.id)) {
            setSelectedElementIds(selIds.filter((id) => id !== hit.id));
          }
        }
        return;
      }

      // ── SELECT TOOL ───────────────────────────────────────────────────────
      if (tool === "select") {
        // Check rotation handle first
        const selected = els.filter((el) => selIds.includes(el.id));
        const selBounds = getUnionBounds(selected);
        if (selBounds) {
          const handles = getSelectionHandles(selBounds);
          const hitHandle = hitTestHandles(handles, worldPt.x, worldPt.y, HANDLE_SIZE * 1.5);

          if (hitHandle) {
            canvas.setPointerCapture(e.pointerId);
            activeHandleRef.current = hitHandle;
            originalBoundsRef.current = { ...selBounds };

            // Save originals for resize
            const map = new Map<string, CanvasElement>();
            selected.forEach((el) => map.set(el.id, { ...el }));
            originalElementsRef.current = map;

            if (hitHandle.id === "rotate") {
              interactionModeRef.current = "rotating";
              rotateCenterRef.current = {
                x: selBounds.x + selBounds.width / 2,
                y: selBounds.y + selBounds.height / 2,
              };
              rotateStartAngleRef.current = Math.atan2(
                worldPt.y - (selBounds.y + selBounds.height / 2),
                worldPt.x - (selBounds.x + selBounds.width / 2)
              );
            } else {
              interactionModeRef.current = "resizing";
            }
            return;
          }
        }

        // Hit test elements
        const hit = hitTestAll(els, worldPt.x, worldPt.y);

        if (hit) {
          // Shift-click toggles element in selection
          if (e.shiftKey) {
            if (selIds.includes(hit.id)) {
              setSelectedElementIds(selIds.filter((id) => id !== hit.id));
            } else {
              setSelectedElementIds([...selIds, hit.id]);
            }
          } else {
            // If clicking an already-selected element, start moving
            const newSel = selIds.includes(hit.id) ? selIds : [hit.id];
            setSelectedElementIds(newSel);
            const updated = useCanvasStore.getState();
            canvas.setPointerCapture(e.pointerId);
            interactionModeRef.current = "moving";
            moveStartWorldRef.current = worldPt;
            const map = new Map<string, CanvasElement>();
            updated.elements
              .filter((el) => newSel.includes(el.id))
              .forEach((el) => map.set(el.id, { ...el }));
            originalElementsRef.current = map;
          }
        } else {
          // Click empty canvas — clear selection
          clearSelection();
        }
        return;
      }

      // ── FREEHAND ─────────────────────────────────────────────────────────
      if (tool === "freehand") {
        e.preventDefault();
        canvas.setPointerCapture(e.pointerId);
        interactionModeRef.current = "freehand";
        freehandPointsRef.current = [worldPt];
        triggerRender(null, freehandPointsRef.current);
        return;
      }

      // ── SHAPE TOOLS ───────────────────────────────────────────────────────
      if (["rectangle", "ellipse", "line", "arrow"].includes(tool)) {
        e.preventDefault();
        canvas.setPointerCapture(e.pointerId);
        interactionModeRef.current = "drawing";
        dragStartWorldRef.current = worldPt;
        previewElementRef.current = null;
      }
    },
    [isSpacePressed, removeElement, setSelectedElementIds, clearSelection, triggerRender]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const mode = interactionModeRef.current;
      const state = useCanvasStore.getState();

      // ── PAN ────────────────────────────────────────────────────────────
      if (mode === "panning") {
        const dx = e.clientX - panStartRef.current.pointerX;
        const dy = e.clientY - panStartRef.current.pointerY;
        setViewport({ panX: panStartRef.current.panX + dx, panY: panStartRef.current.panY + dy });
        return;
      }

      // ── FREEHAND ─────────────────────────────────────────────────────────
      if (mode === "freehand") {
        const worldPt = getCanvasWorld(e.clientX, e.clientY);
        freehandPointsRef.current = [...freehandPointsRef.current, worldPt];
        triggerRender(null, freehandPointsRef.current);
        return;
      }

      // ── MOVING ────────────────────────────────────────────────────────────
      if (mode === "moving" && moveStartWorldRef.current) {
        const worldPt = getCanvasWorld(e.clientX, e.clientY);
        const dx = worldPt.x - moveStartWorldRef.current.x;
        const dy = worldPt.y - moveStartWorldRef.current.y;

        state.selectedElementIds.forEach((id) => {
          const orig = originalElementsRef.current.get(id);
          if (!orig) return;
          const moved = translateElement(orig, dx, dy);
          // Directly update via store without dispatching React state per move
          useCanvasStore.getState().updateElement(id, moved as Partial<CanvasElement>);
        });
        triggerRender();
        return;
      }

      // ── RESIZING ──────────────────────────────────────────────────────────
      if (mode === "resizing" && activeHandleRef.current && originalBoundsRef.current) {
        const worldPt = getCanvasWorld(e.clientX, e.clientY);
        const handle = activeHandleRef.current;
        const origBounds = originalBoundsRef.current;

        state.selectedElementIds.forEach((id) => {
          const orig = originalElementsRef.current.get(id);
          if (!orig) return;
          const resized = resizeElement(orig, handle.id as HandleId, worldPt, origBounds, originalElementsRef.current);
          useCanvasStore.getState().updateElement(id, resized as Partial<CanvasElement>);
        });
        triggerRender();
        return;
      }

      // ── ROTATING ──────────────────────────────────────────────────────────
      if (mode === "rotating" && rotateCenterRef.current) {
        const worldPt = getCanvasWorld(e.clientX, e.clientY);
        const center = rotateCenterRef.current;
        const currentAngle = Math.atan2(worldPt.y - center.y, worldPt.x - center.x);
        const deltaAngle =
          ((currentAngle - rotateStartAngleRef.current) * 180) / Math.PI;

        state.selectedElementIds.forEach((id) => {
          const orig = originalElementsRef.current.get(id);
          if (!orig) return;
          const newRotation = (orig.rotation + deltaAngle) % 360;
          useCanvasStore.getState().updateElement(id, { rotation: newRotation } as Partial<CanvasElement>);
        });
        triggerRender();
        return;
      }

      // ── SHAPE DRAWING ─────────────────────────────────────────────────────
      if (mode === "drawing" && dragStartWorldRef.current) {
        const worldPt = getCanvasWorld(e.clientX, e.clientY);
        const start = dragStartWorldRef.current;
        const tool = state.activeTool;
        const now = Date.now();
        const zIdx = state.elements.length + 1;
        const strokeColor = "#3b82f6";
        const bgColor = "rgba(59, 130, 246, 0.12)";
        const sw = 2;

        if (tool === "rectangle") {
          const x = Math.min(start.x, worldPt.x);
          const y = Math.min(start.y, worldPt.y);
          previewElementRef.current = {
            id: "preview-temp", type: "rectangle", x, y,
            width: Math.abs(worldPt.x - start.x),
            height: Math.abs(worldPt.y - start.y),
            rotation: 0, strokeColor, backgroundColor: bgColor,
            strokeWidth: sw, opacity: 1, zIndex: zIdx, cornerRadius: 8,
            createdAt: now, updatedAt: now,
          };
        } else if (tool === "ellipse") {
          const x = Math.min(start.x, worldPt.x);
          const y = Math.min(start.y, worldPt.y);
          previewElementRef.current = {
            id: "preview-temp", type: "ellipse", x, y,
            width: Math.abs(worldPt.x - start.x),
            height: Math.abs(worldPt.y - start.y),
            rotation: 0, strokeColor, backgroundColor: bgColor,
            strokeWidth: sw, opacity: 1, zIndex: zIdx,
            createdAt: now, updatedAt: now,
          };
        } else if (tool === "line") {
          previewElementRef.current = {
            id: "preview-temp", type: "line",
            x: start.x, y: start.y, x2: worldPt.x, y2: worldPt.y,
            width: Math.abs(worldPt.x - start.x),
            height: Math.abs(worldPt.y - start.y),
            rotation: 0, strokeColor, backgroundColor: "transparent",
            strokeWidth: sw, opacity: 1, zIndex: zIdx,
            createdAt: now, updatedAt: now,
          };
        } else if (tool === "arrow") {
          previewElementRef.current = {
            id: "preview-temp", type: "arrow",
            x: start.x, y: start.y, x2: worldPt.x, y2: worldPt.y,
            width: Math.abs(worldPt.x - start.x),
            height: Math.abs(worldPt.y - start.y),
            rotation: 0, strokeColor, backgroundColor: strokeColor,
            strokeWidth: sw, opacity: 1, zIndex: zIdx, headSize: 12,
            createdAt: now, updatedAt: now,
          };
        }

        triggerRender(previewElementRef.current);
      }
    },
    [setViewport, triggerRender]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      const mode = interactionModeRef.current;

      const releaseCapture = () => {
        if (canvas && canvas.hasPointerCapture(e.pointerId)) {
          canvas.releasePointerCapture(e.pointerId);
        }
      };

      if (mode === "panning") {
        releaseCapture();
        interactionModeRef.current = "idle";
        setIsPanning(false);
        return;
      }

      if (mode === "freehand") {
        releaseCapture();
        const pts = freehandPointsRef.current;
        if (pts.length > 1) {
          const bounds = (() => {
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            for (const p of pts) {
              minX = Math.min(minX, p.x); minY = Math.min(minY, p.y);
              maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y);
            }
            return { x: minX, y: minY, width: maxX - minX || 1, height: maxY - minY || 1 };
          })();

          const el: CanvasElement = {
            id: `el-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            type: "freehand",
            x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height,
            rotation: 0,
            strokeColor: "#3b82f6",
            backgroundColor: "transparent",
            strokeWidth: 3,
            opacity: 1,
            zIndex: useCanvasStore.getState().elements.length + 1,
            points: pts,
            createdAt: Date.now(), updatedAt: Date.now(),
          };
          addElement(el);
        }
        freehandPointsRef.current = [];
        interactionModeRef.current = "idle";
        triggerRender(null, null);
        return;
      }

      if (mode === "moving" || mode === "resizing" || mode === "rotating") {
        releaseCapture();
        interactionModeRef.current = "idle";
        moveStartWorldRef.current = null;
        activeHandleRef.current = null;
        rotateCenterRef.current = null;
        originalElementsRef.current = new Map();
        originalBoundsRef.current = null;
        triggerRender();
        return;
      }

      if (mode === "drawing") {
        releaseCapture();
        const preview = previewElementRef.current;
        if (preview) {
          let isValid = false;
          if (preview.type === "line" || preview.type === "arrow") {
            isValid = Math.hypot(preview.x2 - preview.x, preview.y2 - preview.y) > 2;
          } else {
            isValid = preview.width > 2 || preview.height > 2;
          }

          if (isValid) {
            addElement({
              ...preview,
              id: `el-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            });
          }
        }

        interactionModeRef.current = "idle";
        dragStartWorldRef.current = null;
        previewElementRef.current = null;
        triggerRender(null);
        return;
      }
    },
    [addElement, triggerRender]
  );

  // ── Cursor ────────────────────────────────────────────────────────────────
  let cursorClass = "cursor-default";
  if (isPanning) {
    cursorClass = "cursor-grabbing";
  } else if (activeTool === "hand" || isSpacePressed) {
    cursorClass = "cursor-grab";
  } else if (["rectangle", "ellipse", "line", "arrow", "freehand"].includes(activeTool)) {
    cursorClass = "cursor-crosshair";
  } else if (activeTool === "eraser") {
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
          <span>
            {elements.length} {elements.length === 1 ? "Element" : "Elements"}
          </span>
          <span className="text-border">|</span>
          <span className="text-text-secondary">{board.title}</span>
        </div>
      </div>

      {/* Bottom Right: Zoom Controls HUD */}
      <div className="absolute bottom-4 right-4 z-20 flex items-center gap-1.5 rounded-2xl border border-border/80 bg-bg-secondary/80 backdrop-blur-xl p-1.5 shadow-2xl shadow-black/50">
        <button
          onClick={() =>
            setViewport(
              zoomAtPoint(dimensions.width / 2, dimensions.height / 2, 1 / 1.1, viewport, 0.1, 10.0)
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
              zoomAtPoint(dimensions.width / 2, dimensions.height / 2, 1.1, viewport, 0.1, 10.0)
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
          title="Reset Viewport"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary hover:bg-surface-glass-hover hover:text-text-primary transition-all"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
