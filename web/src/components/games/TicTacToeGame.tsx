"use client";

import { useEffect, useState, useCallback } from "react";
import { Socket } from "socket.io-client";

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
      return { text: "It's a Draw!", color: "text-yellow-400", emoji: "🤝" };
    }

    const iWon = endResult.winnerId === userId;
    if (endResult.reason === "forfeit") {
      return iWon
        ? { text: "You Win! (Opponent Forfeited)", color: "text-green-400", emoji: "🏆" }
        : { text: "You Forfeited", color: "text-red-400", emoji: "🏳️" };
    }

    return iWon
      ? { text: "You Win!", color: "text-green-400", emoji: "🎉" }
      : { text: "You Lose!", color: "text-red-400", emoji: "😢" };
  };

  if (!gameState) {
    return (
      <div className="bg-gray-800 p-6 border border-white/20 text-center">
        <p className="text-gray-400">Loading game...</p>
      </div>
    );
  }

  const resultMessage = getResultMessage();

  return (
    <div className="bg-gray-800 p-4 border border-white/20">
      {/* Game Header */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-xl font-bold text-white">Tic Tac Toe</h3>
          <p className="text-sm text-gray-400">
            You are: <span className={mySymbol === "X" ? "text-blue-400 font-bold" : "text-red-400 font-bold"}>{mySymbol}</span>
          </p>
        </div>
        <div className="text-right">
          {!gameEnded && (
            <p className={`text-sm font-semibold ${isMyTurn ? "text-green-400" : "text-yellow-400"}`}>
              {isMyTurn ? "Your Turn!" : `${opponent?.displayName || "Opponent"}'s Turn`}
            </p>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-2 bg-red-900/50 border border-red-500 text-red-300 text-sm text-center">
          {error}
        </div>
      )}

      {/* Game Board */}
      <div className="flex justify-center mb-4">
        <div 
          className={`grid grid-cols-3 gap-2 p-3 rounded-lg ${
            gameEnded ? "bg-gray-700" : isMyTurn ? "bg-green-900/30 ring-2 ring-green-500" : "bg-gray-700"
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
                transition-all duration-200
                ${cell === null && !gameEnded && isMyTurn
                  ? "bg-gray-600 hover:bg-gray-500 cursor-pointer"
                  : "bg-gray-700 cursor-not-allowed"
                }
                ${isWinningCell(index)
                  ? "bg-green-600 ring-2 ring-green-400 animate-pulse"
                  : ""
                }
                ${lastMove === index && !isWinningCell(index)
                  ? "ring-2 ring-yellow-400"
                  : ""
                }
                ${cell === "X" ? "text-blue-400" : "text-red-400"}
                border border-gray-500
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
        <div className="text-center mb-4 p-4 bg-gray-900 border border-white/20 rounded">
          <p className="text-4xl mb-2">{resultMessage.emoji}</p>
          <p className={`text-2xl font-bold ${resultMessage.color}`}>
            {resultMessage.text}
          </p>
          {endResult.winnerName && !endResult.isDraw && (
            <p className="text-sm text-gray-400 mt-1">
              Winner: {endResult.winnerName}
            </p>
          )}
        </div>
      )}

      {/* Players Info */}
      <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
        <div className={`p-2 rounded ${me?.side === gameState.currentTurn && !gameEnded ? "bg-green-900/50 border border-green-500" : "bg-gray-700"}`}>
          <p className="text-gray-400">You ({me?.side})</p>
          <p className="text-white font-semibold">{me?.displayName || "Player"}</p>
        </div>
        <div className={`p-2 rounded ${opponent?.side === gameState.currentTurn && !gameEnded ? "bg-yellow-900/50 border border-yellow-500" : "bg-gray-700"}`}>
          <p className="text-gray-400">Opponent ({opponent?.side})</p>
          <p className="text-white font-semibold">{opponent?.displayName || "Opponent"}</p>
        </div>
      </div>

      {/* Actions */}
      {!gameEnded && (
        <div className="flex justify-center">
          <button
            onClick={handleForfeit}
            className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-sm font-semibold border border-red-500 transition-colors"
          >
            Forfeit Game
          </button>
        </div>
      )}

      {/* Move History */}
      {gameState.moveHistory.length > 0 && (
        <div className="mt-4 text-xs text-gray-500">
          <p>Moves: {gameState.moveHistory.length}</p>
        </div>
      )}
    </div>
  );
}

