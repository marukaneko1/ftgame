"use client";

import { forwardRef, InputHTMLAttributes, TextareaHTMLAttributes, ReactNode } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: ReactNode;
  iconPosition?: "left" | "right";
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, icon, iconPosition = "left", className = "", id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-txt-secondary mb-1.5">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && iconPosition === "left" && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-txt-muted">{icon}</div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={`
              w-full px-4 py-2.5
              bg-surface-primary text-txt-primary placeholder:text-txt-muted
              border rounded-lg
              transition-all duration-fast
              focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent
              disabled:opacity-50 disabled:cursor-not-allowed
              ${error ? "border-error focus:ring-error/50 focus:border-error" : "border-border-default hover:border-border-strong"}
              ${icon && iconPosition === "left" ? "pl-10" : ""}
              ${icon && iconPosition === "right" ? "pr-10" : ""}
              ${className}
            `}
            {...props}
          />
          {icon && iconPosition === "right" && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-txt-muted">{icon}</div>
          )}
        </div>
        {error && <p className="mt-1.5 text-sm text-error">{error}</p>}
        {hint && !error && <p className="mt-1.5 text-sm text-txt-muted">{hint}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";

// Textarea variant
interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, className = "", id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-txt-secondary mb-1.5">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          className={`
            w-full px-4 py-2.5 min-h-[100px]
            bg-surface-primary text-txt-primary placeholder:text-txt-muted
            border rounded-lg resize-y
            transition-all duration-fast
            focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent
            disabled:opacity-50 disabled:cursor-not-allowed
            ${error ? "border-error focus:ring-error/50 focus:border-error" : "border-border-default hover:border-border-strong"}
            ${className}
          `}
          {...props}
        />
        {error && <p className="mt-1.5 text-sm text-error">{error}</p>}
        {hint && !error && <p className="mt-1.5 text-sm text-txt-muted">{hint}</p>}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";

// Select variant
interface SelectProps extends InputHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  options: { value: string; label: string }[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, hint, options, className = "", id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-txt-secondary mb-1.5">
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={inputId}
            className={`
              w-full px-4 py-2.5 pr-10 appearance-none
              bg-surface-primary text-txt-primary
              border rounded-lg cursor-pointer
              transition-all duration-fast
              focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent
              disabled:opacity-50 disabled:cursor-not-allowed
              ${error ? "border-error focus:ring-error/50 focus:border-error" : "border-border-default hover:border-border-strong"}
              ${className}
            `}
            {...props}
          >
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-txt-muted">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
        {error && <p className="mt-1.5 text-sm text-error">{error}</p>}
        {hint && !error && <p className="mt-1.5 text-sm text-txt-muted">{hint}</p>}
      </div>
    );
  }
);

Select.displayName = "Select";

// Search Input variant
interface SearchInputProps extends Omit<InputProps, "icon" | "iconPosition"> {
  onClear?: () => void;
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  ({ onClear, value, className = "", ...props }, ref) => {
    return (
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-txt-muted">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input
          ref={ref}
          type="search"
          value={value}
          className={`
            w-full pl-10 pr-10 py-2.5
            bg-surface-primary text-txt-primary placeholder:text-txt-muted
            border border-border-default rounded-lg
            transition-all duration-fast
            hover:border-border-strong
            focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent
            ${className}
          `}
          {...props}
        />
        {value && onClear && (
          <button
            type="button"
            onClick={onClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-txt-muted hover:text-txt-primary transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    );
  }
);

SearchInput.displayName = "SearchInput";

export default Input;
