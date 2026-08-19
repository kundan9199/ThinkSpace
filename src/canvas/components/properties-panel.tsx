"use client";

import React, { useRef } from "react";
import { useCanvasStore } from "@/store/canvas/canvas-store";
import {
  CanvasElement,
  StrokeStyle,
  Sloppiness,
  Roundness,
  TextElement,
} from "@/types/canvas";
import { measureText } from "../geometry/text-measurement";
import {
  copyElementsToClipboard,
  cloneElementsWithNewIds,
} from "../core/clipboard";
import { exportCanvasToPng } from "../core/export";
import {
  AlignLeft,
  AlignCenter,
  AlignRight,
  Bold,
  Italic,
  Underline,
  ArrowUp,
  ArrowDown,
  ChevronsUp,
  ChevronsDown,
  Trash2,
  Copy,
  CopyPlus,
  Download,
  Layers,
  Sparkles,
} from "lucide-react";

// Standard ThinkSpace Color Swatches
const STROKE_COLORS = [
  "#f8fafc", // Pure / Slate-50
  "#94a3b8", // Slate-400
  "#38bdf8", // Sky-400 (ThinkSpace Cyan)
  "#3b82f6", // Blue-500
  "#4ade80", // Green-400
  "#fbbf24", // Amber-400
  "#f87171", // Red-400
  "#c084fc", // Purple-400
  "#f472b6", // Pink-400
];

const FILL_COLORS = [
  "transparent",
  "rgba(56, 189, 248, 0.15)", // Sky glass
  "rgba(59, 130, 246, 0.15)", // Blue glass
  "rgba(74, 222, 128, 0.15)", // Green glass
  "rgba(251, 191, 36, 0.15)", // Amber glass
  "rgba(248, 113, 113, 0.15)", // Red glass
  "rgba(192, 132, 252, 0.15)", // Purple glass
  "#1e293b", // Slate Dark
  "#334155", // Slate Medium
];

const FONT_FAMILIES = [
  { label: "Inter (Sans)", value: "Inter, sans-serif" },
  { label: "Arial", value: "Arial, sans-serif" },
  { label: "Helvetica", value: "Helvetica, sans-serif" },
  { label: "Georgia (Serif)", value: "Georgia, serif" },
  { label: "Courier (Mono)", value: "'Courier New', Courier, monospace" },
];

export function PropertiesPanel() {
  const elements = useCanvasStore((s) => s.elements);
  const selectedElementIds = useCanvasStore((s) => s.selectedElementIds);
  const activeTool = useCanvasStore((s) => s.activeTool);
  const canvasBackgroundColor = useCanvasStore((s) => s.canvasBackgroundColor);

  const addElements = useCanvasStore((s) => s.addElements);
  const updateElement = useCanvasStore((s) => s.updateElement);
  const updateElements = useCanvasStore((s) => s.updateElements);
  const commitSnapshot = useCanvasStore((s) => s.commitSnapshot);
  const removeElements = useCanvasStore((s) => s.removeElements);
  const setSelectedElementIds = useCanvasStore((s) => s.setSelectedElementIds);
  const clearSelection = useCanvasStore((s) => s.clearSelection);

  const bringForward = useCanvasStore((s) => s.bringForward);
  const sendBackward = useCanvasStore((s) => s.sendBackward);
  const bringToFront = useCanvasStore((s) => s.bringToFront);
  const sendToBack = useCanvasStore((s) => s.sendToBack);

  // Snapshot ref for continuous slider dragging
  const sliderInitialElementsRef = useRef<CanvasElement[] | null>(null);

  // Only show when elements are selected in select mode
  if (selectedElementIds.length === 0 || activeTool !== "select") {
    return null;
  }

  const selectedElements = elements.filter((el) =>
    selectedElementIds.includes(el.id)
  );
  if (selectedElements.length === 0) return null;

  // Inspect selection capabilities
  const hasText = selectedElements.some((el) => el.type === "text");
  const hasShapes = selectedElements.some((el) => el.type !== "text");
  const hasFill = selectedElements.some(
    (el) => el.type === "rectangle" || el.type === "ellipse"
  );
  const hasRectangle = selectedElements.some((el) => el.type === "rectangle");
  const firstEl = selectedElements[0];

  // Helper to commit snapshot before discrete property update
  const applyProperty = (
    updater: (el: CanvasElement) => Partial<CanvasElement>
  ) => {
    commitSnapshot(elements);
    selectedElements.forEach((el) => {
      const updates = updater(el);
      // If updating text font size/family/weight/italic, re-measure dimensions
      if (el.type === "text") {
        const textEl = el as TextElement;
        const newFontSize = (updates as Partial<TextElement>).fontSize ?? textEl.fontSize;
        const newFontFamily = (updates as Partial<TextElement>).fontFamily ?? textEl.fontFamily;
        const newFontWeight = (updates as Partial<TextElement>).fontWeight ?? textEl.fontWeight ?? "normal";
        const newItalic = (updates as Partial<TextElement>).italic ?? textEl.italic ?? false;
        const measured = measureText(
          textEl.text,
          newFontSize,
          newFontFamily,
          newFontWeight,
          newItalic
        );
        updateElement(el.id, {
          ...updates,
          width: measured.width,
          height: measured.height,
          lineHeight: measured.lineHeight,
        });
      } else {
        updateElement(el.id, updates);
      }
    });
  };

  // Slider interaction start / change / end
  const handleSliderPointerDown = () => {
    sliderInitialElementsRef.current = [...elements];
  };

  const handleOpacityChange = (value: number) => {
    updateElements(selectedElementIds, { opacity: value });
  };

  const handleSliderPointerUp = () => {
    if (sliderInitialElementsRef.current) {
      commitSnapshot(sliderInitialElementsRef.current);
      sliderInitialElementsRef.current = null;
    }
  };

  // Quick Action Handlers
  const handleCopy = () => {
    copyElementsToClipboard(selectedElements);
  };

  const handleDuplicate = () => {
    const maxZIndex = elements.reduce((max, el) => Math.max(max, el.zIndex ?? 0), 0);
    const clones = cloneElementsWithNewIds(selectedElements, { x: 20, y: 20 }, maxZIndex);
    addElements(clones);
    setSelectedElementIds(clones.map((c) => c.id));
  };

  const handleExportSelection = () => {
    exportCanvasToPng({
      elements,
      selectedIds: selectedElementIds,
      canvasBackgroundColor,
      onlySelected: true,
    });
  };

  // Title description
  const title =
    selectedElements.length === 1
      ? `${firstEl.type.charAt(0).toUpperCase() + firstEl.type.slice(1)}`
      : `${selectedElements.length} Elements Selected`;

  return (
    <div
      onPointerDown={(e) => e.stopPropagation()}
      className="absolute top-20 left-4 z-30 w-64 max-h-[calc(100vh-120px)] overflow-y-auto overflow-x-hidden rounded-2xl border border-border/80 bg-bg-secondary/90 backdrop-blur-xl p-3.5 shadow-2xl shadow-black/60 select-none text-text-primary text-xs space-y-4 font-sans custom-scrollbar"
    >
      {/* Panel Header */}
      <div className="flex items-center justify-between border-b border-border/60 pb-2">
        <div className="flex items-center gap-1.5 font-medium text-text-secondary">
          <Sparkles className="h-3.5 w-3.5 text-accent" />
          <span>{title}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleCopy}
            title="Copy (Ctrl+C)"
            className="p-1 rounded-lg text-text-muted hover:text-text-primary hover:bg-white/5 transition-colors"
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={handleDuplicate}
            title="Duplicate (Ctrl+D)"
            className="p-1 rounded-lg text-text-muted hover:text-text-primary hover:bg-white/5 transition-colors"
          >
            <CopyPlus className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={handleExportSelection}
            title="Export Selection as PNG"
            className="p-1 rounded-lg text-text-muted hover:text-accent hover:bg-accent/10 transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => {
              removeElements(selectedElementIds);
              clearSelection();
            }}
            title="Delete selected elements (Delete)"
            className="p-1 rounded-lg text-text-muted hover:text-danger hover:bg-danger/10 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* ── 1. Stroke / Color ────────────────────────────────────────────── */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">
          {hasText ? "Text / Stroke Color" : "Stroke Color"}
        </label>
        <div className="flex flex-wrap items-center gap-1.5">
          {STROKE_COLORS.map((color) => {
            const isSelected = firstEl.strokeColor === color;
            return (
              <button
                key={color}
                onClick={() => applyProperty(() => ({ strokeColor: color }))}
                style={{ backgroundColor: color }}
                title={color}
                className={`h-5 w-5 rounded-full border transition-all ${
                  isSelected
                    ? "border-accent ring-2 ring-accent/40 scale-110"
                    : "border-border/60 hover:scale-105"
                }`}
              />
            );
          })}
          {/* Custom color picker */}
          <label className="relative h-5 w-5 rounded-full border border-border/60 bg-gradient-to-tr from-accent to-pink-500 cursor-pointer flex items-center justify-center hover:scale-105 transition-all">
            <input
              type="color"
              value={firstEl.strokeColor || "#f8fafc"}
              onChange={(e) =>
                applyProperty(() => ({ strokeColor: e.target.value }))
              }
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
          </label>
        </div>
      </div>

      {/* ── 2. Background / Fill ─────────────────────────────────────────── */}
      {(hasFill || hasText) && (
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">
            {hasText ? "Text Background" : "Background / Fill"}
          </label>
          <div className="flex flex-wrap items-center gap-1.5">
            {FILL_COLORS.map((color) => {
              const isSelected =
                (firstEl.backgroundColor || "transparent") === color;
              const isTransparent = color === "transparent";

              return (
                <button
                  key={color}
                  onClick={() =>
                    applyProperty(() => ({ backgroundColor: color }))
                  }
                  style={isTransparent ? {} : { backgroundColor: color }}
                  title={isTransparent ? "Transparent / No fill" : color}
                  className={`h-5 w-5 rounded-full border transition-all flex items-center justify-center ${
                    isSelected
                      ? "border-accent ring-2 ring-accent/40 scale-110"
                      : "border-border/60 hover:scale-105"
                  } ${
                    isTransparent
                      ? "bg-bg-tertiary text-text-muted relative overflow-hidden"
                      : ""
                  }`}
                >
                  {isTransparent && (
                    <div className="w-full h-0.5 bg-danger rotate-45" />
                  )}
                </button>
              );
            })}
            {/* Custom fill color picker */}
            <label className="relative h-5 w-5 rounded-full border border-border/60 bg-gradient-to-tr from-accent to-purple-500 cursor-pointer flex items-center justify-center hover:scale-105 transition-all">
              <input
                type="color"
                value={
                  firstEl.backgroundColor && firstEl.backgroundColor !== "transparent"
                    ? firstEl.backgroundColor
                    : "#3b82f6"
                }
                onChange={(e) =>
                  applyProperty(() => ({ backgroundColor: e.target.value }))
                }
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
            </label>
          </div>
        </div>
      )}

      {/* ── 3. Stroke Width (Shapes only) ────────────────────────────────── */}
      {hasShapes && (
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">
            Stroke Width
          </label>
          <div className="grid grid-cols-3 gap-1 bg-bg-tertiary/60 p-1 rounded-xl border border-border/60">
            {[
              { label: "Thin", value: 1.5 },
              { label: "Medium", value: 3.5 },
              { label: "Thick", value: 6.5 },
            ].map(({ label, value }) => {
              const isSelected =
                Math.round(firstEl.strokeWidth) === Math.round(value);
              return (
                <button
                  key={label}
                  onClick={() =>
                    applyProperty(() => ({ strokeWidth: value }))
                  }
                  className={`py-1 rounded-lg text-[11px] font-medium transition-all ${
                    isSelected
                      ? "bg-accent/20 text-accent border border-accent/40 shadow-sm"
                      : "text-text-secondary hover:text-text-primary hover:bg-white/5"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── 4. Stroke Style (Solid / Dashed / Dotted) ─────────────────────── */}
      {hasShapes && (
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">
            Stroke Style
          </label>
          <div className="grid grid-cols-3 gap-1 bg-bg-tertiary/60 p-1 rounded-xl border border-border/60">
            {[
              { label: "Solid", value: "solid" as StrokeStyle, line: "————" },
              { label: "Dashed", value: "dashed" as StrokeStyle, line: "- - -" },
              { label: "Dotted", value: "dotted" as StrokeStyle, line: "· · ·" },
            ].map(({ label, value, line }) => {
              const currentStyle = firstEl.strokeStyle || "solid";
              const isSelected = currentStyle === value;
              return (
                <button
                  key={label}
                  onClick={() =>
                    applyProperty(() => ({ strokeStyle: value }))
                  }
                  title={label}
                  className={`py-1 flex flex-col items-center justify-center rounded-lg text-[11px] font-medium transition-all ${
                    isSelected
                      ? "bg-accent/20 text-accent border border-accent/40 shadow-sm"
                      : "text-text-secondary hover:text-text-primary hover:bg-white/5"
                  }`}
                >
                  <span className="font-mono text-[10px] leading-tight">
                    {line}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── 5. Sloppiness (Precise / Normal / Sketchy) ────────────────────── */}
      {hasShapes && (
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">
            Sloppiness
          </label>
          <div className="grid grid-cols-3 gap-1 bg-bg-tertiary/60 p-1 rounded-xl border border-border/60">
            {[
              { label: "Precise", value: "precise" as Sloppiness },
              { label: "Normal", value: "normal" as Sloppiness },
              { label: "Sketchy", value: "sketchy" as Sloppiness },
            ].map(({ label, value }) => {
              const currentSloppiness = firstEl.sloppiness || "normal";
              const isSelected = currentSloppiness === value;
              return (
                <button
                  key={label}
                  onClick={() =>
                    applyProperty(() => ({ sloppiness: value }))
                  }
                  className={`py-1 rounded-lg text-[11px] font-medium transition-all ${
                    isSelected
                      ? "bg-accent/20 text-accent border border-accent/40 shadow-sm"
                      : "text-text-secondary hover:text-text-primary hover:bg-white/5"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── 6. Edges / Corners (Rectangle only) ──────────────────────────── */}
      {hasRectangle && (
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">
            Corners
          </label>
          <div className="grid grid-cols-2 gap-1 bg-bg-tertiary/60 p-1 rounded-xl border border-border/60">
            {[
              { label: "Sharp", value: "sharp" as Roundness, radius: 0 },
              { label: "Rounded", value: "rounded" as Roundness, radius: 12 },
            ].map(({ label, value, radius }) => {
              const isSelected =
                (firstEl.roundness === "rounded" ||
                  (firstEl.type === "rectangle" &&
                    (firstEl as { cornerRadius?: number }).cornerRadius &&
                    (firstEl as { cornerRadius?: number }).cornerRadius! > 0)) ===
                (value === "rounded");

              return (
                <button
                  key={label}
                  onClick={() =>
                    applyProperty(() => ({
                      roundness: value,
                      cornerRadius: radius,
                    }))
                  }
                  className={`py-1 rounded-lg text-[11px] font-medium transition-all ${
                    isSelected
                      ? "bg-accent/20 text-accent border border-accent/40 shadow-sm"
                      : "text-text-secondary hover:text-text-primary hover:bg-white/5"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── 7. Text Properties ───────────────────────────────────────────── */}
      {hasText && (
        <div className="space-y-2 border-t border-border/60 pt-2.5">
          <label className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">
            Typography
          </label>

          {/* Font Family Dropdown */}
          <select
            value={
              (firstEl as TextElement).fontFamily || "Inter, sans-serif"
            }
            onChange={(e) =>
              applyProperty(() => ({ fontFamily: e.target.value }))
            }
            className="w-full bg-bg-tertiary border border-border/60 rounded-xl px-2.5 py-1.5 text-xs text-text-primary outline-none focus:border-accent"
          >
            {FONT_FAMILIES.map((font) => (
              <option key={font.value} value={font.value} className="bg-bg-secondary text-text-primary">
                {font.label}
              </option>
            ))}
          </select>

          {/* Font Size & Formats */}
          <div className="flex items-center gap-1.5">
            {/* Font Size Adjuster */}
            <div className="flex items-center bg-bg-tertiary border border-border/60 rounded-xl px-2 py-1">
              <button
                onClick={() => {
                  const curr = (firstEl as TextElement).fontSize || 20;
                  if (curr > 12) {
                    applyProperty(() => ({ fontSize: curr - 2 }));
                  }
                }}
                className="text-text-secondary hover:text-text-primary px-1 text-sm font-bold"
              >
                -
              </button>
              <span className="w-8 text-center font-mono text-xs font-semibold">
                {(firstEl as TextElement).fontSize || 20}
              </span>
              <button
                onClick={() => {
                  const curr = (firstEl as TextElement).fontSize || 20;
                  if (curr < 120) {
                    applyProperty(() => ({ fontSize: curr + 2 }));
                  }
                }}
                className="text-text-secondary hover:text-text-primary px-1 text-sm font-bold"
              >
                +
              </button>
            </div>

            {/* Bold Toggle */}
            <button
              onClick={() => {
                const isBold = (firstEl as TextElement).fontWeight === "bold";
                applyProperty(() => ({ fontWeight: isBold ? "normal" : "bold" }));
              }}
              title="Toggle Bold"
              className={`p-1.5 rounded-lg border transition-all ${
                (firstEl as TextElement).fontWeight === "bold"
                  ? "bg-accent/20 text-accent border-accent/40"
                  : "bg-bg-tertiary border-border/60 text-text-secondary hover:text-text-primary"
              }`}
            >
              <Bold className="h-3.5 w-3.5" />
            </button>

            {/* Italic Toggle */}
            <button
              onClick={() => {
                const isItalic = (firstEl as TextElement).italic === true;
                applyProperty(() => ({ italic: !isItalic }));
              }}
              title="Toggle Italic"
              className={`p-1.5 rounded-lg border transition-all ${
                (firstEl as TextElement).italic
                  ? "bg-accent/20 text-accent border-accent/40"
                  : "bg-bg-tertiary border-border/60 text-text-secondary hover:text-text-primary"
              }`}
            >
              <Italic className="h-3.5 w-3.5" />
            </button>

            {/* Underline Toggle */}
            <button
              onClick={() => {
                const isUnderline = (firstEl as TextElement).underline === true;
                applyProperty(() => ({ underline: !isUnderline }));
              }}
              title="Toggle Underline"
              className={`p-1.5 rounded-lg border transition-all ${
                (firstEl as TextElement).underline
                  ? "bg-accent/20 text-accent border-accent/40"
                  : "bg-bg-tertiary border-border/60 text-text-secondary hover:text-text-primary"
              }`}
            >
              <Underline className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Text Alignment */}
          <div className="grid grid-cols-3 gap-1 bg-bg-tertiary/60 p-1 rounded-xl border border-border/60">
            {[
              { align: "left" as const, icon: <AlignLeft className="h-3.5 w-3.5" /> },
              { align: "center" as const, icon: <AlignCenter className="h-3.5 w-3.5" /> },
              { align: "right" as const, icon: <AlignRight className="h-3.5 w-3.5" /> },
            ].map(({ align, icon }) => {
              const currentAlign = (firstEl as TextElement).textAlign || "left";
              const isSelected = currentAlign === align;
              return (
                <button
                  key={align}
                  onClick={() => applyProperty(() => ({ textAlign: align }))}
                  className={`py-1 flex items-center justify-center rounded-lg transition-all ${
                    isSelected
                      ? "bg-accent/20 text-accent border border-accent/40 shadow-sm"
                      : "text-text-secondary hover:text-text-primary hover:bg-white/5"
                  }`}
                >
                  {icon}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── 8. Opacity Slider ────────────────────────────────────────────── */}
      <div className="space-y-1.5 border-t border-border/60 pt-2.5">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">
            Opacity
          </label>
          <span className="font-mono text-xs font-semibold text-text-primary">
            {Math.round((firstEl.opacity ?? 1) * 100)}%
          </span>
        </div>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={firstEl.opacity ?? 1}
          onPointerDown={handleSliderPointerDown}
          onChange={(e) => handleOpacityChange(parseFloat(e.target.value))}
          onPointerUp={handleSliderPointerUp}
          className="w-full accent-accent h-1.5 bg-bg-tertiary rounded-lg appearance-none cursor-pointer"
        />
      </div>

      {/* ── 9. Layer Reordering ──────────────────────────────────────────── */}
      <div className="space-y-1.5 border-t border-border/60 pt-2.5">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-text-muted uppercase tracking-wider">
          <Layers className="h-3.5 w-3.5 text-accent" />
          <span>Layers</span>
        </div>
        <div className="grid grid-cols-4 gap-1 bg-bg-tertiary/60 p-1 rounded-xl border border-border/60">
          <button
            onClick={() => bringToFront(selectedElementIds)}
            title="Bring to Front"
            className="py-1 flex items-center justify-center rounded-lg text-text-secondary hover:text-text-primary hover:bg-white/5 transition-all"
          >
            <ChevronsUp className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => bringForward(selectedElementIds)}
            title="Bring Forward"
            className="py-1 flex items-center justify-center rounded-lg text-text-secondary hover:text-text-primary hover:bg-white/5 transition-all"
          >
            <ArrowUp className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => sendBackward(selectedElementIds)}
            title="Send Backward"
            className="py-1 flex items-center justify-center rounded-lg text-text-secondary hover:text-text-primary hover:bg-white/5 transition-all"
          >
            <ArrowDown className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => sendToBack(selectedElementIds)}
            title="Send to Back"
            className="py-1 flex items-center justify-center rounded-lg text-text-secondary hover:text-text-primary hover:bg-white/5 transition-all"
          >
            <ChevronsDown className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
