"use client";

import { createContext, useContext, useState, useCallback, ReactNode, forwardRef, HTMLAttributes } from "react";
import { createPortal } from "react-dom";

// Types
type ToastType = "default" | "success" | "error" | "warning" | "info";

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;
}

interface ToastContextValue {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, "id">) => void;
  removeToast: (id: string) => void;
}

// Context
const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

// Provider
interface ToastProviderProps {
  children: ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).slice(2);
    const newToast = { ...toast, id };
    setToasts((prev) => [...prev, newToast]);

    // Auto-remove after duration
    const duration = toast.duration ?? 5000;
    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  );
}

// Container (renders in portal)
function ToastContainer() {
  const { toasts, removeToast } = useToast();

  if (typeof document === "undefined" || toasts.length === 0) return null;

  return createPortal(
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
      ))}
    </div>,
    document.body
  );
}

// Individual Toast Item
interface ToastItemProps extends HTMLAttributes<HTMLDivElement> {
  toast: Toast;
  onClose: () => void;
}

const typeStyles: Record<ToastType, { bg: string; icon: string; iconColor: string }> = {
  default: {
    bg: "bg-surface-secondary border-border-strong",
    icon: "ℹ️",
    iconColor: "text-txt-secondary",
  },
  success: {
    bg: "bg-success-muted border-success/30",
    icon: "✓",
    iconColor: "text-success",
  },
  error: {
    bg: "bg-error-muted border-error/30",
    icon: "✕",
    iconColor: "text-error",
  },
  warning: {
    bg: "bg-warning-muted border-warning/30",
    icon: "⚠",
    iconColor: "text-warning",
  },
  info: {
    bg: "bg-info-muted border-info/30",
    icon: "ℹ",
    iconColor: "text-info",
  },
};

const ToastItem = forwardRef<HTMLDivElement, ToastItemProps>(({ toast, onClose, className = "", ...props }, ref) => {
  const styles = typeStyles[toast.type];

  return (
    <div
      ref={ref}
      role="alert"
      className={`
        flex items-start gap-3 p-4
        ${styles.bg}
        border rounded-lg shadow-lg
        animate-slide-up
        ${className}
      `}
      {...props}
    >
      {/* Icon */}
      <span className={`flex-shrink-0 font-bold ${styles.iconColor}`}>{styles.icon}</span>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-txt-primary">{toast.title}</p>
        {toast.description && <p className="text-sm text-txt-secondary mt-0.5">{toast.description}</p>}
      </div>

      {/* Close Button */}
      <button
        onClick={onClose}
        className="flex-shrink-0 p-1 text-txt-muted hover:text-txt-primary transition-colors"
        aria-label="Close"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
});

ToastItem.displayName = "ToastItem";

// Convenience functions
export function toast(options: Omit<Toast, "id">) {
  // This is a workaround for using toast outside of React components
  // In real usage, prefer using the useToast hook
  console.warn("toast() called outside of React context. Use useToast() hook instead.");
}

export default ToastProvider;
