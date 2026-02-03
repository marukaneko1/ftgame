"use client";

import { ReactNode } from "react";
import { usePathname } from "next/navigation";
import TopNav from "./TopNav";
import StatusBar from "./StatusBar";
import { ToastProvider } from "@/components/ui/Toast";

interface AppShellProps {
  children: ReactNode;
  showNav?: boolean;
  showStatusBar?: boolean;
  isLoggedIn?: boolean;
  username?: string;
  balance?: number;
  avatarUrl?: string;
  onlineCount?: number;
  activeRooms?: number;
  streak?: number;
}

export default function AppShell({
  children,
  showNav = true,
  showStatusBar = false,
  isLoggedIn,
  username,
  balance,
  avatarUrl,
  onlineCount,
  activeRooms,
  streak,
}: AppShellProps) {
  const pathname = usePathname();
  const isHomepage = pathname === "/";
  const showHeader = showNav && !isHomepage;

  return (
    <ToastProvider>
      <div className="min-h-screen flex flex-col relative">
        {/* Ambient Glow Effects - Positioned at corners */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
          {/* Top left purple glow */}
          <div
            className="absolute -top-32 -left-32 w-96 h-96 rounded-full opacity-20"
            style={{
              background: "radial-gradient(circle, var(--color-accent-primary) 0%, transparent 70%)",
              filter: "blur(80px)",
            }}
          />
          {/* Bottom right cyan glow */}
          <div
            className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full opacity-15"
            style={{
              background: "radial-gradient(circle, var(--color-accent-secondary) 0%, transparent 70%)",
              filter: "blur(80px)",
            }}
          />
          {/* Center subtle glow */}
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full opacity-5"
            style={{
              background: "radial-gradient(circle, var(--color-accent-primary) 0%, transparent 50%)",
              filter: "blur(100px)",
            }}
          />
        </div>

        {/* Top Navigation - hidden on homepage (/) so landing is full-screen */}
        {showHeader && (
          <header className="sticky top-0 z-50 bg-base/80 backdrop-blur-glass border-b border-border-subtle">
            <TopNav
              isLoggedIn={isLoggedIn}
              username={username}
              balance={balance}
              avatarUrl={avatarUrl}
            />
          </header>
        )}

        {/* Status Bar */}
        {showStatusBar && (
          <StatusBar
            onlineCount={onlineCount}
            activeRooms={activeRooms}
            streak={streak}
          />
        )}

        {/* Main Content */}
        <main className="flex-1 relative z-10">
          <div className="mx-auto max-w-7xl px-4 lg:px-6 py-6 lg:py-8">
            {children}
          </div>
        </main>

        {/* Footer */}
        <footer className="relative z-10 border-t border-border-subtle py-6 mt-auto">
          <div className="mx-auto max-w-7xl px-4 lg:px-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-txt-muted">
              <p>© 2024 Shitbox Shuffle. US only. 18+ verified.</p>
              <div className="flex items-center gap-4">
                <a href="#" className="hover:text-txt-secondary transition-colors">Terms</a>
                <a href="#" className="hover:text-txt-secondary transition-colors">Privacy</a>
                <a href="#" className="hover:text-txt-secondary transition-colors">Support</a>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </ToastProvider>
  );
}
