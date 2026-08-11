"use client";

import React, { useState, useRef, useCallback, useId } from "react";
import { cn } from "@/utils/cn";

/* ═══════════════════════════════════════════════════════════════
   Tooltip
   ═══════════════════════════════════════════════════════════════ */

export type TooltipSide = "top" | "bottom" | "left" | "right";

export interface TooltipProps {
  /** Tooltip text content */
  content: string;
  /** The trigger element */
  children: React.ReactNode;
  /** Position relative to the trigger */
  side?: TooltipSide;
  /** Delay in ms before showing */
  delayMs?: number;
  /** Additional className for the tooltip */
  className?: string;
}

const sideStyles: Record<TooltipSide, string> = {
  top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
  bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
  left: "right-full top-1/2 -translate-y-1/2 mr-2",
  right: "left-full top-1/2 -translate-y-1/2 ml-2",
};

export function Tooltip({
  content,
  children,
  side = "top",
  delayMs = 300,
  className,
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tooltipId = useId();

  const show = useCallback(() => {
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delayMs);
  }, [delayMs]);

  const hide = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsVisible(false);
  }, []);

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      <div aria-describedby={isVisible ? tooltipId : undefined}>
        {children}
      </div>

      {isVisible && (
        <div
          id={tooltipId}
          role="tooltip"
          className={cn(
            "glass-light pointer-events-none absolute z-50",
            "whitespace-nowrap px-2.5 py-1.5",
            "text-xs font-medium text-text-secondary",
            "animate-fade-in",
            sideStyles[side],
            className
          )}
        >
          {content}
        </div>
      )}
    </div>
  );
}
