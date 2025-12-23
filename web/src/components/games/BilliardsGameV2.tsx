"use client";

import { useEffect, useRef, useState } from "react";
import { Socket } from "socket.io-client";
import dynamic from "next/dynamic";
import { BeginEvent } from "@/lib/billiards/events/beginevent";

interface BilliardsGameV2Props {
  gameId: string;
  socket: Socket;
  odUserId: string;
  initialState?: any;
  initialPlayers?: Array<{ odUserId: string; side: string; displayName: string }>;
  onGameEnd?: (result: any) => void;
}

export default function BilliardsGameV2({
  gameId,
  socket,
  odUserId,
  initialState,
  initialPlayers,
  onGameEnd
}: BilliardsGameV2Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<any>(null);
  const assetsRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!canvasRef.current || typeof window === "undefined") return;

    let container: any = null;
    let animationFrameId: number | null = null;

    const init = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Dynamically import billiards modules (client-side only)
        const { Container } = await import("@/lib/billiards/container");
        const { Assets } = await import("@/lib/billiards/view/assets");
        const { Keyboard } = await import("@/lib/billiards/events/keyboard");
        const { BeginEvent } = await import("@/lib/billiards/events/beginevent");

        // Create assets loader with local assets (no GLTF loading needed)
        const assets = Assets.localAssets("eightball");
        assetsRef.current = assets;

        // Create keyboard handler
        const keyboard = new Keyboard(canvasRef.current!);

        // Create container
        container = new Container(
          canvasRef.current!,
          console.log,
          assets,
          "eightball",
          keyboard,
          odUserId
        );
        containerRef.current = container;
        
        // Set to multiplayer mode
        container.isSinglePlayer = false;

        // Set up WebSocket integration
        container.broadcast = (event: any) => {
          if (socket && socket.connected) {
            // Serialize event for transmission
            const eventData = {
              type: event.type,
              ...event
            };
            socket.emit("billiards.event", {
              gameId,
              event: eventData
            });
          }
        };

        // Listen for remote events
        const handleRemoteEvent = (data: { gameId: string; event: any }) => {
          if (data.gameId === gameId && container) {
            container.eventQueue.push(data.event);
          }
        };

        socket.on("billiards.event", handleRemoteEvent);

        // Start the game
        container.eventQueue.push(new BeginEvent());
        container.animate(performance.now());

        setIsLoading(false);
      } catch (err: any) {
        console.error("Failed to initialize billiards:", err);
        setError(err.message || "Failed to initialize game");
        setIsLoading(false);
      }
    };

    init();

    return () => {
      socket.off("billiards.event");
      if (container && container.frame) {
        // Cancel animation frame
        cancelAnimationFrame(animationFrameId!);
        container.frame = null;
      }
      container = null;
    };
  }, [gameId, socket, odUserId]);

  if (error) {
    return (
      <div className="bg-gray-900 rounded-lg border border-white/20 p-6">
        <p className="text-red-400">Error: {error}</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="bg-gray-900 rounded-lg border border-white/20 p-6">
        <p className="text-gray-400">Loading billiards game...</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-lg border border-white/20 p-6">
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-white mb-2">8-Ball Pool</h2>
      </div>
      <div className="relative w-full" style={{ aspectRatio: '2/1' }}>
        <canvas
          ref={canvasRef}
          className="w-full h-full"
          style={{ display: 'block' }}
        />
      </div>
    </div>
  );
}

