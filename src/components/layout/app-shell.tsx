"use client";

import { cn } from "@/utils/cn";
import React from "react";

export interface AppShellProps {
  children: React.ReactNode;
  /** Optional navigation element rendered at the top */
  nav?: React.ReactNode;
  /** Apply the radial background gradient effect */
  withBackground?: boolean;
  /** Additional className for the main container */
  className?: string;
}

/**
 * AppShell — Full-page layout wrapper with optional navigation
 * and radial background gradient effect.
 */
export function AppShell({
  children,
  nav,
  withBackground = true,
  className,
}: AppShellProps) {
  return (
    <div
      className={cn(
        "flex min-h-screen flex-col",
        withBackground && "bg-gradient-radial"
      )}
    >
      {nav && <header className="relative z-10">{nav}</header>}
      <main className={cn("relative flex flex-1 flex-col", className)}>
        {children}
      </main>
    </div>
  );
}
