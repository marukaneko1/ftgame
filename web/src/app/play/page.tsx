"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { io, Socket } from "socket.io-client";
import { api } from "@/lib/api";
import { getWebSocketUrl } from "@/lib/ws-config";
import { Button, IconButton } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { ProgressBar, Spinner } from "@/components/ui/Progress";
import { Select } from "@/components/ui/Input";

const WS_URL = getWebSocketUrl();
const MATCH_TIMEOUT_MS = 2 * 60 * 1000;
const MAX_RECONNECT_RETRIES = 3;

export default function PlayPage() {
  const router = useRouter();
  const [language, setLanguage] = useState("en");
  const [region, setRegion] = useState("US");
  const [matching, setMatching] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [matchingDuration, setMatchingDuration] = useState(0);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  
  const matchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const matchDurationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) return;

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          setLocation({ latitude, longitude });
          
          const currentToken = localStorage.getItem("accessToken");
          if (!currentToken) return;
          
          try {
            await api.patch("/users/me/location", { latitude, longitude });
          } catch (error: any) {
            console.warn("Failed to update location:", error.response?.status || error.message);
          }
        },
        () => console.log("Location access denied"),
        { timeout: 5000, enableHighAccuracy: false }
      );
    }
  }, []);

  useEffect(() => {
    return () => {
      if (matchTimeoutRef.current) clearTimeout(matchTimeoutRef.current);
      if (matchDurationIntervalRef.current) clearInterval(matchDurationIntervalRef.current);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (socket) {
        socket.emit("match.leave");
        socket.disconnect();
      }
    };
  }, [socket]);

  const handleStartMatch = async () => {
    if (matching) return;
    
    let token: string | null = localStorage.getItem("accessToken");
    if (!token) {
      alert("Please log in first");
      return;
    }

    const isVercelUrl = WS_URL.includes("vercel.app");
    const isRailwayUrl = WS_URL.includes("railway.app");
    
    if (isVercelUrl && !isRailwayUrl) {
      alert("WebSocket connections are not supported in this environment.");
      return;
    }

    try {
      const refreshResponse = await api.post("/auth/refresh", {}, { withCredentials: true });
      if (refreshResponse.data?.accessToken) {
        token = refreshResponse.data.accessToken as string;
        localStorage.setItem("accessToken", token);
      }
    } catch (refreshError: any) {
      console.warn("Token refresh failed, using existing token");
    }

    if (!token) {
      alert("Please log in first");
      return;
    }

    setMatching(true);
    setMatchingDuration(0);
    
    matchDurationIntervalRef.current = setInterval(() => {
      setMatchingDuration(prev => prev + 1);
    }, 1000);
    
    matchTimeoutRef.current = setTimeout(() => {
      if (socket) {
        socket.emit("match.leave");
        socket.disconnect();
        setSocket(null);
      }
      setMatching(false);
      setMatchingDuration(0);
      alert("No match found within 2 minutes. Please try again later.");
    }, MATCH_TIMEOUT_MS);
    
    const authToken = token;
    const wsUrl = WS_URL.replace(/\/$/, '');
    
    const ws = io(`${wsUrl}/ws`, {
      path: '/socket.io',
      transports: ["websocket", "polling"],
      reconnection: false,
      timeout: 10000,
      withCredentials: true,
      auth: { token: authToken },
      query: { token: authToken },
      forceNew: true
    });

    ws.on("connect", () => {
      setReconnectAttempts(0);
      ws.emit("match.join", {
        region,
        language,
        latitude: location?.latitude,
        longitude: location?.longitude
      });
    });

    ws.on("match.queued", (data) => {
      console.log("Queued for matchmaking...", data);
    });

    ws.on("match.matched", (data) => {
      if (matchTimeoutRef.current) clearTimeout(matchTimeoutRef.current);
      if (matchDurationIntervalRef.current) clearInterval(matchDurationIntervalRef.current);
      setMatching(false);
      setMatchingDuration(0);
      ws.disconnect();
      if (data.sessionId) {
        router.push(`/session/${data.sessionId}`);
      }
    });

    ws.on("error", (err: any) => {
      console.error("Matchmaking error:", err);
      if (matchTimeoutRef.current) clearTimeout(matchTimeoutRef.current);
      if (matchDurationIntervalRef.current) clearInterval(matchDurationIntervalRef.current);
      
      const errorMsg = err.message || err.data?.message || "Matchmaking failed.";
      if (!errorMsg.includes("Agora")) {
        alert(errorMsg);
        setMatching(false);
        setMatchingDuration(0);
        ws.disconnect();
      }
    });

    ws.on("connect_error", async (err: any) => {
      console.error("WebSocket connection error:", err.message);
      if (matchTimeoutRef.current) clearTimeout(matchTimeoutRef.current);
      if (matchDurationIntervalRef.current) clearInterval(matchDurationIntervalRef.current);
      setMatching(false);
      setMatchingDuration(0);
      
      if (err.message?.includes("token") || err.message?.includes("Unauthorized")) {
        alert("Session expired. Please log in again.");
        router.push("/auth/login");
      } else {
        alert("Failed to connect. Please try again.");
      }
    });

    setSocket(ws);
  };

  const handleStopMatch = () => {
    if (matchTimeoutRef.current) clearTimeout(matchTimeoutRef.current);
    if (matchDurationIntervalRef.current) clearInterval(matchDurationIntervalRef.current);
    
    if (socket) {
      socket.emit("match.leave");
      socket.disconnect();
      setSocket(null);
    }
    setMatching(false);
    setMatchingDuration(0);
  };

  const formatMatchingTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <Badge variant="accent" size="sm" className="mb-2">Matchmaking</Badge>
          <h1 className="text-3xl font-display text-txt-primary tracking-tight">
            Find a Match
          </h1>
          <p className="text-txt-secondary mt-1">
            Connect with a random verified player
          </p>
        </div>
        <Link href="/dashboard">
          <Button variant="ghost" size="sm">
            ← Back
          </Button>
        </Link>
      </header>

      {/* Info Card */}
      <Card variant="glass" padding="lg">
        <p className="text-sm text-txt-secondary">
          Requires active subscription, 18+ verification, and not being banned. 
          Tokens are used for optional gifts and friendly wagers — they cannot be withdrawn or converted to cash.
        </p>
      </Card>

      {/* Matchmaking Controls */}
      <Card variant="elevated" padding="lg">
        <CardHeader>
          <CardTitle>Preferences</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <Select
              label="Language"
              value={language}
              onChange={(e: any) => setLanguage(e.target.value)}
              options={[{ value: "en", label: "English (US)" }]}
            />
            <Select
              label="Region"
              value={region}
              onChange={(e: any) => setRegion(e.target.value)}
              options={[{ value: "US", label: "United States" }]}
            />
          </div>

          <div className="mt-6">
            {matching ? (
              <Button
                variant="danger"
                size="lg"
                fullWidth
                onClick={handleStopMatch}
              >
                Stop Matching
              </Button>
            ) : (
              <Button
                variant="primary"
                size="lg"
                fullWidth
                onClick={handleStartMatch}
                className="animate-pulse-glow"
              >
                Start Matching
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Matching Status */}
      <Card variant={matching ? "neon" : "default"} padding="lg">
        {matching ? (
          <div className="space-y-6">
            {/* Status Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Spinner size="md" />
                <div>
                  <p className="font-medium text-txt-primary">Searching for a match...</p>
                  <p className="text-sm text-txt-secondary">This may take a moment</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-mono font-bold text-accent">
                  {formatMatchingTime(matchingDuration)}
                </p>
                <p className="text-xs text-txt-muted">elapsed</p>
              </div>
            </div>

            {/* Progress Bar */}
            <div>
              <ProgressBar
                value={matchingDuration}
                max={120}
                variant="accent"
                size="lg"
                animated
              />
              <p className="text-xs text-txt-muted mt-2 text-center">
                Timeout in {formatMatchingTime(120 - matchingDuration)}
              </p>
            </div>

            {/* Location Info */}
            <div className="pt-4 border-t border-border-subtle space-y-2">
              <p className="text-sm text-txt-tertiary">
                {location 
                  ? `📍 Location: ${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`
                  : "📍 Location not available — matching by region"}
              </p>
              <p className="text-sm text-txt-tertiary">
                ⏳ Waiting for another player to join the queue...
              </p>
              <p className="text-sm text-warning">
                💡 Tip: Open another browser/tab with a different account to test matching!
              </p>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-surface-secondary flex items-center justify-center text-3xl">
              🎲
            </div>
            <h3 className="text-lg font-display text-txt-primary">Ready to Shuffle?</h3>
            <p className="text-sm text-txt-secondary mt-2 max-w-sm mx-auto">
              When matched, you'll enter a video call with another verified player. 
              Play games, chat, and send gifts!
            </p>
          </div>
        )}
      </Card>

      {/* Game Preview */}
      {!matching && (
        <Card variant="glass" padding="lg">
          <h3 className="text-lg font-display text-txt-primary mb-4">Games Available In-Session</h3>
          <div className="grid grid-cols-4 gap-3">
            {[
              { icon: "♟️", name: "Chess" },
              { icon: "❓", name: "Trivia" },
              { icon: "⭕", name: "Tic-Tac-Toe" },
              { icon: "🃏", name: "Poker" },
            ].map((game) => (
              <div key={game.name} className="text-center p-3 rounded-lg bg-surface-secondary/50">
                <span className="text-2xl block">{game.icon}</span>
                <span className="text-xs text-txt-muted mt-1 block">{game.name}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
