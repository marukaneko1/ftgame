"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { io, Socket } from "socket.io-client";
import { api } from "@/lib/api";
import BackButton from "@/components/BackButton";

import { getWebSocketUrl } from "@/lib/ws-config";

// Configurable WebSocket URL
const WS_URL = getWebSocketUrl();

// Matching timeout (2 minutes)
const MATCH_TIMEOUT_MS = 2 * 60 * 1000;
// Max reconnection retries
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

  // Request location on mount (but don't block matchmaking if it fails)
  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      // User not logged in, skip location update
      return;
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          setLocation({ latitude, longitude });
          
          // Double-check token is still available before making API call
          const currentToken = localStorage.getItem("accessToken");
          if (!currentToken) {
            console.log("Token no longer available, skipping location update");
            return;
          }
          
          // Update location on backend (non-blocking)
          try {
            await api.patch("/users/me/location", { latitude, longitude });
            console.log("Location updated successfully");
          } catch (error: any) {
            // Don't block matchmaking if location update fails
            // 401 means unauthorized - token expired or invalid, but we'll continue anyway
            if (error.response?.status === 401) {
              console.log("Location update failed: authentication required (this is non-critical)");
            } else {
              console.warn("Failed to update location (matchmaking will still work):", error.response?.status || error.message);
            }
          }
        },
        (error) => {
          console.log("Location access denied or unavailable (matchmaking will still work)");
        },
        { timeout: 5000, enableHighAccuracy: false }
      );
    }
  }, []);

  // Cleanup on component unmount - prevent memory leaks and stale connections
  useEffect(() => {
    return () => {
      // Clear all timers
      if (matchTimeoutRef.current) {
        clearTimeout(matchTimeoutRef.current);
        matchTimeoutRef.current = null;
      }
      if (matchDurationIntervalRef.current) {
        clearInterval(matchDurationIntervalRef.current);
        matchDurationIntervalRef.current = null;
      }
    };
  }, []);

  // Cleanup socket when it changes or component unmounts
  useEffect(() => {
    return () => {
      if (socket) {
        console.log("[PlayPage] Cleaning up socket on unmount");
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

    // Try to refresh token before connecting (in case it's expired)
    try {
      // Attempt to refresh token - refresh token is in HTTP-only cookie
      // Note: The refresh endpoint may require a refreshToken in body or cookie
      const refreshResponse = await api.post("/auth/refresh", {});
      if (refreshResponse.data?.accessToken) {
        token = refreshResponse.data.accessToken as string;
        localStorage.setItem("accessToken", token);
        console.log("[PlayPage] Token refreshed before WebSocket connection");
      }
    } catch (refreshError: any) {
      // If refresh fails with 401/403, the refresh token is invalid/expired
      if (refreshError.response?.status === 401 || refreshError.response?.status === 403) {
        console.error("[PlayPage] Token refresh failed, user may need to log in again");
        alert("Your session has expired. Please log in again.");
        router.push("/auth/login");
        setMatching(false);
        return;
      }
      // Otherwise, try with existing token (might still work)
      console.warn("[PlayPage] Token refresh failed (non-critical), using existing token");
    }

    // Ensure token exists after potential refresh
    if (!token) {
      alert("Please log in first");
      return;
    }

    setMatching(true);
    setMatchingDuration(0);
    
    // Start duration counter
    matchDurationIntervalRef.current = setInterval(() => {
      setMatchingDuration(prev => prev + 1);
    }, 1000);
    
    // Set matching timeout
    matchTimeoutRef.current = setTimeout(() => {
      console.log("[PlayPage] Matching timeout reached (2 minutes)");
      if (socket) {
        socket.emit("match.leave");
        socket.disconnect();
        setSocket(null);
      }
      setMatching(false);
      setMatchingDuration(0);
      alert("No match found within 2 minutes. Please try again later when more users are online.");
    }, MATCH_TIMEOUT_MS);
    
    // Token is guaranteed to be string at this point
    const authToken = token;
    
    // Connect to WebSocket (using configurable URL)
    const ws = io(`${WS_URL}/ws`, {
      auth: { token: authToken },
      transports: ["websocket"],
      reconnection: false, // Disable auto-reconnect to handle token refresh manually
      timeout: 10000
    });

    ws.on("connect", () => {
      // Reset reconnect attempts on successful connection
      setReconnectAttempts(0);
      
      // Get fresh token on connect in case we're reconnecting
      const currentToken = localStorage.getItem("accessToken");
      if (currentToken && currentToken !== token) {
        // Token was refreshed, reconnect with new token
        ws.disconnect();
        handleStartMatch();
        return;
      }
      
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

    ws.on("disconnect", () => {
      console.log("WebSocket disconnected");
    });

    ws.on("match.matched", (data) => {
      console.log("Matched!", data);
      // Clear timeouts and intervals
      if (matchTimeoutRef.current) {
        clearTimeout(matchTimeoutRef.current);
        matchTimeoutRef.current = null;
      }
      if (matchDurationIntervalRef.current) {
        clearInterval(matchDurationIntervalRef.current);
        matchDurationIntervalRef.current = null;
      }
      setMatching(false);
      setMatchingDuration(0);
      ws.disconnect();
      // Store session data temporarily if needed
      if (data.sessionId) {
        router.push(`/session/${data.sessionId}`);
      }
    });

    ws.on("error", (err: any) => {
      console.error("Matchmaking error:", err);
      // Clear timeouts and intervals
      if (matchTimeoutRef.current) {
        clearTimeout(matchTimeoutRef.current);
        matchTimeoutRef.current = null;
      }
      if (matchDurationIntervalRef.current) {
        clearInterval(matchDurationIntervalRef.current);
        matchDurationIntervalRef.current = null;
      }
      const errorMsg = err.message || "Matchmaking failed. Please check your subscription and verification status.";
      alert(errorMsg);
      setMatching(false);
      setMatchingDuration(0);
      ws.disconnect();
    });

    ws.on("connect_error", async (err: any) => {
      console.error("[PlayPage] WebSocket connection error:", err.message, err);
      
      // If it's an auth error, try refreshing the token (refresh token is in HTTP-only cookie)
      if (err.message?.includes("token") || err.message?.includes("Unauthorized") || err.message?.includes("expired")) {
        console.log("[PlayPage] Auth error detected, attempting token refresh...");
        
        // Check retry limit to prevent infinite loop
        if (reconnectAttempts >= MAX_RECONNECT_RETRIES) {
          console.error("[PlayPage] Max reconnect attempts reached");
          alert("Failed to connect after multiple attempts. Please log in again.");
          router.push("/auth/login");
          setMatching(false);
          setReconnectAttempts(0);
          return;
        }
        
        try {
          // Try to refresh - refresh token should be in HTTP-only cookie
          const response = await api.post("/auth/refresh", {});
          if (response.data?.accessToken) {
            localStorage.setItem("accessToken", response.data.accessToken);
            console.log("[PlayPage] Token refreshed successfully, retrying connection (attempt", reconnectAttempts + 1, ")");
            // Disconnect and retry
            ws.disconnect();
            setMatching(false); // Reset matching state before retry
            setReconnectAttempts(prev => prev + 1);
            setTimeout(() => handleStartMatch(), 500);
            return;
          }
        } catch (refreshError: any) {
          console.error("[PlayPage] Failed to refresh token:", refreshError.response?.status, refreshError.message);
          // Refresh failed, user needs to log in again
          alert("Your session has expired. Please log in again.");
          router.push("/auth/login");
          setMatching(false);
          return;
        }
        
        alert("Authentication failed. Please log in again.");
        router.push("/auth/login");
        setMatching(false);
        return;
      }
      
      // Clear timeouts on error
      if (matchTimeoutRef.current) {
        clearTimeout(matchTimeoutRef.current);
        matchTimeoutRef.current = null;
      }
      if (matchDurationIntervalRef.current) {
        clearInterval(matchDurationIntervalRef.current);
        matchDurationIntervalRef.current = null;
      }
      
      alert("Failed to connect to server. Please check your connection.");
      setMatching(false);
      setMatchingDuration(0);
    });

    setSocket(ws);
  };

  const handleStopMatch = () => {
    // Clear timeouts and intervals
    if (matchTimeoutRef.current) {
      clearTimeout(matchTimeoutRef.current);
      matchTimeoutRef.current = null;
    }
    if (matchDurationIntervalRef.current) {
      clearInterval(matchDurationIntervalRef.current);
      matchDurationIntervalRef.current = null;
    }
    
    if (socket) {
      socket.emit("match.leave");
      socket.disconnect();
      setSocket(null);
    }
    setMatching(false);
    setMatchingDuration(0);
  };

  // Format seconds as mm:ss
  const formatMatchingTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <main className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm uppercase tracking-[0.25em] text-gray-400">Matchmaking</p>
          <h1 className="text-2xl font-semibold text-white">Find a match</h1>
        </div>
        <BackButton href="/dashboard" />
      </div>
      <div className="bg-gray-900 p-6 border border-white/20">
        <p className="text-sm text-gray-400">
          Requires active subscription, 18+ verification, and not being banned. Tokens are used for
          optional gifts and friendly wagers; they cannot be withdrawn or converted to cash.
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="bg-black px-3 py-2 text-white border border-white/30"
          >
            <option value="en">English (US)</option>
          </select>
          <select
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            className="bg-black px-3 py-2 text-white border border-white/30"
          >
            <option value="US">United States</option>
          </select>
          {matching ? (
            <button
              onClick={handleStopMatch}
              className="bg-gray-600 px-4 py-2 font-semibold text-white hover:bg-gray-700 border-2 border-gray-500"
            >
              Stop matching
            </button>
          ) : (
            <button
              onClick={handleStartMatch}
              className="bg-white px-4 py-2 font-semibold text-black hover:bg-gray-200 border-2 border-white"
            >
              Start match
            </button>
          )}
        </div>
      </div>
      <div className="bg-gray-900 p-6 border border-white/20">
        {matching ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-400">Searching for a match...</p>
              <p className="text-sm text-green-400 font-mono">{formatMatchingTime(matchingDuration)}</p>
            </div>
            
            {/* Progress bar showing time remaining */}
            <div className="w-full bg-gray-800 rounded-full h-2">
              <div 
                className="bg-green-500 h-2 rounded-full transition-all duration-1000"
                style={{ width: `${Math.min(100, (matchingDuration / 120) * 100)}%` }}
              />
            </div>
            
            <p className="text-xs text-gray-500">
              {location 
                ? `Location: ${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}` 
                : "Location not available - matching by region"}
            </p>
            <p className="text-xs text-gray-500">
              Requires at least 2 users to match. Timeout in {formatMatchingTime(120 - matchingDuration)}.
            </p>
          </div>
        ) : (
          <p className="text-sm text-gray-400">When matched, the call screen, games, gifts, and reporting UI will appear here.</p>
        )}
      </div>
    </main>
  );
}



