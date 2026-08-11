import React from "react";
import { cn } from "@/utils/cn";

/* ═══════════════════════════════════════════════════════════════
   Spinner
   ═══════════════════════════════════════════════════════════════ */

export type SpinnerSize = "sm" | "md" | "lg";

export interface SpinnerProps {
  /** Size variant */
  size?: SpinnerSize;
  /** Additional className */
  className?: string;
}

const sizeStyles: Record<SpinnerSize, { className: string; stroke: number }> = {
  sm: { className: "w-4 h-4", stroke: 3 },
  md: { className: "w-6 h-6", stroke: 2.5 },
  lg: { className: "w-8 h-8", stroke: 2 },
};

export function Spinner({ size = "md", className }: SpinnerProps) {
  const { className: sizeClass, stroke } = sizeStyles[size];

  return (
    <svg
      className={cn("animate-spin text-accent", sizeClass, className)}
      viewBox="0 0 24 24"
      fill="none"
      aria-label="Loading"
      role="status"
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth={stroke}
        className="opacity-20"
      />
      <path
        d="M12 2a10 10 0 019.95 9"
        stroke="currentColor"
        strokeWidth={stroke}
        strokeLinecap="round"
      />
    </svg>
  );
}
