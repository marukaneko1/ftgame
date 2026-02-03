"use client";

import { createContext, useContext, forwardRef, HTMLAttributes, ReactNode, useState } from "react";

// Context for tab state
interface TabsContextValue {
  activeTab: string;
  setActiveTab: (value: string) => void;
}

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabsContext() {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error("Tab components must be used within a Tabs component");
  }
  return context;
}

// Tabs Container
interface TabsProps extends HTMLAttributes<HTMLDivElement> {
  defaultValue: string;
  value?: string;
  onValueChange?: (value: string) => void;
  children: ReactNode;
}

export const Tabs = forwardRef<HTMLDivElement, TabsProps>(
  ({ defaultValue, value, onValueChange, children, className = "", ...props }, ref) => {
    const [internalValue, setInternalValue] = useState(defaultValue);
    const activeTab = value ?? internalValue;

    const setActiveTab = (newValue: string) => {
      if (!value) {
        setInternalValue(newValue);
      }
      onValueChange?.(newValue);
    };

    return (
      <TabsContext.Provider value={{ activeTab, setActiveTab }}>
        <div ref={ref} className={className} {...props}>
          {children}
        </div>
      </TabsContext.Provider>
    );
  }
);

Tabs.displayName = "Tabs";

// Tab List - Casino-style segmented control
interface TabListProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  variant?: "default" | "pills" | "underline";
}

export const TabList = forwardRef<HTMLDivElement, TabListProps>(
  ({ children, variant = "default", className = "", ...props }, ref) => {
    const variantStyles = {
      default: "bg-surface-primary p-1 rounded-lg border border-border-default gap-1",
      pills: "gap-2",
      underline: "border-b border-border-default gap-0",
    };

    return (
      <div
        ref={ref}
        role="tablist"
        className={`flex items-center ${variantStyles[variant]} ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

TabList.displayName = "TabList";

// Tab Trigger
interface TabTriggerProps extends HTMLAttributes<HTMLButtonElement> {
  value: string;
  children: ReactNode;
  disabled?: boolean;
  variant?: "default" | "pills" | "underline";
}

export const TabTrigger = forwardRef<HTMLButtonElement, TabTriggerProps>(
  ({ value, children, disabled = false, variant = "default", className = "", ...props }, ref) => {
    const { activeTab, setActiveTab } = useTabsContext();
    const isActive = activeTab === value;

    const variantStyles = {
      default: {
        base: "px-4 py-2 text-sm font-medium rounded-md transition-all duration-fast",
        active: "bg-surface-secondary text-txt-primary shadow-md border border-accent/30",
        inactive: "text-txt-secondary hover:text-txt-primary hover:bg-surface-secondary/50",
      },
      pills: {
        base: "px-4 py-2 text-sm font-medium rounded-pill transition-all duration-fast border",
        active: "bg-accent text-base border-accent shadow-glow-purple",
        inactive: "text-txt-secondary border-transparent hover:text-txt-primary hover:border-border-default hover:bg-surface-primary",
      },
      underline: {
        base: "px-4 py-3 text-sm font-medium transition-all duration-fast border-b-2 -mb-px",
        active: "text-accent border-accent",
        inactive: "text-txt-secondary border-transparent hover:text-txt-primary hover:border-border-default",
      },
    };

    const styles = variantStyles[variant];

    return (
      <button
        ref={ref}
        role="tab"
        aria-selected={isActive}
        aria-controls={`tabpanel-${value}`}
        disabled={disabled}
        onClick={() => setActiveTab(value)}
        className={`
          ${styles.base}
          ${isActive ? styles.active : styles.inactive}
          disabled:opacity-50 disabled:cursor-not-allowed
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-base
          ${className}
        `}
        {...props}
      >
        {children}
      </button>
    );
  }
);

TabTrigger.displayName = "TabTrigger";

// Tab Content
interface TabContentProps extends HTMLAttributes<HTMLDivElement> {
  value: string;
  children: ReactNode;
}

export const TabContent = forwardRef<HTMLDivElement, TabContentProps>(
  ({ value, children, className = "", ...props }, ref) => {
    const { activeTab } = useTabsContext();

    if (activeTab !== value) return null;

    return (
      <div
        ref={ref}
        role="tabpanel"
        id={`tabpanel-${value}`}
        className={`animate-fade-in ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

TabContent.displayName = "TabContent";

export default Tabs;
