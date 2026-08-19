import { create } from "zustand";
import { CanvasElement, ToolType, ViewportState } from "@/types/canvas";

export interface CanvasState {
  // Scene elements
  elements: CanvasElement[];

  // Selection
  selectedElementIds: string[];

  // Active Tool
  activeTool: ToolType;

  // Camera / Viewport
  viewport: ViewportState;

  // Actions
  setElements: (elements: CanvasElement[]) => void;
  addElement: (element: CanvasElement) => void;
  updateElement: (id: string, updates: Partial<CanvasElement>) => void;
  removeElement: (id: string) => void;
  clearElements: () => void;
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

  setElements: (elements) => set({ elements }),

  addElement: (element) =>
    set((state) => ({
      elements: [...state.elements, element],
    })),

  updateElement: (id, updates) =>
    set((state) => ({
      elements: state.elements.map((el) =>
        el.id === id ? ({ ...el, ...updates, updatedAt: Date.now() } as CanvasElement) : el
      ),
    })),

  removeElement: (id) =>
    set((state) => ({
      elements: state.elements.filter((el) => el.id !== id),
      selectedElementIds: state.selectedElementIds.filter((selId) => selId !== id),
    })),

  clearElements: () => set({ elements: [], selectedElementIds: [] }),

  setSelectedElementIds: (selectedElementIds) => set({ selectedElementIds }),

  clearSelection: () => set({ selectedElementIds: [] }),

  setActiveTool: (activeTool) => set({ activeTool }),

  setViewport: (updates) =>
    set((state) => ({
      viewport: { ...state.viewport, ...updates },
    })),

  resetViewport: () => set({ viewport: DEFAULT_VIEWPORT }),
}));
