import React from "react";
import { cn } from "@/utils/cn";

/* ═══════════════════════════════════════════════════════════════
   Avatar
   ═══════════════════════════════════════════════════════════════ */

export type AvatarSize = "sm" | "md" | "lg";

export interface AvatarProps {
  /** User's display name (used for initials fallback and color) */
  name: string;
  /** Optional image URL */
  src?: string;
  /** Size variant */
  size?: AvatarSize;
  /** Additional className */
  className?: string;
}

const sizeStyles: Record<AvatarSize, string> = {
  sm: "w-7 h-7 text-xs",
  md: "w-9 h-9 text-sm",
  lg: "w-11 h-11 text-base",
};

/**
 * Generate a consistent hue from a name string.
 * Uses a simple hash to produce a value between 0–360.
 */
function nameToHue(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % 360;
}

/**
 * Extract initials from a name (up to 2 characters).
 */
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export function Avatar({ name, src, size = "md", className }: AvatarProps) {
  const hue = nameToHue(name);
  const initials = getInitials(name);

  if (src) {
    return (
      /* eslint-disable-next-line @next/next/no-img-element */
      <img
        src={src}
        alt={name}
        className={cn(
          "shrink-0 rounded-full object-cover",
          sizeStyles[size],
          className
        )}
      />
    );
  }

  return (
    <div
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-medium text-white",
        sizeStyles[size],
        className
      )}
      style={{ backgroundColor: `hsl(${hue}, 55%, 45%)` }}
      aria-label={name}
      role="img"
    >
      {initials}
    </div>
  );
}
