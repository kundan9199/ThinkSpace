"use client";

import React from "react";
import { cn } from "@/utils/cn";

/* ═══════════════════════════════════════════════════════════════
   Input
   ═══════════════════════════════════════════════════════════════ */

export type InputSize = "sm" | "md" | "lg";

export interface InputProps
  extends React.ComponentPropsWithoutRef<"input"> {
  /** Label displayed above the input */
  label?: string;
  /** Error message displayed below the input */
  error?: string;
  /** Helper text displayed below the input */
  helperText?: string;
  /** Input size variant */
  inputSize?: InputSize;
}

const sizeStyles: Record<InputSize, string> = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-3.5 text-sm",
  lg: "h-12 px-4 text-base",
};

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      helperText,
      inputSize = "md",
      className,
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-text-secondary"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            "w-full rounded-[var(--radius-md)] bg-bg-secondary",
            "border border-border text-text-primary",
            "placeholder:text-text-muted",
            "transition-all duration-200",
            "focus:border-border-active focus:ring-1 focus:ring-accent/40 focus:outline-none",
            error && "border-danger focus:border-danger focus:ring-danger/40",
            sizeStyles[inputSize],
            className
          )}
          aria-invalid={error ? "true" : undefined}
          aria-describedby={
            error
              ? `${inputId}-error`
              : helperText
                ? `${inputId}-helper`
                : undefined
          }
          {...props}
        />
        {error && (
          <p
            id={`${inputId}-error`}
            className="text-xs text-danger"
            role="alert"
          >
            {error}
          </p>
        )}
        {!error && helperText && (
          <p id={`${inputId}-helper`} className="text-xs text-text-muted">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
