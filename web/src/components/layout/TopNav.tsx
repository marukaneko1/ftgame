"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button, IconButton } from "@/components/ui/Button";

interface TopNavProps {
  isLoggedIn?: boolean;
  username?: string;
  balance?: number;
  avatarUrl?: string;
  onLogout?: () => void;
}

export default function TopNav({ isLoggedIn, username, balance = 0, avatarUrl, onLogout }: TopNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Check auth state from localStorage (only after mount so nav links stay hidden until we know)
  const [authState, setAuthState] = useState<{ loggedIn: boolean; checked: boolean }>({ loggedIn: false, checked: false });

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
    setAuthState({ loggedIn: !!token, checked: true });
  }, []);

  // Show Home / Shuffle / Lobby / Shop only when logged in; hide until auth check has run
  const effectiveLoggedIn = authState.checked && (isLoggedIn ?? authState.loggedIn);

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    setAuthState({ loggedIn: false });
    onLogout?.();
    router.push("/");
  };

  return (
    <nav className="relative z-40">
      {/* Main Nav Bar */}
      <div className="flex items-center justify-between h-16 px-4 lg:px-6">
        {/* Left: Logo */}
        <Link href={effectiveLoggedIn ? "/dashboard" : "/"} className="flex items-center group">
          <span className="text-lg font-display text-txt-primary tracking-tight">
            Shitbox <span className="text-accent">Shuffle</span>
          </span>
        </Link>

        {/* Center: Nav Links (Desktop) */}
        {effectiveLoggedIn && (
          <div className="hidden md:flex items-center gap-1">
            <NavLink href="/dashboard" active={pathname === "/dashboard"}>
              Home
            </NavLink>
            <NavLink href="/play" active={pathname === "/play"}>
              Shuffle
            </NavLink>
            <NavLink href="/lobby" active={pathname === "/lobby"}>
              Lobby
            </NavLink>
            <NavLink href="/wallet" active={pathname === "/wallet"}>
              Shop
            </NavLink>
          </div>
        )}

        {/* Right: Actions - don't show Log in/Sign up until auth checked (avoids flash when logged in) */}
        <div className="flex items-center gap-2">
          {!authState.checked ? (
            <div className="w-20 h-9" aria-hidden />
          ) : effectiveLoggedIn ? (
            <>
              <IconButton
                variant="ghost"
                size="sm"
                label="Notifications"
                onClick={() => {}}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </IconButton>
              <Link
                href="/settings"
                className="inline-flex items-center justify-center gap-1.5 p-2 md:px-3 md:py-2 rounded-lg text-txt-secondary hover:text-txt-primary hover:bg-surface-secondary md:border border-transparent md:border-border-default transition-all duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                aria-label="Settings"
              >
                <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="hidden md:inline text-sm font-medium">Settings</span>
              </Link>
            </>
          ) : (
            <>
              <Link href="/auth/login">
                <Button variant="ghost" size="sm">Log in</Button>
              </Link>
              <Link href="/auth/register">
                <Button variant="primary" size="sm">Sign up</Button>
              </Link>
            </>
          )}

          {/* Mobile Menu Toggle - only show when logged in (menu has content) */}
          {effectiveLoggedIn && (
          <IconButton
            variant="ghost"
            size="md"
            label="Menu"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden"
          >
            {mobileMenuOpen ? (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </IconButton>
          )}
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && effectiveLoggedIn && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-surface-primary border-t border-border-default animate-slide-down">
          <div className="flex flex-col p-4 gap-1">
            <MobileNavLink href="/dashboard" onClick={() => setMobileMenuOpen(false)}>
              Home
            </MobileNavLink>
            <MobileNavLink href="/play" onClick={() => setMobileMenuOpen(false)}>
              Shuffle
            </MobileNavLink>
            <MobileNavLink href="/lobby" onClick={() => setMobileMenuOpen(false)}>
              Lobby
            </MobileNavLink>
            <MobileNavLink href="/wallet" onClick={() => setMobileMenuOpen(false)}>
              Shop
            </MobileNavLink>
            <MobileNavLink href="/settings" onClick={() => setMobileMenuOpen(false)}>
              Settings
            </MobileNavLink>
            <hr className="border-border-subtle my-2" />
            <button
              onClick={() => {
                handleLogout();
                setMobileMenuOpen(false);
              }}
              className="text-left px-4 py-3 text-error hover:bg-error-muted rounded-lg transition-colors"
            >
              Log out
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}

// Nav Link Component
function NavLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`
        px-4 py-2 text-sm font-medium rounded-lg transition-all duration-fast
        ${
          active
            ? "text-txt-primary bg-surface-secondary border border-accent/30"
            : "text-txt-secondary hover:text-txt-primary hover:bg-surface-primary"
        }
      `}
    >
      {children}
    </Link>
  );
}

// Mobile Nav Link
function MobileNavLink({
  href,
  onClick,
  children,
}: {
  href: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const active = pathname === href;

  return (
    <Link
      href={href}
      onClick={onClick}
      className={`
        px-4 py-3 text-base font-medium rounded-lg transition-colors
        ${active ? "text-accent bg-accent-muted" : "text-txt-secondary hover:text-txt-primary hover:bg-surface-secondary"}
      `}
    >
      {children}
    </Link>
  );
}
