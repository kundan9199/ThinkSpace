import { create } from "zustand";
import { CanvasElement, ToolType, ViewportState } from "@/types/canvas";

const MAX_HISTORY = 100;

export interface CanvasHistoryEntry {
  elements: CanvasElement[];
  canvasBackgroundColor: string;
}

export interface CanvasState {
  // Scene elements
  elements: CanvasElement[];

  // Selection
  selectedElementIds: string[];

  // Active Tool
  activeTool: ToolType;

  // Camera / Viewport
  viewport: ViewportState;

  // Canvas Appearance
  canvasBackgroundColor: string;

  // History Stacks
  past: CanvasHistoryEntry[];
  future: CanvasHistoryEntry[];

  // Actions
  setElements: (elements: CanvasElement[]) => void;
  addElement: (element: CanvasElement) => void;
  addElements: (elements: CanvasElement[]) => void;
  updateElement: (id: string, updates: Partial<CanvasElement>) => void;
  updateElements: (ids: string[], updates: Partial<CanvasElement>) => void;
  removeElement: (id: string) => void;
  removeElements: (ids: string[]) => void;
  clearElements: () => void;
  setCanvasBackgroundColor: (color: string, commit?: boolean) => void;
  bringForward: (ids: string[]) => void;
  sendBackward: (ids: string[]) => void;
  bringToFront: (ids: string[]) => void;
  sendToBack: (ids: string[]) => void;
  commitSnapshot: (previousElementsOrEntry: CanvasElement[] | CanvasHistoryEntry) => void;
  undo: () => void;
  redo: () => void;
  setSelectedElementIds: (ids: string[]) => void;
  clearSelection: () => void;
  setActiveTool: (tool: ToolType) => void;
  setViewport: (viewport: Partial<ViewportState>) => void;
  resetViewport: () => void;
}

const DEFAULT_VIEWPORT: ViewportState = {
  zoom: 1.0,
  panX: 0,
  panY: 0,
  dpr: typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1,
};

export const DEFAULT_CANVAS_BG = "#090d16";

function reorderLayers(
  elements: CanvasElement[],
  ids: string[],
  action: "forward" | "backward" | "front" | "back"
): CanvasElement[] {
  if (elements.length === 0 || ids.length === 0) return elements;
  const idSet = new Set(ids);
  const sorted = [...elements].sort((a, b) => a.zIndex - b.zIndex);

  if (action === "front") {
    const unselected = sorted.filter((el) => !idSet.has(el.id));
    const selected = sorted.filter((el) => idSet.has(el.id));
    const reordered = [...unselected, ...selected];
    return reordered.map((el, i) => ({ ...el, zIndex: i + 1 }));
  }

  if (action === "back") {
    const selected = sorted.filter((el) => idSet.has(el.id));
    const unselected = sorted.filter((el) => !idSet.has(el.id));
    const reordered = [...selected, ...unselected];
    return reordered.map((el, i) => ({ ...el, zIndex: i + 1 }));
  }

  if (action === "forward") {
    const result = [...sorted];
    for (let i = result.length - 2; i >= 0; i--) {
      if (idSet.has(result[i].id) && !idSet.has(result[i + 1].id)) {
        const temp = result[i];
        result[i] = result[i + 1];
        result[i + 1] = temp;
      }
    }
    return result.map((el, i) => ({ ...el, zIndex: i + 1 }));
  }

  if (action === "backward") {
    const result = [...sorted];
    for (let i = 1; i < result.length; i++) {
      if (idSet.has(result[i].id) && !idSet.has(result[i - 1].id)) {
        const temp = result[i];
        result[i] = result[i - 1];
        result[i - 1] = temp;
      }
    }
    return result.map((el, i) => ({ ...el, zIndex: i + 1 }));
  }

  return elements;
}

export const useCanvasStore = create<CanvasState>((set) => ({
  elements: [],
  selectedElementIds: [],
  activeTool: "select",
  viewport: DEFAULT_VIEWPORT,
  canvasBackgroundColor: DEFAULT_CANVAS_BG,
  past: [],
  future: [],

  setElements: (elements) => set({ elements }),

  addElement: (element) =>
    set((state) => ({
      past: [
        ...state.past.slice(-(MAX_HISTORY - 1)),
        { elements: state.elements, canvasBackgroundColor: state.canvasBackgroundColor },
      ],
      future: [],
      elements: [...state.elements, element],
    })),

  addElements: (newElements) =>
    set((state) => {
      if (!newElements || newElements.length === 0) return state;
      return {
        past: [
          ...state.past.slice(-(MAX_HISTORY - 1)),
          { elements: state.elements, canvasBackgroundColor: state.canvasBackgroundColor },
        ],
        future: [],
        elements: [...state.elements, ...newElements],
      };
    }),

  updateElement: (id, updates) =>
    set((state) => ({
      elements: state.elements.map((el) =>
        el.id === id ? ({ ...el, ...updates, updatedAt: Date.now() } as CanvasElement) : el
      ),
    })),

  updateElements: (ids, updates) =>
    set((state) => {
      const idSet = new Set(ids);
      return {
        elements: state.elements.map((el) =>
          idSet.has(el.id) ? ({ ...el, ...updates, updatedAt: Date.now() } as CanvasElement) : el
        ),
      };
    }),

  commitSnapshot: (previousElementsOrEntry) =>
    set((state) => {
      const entry: CanvasHistoryEntry = Array.isArray(previousElementsOrEntry)
        ? { elements: previousElementsOrEntry, canvasBackgroundColor: state.canvasBackgroundColor }
        : previousElementsOrEntry;
      return {
        past: [...state.past.slice(-(MAX_HISTORY - 1)), entry],
        future: [],
      };
    }),

  removeElement: (id) =>
    set((state) => ({
      past: [
        ...state.past.slice(-(MAX_HISTORY - 1)),
        { elements: state.elements, canvasBackgroundColor: state.canvasBackgroundColor },
      ],
      future: [],
      elements: state.elements.filter((el) => el.id !== id),
      selectedElementIds: state.selectedElementIds.filter((selId) => selId !== id),
    })),

  removeElements: (ids) =>
    set((state) => {
      const idSet = new Set(ids);
      return {
        past: [
          ...state.past.slice(-(MAX_HISTORY - 1)),
          { elements: state.elements, canvasBackgroundColor: state.canvasBackgroundColor },
        ],
        future: [],
        elements: state.elements.filter((el) => !idSet.has(el.id)),
        selectedElementIds: state.selectedElementIds.filter((selId) => !idSet.has(selId)),
      };
    }),

  clearElements: () =>
    set((state) => ({
      past: [
        ...state.past.slice(-(MAX_HISTORY - 1)),
        { elements: state.elements, canvasBackgroundColor: state.canvasBackgroundColor },
      ],
      future: [],
      elements: [],
      selectedElementIds: [],
    })),

  setCanvasBackgroundColor: (color, commit = true) =>
    set((state) => {
      if (state.canvasBackgroundColor === color) return state;
      const past = commit
        ? [
            ...state.past.slice(-(MAX_HISTORY - 1)),
            { elements: state.elements, canvasBackgroundColor: state.canvasBackgroundColor },
          ]
        : state.past;
      return {
        canvasBackgroundColor: color,
        past,
        future: commit ? [] : state.future,
      };
    }),

  bringForward: (ids) =>
    set((state) => {
      const newElements = reorderLayers(state.elements, ids, "forward");
      return {
        past: [
          ...state.past.slice(-(MAX_HISTORY - 1)),
          { elements: state.elements, canvasBackgroundColor: state.canvasBackgroundColor },
        ],
        future: [],
        elements: newElements,
      };
    }),

  sendBackward: (ids) =>
    set((state) => {
      const newElements = reorderLayers(state.elements, ids, "backward");
      return {
        past: [
          ...state.past.slice(-(MAX_HISTORY - 1)),
          { elements: state.elements, canvasBackgroundColor: state.canvasBackgroundColor },
        ],
        future: [],
        elements: newElements,
      };
    }),

  bringToFront: (ids) =>
    set((state) => {
      const newElements = reorderLayers(state.elements, ids, "front");
      return {
        past: [
          ...state.past.slice(-(MAX_HISTORY - 1)),
          { elements: state.elements, canvasBackgroundColor: state.canvasBackgroundColor },
        ],
        future: [],
        elements: newElements,
      };
    }),

  sendToBack: (ids) =>
    set((state) => {
      const newElements = reorderLayers(state.elements, ids, "back");
      return {
        past: [
          ...state.past.slice(-(MAX_HISTORY - 1)),
          { elements: state.elements, canvasBackgroundColor: state.canvasBackgroundColor },
        ],
        future: [],
        elements: newElements,
      };
    }),

  undo: () =>
    set((state) => {
      if (state.past.length === 0) return state;
      const previous = state.past[state.past.length - 1];
      const newPast = state.past.slice(0, state.past.length - 1);
      const remainingIds = new Set(previous.elements.map((el) => el.id));

      return {
        past: newPast,
        future: [
          { elements: state.elements, canvasBackgroundColor: state.canvasBackgroundColor },
          ...state.future.slice(0, MAX_HISTORY - 1),
        ],
        elements: previous.elements,
        canvasBackgroundColor: previous.canvasBackgroundColor || state.canvasBackgroundColor,
        selectedElementIds: state.selectedElementIds.filter((id) => remainingIds.has(id)),
      };
    }),

  redo: () =>
    set((state) => {
      if (state.future.length === 0) return state;
      const next = state.future[0];
      const newFuture = state.future.slice(1);
      const remainingIds = new Set(next.elements.map((el) => el.id));

      return {
        past: [
          ...state.past.slice(-(MAX_HISTORY - 1)),
          { elements: state.elements, canvasBackgroundColor: state.canvasBackgroundColor },
        ],
        future: newFuture,
        elements: next.elements,
        canvasBackgroundColor: next.canvasBackgroundColor || state.canvasBackgroundColor,
        selectedElementIds: state.selectedElementIds.filter((id) => remainingIds.has(id)),
      };
    }),

  setSelectedElementIds: (selectedElementIds) => set({ selectedElementIds }),

  clearSelection: () => set({ selectedElementIds: [] }),

  setActiveTool: (activeTool) => set({ activeTool }),

  setViewport: (updates) =>
    set((state) => ({
      viewport: { ...state.viewport, ...updates },
    })),

  resetViewport: () => set({ viewport: DEFAULT_VIEWPORT }),
}));
