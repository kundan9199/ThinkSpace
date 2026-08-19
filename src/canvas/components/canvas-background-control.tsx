"use client";

import React, { useState, useRef, useEffect } from "react";
import { useCanvasStore, DEFAULT_CANVAS_BG } from "@/store/canvas/canvas-store";
import { Palette, RotateCcw } from "lucide-react";

const CANVAS_BG_PRESETS = [
  { label: "Dark Navy (Default)", color: DEFAULT_CANVAS_BG },
  { label: "Deep Black", color: "#000000" },
  { label: "Charcoal", color: "#18181b" },
  { label: "Slate Night", color: "#0f172a" },
  { label: "Deep Indigo", color: "#1e1b4b" },
  { label: "Warm Dark", color: "#1c1917" },
  { label: "Paper White", color: "#ffffff" },
  { label: "Soft Cream", color: "#f8fafc" },
];

export function CanvasBackgroundControl() {
  const canvasBackgroundColor = useCanvasStore((s) => s.canvasBackgroundColor);
  const setCanvasBackgroundColor = useCanvasStore((s) => s.setCanvasBackgroundColor);
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close popup when clicking outside
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    window.addEventListener("mousedown", handleClickOutside);
    return () => window.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  return (
    <div className="relative" ref={popoverRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        title="Canvas Background Color"
        className={`flex items-center gap-1.5 rounded-xl border border-border/60 bg-bg-secondary/70 backdrop-blur-md px-2.5 py-1.5 text-xs text-text-secondary hover:text-text-primary hover:bg-surface-glass-hover shadow-lg transition-all ${
          isOpen ? "border-accent/60 bg-bg-secondary/90 text-text-primary ring-1 ring-accent/30" : ""
        }`}
      >
        <div
          className="h-3 w-3 rounded-full border border-border/80 shadow-sm"
          style={{ backgroundColor: canvasBackgroundColor }}
        />
        <Palette className="h-3.5 w-3.5 text-accent" />
        <span className="text-[11px] font-mono">Canvas</span>
      </button>

      {isOpen && (
        <div
          onPointerDown={(e) => e.stopPropagation()}
          className="absolute bottom-full mb-2 left-0 z-30 w-52 rounded-2xl border border-border/80 bg-bg-secondary/95 backdrop-blur-xl p-3 shadow-2xl shadow-black/60 select-none text-text-primary space-y-3"
        >
          <div className="flex items-center justify-between border-b border-border/60 pb-1.5">
            <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">
              Canvas Background
            </span>
            <button
              onClick={() => setCanvasBackgroundColor(DEFAULT_CANVAS_BG)}
              title="Reset to default background"
              className="p-1 rounded-lg text-text-muted hover:text-text-primary hover:bg-white/5 transition-colors"
            >
              <RotateCcw className="h-3 w-3" />
            </button>
          </div>

          {/* Preset Swatches */}
          <div className="grid grid-cols-4 gap-2">
            {CANVAS_BG_PRESETS.map((preset) => {
              const isSelected = canvasBackgroundColor.toLowerCase() === preset.color.toLowerCase();
              return (
                <button
                  key={preset.color}
                  onClick={() => setCanvasBackgroundColor(preset.color)}
                  title={preset.label}
                  style={{ backgroundColor: preset.color }}
                  className={`h-7 w-full rounded-lg border transition-all ${
                    isSelected
                      ? "border-accent ring-2 ring-accent/40 scale-105"
                      : "border-border/60 hover:scale-105"
                  }`}
                />
              );
            })}
          </div>

          {/* Custom Color Input */}
          <div className="flex items-center justify-between pt-1 border-t border-border/40">
            <span className="text-[11px] text-text-secondary">Custom Color</span>
            <label className="relative h-6 w-8 rounded-lg border border-border/60 bg-gradient-to-tr from-accent to-purple-500 cursor-pointer flex items-center justify-center hover:scale-105 transition-all">
              <input
                type="color"
                value={canvasBackgroundColor}
                onChange={(e) => setCanvasBackgroundColor(e.target.value)}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
