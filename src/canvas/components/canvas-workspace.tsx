"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { useCanvasStore } from "@/store/canvas/canvas-store";
import { CanvasRenderer } from "../rendering/canvas-renderer";
import { screenToWorld, worldToScreen, zoomAtPoint, calculateFitToContent } from "../core/camera";
import { ToolType, CanvasElement, Point, TextElement } from "@/types/canvas";
import { BoardDetails } from "@/lib/board/actions";
import { measureText } from "../geometry/text-measurement";
import { PropertiesPanel } from "./properties-panel";
import { CanvasBackgroundControl } from "./canvas-background-control";
import { ExportMenu } from "./export-menu";
import {
  copyElementsToClipboard,
  getElementsFromClipboard,
  cloneElementsWithNewIds,
} from "../core/clipboard";
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
  Maximize2,
  Layers,
  Undo2,
  Redo2,
} from "lucide-react";

export interface CanvasWorkspaceProps {
  board: BoardDetails;
}

const TOOLS: Array<{ type: ToolType; label: string; icon: React.ReactNode }> = [
  { type: "select", label: "Select (V)", icon: <MousePointer className="h-4 w-4" /> },
  { type: "hand", label: "Hand / Pan (H)", icon: <Hand className="h-4 w-4" /> },
  { type: "rectangle", label: "Rectangle (R)", icon: <Square className="h-4 w-4" /> },
  { type: "ellipse", label: "Ellipse (O)", icon: <Circle className="h-4 w-4" /> },
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

interface TextEditingSession {
  id?: string;
  worldX: number;
  worldY: number;
  text: string;
  fontSize: number;
  fontFamily: string;
  strokeColor: string;
  initialElements: CanvasElement[];
}

export function CanvasWorkspace({ board }: CanvasWorkspaceProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<CanvasRenderer | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });

  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [editingSession, setEditingSession] = useState<TextEditingSession | null>(null);
  const editingSessionRef = useRef<TextEditingSession | null>(null);

  useEffect(() => {
    editingSessionRef.current = editingSession;
  }, [editingSession]);

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

  // History drag snapshot refs
  const dragStartElementsSnapshotRef = useRef<CanvasElement[] | null>(null);
  const hasTransformedRef = useRef(false);

  // Keyboard arrow movement coalescing refs
  const arrowMoveSnapshotRef = useRef<CanvasElement[] | null>(null);
  const arrowMoveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // ── Zustand Store ─────────────────────────────────────────────────────────
  const elements = useCanvasStore((s) => s.elements);
  const selectedElementIds = useCanvasStore((s) => s.selectedElementIds);
  const activeTool = useCanvasStore((s) => s.activeTool);
  const viewport = useCanvasStore((s) => s.viewport);
  const canvasBackgroundColor = useCanvasStore((s) => s.canvasBackgroundColor);
  const past = useCanvasStore((s) => s.past);
  const future = useCanvasStore((s) => s.future);

  const addElement = useCanvasStore((s) => s.addElement);
  const addElements = useCanvasStore((s) => s.addElements);
  const updateElement = useCanvasStore((s) => s.updateElement);
  const removeElement = useCanvasStore((s) => s.removeElement);
  const removeElements = useCanvasStore((s) => s.removeElements);
  const commitSnapshot = useCanvasStore((s) => s.commitSnapshot);
  const undo = useCanvasStore((s) => s.undo);
  const redo = useCanvasStore((s) => s.redo);
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
        freehandPts ?? null,
        state.canvasBackgroundColor
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
        null,
        canvasBackgroundColor
      );
    }
  }, [elements, selectedElementIds, viewport, dimensions, canvasBackgroundColor, getSelectionState]);

  // ── 4. Text Editing Commit / Cancel ───────────────────────────────────────
  const commitTextEditing = useCallback(() => {
    const session = editingSessionRef.current;
    if (!session) return;
    const trimmed = session.text.trim();

    if (trimmed.length > 0) {
      const measured = measureText(
        session.text,
        session.fontSize,
        session.fontFamily
      );

      if (session.id) {
        // Editing existing text element
        commitSnapshot(session.initialElements);
        useCanvasStore.getState().updateElement(session.id, {
          text: session.text,
          width: measured.width,
          height: measured.height,
          fontSize: session.fontSize,
          fontFamily: session.fontFamily,
          lineHeight: measured.lineHeight,
        });
      } else {
        // Creating new text element
        const newEl: CanvasElement = {
          id: `el-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          type: "text",
          x: session.worldX,
          y: session.worldY,
          width: measured.width,
          height: measured.height,
          rotation: 0,
          strokeColor: session.strokeColor,
          backgroundColor: "transparent",
          strokeWidth: 1,
          opacity: 1,
          zIndex: useCanvasStore.getState().elements.length + 1,
          text: session.text,
          fontSize: session.fontSize,
          fontFamily: session.fontFamily,
          lineHeight: measured.lineHeight,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        addElement(newEl);
        setSelectedElementIds([newEl.id]);
        setActiveTool("select");
      }
    } else if (session.id) {
      // Empty text on existing element -> remove it
      removeElement(session.id);
    }

    editingSessionRef.current = null;
    setEditingSession(null);
  }, [commitSnapshot, addElement, removeElement, setSelectedElementIds, setActiveTool]);

  // Focus textarea when editingSession starts (only once when session opens)
  const isEditing = editingSession !== null;
  useEffect(() => {
    if (isEditing) {
      const focusTextarea = () => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          const len = textareaRef.current.value.length;
          textareaRef.current.setSelectionRange(len, len);
        }
      };
      focusTextarea();
      const raf = requestAnimationFrame(focusTextarea);
      return () => cancelAnimationFrame(raf);
    }
  }, [isEditing]);

  // ── 5. Keyboard Shortcuts & Undo/Redo / Clipboard ───────────────────────
  useEffect(() => {
    const isTyping = (target: EventTarget | null) => {
      if (editingSessionRef.current !== null) return true;
      if (!target || !(target instanceof HTMLElement)) return false;
      const tag = target.tagName.toUpperCase();
      if (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        target.isContentEditable ||
        target.getAttribute("contenteditable") === "true"
      ) {
        return true;
      }
      if (target.closest("input, textarea, select, [contenteditable='true']")) {
        return true;
      }
      return false;
    };

    const flushArrowMovement = () => {
      if (arrowMoveTimerRef.current) {
        clearTimeout(arrowMoveTimerRef.current);
        arrowMoveTimerRef.current = null;
      }
      if (arrowMoveSnapshotRef.current) {
        commitSnapshot(arrowMoveSnapshotRef.current);
        arrowMoveSnapshotRef.current = null;
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isTyping(e.target)) return;

      const isCtrlOrCmd = e.ctrlKey || e.metaKey;

      // Handle Ctrl/Cmd Shortcuts
      if (isCtrlOrCmd) {
        if (e.key === "z" || e.key === "Z") {
          e.preventDefault();
          flushArrowMovement();
          if (e.shiftKey) {
            redo();
          } else {
            undo();
          }
          return;
        }
        if (e.key === "y" || e.key === "Y") {
          e.preventDefault();
          flushArrowMovement();
          redo();
          return;
        }
        if (e.key === "a" || e.key === "A") {
          e.preventDefault();
          setSelectedElementIds(useCanvasStore.getState().elements.map((el) => el.id));
          return;
        }
        if (e.key === "c" || e.key === "C") {
          e.preventDefault();
          const state = useCanvasStore.getState();
          const sel = state.elements.filter((el) => state.selectedElementIds.includes(el.id));
          copyElementsToClipboard(sel);
          return;
        }
        if (e.key === "x" || e.key === "X") {
          e.preventDefault();
          flushArrowMovement();
          const state = useCanvasStore.getState();
          const sel = state.elements.filter((el) => state.selectedElementIds.includes(el.id));
          if (sel.length > 0) {
            copyElementsToClipboard(sel);
            removeElements(state.selectedElementIds);
            clearSelection();
          }
          return;
        }
        if (e.key === "v" || e.key === "V") {
          e.preventDefault();
          flushArrowMovement();
          const state = useCanvasStore.getState();
          const maxZIndex = state.elements.reduce((max, el) => Math.max(max, el.zIndex ?? 0), 0);
          getElementsFromClipboard(maxZIndex).then((pasted) => {
            if (pasted && pasted.length > 0) {
              addElements(pasted);
              setSelectedElementIds(pasted.map((el) => el.id));
            }
          });
          return;
        }
        if (e.key === "d" || e.key === "D") {
          e.preventDefault();
          flushArrowMovement();
          const state = useCanvasStore.getState();
          const sel = state.elements.filter((el) => state.selectedElementIds.includes(el.id));
          if (sel.length > 0) {
            const maxZIndex = state.elements.reduce((max, el) => Math.max(max, el.zIndex ?? 0), 0);
            const clones = cloneElementsWithNewIds(sel, { x: 20, y: 20 }, maxZIndex);
            addElements(clones);
            setSelectedElementIds(clones.map((el) => el.id));
          }
          return;
        }
      }

      // Space bar for panning
      if (e.code === "Space" && !isSpacePressed) {
        e.preventDefault();
        setIsSpacePressed(true);
        return;
      }

      // Arrow keys movement
      if (
        e.key === "ArrowUp" ||
        e.key === "ArrowDown" ||
        e.key === "ArrowLeft" ||
        e.key === "ArrowRight"
      ) {
        const state = useCanvasStore.getState();
        if (state.selectedElementIds.length > 0) {
          e.preventDefault();
          const step = e.shiftKey ? 10 : 1;
          let dx = 0;
          let dy = 0;
          if (e.key === "ArrowLeft") dx = -step;
          else if (e.key === "ArrowRight") dx = step;
          else if (e.key === "ArrowUp") dy = -step;
          else if (e.key === "ArrowDown") dy = step;

          if (!arrowMoveSnapshotRef.current) {
            arrowMoveSnapshotRef.current = [...state.elements];
          }

          state.selectedElementIds.forEach((id) => {
            const el = state.elements.find((item) => item.id === id);
            if (el) {
              updateElement(id, translateElement(el, dx, dy));
            }
          });

          if (arrowMoveTimerRef.current) {
            clearTimeout(arrowMoveTimerRef.current);
          }
          arrowMoveTimerRef.current = setTimeout(() => {
            if (arrowMoveSnapshotRef.current) {
              commitSnapshot(arrowMoveSnapshotRef.current);
              arrowMoveSnapshotRef.current = null;
            }
          }, 400);
          return;
        }
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
        case "t":
        case "T":
          setActiveTool("text");
          break;
        case "e":
        case "E":
          setActiveTool("eraser");
          break;
        case "Delete":
        case "Backspace": {
          flushArrowMovement();
          const ids = useCanvasStore.getState().selectedElementIds;
          if (ids.length === 0) break;
          removeElements(ids);
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
      if (arrowMoveTimerRef.current) {
        clearTimeout(arrowMoveTimerRef.current);
      }
    };
  }, [
    isSpacePressed,
    undo,
    redo,
    setActiveTool,
    addElement,
    addElements,
    updateElement,
    removeElements,
    setSelectedElementIds,
    clearSelection,
    commitSnapshot,
  ]);

  // ── 6. Wheel zoom ─────────────────────────────────────────────────────────
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

  const startTextEditing = useCallback(
    (existingElement?: TextElement, worldPos?: Point) => {
      const state = useCanvasStore.getState();
      const initialElements = [...state.elements];

      if (existingElement) {
        const session: TextEditingSession = {
          id: existingElement.id,
          worldX: existingElement.x,
          worldY: existingElement.y,
          text: existingElement.text,
          fontSize: existingElement.fontSize || 20,
          fontFamily: existingElement.fontFamily || "Inter, sans-serif",
          strokeColor: existingElement.strokeColor || "#f8fafc",
          initialElements,
        };
        editingSessionRef.current = session;
        setEditingSession(session);
      } else if (worldPos) {
        const session: TextEditingSession = {
          worldX: worldPos.x,
          worldY: worldPos.y,
          text: "",
          fontSize: 20,
          fontFamily: "Inter, sans-serif",
          strokeColor: "#f8fafc",
          initialElements,
        };
        editingSessionRef.current = session;
        setEditingSession(session);
      }
    },
    []
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      // Commit any active text editing when clicking canvas
      if (editingSessionRef.current) {
        commitTextEditing();
      }

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

      // ── TEXT TOOL ─────────────────────────────────────────────────────────
      if (tool === "text") {
        e.preventDefault();
        const hit = hitTestAll(els, worldPt.x, worldPt.y);
        if (hit && hit.type === "text") {
          startTextEditing(hit as TextElement);
        } else {
          startTextEditing(undefined, worldPt);
        }
        return;
      }

      // ── SELECT TOOL ───────────────────────────────────────────────────────
      if (tool === "select") {
        // Check rotation and resize handles first
        const selected = els.filter((el) => selIds.includes(el.id));
        const selBounds = getUnionBounds(selected);
        if (selBounds) {
          const handles = getSelectionHandles(selBounds);
          const hitHandle = hitTestHandles(handles, worldPt.x, worldPt.y, HANDLE_SIZE * 1.5);

          if (hitHandle) {
            canvas.setPointerCapture(e.pointerId);
            activeHandleRef.current = hitHandle;
            originalBoundsRef.current = { ...selBounds };

            // Save snapshot of all elements before transformation
            dragStartElementsSnapshotRef.current = [...els];
            hasTransformedRef.current = false;

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
          if (e.shiftKey) {
            // Shift-click toggles element in selection
            if (selIds.includes(hit.id)) {
              setSelectedElementIds(selIds.filter((id) => id !== hit.id));
            } else {
              setSelectedElementIds([...selIds, hit.id]);
            }
          } else {
            // If already selected, prepare to move
            const newSel = selIds.includes(hit.id) ? selIds : [hit.id];
            setSelectedElementIds(newSel);
            const updated = useCanvasStore.getState();

            canvas.setPointerCapture(e.pointerId);
            interactionModeRef.current = "moving";
            moveStartWorldRef.current = worldPt;

            // Save snapshot before move begins
            dragStartElementsSnapshotRef.current = [...updated.elements];
            hasTransformedRef.current = false;

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
    [
      commitTextEditing,
      isSpacePressed,
      removeElement,
      startTextEditing,
      setSelectedElementIds,
      clearSelection,
      triggerRender,
    ]
  );

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      const worldPt = getCanvasWorld(e.clientX, e.clientY);
      const hit = hitTestAll(useCanvasStore.getState().elements, worldPt.x, worldPt.y);
      if (hit && hit.type === "text") {
        startTextEditing(hit as TextElement);
      }
    },
    [startTextEditing]
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

        if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
          hasTransformedRef.current = true;
        }

        state.selectedElementIds.forEach((id) => {
          const orig = originalElementsRef.current.get(id);
          if (!orig) return;
          const moved = translateElement(orig, dx, dy);
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

        hasTransformedRef.current = true;

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

        if (Math.abs(deltaAngle) > 0.5) {
          hasTransformedRef.current = true;
        }

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

        // Commit single history entry if transformation actually happened
        if (hasTransformedRef.current && dragStartElementsSnapshotRef.current) {
          commitSnapshot(dragStartElementsSnapshotRef.current);
        }

        interactionModeRef.current = "idle";
        moveStartWorldRef.current = null;
        activeHandleRef.current = null;
        rotateCenterRef.current = null;
        originalElementsRef.current = new Map();
        originalBoundsRef.current = null;
        dragStartElementsSnapshotRef.current = null;
        hasTransformedRef.current = false;
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
    [addElement, commitSnapshot, triggerRender]
  );

  // ── Dynamic Cursor ────────────────────────────────────────────────────────
  let cursorClass = "cursor-default";
  if (isPanning) {
    cursorClass = "cursor-grabbing";
  } else if (activeTool === "hand" || isSpacePressed) {
    cursorClass = "cursor-grab";
  } else if (["rectangle", "ellipse", "line", "arrow", "freehand"].includes(activeTool)) {
    cursorClass = "cursor-crosshair";
  } else if (activeTool === "text") {
    cursorClass = "cursor-text";
  } else if (activeTool === "eraser") {
    cursorClass = "cursor-crosshair";
  }

  // Calculate screen position for temporary text editor
  const textEditorScreenPos = editingSession
    ? worldToScreen(editingSession.worldX, editingSession.worldY, viewport)
    : { x: 0, y: 0 };

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
        onDoubleClick={handleDoubleClick}
        className={`absolute inset-0 block touch-none ${cursorClass}`}
      />

      {/* Temporary Floating Textarea Overlay */}
      {editingSession && (
        <textarea
          ref={textareaRef}
          autoFocus
          value={editingSession.text}
          onChange={(e) => {
            const val = e.target.value;
            setEditingSession((prev) => {
              if (!prev) return null;
              const next = { ...prev, text: val };
              editingSessionRef.current = next;
              return next;
            });
          }}
          onBlur={commitTextEditing}
          onPointerDown={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          onDoubleClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === "Escape") {
              e.preventDefault();
              editingSessionRef.current = null;
              setEditingSession(null);
            } else if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              commitTextEditing();
            }
          }}
          style={{
            position: "absolute",
            left: `${textEditorScreenPos.x}px`,
            top: `${textEditorScreenPos.y}px`,
            fontSize: `${Math.max(12, editingSession.fontSize * viewport.zoom)}px`,
            fontFamily: editingSession.fontFamily,
            color: editingSession.strokeColor,
            lineHeight: 1.25,
            zIndex: 50,
          }}
          rows={Math.max(1, editingSession.text.split("\n").length)}
          placeholder="Type something..."
          className="min-w-[120px] max-w-[500px] resize-none overflow-hidden rounded-lg border border-accent/60 bg-bg-secondary/90 px-2 py-1 shadow-2xl backdrop-blur-md outline-none text-text-primary caret-accent"
        />
      )}

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

        <div className="h-4 w-px bg-border my-auto mx-1" />

        {/* Undo Button */}
        <button
          onClick={() => undo()}
          disabled={past.length === 0}
          title="Undo (Ctrl+Z)"
          className={`flex h-9 w-9 items-center justify-center rounded-xl transition-all ${
            past.length === 0
              ? "text-text-muted/30 cursor-not-allowed"
              : "text-text-secondary hover:bg-surface-glass-hover hover:text-text-primary active:scale-95"
          }`}
        >
          <Undo2 className="h-4 w-4" />
        </button>

        {/* Redo Button */}
        <button
          onClick={() => redo()}
          disabled={future.length === 0}
          title="Redo (Ctrl+Shift+Z / Ctrl+Y)"
          className={`flex h-9 w-9 items-center justify-center rounded-xl transition-all ${
            future.length === 0
              ? "text-text-muted/30 cursor-not-allowed"
              : "text-text-secondary hover:bg-surface-glass-hover hover:text-text-primary active:scale-95"
          }`}
        >
          <Redo2 className="h-4 w-4" />
        </button>
      </div>

      {/* Floating Properties Panel (Contextual when elements are selected) */}
      <PropertiesPanel />

      {/* Top Right: Export & Canvas Actions HUD */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
        <ExportMenu boardTitle={board.title} />
      </div>

      {/* Bottom Left: Board & Scene Info HUD + Canvas Background Control */}
      <div className="absolute bottom-4 left-4 z-20 flex items-center gap-2">
        <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-bg-secondary/70 backdrop-blur-md px-3 py-1.5 text-xs text-text-muted font-mono shadow-lg">
          <Layers className="h-3.5 w-3.5 text-accent" />
          <span>
            {elements.length} {elements.length === 1 ? "Element" : "Elements"}
          </span>
          <span className="text-border">|</span>
          <span className="text-text-secondary">{board.title}</span>
        </div>

        <CanvasBackgroundControl />
      </div>

      {/* Bottom Right: Zoom Controls HUD */}
      <div className="absolute bottom-4 right-4 z-20 flex items-center gap-1.5 rounded-2xl border border-border/80 bg-bg-secondary/80 backdrop-blur-xl p-1.5 shadow-2xl shadow-black/50">
        <button
          onClick={() =>
            setViewport(
              zoomAtPoint(dimensions.width / 2, dimensions.height / 2, 1 / 1.1, viewport, 0.1, 10.0)
            )
          }
          title="Zoom Out (-)"
          aria-label="Zoom Out"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary hover:bg-surface-glass-hover hover:text-text-primary transition-all"
        >
          <ZoomOut className="h-4 w-4" />
        </button>

        <button
          onClick={() => setViewport({ zoom: 1.0 })}
          title="Reset Zoom to 100%"
          aria-label="Reset Zoom to 100%"
          className="w-12 text-center text-xs font-mono font-semibold text-text-primary hover:text-accent transition-colors"
        >
          {Math.round(viewport.zoom * 100)}%
        </button>

        <button
          onClick={() =>
            setViewport(
              zoomAtPoint(dimensions.width / 2, dimensions.height / 2, 1.1, viewport, 0.1, 10.0)
            )
          }
          title="Zoom In (+)"
          aria-label="Zoom In"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary hover:bg-surface-glass-hover hover:text-text-primary transition-all"
        >
          <ZoomIn className="h-4 w-4" />
        </button>

        <div className="h-4 w-px bg-border my-auto mx-0.5" />

        {/* Fit to Content Button */}
        <button
          onClick={() => {
            if (elements.length === 0) {
              resetViewport();
              return;
            }
            const bounds = getUnionBounds(elements);
            const fit = calculateFitToContent(bounds, dimensions.width, dimensions.height, 64, 0.1, 10.0);
            setViewport(fit);
          }}
          title="Fit to Content"
          aria-label="Fit to Content"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary hover:bg-surface-glass-hover hover:text-text-primary transition-all"
        >
          <Maximize2 className="h-3.5 w-3.5" />
        </button>

        <button
          onClick={() => resetViewport()}
          title="Reset Viewport"
          aria-label="Reset Viewport"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary hover:bg-surface-glass-hover hover:text-text-primary transition-all"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
