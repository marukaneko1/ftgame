"use client";

import { forwardRef, ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "success";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: ReactNode;
  iconPosition?: "left" | "right";
  fullWidth?: boolean;
  children: ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: `
    bg-accent text-base font-semibold
    border border-accent/50
    shadow-glow-purple
    hover:bg-accent-hover hover:shadow-[0_0_30px_var(--color-accent-primary-glow)]
    active:scale-[0.98]
    disabled:opacity-50 disabled:shadow-none disabled:hover:bg-accent
  `,
  secondary: `
    bg-surface-secondary text-txt-primary font-medium
    border border-border-strong
    shadow-md
    hover:bg-surface-tertiary hover:border-accent/30
    active:scale-[0.98]
    disabled:opacity-50 disabled:hover:bg-surface-secondary
  `,
  ghost: `
    bg-transparent text-txt-secondary font-medium
    border border-transparent
    hover:bg-surface-primary hover:text-txt-primary hover:border-border-default
    active:scale-[0.98]
    disabled:opacity-50 disabled:hover:bg-transparent
  `,
  danger: `
    bg-error/20 text-error font-semibold
    border border-error/30
    hover:bg-error/30 hover:border-error/50
    active:scale-[0.98]
    disabled:opacity-50 disabled:hover:bg-error/20
  `,
  success: `
    bg-success/20 text-success font-semibold
    border border-success/30
    shadow-[0_0_15px_var(--color-success-muted)]
    hover:bg-success/30 hover:border-success/50
    active:scale-[0.98]
    disabled:opacity-50 disabled:hover:bg-success/20
  `,
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-sm rounded-md gap-1.5",
  md: "px-4 py-2.5 text-base rounded-lg gap-2",
  lg: "px-6 py-3 text-lg rounded-lg gap-2.5",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      loading = false,
      icon,
      iconPosition = "left",
      fullWidth = false,
      children,
      className = "",
      disabled,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        className={`
          inline-flex items-center justify-center
          transition-all duration-fast ease-default
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-base
          ${variantStyles[variant]}
          ${sizeStyles[size]}
          ${fullWidth ? "w-full" : ""}
          ${isDisabled ? "cursor-not-allowed" : "cursor-pointer"}
          ${className}
        `}
        disabled={isDisabled}
        {...props}
      >
        {loading ? (
          <>
            <LoadingSpinner size={size} />
            <span className="ml-2">{children}</span>
          </>
        ) : (
          <>
            {icon && iconPosition === "left" && <span className="flex-shrink-0">{icon}</span>}
            {children}
            {icon && iconPosition === "right" && <span className="flex-shrink-0">{icon}</span>}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = "Button";

// Icon Button variant
interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
  label: string; // For accessibility
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ variant = "ghost", size = "md", children, label, className = "", ...props }, ref) => {
    const iconSizes: Record<ButtonSize, string> = {
      sm: "p-1.5 rounded-md",
      md: "p-2 rounded-lg",
      lg: "p-3 rounded-lg",
    };

    return (
      <button
        ref={ref}
        aria-label={label}
        className={`
          inline-flex items-center justify-center
          transition-all duration-fast ease-default
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-base
          ${variantStyles[variant]}
          ${iconSizes[size]}
          ${className}
        `}
        {...props}
      >
        {children}
      </button>
    );
  }
);

IconButton.displayName = "IconButton";

// Loading Spinner component
function LoadingSpinner({ size }: { size: ButtonSize }) {
  const spinnerSizes: Record<ButtonSize, string> = {
    sm: "w-3.5 h-3.5",
    md: "w-4 h-4",
    lg: "w-5 h-5",
  };

  return (
    <svg
      className={`animate-spin ${spinnerSizes[size]}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

export default Button;
