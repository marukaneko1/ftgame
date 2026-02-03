"use client";

import { Badge, StatusBadge } from "@/components/ui/Badge";

interface StatusBarProps {
  onlineCount?: number;
  activeRooms?: number;
  streak?: number;
  ping?: number;
  micEnabled?: boolean;
  camEnabled?: boolean;
  connectionStatus?: "connected" | "connecting" | "disconnected";
}

export default function StatusBar({
  onlineCount = 0,
  activeRooms = 0,
  streak = 0,
  ping,
  micEnabled = true,
  camEnabled = true,
  connectionStatus = "connected",
}: StatusBarProps) {
  return (
    <div className="flex items-center justify-between px-4 lg:px-6 py-2 bg-surface-primary/50 border-y border-border-subtle">
      {/* Left: Platform Stats */}
      <div className="flex items-center gap-4 text-xs">
        {/* Online Users */}
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
          </span>
          <span className="text-txt-secondary">
            <span className="font-mono text-success">{onlineCount.toLocaleString()}</span> online
          </span>
        </div>

        {/* Active Rooms */}
        <div className="hidden sm:flex items-center gap-1.5 text-txt-tertiary">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
            />
          </svg>
          <span>
            <span className="font-mono text-txt-secondary">{activeRooms}</span> rooms
          </span>
        </div>

        {/* User Streak */}
        {streak > 0 && (
          <div className="hidden md:flex items-center gap-1.5">
            <span className="text-warning">🔥</span>
            <span className="text-txt-tertiary">
              <span className="font-mono text-warning">{streak}</span> day streak
            </span>
          </div>
        )}
      </div>

      {/* Right: Connection Status */}
      <div className="flex items-center gap-3 text-xs">
        {/* Ping */}
        {ping !== undefined && (
          <div className="hidden sm:flex items-center gap-1.5 text-txt-tertiary">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
            <span className={`font-mono ${ping < 50 ? "text-success" : ping < 100 ? "text-warning" : "text-error"}`}>
              {ping}ms
            </span>
          </div>
        )}

        {/* Mic/Cam Status */}
        <div className="flex items-center gap-2">
          <span className={`${micEnabled ? "text-success" : "text-error"}`}>
            {micEnabled ? "🎤" : "🔇"}
          </span>
          <span className={`${camEnabled ? "text-success" : "text-error"}`}>
            {camEnabled ? "📹" : "📷"}
          </span>
        </div>

        {/* Connection Status */}
        <Badge
          variant={connectionStatus === "connected" ? "success" : connectionStatus === "connecting" ? "warning" : "error"}
          size="sm"
          dot
          pulse={connectionStatus === "connecting"}
        >
          {connectionStatus === "connected" ? "Live" : connectionStatus === "connecting" ? "Connecting" : "Offline"}
        </Badge>
      </div>
    </div>
  );
}
