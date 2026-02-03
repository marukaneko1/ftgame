"use client";

import { forwardRef, HTMLAttributes, ReactNode } from "react";

type BadgeVariant = "default" | "success" | "warning" | "error" | "info" | "accent" | "gold";
type BadgeSize = "sm" | "md";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  pulse?: boolean;
  dot?: boolean;
  children: ReactNode;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: "bg-surface-tertiary text-txt-secondary border-border-default",
  success: "bg-success-muted text-success border-success/30",
  warning: "bg-warning-muted text-warning border-warning/30",
  error: "bg-error-muted text-error border-error/30",
  info: "bg-info-muted text-info border-info/30",
  accent: "bg-accent-muted text-accent border-accent/30",
  gold: "bg-gold/20 text-gold border-gold/30",
};

const sizeStyles: Record<BadgeSize, string> = {
  sm: "px-2 py-0.5 text-xs",
  md: "px-2.5 py-1 text-sm",
};

const dotColors: Record<BadgeVariant, string> = {
  default: "bg-txt-muted",
  success: "bg-success",
  warning: "bg-warning",
  error: "bg-error",
  info: "bg-info",
  accent: "bg-accent",
  gold: "bg-gold",
};

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ variant = "default", size = "sm", pulse = false, dot = false, children, className = "", ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={`
          inline-flex items-center gap-1.5
          font-medium rounded-pill border
          ${variantStyles[variant]}
          ${sizeStyles[size]}
          ${className}
        `}
        {...props}
      >
        {dot && (
          <span className="relative flex h-2 w-2">
            {pulse && (
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${dotColors[variant]}`}
              />
            )}
            <span className={`relative inline-flex rounded-full h-2 w-2 ${dotColors[variant]}`} />
          </span>
        )}
        {children}
      </span>
    );
  }
);

Badge.displayName = "Badge";

// Status Badge - Pre-configured for common statuses
type StatusType = "live" | "searching" | "queued" | "verified" | "offline" | "banned" | "vip";

const statusConfig: Record<StatusType, { variant: BadgeVariant; label: string; pulse?: boolean }> = {
  live: { variant: "success", label: "Live", pulse: true },
  searching: { variant: "accent", label: "Searching", pulse: true },
  queued: { variant: "info", label: "In Queue" },
  verified: { variant: "success", label: "Verified" },
  offline: { variant: "default", label: "Offline" },
  banned: { variant: "error", label: "Banned" },
  vip: { variant: "gold", label: "VIP" },
};

interface StatusBadgeProps extends Omit<BadgeProps, "variant" | "children"> {
  status: StatusType;
}

export const StatusBadge = forwardRef<HTMLSpanElement, StatusBadgeProps>(
  ({ status, ...props }, ref) => {
    const config = statusConfig[status];
    return (
      <Badge ref={ref} variant={config.variant} dot pulse={config.pulse} {...props}>
        {config.label}
      </Badge>
    );
  }
);

StatusBadge.displayName = "StatusBadge";

// Chip variant - for filters/tags that can be selected
interface ChipProps extends HTMLAttributes<HTMLButtonElement> {
  selected?: boolean;
  children: ReactNode;
}

export const Chip = forwardRef<HTMLButtonElement, ChipProps>(
  ({ selected = false, children, className = "", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={`
          inline-flex items-center gap-1.5 px-3 py-1.5
          text-sm font-medium rounded-pill border
          transition-all duration-fast
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent
          ${
            selected
              ? "bg-accent text-base border-accent shadow-glow-purple"
              : "bg-surface-primary text-txt-secondary border-border-default hover:border-accent/50 hover:text-txt-primary"
          }
          ${className}
        `}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Chip.displayName = "Chip";

export default Badge;
