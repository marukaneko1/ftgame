"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Socket } from "socket.io-client";

// Types matching backend
interface Vector2D {
  x: number;
  y: number;
}

interface BallState {
  id: number;
  type: 'cue' | 'solid' | 'stripe' | 'eight';
  number: number;
  position: Vector2D;
  velocity: Vector2D;
  angularVelocity: number;
  angle: number;
  pocketed: boolean;
  pocketedBy: string | null;
  pocketedAt: number | null;
  pocketId: number | null;
  onTable: boolean;
}

interface PocketState {
  id: number;
  position: Vector2D;
  radius: number;
  ballsPocketed: number[];
}

interface ShotRecord {
  playerId: string;
  power: number;
  angle: number;
  timestamp: number;
  cueBallStartPos: Vector2D;
  ballsHit: Array<{ ballId: number; timestamp: number; position: Vector2D }>;
  ballsPocketed: Array<{ ballId: number; pocketId: number; timestamp: number; order: number }>;
  foul: boolean;
  foulReason: string | null;
  scratch: boolean;
  firstBallHit: number | null;
  groupDetermined: 'solids' | 'stripes' | null;
}

interface BilliardsState {
  phase: 'break' | 'playing' | 'ballInHand' | 'gameEnd';
  currentPlayer: string;
  breakPlayer: string;
  playerGroups: Record<string, 'solids' | 'stripes' | null>;
  balls: BallState[];
  pockets: PocketState[];
  turnHistory: any[];
  currentTurn: number;
  gameStatus: 'active' | 'paused' | 'ended';
  winnerId: string | null;
  lastShot: ShotRecord | null;
  foulOccurred: boolean;
  ballInHand: string | null;
  tableOpen: boolean;
  eightBallCalled: boolean;
  eightBallPocket: number | null;
}

interface GamePlayer {
  odUserId: string;
  side: string;
  displayName: string;
}

interface BilliardsGameProps {
  gameId: string;
  socket: Socket;
  odUserId: string;
  initialState?: BilliardsState;
  initialPlayers?: GamePlayer[];
  onGameEnd?: (result: GameEndResult) => void;
}

interface GameEndResult {
  winnerId: string | null;
  winnerName: string | null;
  isDraw: boolean;
}

export default function BilliardsGame({
  gameId,
  socket,
  odUserId,
  initialState,
  initialPlayers,
  onGameEnd
}: BilliardsGameProps) {
  const [gameState, setGameState] = useState<BilliardsState | null>(initialState || null);
  const [aimAngle, setAimAngle] = useState<number>(0);
  const [power, setPower] = useState<number>(50);
  const [isAiming, setIsAiming] = useState<boolean>(false);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mousePos, setMousePos] = useState<Vector2D | null>(null);

  const isMyTurn = gameState?.currentPlayer === odUserId;
  const isBallInHand = gameState?.ballInHand === odUserId;
  const opponent = initialPlayers?.find(p => p.odUserId !== odUserId);
  const myGroup = gameState?.playerGroups?.[odUserId];

  // Table dimensions (scaled for display)
  const TABLE_WIDTH = 800;
  const TABLE_HEIGHT = 400;
  const SCALE_X = TABLE_WIDTH / 2.24; // meters to pixels
  const SCALE_Y = TABLE_HEIGHT / 1.12;

  useEffect(() => {
    if (initialState) {
      setGameState(initialState);
    }
  }, [initialState]);

  useEffect(() => {
    if (!socket) return;

    const handleStateUpdate = (data: { gameId: string; state: BilliardsState }) => {
      if (data.gameId === gameId) {
        setGameState(data.state);
        setIsSimulating(false);
      }
    };

    const handleShotResult = (data: {
      gameId: string;
      shot: ShotRecord;
      finalBallStates: BallState[];
      turnResult: string;
      gameState: BilliardsState;
      winnerId: string | null;
    }) => {
      if (data.gameId === gameId) {
        setIsSimulating(false);
        setGameState(data.gameState);
        
        if (data.winnerId) {
          if (onGameEnd) {
            const winner = initialPlayers?.find(p => p.odUserId === data.winnerId);
            onGameEnd({
              winnerId: data.winnerId,
              winnerName: winner?.displayName || null,
              isDraw: false
            });
          }
        }
      }
    };

    const handleGameEnd = (data: {
      gameId: string;
      winnerId: string | null;
      reason: string;
      finalState: BilliardsState;
    }) => {
      if (data.gameId === gameId) {
        setGameState(data.finalState);
        if (onGameEnd) {
          const winner = initialPlayers?.find(p => p.odUserId === data.winnerId);
          onGameEnd({
            winnerId: data.winnerId,
            winnerName: winner?.displayName || null,
            isDraw: false
          });
        }
      }
    };

    socket.on("game.stateUpdate", handleStateUpdate);
    socket.on("billiards.shotResult", handleShotResult);
    socket.on("billiards.gameEnd", handleGameEnd);

    return () => {
      socket.off("game.stateUpdate", handleStateUpdate);
      socket.off("billiards.shotResult", handleShotResult);
      socket.off("billiards.gameEnd", handleGameEnd);
    };
  }, [socket, gameId, onGameEnd, initialPlayers]);

  /**
   * Handle mouse move for aiming
   */
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isMyTurn || isSimulating || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setMousePos({ x, y });
    
    const cueBall = gameState?.balls.find(b => b.id === 0 && !b.pocketed);
    if (!cueBall) return;
    
    // Convert canvas coordinates to table coordinates
    const tableX = (x / canvas.width) * 2.24;
    const tableY = (y / canvas.height) * 1.12;
    
    // Calculate angle from cue ball to mouse
    const dx = tableX - cueBall.position.x;
    const dy = tableY - cueBall.position.y;
    const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
    
    setAimAngle(angle < 0 ? angle + 360 : angle);
    setIsAiming(true);
  }, [isMyTurn, isSimulating, gameState]);

  /**
   * Handle power adjustment (mouse wheel)
   */
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (!isMyTurn || isSimulating) return;
    
    e.preventDefault();
    const delta = e.deltaY > 0 ? -5 : 5;
    setPower(prev => Math.max(10, Math.min(100, prev + delta)));
  }, [isMyTurn, isSimulating]);

  /**
   * Execute shot
   */
  const handleShot = () => {
    if (!isMyTurn || isSimulating || !socket) return;
    
    setIsSimulating(true);
    
    socket.emit("billiards.shot", {
      gameId,
      power,
      angle: aimAngle
    });
  };

  /**
   * Place cue ball (ball-in-hand)
   */
  const handlePlaceCueBall = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isBallInHand || !socket || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Convert canvas coordinates to table coordinates
    const tableX = (x / canvas.width) * 2.24;
    const tableY = (y / canvas.height) * 1.12;
    
    socket.emit("billiards.placeCueBall", {
      gameId,
      position: { x: tableX, y: tableY }
    });
  };

  /**
   * Render table and balls
   */
  useEffect(() => {
    if (!canvasRef.current || !gameState) return;
    
    try {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        console.error('Failed to get 2D context from canvas');
        return;
      }
      
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    
      // Draw table (green felt)
      ctx.fillStyle = '#0d5d2a';
      ctx.fillRect(0, 0, TABLE_WIDTH, TABLE_HEIGHT);
      
      // Draw table rails (dark brown) - drawn first so felt is on top
      const railWidth = 20;
      ctx.fillStyle = '#8b4513'; // Dark brown rails
      // Top rail
      ctx.fillRect(0, 0, TABLE_WIDTH, railWidth);
      // Bottom rail
      ctx.fillRect(0, TABLE_HEIGHT - railWidth, TABLE_WIDTH, railWidth);
      // Left rail
      ctx.fillRect(0, 0, railWidth, TABLE_HEIGHT);
      // Right rail
      ctx.fillRect(TABLE_WIDTH - railWidth, 0, railWidth, TABLE_HEIGHT);
      
      // Draw table (green felt) - on top of rails
      ctx.fillStyle = '#0d5d2a';
      ctx.fillRect(railWidth, railWidth, TABLE_WIDTH - 2 * railWidth, TABLE_HEIGHT - 2 * railWidth);
      
      // Draw diamond markers on rails (white)
      ctx.fillStyle = '#fff';
      const diamondSize = 4;
      const diamondSpacing = (TABLE_WIDTH - 2 * railWidth) / 4;
      // Top rail diamonds (3 markers)
      for (let i = 1; i <= 3; i++) {
        ctx.beginPath();
        ctx.arc(railWidth + diamondSpacing * i, railWidth / 2, diamondSize, 0, Math.PI * 2);
        ctx.fill();
      }
      // Bottom rail diamonds (3 markers)
      for (let i = 1; i <= 3; i++) {
        ctx.beginPath();
        ctx.arc(railWidth + diamondSpacing * i, TABLE_HEIGHT - railWidth / 2, diamondSize, 0, Math.PI * 2);
        ctx.fill();
      }
      // Left side diamond (1 marker)
      ctx.beginPath();
      ctx.arc(railWidth / 2, TABLE_HEIGHT / 2, diamondSize, 0, Math.PI * 2);
      ctx.fill();
      // Right side diamond (1 marker)
      ctx.beginPath();
      ctx.arc(TABLE_WIDTH - railWidth / 2, TABLE_HEIGHT / 2, diamondSize, 0, Math.PI * 2);
      ctx.fill();
      
      // Draw pockets (all same size)
      if (gameState.pockets && Array.isArray(gameState.pockets)) {
        gameState.pockets.forEach(pocket => {
          ctx.beginPath();
          ctx.arc(
            pocket.position.x * SCALE_X,
            pocket.position.y * SCALE_Y,
            pocket.radius * SCALE_X, // All pockets use same radius
            0,
            Math.PI * 2
          );
          ctx.fillStyle = '#000';
          ctx.fill();
          
          // Draw pocket rim
          ctx.strokeStyle = '#8b4513';
          ctx.lineWidth = 2;
          ctx.stroke();
        });
      }
      
      // Draw balls
      if (gameState.balls && Array.isArray(gameState.balls)) {
        gameState.balls.forEach(ball => {
          if (ball.pocketed) return;
          
          const x = ball.position.x * SCALE_X;
          const y = ball.position.y * SCALE_Y;
          const radius = 0.028 * SCALE_X;
          
          // Ball circle
          ctx.beginPath();
          ctx.arc(x, y, radius, 0, Math.PI * 2);
          
          // Ball color based on type
          if (ball.id === 0) {
            ctx.fillStyle = '#fff'; // Cue ball (white)
          } else if (ball.id === 8) {
            ctx.fillStyle = '#000'; // 8-ball (black)
          } else if (ball.type === 'solid') {
            ctx.fillStyle = '#ff6b6b'; // Solid (red)
          } else {
            ctx.fillStyle = '#4ecdc4'; // Stripe (cyan)
          }
          
          ctx.fill();
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 2;
          ctx.stroke();
          
          // Ball number
          if (ball.id !== 0) {
            ctx.fillStyle = ball.id === 8 ? '#fff' : '#000';
            ctx.font = 'bold 14px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(ball.id.toString(), x, y);
          }
        });
      }
      
      // Draw aim line if aiming
      if (isMyTurn && isAiming && !isSimulating && mousePos) {
        const cueBall = gameState.balls.find(b => b.id === 0 && !b.pocketed);
        if (cueBall) {
          const cueX = cueBall.position.x * SCALE_X;
          const cueY = cueBall.position.y * SCALE_Y;
          
          ctx.strokeStyle = '#ffff00';
          ctx.lineWidth = 2;
          ctx.setLineDash([5, 5]);
          ctx.beginPath();
          ctx.moveTo(cueX, cueY);
          ctx.lineTo(mousePos.x, mousePos.y);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }
    } catch (error) {
      console.error('Error rendering billiards table:', error);
    }
  }, [gameState, isMyTurn, isAiming, isSimulating, mousePos, SCALE_X, SCALE_Y]);

  if (!gameState) {
    return (
      <div className="bg-gray-900 rounded-lg border border-white/20 p-6">
        <p className="text-gray-400">Loading game...</p>
        <p className="text-gray-500 text-sm mt-2">Waiting for game state...</p>
      </div>
    );
  }

  // Safety check for required game state properties
  if (!gameState.balls || !Array.isArray(gameState.balls) || !gameState.pockets || !Array.isArray(gameState.pockets)) {
    return (
      <div className="bg-gray-900 rounded-lg border border-white/20 p-6">
        <p className="text-red-400">Error: Game state incomplete</p>
        <p className="text-gray-500 text-sm mt-2">
          Missing: {!gameState.balls ? 'balls ' : ''}{!gameState.pockets ? 'pockets' : ''}
        </p>
        <pre className="text-xs mt-2 text-gray-400 overflow-auto">
          {JSON.stringify(gameState, null, 2)}
        </pre>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-lg border border-white/20 p-6">
      {/* Game Header */}
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-white mb-2">8-Ball Pool</h2>
        <div className="flex justify-between text-sm text-gray-300">
          <div>
            <span>Turn: </span>
            <span className={isMyTurn ? "text-yellow-400 font-bold" : ""}>
              {isMyTurn ? "You" : opponent?.displayName || "Opponent"}
            </span>
          </div>
          <div>
            {myGroup && (
              <span>Your Group: <span className="font-semibold">{myGroup}</span></span>
            )}
            {gameState.tableOpen && (
              <span className="text-yellow-400">Table Open</span>
            )}
          </div>
        </div>
      </div>

      {/* Pool Table Canvas */}
      <div className="relative mb-4 overflow-hidden" style={{ backgroundColor: '#8b4513', padding: '20px', borderRadius: '8px' }}>
        <canvas
          ref={canvasRef}
          width={TABLE_WIDTH}
          height={TABLE_HEIGHT}
          onMouseMove={handleMouseMove}
          onWheel={handleWheel}
          onClick={isBallInHand ? handlePlaceCueBall : undefined}
          className="w-full h-auto cursor-crosshair"
          style={{ display: 'block', borderRadius: '4px' }}
        />
      </div>

      {/* Controls */}
      {isMyTurn && !isSimulating && (
        <div className="space-y-4">
          {isBallInHand ? (
            <div>
              <p className="text-yellow-400 mb-2 text-center">Click on table to place cue ball</p>
            </div>
          ) : (
            <>
              <div>
                <label className="text-white mb-2 block">Power: {power}%</label>
                <input
                  type="range"
                  min="10"
                  max="100"
                  value={power}
                  onChange={(e) => setPower(Number(e.target.value))}
                  className="w-full"
                />
              </div>
              <button
                onClick={handleShot}
                className="w-full bg-white px-6 py-3 text-black font-semibold hover:bg-gray-200 border-2 border-white"
              >
                Take Shot
              </button>
            </>
          )}
        </div>
      )}

      {isSimulating && (
        <div className="text-center text-gray-400">
          <p>Simulating shot...</p>
        </div>
      )}

      {/* Game Status */}
      {gameState.foulOccurred && gameState.lastShot && (
        <div className="mt-4 p-3 bg-red-900/30 border border-red-500 rounded">
          <p className="text-red-400 font-semibold">
            Foul: {gameState.lastShot.foulReason}
          </p>
          {gameState.lastShot.scratch && (
            <p className="text-red-300 text-sm mt-1">Scratch - Opponent gets ball-in-hand</p>
          )}
        </div>
      )}

      {/* Game End */}
      {gameState.gameStatus === 'ended' && gameState.winnerId && (
        <div className="mt-4 p-4 bg-green-900/30 border border-green-500 rounded text-center">
          <div className="text-4xl mb-2">🏆</div>
          <p className="text-green-400 font-bold text-xl">
            {gameState.winnerId === odUserId ? "You Win!" : `${opponent?.displayName || "Opponent"} Wins!`}
          </p>
        </div>
      )}
    </div>
  );
}

