"use client";

import React from "react";
import { cn } from "@/utils/cn";
import { Tooltip, TooltipSide } from "@/components/ui/tooltip";

/* ═══════════════════════════════════════════════════════════════
   IconButton
   ═══════════════════════════════════════════════════════════════ */

export type IconButtonVariant = "ghost" | "glass";
export type IconButtonSize = "sm" | "md" | "lg";

export interface IconButtonProps
  extends React.ComponentPropsWithoutRef<"button"> {
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  isActive?: boolean;
  tooltip?: string;
  tooltipSide?: TooltipSide;
}

const variantStyles: Record<IconButtonVariant, string> = {
  ghost:
    "bg-transparent text-text-secondary hover:bg-surface-glass-light hover:text-text-primary",
  glass:
    "bg-surface-glass border border-border text-text-primary hover:border-border-hover hover:bg-surface-glass-strong",
};

const sizeStyles: Record<IconButtonSize, string> = {
  sm: "w-8 h-8 text-xs",
  md: "w-9 h-9 text-sm",
  lg: "w-10 h-10 text-base",
};

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      variant = "ghost",
      size = "md",
      isActive = false,
      tooltip,
      tooltipSide = "top",
      className,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const button = (
      <button
        ref={ref}
        disabled={disabled}
        className={cn(
          "inline-flex cursor-pointer items-center justify-center font-medium",
          "rounded-[var(--radius-md)] transition-all duration-200",
          "focus-ring",
          "disabled:pointer-events-none disabled:opacity-50",
          variantStyles[variant],
          sizeStyles[size],
          isActive &&
            "bg-accent-muted border-border-active text-accent shadow-accent",
          className
        )}
        {...props}
      >
        {children}
      </button>
    );

    if (tooltip) {
      return (
        <Tooltip content={tooltip} side={tooltipSide}>
          {button}
        </Tooltip>
      );
    }

    return button;
  }
);

IconButton.displayName = "IconButton";
