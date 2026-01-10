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
  const retryCountRef = useRef(0);
  const MAX_RETRIES = 10;

  useEffect(() => {
    if (typeof window === "undefined" || initCompleteRef.current) return;

    // Wait for canvas to be available with retry mechanism
    const checkCanvasAndInit = () => {
      if (!canvasRef.current) {
        retryCountRef.current++;
        if (retryCountRef.current < MAX_RETRIES) {
          console.log(`[BilliardsGameV2] Canvas ref not ready, retry ${retryCountRef.current}/${MAX_RETRIES}...`);
          setTimeout(checkCanvasAndInit, 200);
          return;
        } else {
          console.error("[BilliardsGameV2] Canvas ref not available after max retries");
          setError("Canvas element not found. Please refresh the page.");
          setIsLoading(false);
          return;
        }
      }

      // Canvas is ready, proceed with initialization
      console.log("[BilliardsGameV2] Canvas ref is ready, starting initialization...");

    let container: any = null;
    let animationFrameId: number | null = null;
    let remoteEventHandler: ((data: any) => void) | null = null;

    const init = async () => {
      try {
        console.log("[BilliardsGameV2] Starting initialization...");
        setIsLoading(true);
        setError(null);

        // Check canvas is still available
        if (!canvasRef.current) {
          throw new Error("Canvas element not available");
        }

        console.log("[BilliardsGameV2] Importing billiards modules...");
        // Dynamically import billiards modules (client-side only)
        const { Container } = await import("@/lib/billiards/container");
        const { Assets } = await import("@/lib/billiards/view/assets");
        const { Keyboard } = await import("@/lib/billiards/events/keyboard");
        const { BeginEvent } = await import("@/lib/billiards/events/beginevent");
        const { WatchEvent } = await import("@/lib/billiards/events/watchevent");
        const { EventUtil } = await import("@/lib/billiards/events/eventutil");
        
        console.log("[BilliardsGameV2] Modules imported successfully");

        console.log("[BilliardsGameV2] Creating assets...");
        // Create assets loader with local assets (no GLTF loading needed)
        const assets = Assets.localAssets("eightball");
        assetsRef.current = assets;
        console.log("[BilliardsGameV2] Assets created");

        console.log("[BilliardsGameV2] Creating keyboard handler...");
        // Create keyboard handler
        const keyboard = new Keyboard(canvasRef.current!);
        console.log("[BilliardsGameV2] Keyboard handler created");

        console.log("[BilliardsGameV2] Creating Container...");
        // Create container
        try {
          container = new Container(
            canvasRef.current!,
            console.log,
            assets,
            "eightball",
            keyboard,
            odUserId
          );
          containerRef.current = container;
          console.log("[BilliardsGameV2] Container created successfully");
        } catch (containerError: any) {
          console.error("[BilliardsGameV2] Container creation failed:", containerError);
          throw new Error(`Failed to create Container: ${containerError.message || containerError}`);
        }
        
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
        console.error("[BilliardsGameV2] Error stack:", err.stack);
        console.error("[BilliardsGameV2] Error details:", {
          message: err.message,
          name: err.name,
          cause: err.cause
        });
        setError(err.message || err.toString() || "Failed to initialize game");
        setIsLoading(false);
        initCompleteRef.current = false; // Allow retry
      }
    };

    // Start checking for canvas
    checkCanvasAndInit();

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

