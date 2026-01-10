"use client";

import { useEffect, useRef, useState } from "react";
import { Socket } from "socket.io-client";
import dynamic from "next/dynamic";

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
  const initCompleteRef = useRef(false);

  useEffect(() => {
    if (!canvasRef.current || typeof window === "undefined" || initCompleteRef.current) return;

    let container: any = null;
    let animationFrameId: number | null = null;
    let remoteEventHandler: ((data: any) => void) | null = null;

    const init = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Dynamically import billiards modules (client-side only)
        const { Container } = await import("@/lib/billiards/container");
        const { Assets } = await import("@/lib/billiards/view/assets");
        const { Keyboard } = await import("@/lib/billiards/events/keyboard");
        const { BeginEvent } = await import("@/lib/billiards/events/beginevent");
        const { WatchEvent } = await import("@/lib/billiards/events/watchevent");
        const { EventUtil } = await import("@/lib/billiards/events/eventutil");

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

        // Set up WebSocket integration for broadcasting events
        container.broadcast = (event: any) => {
          if (socket && socket.connected) {
            try {
              // Serialize event for transmission - Socket.IO will handle JSON serialization
              // We send the serialized JSON string, and Socket.IO will transmit it
              const serialized = EventUtil.serialise(event);
              
              socket.emit("billiards.event", {
                gameId,
                event: serialized // Send as JSON string, backend will receive it as object after Socket.IO deserializes
              });
              console.log("[BilliardsGameV2] Broadcast event:", event.type || JSON.parse(serialized).type);
            } catch (err) {
              console.error("[BilliardsGameV2] Error broadcasting event:", err, event);
            }
          }
        };

        // Listen for remote events from other players
        remoteEventHandler = (data: { gameId: string; event: any }) => {
          if (data.gameId === gameId && container) {
            try {
              console.log("[BilliardsGameV2] Received remote event:", typeof data.event, data.event);
              
              // Deserialize event - data.event will be a string (JSON) or already an object
              // EventUtil.fromSerialised expects a JSON string
              const eventString = typeof data.event === 'string' ? data.event : JSON.stringify(data.event);
              const reconstructedEvent = EventUtil.fromSerialised(eventString);
              
              if (reconstructedEvent) {
                container.eventQueue.push(reconstructedEvent);
                console.log("[BilliardsGameV2] Added event to queue:", reconstructedEvent.type);
                
                // Check for game end events (ChatEvent with "Game over" message)
                if (reconstructedEvent.type === 'CHAT' && reconstructedEvent.message && 
                    reconstructedEvent.message.includes('Game over')) {
                  if (onGameEnd) {
                    onGameEnd({
                      winnerId: null,
                      winnerName: null,
                      isDraw: false
                    });
                  }
                }
              }
            } catch (err) {
              console.error("[BilliardsGameV2] Error handling remote event:", err, data.event);
            }
          }
        };

        socket.on("billiards.event", remoteEventHandler);

        // Monitor for game end by checking if controller transitions to End state
        // Wrap the updateController method to detect game end
        const originalUpdateController = container.updateController.bind(container);
        container.updateController = function(newController: any) {
          originalUpdateController(newController);
          // Check if controller is End (game ended)
          if (newController && newController.constructor && 
              (newController.constructor.name === 'End' || 
               (newController.rulename && newController.rulename === 'end'))) {
            if (onGameEnd) {
              onGameEnd({
                winnerId: null, // Container doesn't track winner ID - would need to extract from chat/game state
                winnerName: null,
                isDraw: false
              });
            }
          }
        };
        
        // Start the game - BeginEvent will handle initialization
        // The first player will send WatchEvent to sync table state with the second player
        container.eventQueue.push(new BeginEvent());
        
        // Start animation loop
        container.animate(performance.now());
        
        initCompleteRef.current = true;
        setIsLoading(false);
        console.log("[BilliardsGameV2] Initialized successfully");
      } catch (err: any) {
        console.error("[BilliardsGameV2] Failed to initialize billiards:", err);
        setError(err.message || "Failed to initialize game");
        setIsLoading(false);
      }
    };

    init();

    return () => {
      if (remoteEventHandler) {
        socket.off("billiards.event", remoteEventHandler);
      }
      if (container && container.frame) {
        // Cancel animation frame properly
        if (container.frame) {
          cancelAnimationFrame(container.frame as number);
        }
        container.frame = null;
      }
      container = null;
      initCompleteRef.current = false;
    };
  }, [gameId, socket, odUserId, initialState]);

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

