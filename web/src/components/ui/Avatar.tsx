"use client";

import { forwardRef, HTMLAttributes, ReactNode } from "react";

type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl";
type PresenceStatus = "online" | "offline" | "away" | "busy" | "dnd";

interface AvatarProps extends HTMLAttributes<HTMLDivElement> {
  src?: string;
  alt?: string;
  fallback?: string | ReactNode;
  size?: AvatarSize;
  presence?: PresenceStatus;
  border?: boolean;
}

const sizeStyles: Record<AvatarSize, { container: string; text: string; presence: string }> = {
  xs: { container: "w-6 h-6", text: "text-xs", presence: "w-2 h-2 bottom-0 right-0" },
  sm: { container: "w-8 h-8", text: "text-sm", presence: "w-2.5 h-2.5 bottom-0 right-0" },
  md: { container: "w-10 h-10", text: "text-base", presence: "w-3 h-3 bottom-0 right-0" },
  lg: { container: "w-14 h-14", text: "text-lg", presence: "w-3.5 h-3.5 bottom-0.5 right-0.5" },
  xl: { container: "w-20 h-20", text: "text-2xl", presence: "w-4 h-4 bottom-1 right-1" },
};

const presenceColors: Record<PresenceStatus, string> = {
  online: "bg-success",
  offline: "bg-txt-muted",
  away: "bg-warning",
  busy: "bg-error",
  dnd: "bg-error",
};

export const Avatar = forwardRef<HTMLDivElement, AvatarProps>(
  ({ src, alt = "Avatar", fallback, size = "md", presence, border = false, className = "", ...props }, ref) => {
    const styles = sizeStyles[size];

    // Generate fallback text from alt or fallback prop
    const getFallbackText = () => {
      if (typeof fallback === "string") return fallback.slice(0, 2).toUpperCase();
      if (fallback) return fallback;
      return alt
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();
    };

    return (
      <div ref={ref} className={`relative inline-flex flex-shrink-0 ${styles.container} ${className}`} {...props}>
        {/* Avatar Circle */}
        <div
          className={`
            ${styles.container}
            rounded-full overflow-hidden
            bg-surface-secondary
            flex items-center justify-center
            ${border ? "ring-2 ring-border-strong" : ""}
          `}
        >
          {src ? (
            <img src={src} alt={alt} className="w-full h-full object-cover" />
          ) : (
            <span className={`font-medium text-txt-secondary ${styles.text}`}>{getFallbackText()}</span>
          )}
        </div>

        {/* Presence Indicator */}
        {presence && (
          <span
            className={`
              absolute ${styles.presence}
              rounded-full
              ${presenceColors[presence]}
              ring-2 ring-surface-primary
            `}
          />
        )}
      </div>
    );
  }
);

Avatar.displayName = "Avatar";

// Avatar Group
interface AvatarGroupProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  max?: number;
  size?: AvatarSize;
}

export const AvatarGroup = forwardRef<HTMLDivElement, AvatarGroupProps>(
  ({ children, max = 4, size = "md", className = "", ...props }, ref) => {
    const childArray = Array.isArray(children) ? children : [children];
    const visible = childArray.slice(0, max);
    const remaining = childArray.length - max;

    return (
      <div ref={ref} className={`flex -space-x-2 ${className}`} {...props}>
        {visible.map((child, index) => (
          <div key={index} className="relative" style={{ zIndex: visible.length - index }}>
            {child}
          </div>
        ))}
        {remaining > 0 && (
          <div
            className={`
              ${sizeStyles[size].container}
              rounded-full
              bg-surface-tertiary
              flex items-center justify-center
              ring-2 ring-surface-primary
              relative
            `}
            style={{ zIndex: 0 }}
          >
            <span className={`font-medium text-txt-secondary ${sizeStyles[size].text}`}>+{remaining}</span>
          </div>
        )}
      </div>
    );
  }
);

AvatarGroup.displayName = "AvatarGroup";

export default Avatar;
