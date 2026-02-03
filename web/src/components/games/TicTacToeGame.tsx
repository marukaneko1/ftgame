"use client";

import { useEffect, useState, useCallback } from "react";
import { Socket } from "socket.io-client";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

// Types matching backend
interface TicTacToeState {
  board: (string | null)[];
  currentTurn: "X" | "O";
  moveHistory: { cell: number; player: string; timestamp: number }[];
  playerX: string;
  playerO: string;
  startedAt: number;
}

interface GamePlayer {
  odUserId: string;
  side: string;
  displayName: string;
}

interface TicTacToeGameProps {
  gameId: string;
  socket: Socket;
  userId: string;
  initialState?: TicTacToeState;
  initialPlayers?: GamePlayer[];
  onGameEnd?: (result: GameEndResult) => void;
}

interface GameEndResult {
  winnerId: string | null;
  winnerName: string | null;
  isDraw: boolean;
  reason: "win" | "draw" | "forfeit";
  winningLine?: number[];
}

const WINNING_COMBINATIONS = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
  [0, 4, 8], [2, 4, 6]             // Diagonals
];

export default function TicTacToeGame({
  gameId,
  socket,
  userId,
  initialState,
  initialPlayers,
  onGameEnd
}: TicTacToeGameProps) {
  const [gameState, setGameState] = useState<TicTacToeState | null>(initialState || null);
  const [players, setPlayers] = useState<GamePlayer[]>(initialPlayers || []);
  const [gameEnded, setGameEnded] = useState(false);
  const [endResult, setEndResult] = useState<GameEndResult | null>(null);
  const [error, setError] = useState<string>("");
  const [lastMove, setLastMove] = useState<number | null>(null);

  // Get my symbol (X or O)
  const mySymbol = gameState?.playerX === userId ? "X" : gameState?.playerO === userId ? "O" : null;
  const isMyTurn = gameState?.currentTurn === mySymbol;

  // Get opponent info
  const opponent = players.find(p => p.odUserId !== userId);
  const me = players.find(p => p.odUserId === userId);

  // Setup socket listeners
  useEffect(() => {
    if (!socket) return;

    // Join game room
    socket.emit("game.join", { gameId });

    // Listen for game state updates
    const handleStateUpdate = (data: { gameId: string; state: TicTacToeState; lastMove?: { cell: number } }) => {
      if (data.gameId === gameId) {
        setGameState(data.state);
        if (data.lastMove !== undefined) {
          setLastMove(data.lastMove.cell);
        }
        setError("");
      }
    };

    // Listen for game state (initial)
    const handleGameState = (data: { gameId: string; state: TicTacToeState; players: GamePlayer[] }) => {
      if (data.gameId === gameId) {
        setGameState(data.state);
        setPlayers(data.players);
      }
    };

    // Listen for game end
    const handleGameEnd = (data: {
      gameId: string;
      winnerId: string | null;
      winnerName: string | null;
      isDraw: boolean;
      reason: "win" | "draw" | "forfeit";
      winningLine?: number[];
    }) => {
      if (data.gameId === gameId) {
        setGameEnded(true);
        setEndResult({
          winnerId: data.winnerId,
          winnerName: data.winnerName,
          isDraw: data.isDraw,
          reason: data.reason,
          winningLine: data.winningLine
        });
        onGameEnd?.(data);
      }
    };

    // Listen for errors
    const handleError = (data: { message: string }) => {
      setError(data.message);
      // Clear error after 3 seconds
      setTimeout(() => setError(""), 3000);
    };

    socket.on("game.stateUpdate", handleStateUpdate);
    socket.on("game.state", handleGameState);
    socket.on("game.end", handleGameEnd);
    socket.on("game.error", handleError);

    return () => {
      socket.off("game.stateUpdate", handleStateUpdate);
      socket.off("game.state", handleGameState);
      socket.off("game.end", handleGameEnd);
      socket.off("game.error", handleError);
    };
  }, [socket, gameId, onGameEnd]);

  // Handle cell click
  const handleCellClick = useCallback((cellIndex: number) => {
    if (!socket || !gameState || gameEnded) return;
    if (!isMyTurn) return;
    if (gameState.board[cellIndex] !== null) return;

    socket.emit("game.move", { gameId, cellIndex });
  }, [socket, gameId, gameState, gameEnded, isMyTurn]);

  // Handle forfeit
  const handleForfeit = useCallback(() => {
    if (!socket || gameEnded) return;
    if (confirm("Are you sure you want to forfeit? Your opponent will win.")) {
      socket.emit("game.forfeit", { gameId });
    }
  }, [socket, gameId, gameEnded]);

  // Determine if a cell is part of the winning line
  const isWinningCell = (index: number): boolean => {
    return endResult?.winningLine?.includes(index) || false;
  };

  // Render game result message
  const getResultMessage = (): { text: string; color: string; emoji: string } => {
    if (!endResult) return { text: "", color: "", emoji: "" };

    if (endResult.isDraw) {
      return { text: "It's a Draw!", color: "text-warning", emoji: "🤝" };
    }

    const iWon = endResult.winnerId === userId;
    if (endResult.reason === "forfeit") {
      return iWon
        ? { text: "You Win! (Opponent Forfeited)", color: "text-success", emoji: "🏆" }
        : { text: "You Forfeited", color: "text-error", emoji: "🏳️" };
    }

    return iWon
      ? { text: "You Win!", color: "text-success", emoji: "🎉" }
      : { text: "You Lose!", color: "text-error", emoji: "😢" };
  };

  if (!gameState) {
    return (
      <Card variant="glass" padding="lg" className="text-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          <p className="text-txt-muted">Loading game...</p>
        </div>
      </Card>
    );
  }

  const resultMessage = getResultMessage();

  return (
    <Card variant="elevated" padding="md">
      {/* Game Header */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-xl font-display font-bold text-txt-primary flex items-center gap-2">
            <span>⭕</span> Tic Tac Toe
          </h3>
          <p className="text-sm text-txt-secondary mt-1">
            You are: <span className={mySymbol === "X" ? "text-info font-bold" : "text-error font-bold"}>{mySymbol}</span>
          </p>
        </div>
        <div className="text-right">
          {!gameEnded && (
            <Badge 
              variant={isMyTurn ? "success" : "warning"} 
              size="md"
              dot
              pulse={isMyTurn}
            >
              {isMyTurn ? "Your Turn!" : `${opponent?.displayName || "Opponent"}'s Turn`}
            </Badge>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 bg-error-muted rounded-lg border border-error/30">
          <Badge variant="error">{error}</Badge>
        </div>
      )}

      {/* Game Board */}
      <div className="flex justify-center mb-4">
        <div 
          className={`grid grid-cols-3 gap-2 p-4 rounded-xl transition-all ${
            gameEnded 
              ? "bg-surface-tertiary" 
              : isMyTurn 
                ? "bg-success-muted ring-2 ring-success/50 shadow-[0_0_20px_var(--color-success-muted)]" 
                : "bg-surface-tertiary"
          }`}
        >
          {gameState.board.map((cell, index) => (
            <button
              key={index}
              onClick={() => handleCellClick(index)}
              disabled={gameEnded || !isMyTurn || cell !== null}
              className={`
                w-20 h-20 text-4xl font-bold
                flex items-center justify-center
                transition-all duration-fast rounded-lg
                ${cell === null && !gameEnded && isMyTurn
                  ? "bg-surface-secondary hover:bg-surface-primary hover:shadow-glow-purple cursor-pointer border border-border-strong hover:border-accent/50"
                  : "bg-surface-primary cursor-not-allowed border border-border-default"
                }
                ${isWinningCell(index)
                  ? "bg-success/30 ring-2 ring-success shadow-[0_0_15px_var(--color-success-muted)] animate-pulse"
                  : ""
                }
                ${lastMove === index && !isWinningCell(index)
                  ? "ring-2 ring-gold/50"
                  : ""
                }
                ${cell === "X" ? "text-info" : "text-error"}
              `}
            >
              {cell && (
                <span className={`${lastMove === index ? "animate-bounce" : ""}`}>
                  {cell}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Game Result */}
      {gameEnded && endResult && (
        <Card variant="neon" padding="md" className="text-center mb-4 animate-scale-in">
          <p className="text-5xl mb-3">{resultMessage.emoji}</p>
          <p className={`text-2xl font-display font-bold ${resultMessage.color}`}>
            {resultMessage.text}
          </p>
          {endResult.winnerName && !endResult.isDraw && (
            <p className="text-sm text-txt-muted mt-2">
              Winner: <span className="text-txt-secondary font-medium">{endResult.winnerName}</span>
            </p>
          )}
        </Card>
      )}

      {/* Players Info */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <Card 
          variant={me?.side === gameState.currentTurn && !gameEnded ? "neon" : "default"} 
          padding="sm"
          className={me?.side === gameState.currentTurn && !gameEnded ? "shadow-[0_0_15px_var(--color-success-muted)] border-success/50" : ""}
        >
          <p className="text-xs text-txt-muted uppercase tracking-wide">You ({me?.side})</p>
          <p className="text-txt-primary font-semibold">{me?.displayName || "Player"}</p>
        </Card>
        <Card 
          variant={opponent?.side === gameState.currentTurn && !gameEnded ? "neon" : "default"} 
          padding="sm"
          className={opponent?.side === gameState.currentTurn && !gameEnded ? "shadow-[0_0_15px_var(--color-warning-muted)] border-warning/50" : ""}
        >
          <p className="text-xs text-txt-muted uppercase tracking-wide">Opponent ({opponent?.side})</p>
          <p className="text-txt-primary font-semibold">{opponent?.displayName || "Opponent"}</p>
        </Card>
      </div>

      {/* Actions */}
      {!gameEnded && (
        <div className="flex justify-center">
          <Button variant="danger" size="sm" onClick={handleForfeit}>
            Forfeit Game
          </Button>
        </div>
      )}

      {/* Move History */}
      {gameState.moveHistory.length > 0 && (
        <div className="mt-4 pt-3 border-t border-border-subtle">
          <p className="text-xs text-txt-muted font-mono">Moves: {gameState.moveHistory.length}</p>
        </div>
      )}
    </Card>
  );
}

