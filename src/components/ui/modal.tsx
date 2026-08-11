"use client";

import React, { useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/utils/cn";

/* ═══════════════════════════════════════════════════════════════
   Modal
   ═══════════════════════════════════════════════════════════════ */

export interface ModalProps {
  /** Whether the modal is visible */
  isOpen: boolean;
  /** Callback when the modal should close */
  onClose: () => void;
  /** Modal title displayed in the header */
  title?: string;
  /** Modal content */
  children: React.ReactNode;
  /** Optional footer (e.g. action buttons) */
  footer?: React.ReactNode;
  /** Additional className for the modal panel */
  className?: string;
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  className,
}: ModalProps) {
  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (!isOpen) return;
    document.addEventListener("keydown", handleEscape);
    // Prevent body scroll when modal is open
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [isOpen, handleEscape]);

  if (!isOpen) return null;

  // SSR safety: only render portal on client
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        className={cn(
          "glass-strong relative mx-4 w-full max-w-md",
          "rounded-[var(--radius-xl)] p-0",
          "animate-scale-in",
          className
        )}
      >
        {/* Header */}
        {(title || true) && (
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            {title && (
              <h2 className="text-lg font-semibold text-text-primary">
                {title}
              </h2>
            )}
            <button
              onClick={onClose}
              className={cn(
                "ml-auto flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)]",
                "text-text-muted transition-colors",
                "hover:bg-surface-glass-light hover:text-text-primary",
                "focus-ring cursor-pointer"
              )}
              aria-label="Close modal"
            >
              <X size={18} />
            </button>
          </div>
        )}

        {/* Content */}
        <div className="px-5 py-4">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-3 border-t border-border px-5 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
