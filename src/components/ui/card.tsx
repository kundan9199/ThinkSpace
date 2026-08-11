import React from "react";
import { cn } from "@/utils/cn";

/* ═══════════════════════════════════════════════════════════════
   Card — Compound Component
   ═══════════════════════════════════════════════════════════════ */

export interface CardProps extends React.ComponentPropsWithoutRef<"div"> {
  /** Adds hover effects and cursor-pointer for clickable cards */
  interactive?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ interactive = false, className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "rounded-[var(--radius-lg)] border border-border bg-surface-glass shadow-glass backdrop-blur-xl",
          "transition-all duration-300",
          interactive &&
            "cursor-pointer hover:border-border-hover hover:shadow-accent",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = "Card";

/* ── Card Header ────────────────────────────────────────────── */

export const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<"div">
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "flex items-center gap-3 border-b border-border px-5 py-4",
        className
      )}
      {...props}
    />
  );
});

CardHeader.displayName = "CardHeader";

/* ── Card Content ───────────────────────────────────────────── */

export const CardContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<"div">
>(({ className, ...props }, ref) => {
  return <div ref={ref} className={cn("px-5 py-4", className)} {...props} />;
});

CardContent.displayName = "CardContent";

/* ── Card Footer ────────────────────────────────────────────── */

export const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<"div">
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "flex items-center justify-end gap-3 border-t border-border px-5 py-4",
        className
      )}
      {...props}
    />
  );
});

CardFooter.displayName = "CardFooter";
