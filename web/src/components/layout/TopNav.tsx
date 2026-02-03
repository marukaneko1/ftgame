"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Button, IconButton } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

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

  // Check auth state from localStorage
  const [authState, setAuthState] = useState<{ loggedIn: boolean; user?: string }>({ loggedIn: false });

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    setAuthState({ loggedIn: !!token });
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    setAuthState({ loggedIn: false });
    onLogout?.();
    router.push("/");
  };

  const effectiveLoggedIn = isLoggedIn ?? authState.loggedIn;

  return (
    <nav className="relative z-40">
      {/* Main Nav Bar */}
      <div className="flex items-center justify-between h-16 px-4 lg:px-6">
        {/* Left: Logo */}
        <Link href={effectiveLoggedIn ? "/dashboard" : "/"} className="flex items-center gap-3 group">
          {/* Logo Icon */}
          <div className="relative w-10 h-10 rounded-lg bg-gradient-to-br from-accent to-cyan flex items-center justify-center shadow-glow-purple group-hover:shadow-[0_0_30px_var(--color-accent-primary-glow)] transition-shadow">
            <span className="text-xl font-bold text-base">S</span>
            {/* Shine effect */}
            <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-white/20 to-transparent" />
          </div>
          {/* Logo Text */}
          <div className="hidden sm:block">
            <span className="text-lg font-display text-txt-primary tracking-tight">
              Shitbox <span className="text-accent">Shuffle</span>
            </span>
          </div>
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

        {/* Right: Actions */}
        <div className="flex items-center gap-3">
          {effectiveLoggedIn ? (
            <>
              {/* Token Balance */}
              <Link
                href="/wallet"
                className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-gold/10 border border-gold/30 rounded-lg hover:bg-gold/20 transition-colors group"
              >
                <span className="text-gold text-lg">💰</span>
                <span className="font-mono font-semibold text-gold group-hover:text-gold-glow transition-colors">
                  {balance.toLocaleString()}
                </span>
              </Link>

              {/* Profile Dropdown */}
              <div className="relative">
                <Link
                  href="/settings"
                  className="flex items-center gap-2 p-1 rounded-lg hover:bg-surface-secondary transition-colors"
                >
                  <Avatar src={avatarUrl} alt={username || "User"} size="sm" presence="online" />
                  <span className="hidden lg:block text-sm text-txt-secondary">{username}</span>
                </Link>
              </div>

              {/* Logout */}
              <IconButton
                variant="ghost"
                size="sm"
                label="Logout"
                onClick={handleLogout}
                className="hidden md:flex"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
              </IconButton>
            </>
          ) : (
            <>
              <Link href="/auth/login">
                <Button variant="ghost" size="sm">
                  Log in
                </Button>
              </Link>
              <Link href="/auth/register">
                <Button variant="primary" size="sm">
                  Sign up
                </Button>
              </Link>
            </>
          )}

          {/* Mobile Menu Toggle */}
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
