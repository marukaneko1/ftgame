"use client";

import { forwardRef, HTMLAttributes, ReactNode } from "react";

type CardVariant = "default" | "elevated" | "glass" | "neon";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  padding?: "none" | "sm" | "md" | "lg";
  hover?: boolean;
  children: ReactNode;
}

const variantStyles: Record<CardVariant, string> = {
  default: `
    bg-surface-primary
    border border-border-default
    rounded-lg
    shadow-md
  `,
  elevated: `
    bg-surface-secondary
    border border-border-strong
    rounded-lg
    shadow-lg
  `,
  glass: `
    bg-glass-bg backdrop-blur-glass
    border border-glass-border
    rounded-lg
    shadow-lg
  `,
  neon: `
    bg-surface-primary
    border border-accent/30
    rounded-lg
    shadow-glow-purple
  `,
};

const paddingStyles = {
  none: "",
  sm: "p-3",
  md: "p-4",
  lg: "p-6",
};

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ variant = "default", padding = "md", hover = false, children, className = "", ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`
          ${variantStyles[variant]}
          ${paddingStyles[padding]}
          ${hover ? "transition-all duration-fast hover:border-accent/50 hover:shadow-glow-purple cursor-pointer" : ""}
          ${className}
        `}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = "Card";

// Card Header
interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ children, className = "", ...props }, ref) => {
    return (
      <div ref={ref} className={`mb-4 ${className}`} {...props}>
        {children}
      </div>
    );
  }
);

CardHeader.displayName = "CardHeader";

// Card Title
interface CardTitleProps extends HTMLAttributes<HTMLHeadingElement> {
  children: ReactNode;
  as?: "h1" | "h2" | "h3" | "h4";
}

export const CardTitle = forwardRef<HTMLHeadingElement, CardTitleProps>(
  ({ children, as: Tag = "h3", className = "", ...props }, ref) => {
    return (
      <Tag
        ref={ref}
        className={`text-xl font-display text-txt-primary tracking-tight ${className}`}
        {...props}
      >
        {children}
      </Tag>
    );
  }
);

CardTitle.displayName = "CardTitle";

// Card Description
interface CardDescriptionProps extends HTMLAttributes<HTMLParagraphElement> {
  children: ReactNode;
}

export const CardDescription = forwardRef<HTMLParagraphElement, CardDescriptionProps>(
  ({ children, className = "", ...props }, ref) => {
    return (
      <p ref={ref} className={`text-sm text-txt-secondary mt-1 ${className}`} {...props}>
        {children}
      </p>
    );
  }
);

CardDescription.displayName = "CardDescription";

// Card Content
interface CardContentProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export const CardContent = forwardRef<HTMLDivElement, CardContentProps>(
  ({ children, className = "", ...props }, ref) => {
    return (
      <div ref={ref} className={className} {...props}>
        {children}
      </div>
    );
  }
);

CardContent.displayName = "CardContent";

// Card Footer
interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export const CardFooter = forwardRef<HTMLDivElement, CardFooterProps>(
  ({ children, className = "", ...props }, ref) => {
    return (
      <div ref={ref} className={`mt-4 pt-4 border-t border-border-subtle ${className}`} {...props}>
        {children}
      </div>
    );
  }
);

CardFooter.displayName = "CardFooter";

export default Card;
