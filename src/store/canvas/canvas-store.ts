import { create } from "zustand";
import { CanvasElement, ToolType, ViewportState } from "@/types/canvas";

const MAX_HISTORY = 100;

export interface CanvasState {
  // Scene elements
  elements: CanvasElement[];

  // Selection
  selectedElementIds: string[];

  // Active Tool
  activeTool: ToolType;

  // Camera / Viewport
  viewport: ViewportState;

  // History Stacks
  past: CanvasElement[][];
  future: CanvasElement[][];

  // Actions
  setElements: (elements: CanvasElement[]) => void;
  addElement: (element: CanvasElement) => void;
  updateElement: (id: string, updates: Partial<CanvasElement>) => void;
  removeElement: (id: string) => void;
  removeElements: (ids: string[]) => void;
  clearElements: () => void;
  commitSnapshot: (previousElements: CanvasElement[]) => void;
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

export const useCanvasStore = create<CanvasState>((set) => ({
  elements: [],
  selectedElementIds: [],
  activeTool: "select",
  viewport: DEFAULT_VIEWPORT,
  past: [],
  future: [],

  setElements: (elements) => set({ elements }),

  addElement: (element) =>
    set((state) => ({
      past: [...state.past.slice(-(MAX_HISTORY - 1)), state.elements],
      future: [],
      elements: [...state.elements, element],
    })),

  updateElement: (id, updates) =>
    set((state) => ({
      elements: state.elements.map((el) =>
        el.id === id ? ({ ...el, ...updates, updatedAt: Date.now() } as CanvasElement) : el
      ),
    })),

  commitSnapshot: (previousElements) =>
    set((state) => ({
      past: [...state.past.slice(-(MAX_HISTORY - 1)), previousElements],
      future: [],
    })),

  removeElement: (id) =>
    set((state) => ({
      past: [...state.past.slice(-(MAX_HISTORY - 1)), state.elements],
      future: [],
      elements: state.elements.filter((el) => el.id !== id),
      selectedElementIds: state.selectedElementIds.filter((selId) => selId !== id),
    })),

  removeElements: (ids) =>
    set((state) => {
      const idSet = new Set(ids);
      return {
        past: [...state.past.slice(-(MAX_HISTORY - 1)), state.elements],
        future: [],
        elements: state.elements.filter((el) => !idSet.has(el.id)),
        selectedElementIds: state.selectedElementIds.filter((selId) => !idSet.has(selId)),
      };
    }),

  clearElements: () =>
    set((state) => ({
      past: [...state.past.slice(-(MAX_HISTORY - 1)), state.elements],
      future: [],
      elements: [],
      selectedElementIds: [],
    })),

  undo: () =>
    set((state) => {
      if (state.past.length === 0) return state;
      const previous = state.past[state.past.length - 1];
      const newPast = state.past.slice(0, state.past.length - 1);
      const remainingIds = new Set(previous.map((el) => el.id));

      return {
        past: newPast,
        future: [state.elements, ...state.future.slice(0, MAX_HISTORY - 1)],
        elements: previous,
        selectedElementIds: state.selectedElementIds.filter((id) => remainingIds.has(id)),
      };
    }),

  redo: () =>
    set((state) => {
      if (state.future.length === 0) return state;
      const next = state.future[0];
      const newFuture = state.future.slice(1);
      const remainingIds = new Set(next.map((el) => el.id));

      return {
        past: [...state.past.slice(-(MAX_HISTORY - 1)), state.elements],
        future: newFuture,
        elements: next,
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
