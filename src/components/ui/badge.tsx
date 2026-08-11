import React from "react";
import { cn } from "@/utils/cn";

/* ═══════════════════════════════════════════════════════════════
   Badge
   ═══════════════════════════════════════════════════════════════ */

export type BadgeVariant =
  | "default"
  | "accent"
  | "success"
  | "warning"
  | "danger";

export interface BadgeProps {
  /** Badge variant */
  variant?: BadgeVariant;
  /** Badge content */
  children: React.ReactNode;
  /** Additional className */
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: "bg-bg-tertiary text-text-secondary",
  accent: "bg-accent-muted text-accent",
  success: "bg-success-muted text-success",
  warning: "bg-warning-muted text-warning",
  danger: "bg-danger-muted text-danger",
};

export function Badge({
  variant = "default",
  children,
  className,
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5",
        "text-xs font-medium",
        variantStyles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
