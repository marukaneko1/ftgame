"use client";

import { forwardRef, HTMLAttributes } from "react";

// Progress Bar
interface ProgressBarProps extends HTMLAttributes<HTMLDivElement> {
  value: number;
  max?: number;
  variant?: "default" | "accent" | "success" | "warning" | "error";
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  animated?: boolean;
}

const variantColors = {
  default: "bg-txt-secondary",
  accent: "bg-accent",
  success: "bg-success",
  warning: "bg-warning",
  error: "bg-error",
};

const sizeStyles = {
  sm: "h-1",
  md: "h-2",
  lg: "h-3",
};

export const ProgressBar = forwardRef<HTMLDivElement, ProgressBarProps>(
  ({ value, max = 100, variant = "accent", size = "md", showLabel = false, animated = false, className = "", ...props }, ref) => {
    const percentage = Math.min(100, Math.max(0, (value / max) * 100));

    return (
      <div ref={ref} className={`w-full ${className}`} {...props}>
        {showLabel && (
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-sm text-txt-secondary">Progress</span>
            <span className="text-sm font-mono text-txt-primary">{Math.round(percentage)}%</span>
          </div>
        )}
        <div className={`w-full ${sizeStyles[size]} bg-surface-tertiary rounded-full overflow-hidden`}>
          <div
            className={`
              h-full ${variantColors[variant]} rounded-full
              transition-all duration-slow ease-default
              ${animated ? "animate-shimmer bg-gradient-to-r from-transparent via-white/20 to-transparent bg-[length:200%_100%]" : ""}
            `}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    );
  }
);

ProgressBar.displayName = "ProgressBar";

// Loading Spinner
interface SpinnerProps extends HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg" | "xl";
  variant?: "default" | "accent";
}

const spinnerSizes = {
  sm: "w-4 h-4 border-2",
  md: "w-6 h-6 border-2",
  lg: "w-8 h-8 border-3",
  xl: "w-12 h-12 border-4",
};

export const Spinner = forwardRef<HTMLDivElement, SpinnerProps>(
  ({ size = "md", variant = "accent", className = "", ...props }, ref) => {
    return (
      <div ref={ref} className={`${className}`} {...props}>
        <div
          className={`
            ${spinnerSizes[size]}
            rounded-full
            border-surface-tertiary
            ${variant === "accent" ? "border-t-accent" : "border-t-txt-primary"}
            animate-spin
          `}
        />
      </div>
    );
  }
);

Spinner.displayName = "Spinner";

// Skeleton Loader
interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "text" | "circular" | "rectangular" | "rounded";
  width?: string | number;
  height?: string | number;
  lines?: number;
}

export const Skeleton = forwardRef<HTMLDivElement, SkeletonProps>(
  ({ variant = "text", width, height, lines = 1, className = "", ...props }, ref) => {
    const getVariantStyles = () => {
      switch (variant) {
        case "circular":
          return "rounded-full aspect-square";
        case "rectangular":
          return "rounded-none";
        case "rounded":
          return "rounded-lg";
        case "text":
        default:
          return "rounded h-4";
      }
    };

    const style = {
      width: width || (variant === "text" ? "100%" : undefined),
      height: height || undefined,
    };

    if (variant === "text" && lines > 1) {
      return (
        <div ref={ref} className={`space-y-2 ${className}`} {...props}>
          {Array.from({ length: lines }).map((_, i) => (
            <div
              key={i}
              className={`skeleton h-4 ${i === lines - 1 ? "w-3/4" : "w-full"}`}
              style={i === lines - 1 ? {} : style}
            />
          ))}
        </div>
      );
    }

    return <div ref={ref} className={`skeleton ${getVariantStyles()} ${className}`} style={style} {...props} />;
  }
);

Skeleton.displayName = "Skeleton";

// Slot-machine style spinner (for casino vibe)
interface SlotSpinnerProps extends HTMLAttributes<HTMLDivElement> {
  label?: string;
}

export const SlotSpinner = forwardRef<HTMLDivElement, SlotSpinnerProps>(
  ({ label = "Loading", className = "", ...props }, ref) => {
    return (
      <div ref={ref} className={`flex flex-col items-center gap-3 ${className}`} {...props}>
        <div className="relative flex gap-1">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-8 h-10 bg-surface-secondary rounded-md border border-border-default overflow-hidden"
            >
              <div
                className="flex flex-col items-center justify-center animate-spin"
                style={{
                  animationDuration: `${0.5 + i * 0.1}s`,
                  animationTimingFunction: "linear",
                }}
              >
                {["🎰", "💎", "🎯", "⭐"].map((emoji, j) => (
                  <span key={j} className="text-lg leading-10">
                    {emoji}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
        <p className="text-sm text-txt-secondary animate-pulse">{label}</p>
      </div>
    );
  }
);

SlotSpinner.displayName = "SlotSpinner";

export default ProgressBar;
