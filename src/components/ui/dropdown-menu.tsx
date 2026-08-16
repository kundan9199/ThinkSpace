"use client";

import React, { useState, useRef, useEffect } from "react";
import { cn } from "@/utils/cn";

/* ═══════════════════════════════════════════════════════════════
   DropdownMenu
   ═══════════════════════════════════════════════════════════════ */

export interface DropdownMenuProps {
  /** The clickable element that toggles the dropdown */
  trigger: React.ReactNode;
  /** Menu items or separators */
  children: React.ReactNode;
  /** Horizontal alignment of the menu panel */
  align?: "left" | "right";
  /** Additional className for the dropdown container */
  className?: string;
}

export function DropdownMenu({
  trigger,
  children,
  align = "left",
  className,
}: DropdownMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className={cn("relative inline-block", className)}>
      <div
        onClick={() => setIsOpen((prev) => !prev)}
        className="cursor-pointer"
        role="button"
        tabIndex={0}
        aria-haspopup="true"
        aria-expanded={isOpen}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setIsOpen((prev) => !prev);
          }
        }}
      >
        {trigger}
      </div>

      {isOpen && (
        <div
          className={cn(
            "glass-strong absolute top-full z-50 mt-2 min-w-[180px] py-1 shadow-glass-lg animate-scale-in",
            align === "left" ? "left-0" : "right-0"
          )}
          role="menu"
        >
          {children}
        </div>
      )}
    </div>
  );
}

/* ── DropdownMenuItem ────────────────────────────────────────── */

export interface DropdownMenuItemProps {
  children: React.ReactNode;
  onClick?: () => void;
  icon?: React.ReactNode;
  destructive?: boolean;
  disabled?: boolean;
  className?: string;
}

export function DropdownMenuItem({
  children,
  onClick,
  icon,
  destructive = false,
  disabled = false,
  className,
}: DropdownMenuItemProps) {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors cursor-pointer",
        destructive
          ? "text-danger hover:bg-danger-muted"
          : "text-text-secondary hover:bg-surface-glass-light hover:text-text-primary",
        disabled && "pointer-events-none opacity-50",
        className
      )}
    >
      {icon && <span className="shrink-0 text-current">{icon}</span>}
      <span className="truncate">{children}</span>
    </button>
  );
}

/* ── DropdownMenuSeparator ───────────────────────────────────── */

export function DropdownMenuSeparator() {
  return <div className="my-1 border-t border-border" role="separator" />;
}
