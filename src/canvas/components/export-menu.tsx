"use client";

import React, { useState, useRef, useEffect } from "react";
import { useCanvasStore } from "@/store/canvas/canvas-store";
import { exportCanvasToPng } from "../core/export";
import { Download, Image as ImageIcon, CheckSquare, Sparkles } from "lucide-react";

export interface ExportMenuProps {
  boardTitle?: string;
}

export function ExportMenu({ boardTitle = "thinkspace" }: ExportMenuProps) {
  const elements = useCanvasStore((s) => s.elements);
  const selectedElementIds = useCanvasStore((s) => s.selectedElementIds);
  const canvasBackgroundColor = useCanvasStore((s) => s.canvasBackgroundColor);

  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  const hasSelection = selectedElementIds.length > 0;
  const hasElements = elements.length > 0;

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

  const handleExportFull = async () => {
    if (isExporting || !hasElements) return;
    setIsExporting(true);
    try {
      await exportCanvasToPng({
        elements,
        canvasBackgroundColor,
        onlySelected: false,
        boardTitle,
      });
    } finally {
      setIsExporting(false);
      setIsOpen(false);
    }
  };

  const handleExportSelection = async () => {
    if (isExporting || !hasSelection) return;
    setIsExporting(true);
    try {
      await exportCanvasToPng({
        elements,
        selectedIds: selectedElementIds,
        canvasBackgroundColor,
        onlySelected: true,
        boardTitle,
      });
    } finally {
      setIsExporting(false);
      setIsOpen(false);
    }
  };

  return (
    <div className="relative" ref={popoverRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        title="Export Canvas / Selection as PNG"
        aria-label="Export Menu"
        className={`flex items-center gap-1.5 rounded-xl border border-border/80 bg-bg-secondary/80 backdrop-blur-xl px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary hover:bg-surface-glass-hover shadow-xl shadow-black/40 transition-all ${
          isOpen ? "border-accent/60 bg-bg-secondary/95 text-text-primary ring-1 ring-accent/30" : ""
        }`}
      >
        <Download className="h-3.5 w-3.5 text-accent" />
        <span className="font-medium hidden sm:inline">Export</span>
      </button>

      {isOpen && (
        <div
          onPointerDown={(e) => e.stopPropagation()}
          className="absolute top-full mt-2 right-0 z-40 w-56 rounded-2xl border border-border/80 bg-bg-secondary/95 backdrop-blur-2xl p-2 shadow-2xl shadow-black/70 select-none text-text-primary space-y-1 font-sans animate-scale-in"
        >
          <div className="px-2.5 py-1.5 text-[11px] font-semibold text-text-muted uppercase tracking-wider border-b border-border/50 flex items-center justify-between">
            <span>Export Image</span>
            <Sparkles className="h-3 w-3 text-accent" />
          </div>

          {/* Export Full Canvas */}
          <button
            onClick={handleExportFull}
            disabled={!hasElements || isExporting}
            className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-medium text-left transition-all ${
              !hasElements
                ? "text-text-muted/40 cursor-not-allowed"
                : "text-text-primary hover:bg-surface-glass-hover hover:text-accent"
            }`}
          >
            <ImageIcon className="h-4 w-4 shrink-0 text-accent" />
            <div className="flex flex-col">
              <span>Export Full Canvas</span>
              <span className="text-[10px] text-text-muted">PNG Image (High Res)</span>
            </div>
          </button>

          {/* Export Selection */}
          <button
            onClick={handleExportSelection}
            disabled={!hasSelection || isExporting}
            className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-medium text-left transition-all ${
              !hasSelection
                ? "text-text-muted/40 cursor-not-allowed"
                : "text-text-primary hover:bg-surface-glass-hover hover:text-accent"
            }`}
          >
            <CheckSquare className="h-4 w-4 shrink-0 text-accent" />
            <div className="flex flex-col">
              <span>Export Selection</span>
              <span className="text-[10px] text-text-muted">
                {hasSelection ? `${selectedElementIds.length} elements selected` : "No elements selected"}
              </span>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
