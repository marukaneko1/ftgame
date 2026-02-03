"use client";

import { forwardRef, HTMLAttributes, ReactNode, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";

interface ModalProps extends HTMLAttributes<HTMLDivElement> {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "full";
  closeOnOverlay?: boolean;
  closeOnEscape?: boolean;
  showClose?: boolean;
}

const sizeStyles = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-2xl",
  full: "max-w-[90vw] max-h-[90vh]",
};

export const Modal = forwardRef<HTMLDivElement, ModalProps>(
  (
    {
      open,
      onClose,
      children,
      size = "md",
      closeOnOverlay = true,
      closeOnEscape = true,
      showClose = true,
      className = "",
      ...props
    },
    ref
  ) => {
    // Handle escape key
    const handleEscape = useCallback(
      (e: KeyboardEvent) => {
        if (e.key === "Escape" && closeOnEscape) {
          onClose();
        }
      },
      [closeOnEscape, onClose]
    );

    useEffect(() => {
      if (open) {
        document.addEventListener("keydown", handleEscape);
        document.body.style.overflow = "hidden";
      }
      return () => {
        document.removeEventListener("keydown", handleEscape);
        document.body.style.overflow = "";
      };
    }, [open, handleEscape]);

    if (!open) return null;

    const modalContent = (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Overlay */}
        <div
          className="absolute inset-0 bg-base/90 backdrop-blur-sm animate-fade-in"
          onClick={closeOnOverlay ? onClose : undefined}
        />

        {/* Modal Content */}
        <div
          ref={ref}
          role="dialog"
          aria-modal="true"
          className={`
            relative w-full ${sizeStyles[size]}
            bg-surface-primary border border-border-strong
            rounded-xl shadow-lg
            animate-scale-in
            ${className}
          `}
          {...props}
        >
          {/* Inner highlight */}
          <div className="absolute top-0 left-[10%] right-[10%] h-px bg-gradient-to-r from-transparent via-white/10 to-transparent rounded-full" />

          {/* Close Button */}
          {showClose && (
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-txt-muted hover:text-txt-primary hover:bg-surface-secondary transition-all duration-fast z-10"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}

          {children}
        </div>
      </div>
    );

    // Use portal to render at document body level
    if (typeof document !== "undefined") {
      return createPortal(modalContent, document.body);
    }
    return null;
  }
);

Modal.displayName = "Modal";

// Modal Header
interface ModalHeaderProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export const ModalHeader = forwardRef<HTMLDivElement, ModalHeaderProps>(
  ({ children, className = "", ...props }, ref) => {
    return (
      <div ref={ref} className={`px-6 pt-6 pb-4 ${className}`} {...props}>
        {children}
      </div>
    );
  }
);

ModalHeader.displayName = "ModalHeader";

// Modal Title
interface ModalTitleProps extends HTMLAttributes<HTMLHeadingElement> {
  children: ReactNode;
}

export const ModalTitle = forwardRef<HTMLHeadingElement, ModalTitleProps>(
  ({ children, className = "", ...props }, ref) => {
    return (
      <h2 ref={ref} className={`text-2xl font-display text-txt-primary tracking-tight ${className}`} {...props}>
        {children}
      </h2>
    );
  }
);

ModalTitle.displayName = "ModalTitle";

// Modal Description
interface ModalDescriptionProps extends HTMLAttributes<HTMLParagraphElement> {
  children: ReactNode;
}

export const ModalDescription = forwardRef<HTMLParagraphElement, ModalDescriptionProps>(
  ({ children, className = "", ...props }, ref) => {
    return (
      <p ref={ref} className={`text-sm text-txt-secondary mt-2 ${className}`} {...props}>
        {children}
      </p>
    );
  }
);

ModalDescription.displayName = "ModalDescription";

// Modal Body
interface ModalBodyProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export const ModalBody = forwardRef<HTMLDivElement, ModalBodyProps>(
  ({ children, className = "", ...props }, ref) => {
    return (
      <div ref={ref} className={`px-6 py-4 ${className}`} {...props}>
        {children}
      </div>
    );
  }
);

ModalBody.displayName = "ModalBody";

// Modal Footer
interface ModalFooterProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export const ModalFooter = forwardRef<HTMLDivElement, ModalFooterProps>(
  ({ children, className = "", ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`px-6 py-4 border-t border-border-subtle flex items-center justify-end gap-3 ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

ModalFooter.displayName = "ModalFooter";

export default Modal;
