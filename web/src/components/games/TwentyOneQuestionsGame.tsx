"use client";

import { useEffect, useState } from "react";
import { Socket } from "socket.io-client";

interface TwentyOneQuestionsState {
  phase: "playing" | "questionComplete" | "gameEnd";
  currentQuestionIndex: number;
  currentQuestion: string;
  questionIds: number[];
  playerReady: {
    [playerId: string]: boolean;
  };
  totalQuestions: number;
  completedQuestions: number;
  players: string[];
}

interface GamePlayer {
  odUserId: string;
  side: string;
  displayName: string;
}

interface TwentyOneQuestionsGameProps {
  gameId: string;
  socket: Socket;
  odUserId: string;
  initialState?: TwentyOneQuestionsState;
  initialPlayers?: GamePlayer[];
  onGameEnd?: (result: GameEndResult) => void;
}

interface GameEndResult {
  winnerId: string | null;
  winnerName: string | null;
  isDraw: boolean;
}

export default function TwentyOneQuestionsGame({
  gameId,
  socket,
  odUserId,
  initialState,
  initialPlayers,
  onGameEnd
}: TwentyOneQuestionsGameProps) {
  const [gameState, setGameState] = useState<TwentyOneQuestionsState | null>(initialState || null);
  const [isReady, setIsReady] = useState(false);
  const [waitingForOpponent, setWaitingForOpponent] = useState(false);

  const opponent = initialPlayers?.find(p => p.odUserId !== odUserId);
  const amIReady = gameState?.playerReady[odUserId] || false;
  const isOpponentReady = opponent ? (gameState?.playerReady[opponent.odUserId] || false) : false;

  useEffect(() => {
    if (initialState) {
      setGameState(initialState);
      setIsReady(initialState.playerReady[odUserId] || false);
    }
  }, [initialState, odUserId]);

  useEffect(() => {
    if (!socket) return;

    const handleGameStarted = (data: { gameId: string; gameType: string; state: any; players: any[] }) => {
      if (data.gameId === gameId && (data.gameType === "TWENTY_ONE_QUESTIONS" || data.gameType?.toUpperCase() === "TWENTY_ONE_QUESTIONS")) {
        console.log("TwentyOneQuestionsGame: Received game.started event", data);
        if (data.state) {
          setGameState(data.state);
          setIsReady(data.state.playerReady?.[odUserId] || false);
        }
      }
    };

    const handleGameStateUpdate = (data: { gameId: string; state: TwentyOneQuestionsState }) => {
      if (data.gameId === gameId) {
        console.log("TwentyOneQuestionsGame: State updated", data);
        setGameState(data.state);
        setIsReady(data.state.playerReady?.[odUserId] || false);
        setWaitingForOpponent(!data.state.playerReady?.[opponent?.odUserId || ""]);
      }
    };

    const handlePlayerReady = (data: {
      gameId: string;
      playerId: string;
      allReady: boolean;
      state: TwentyOneQuestionsState;
    }) => {
      if (data.gameId === gameId) {
        console.log("TwentyOneQuestionsGame: Player ready", data);
        setGameState(data.state);
        // Update ready state from the server state
        setIsReady(data.state.playerReady?.[odUserId] || false);
        // Only show waiting message if I'm ready and opponent isn't
        setWaitingForOpponent(
          (data.state.playerReady?.[odUserId] || false) && 
          !data.allReady
        );
      }
    };

    const handleNextQuestion = (data: {
      gameId: string;
      question: string;
      questionNumber: number;
      totalQuestions: number;
      state: TwentyOneQuestionsState;
    }) => {
      if (data.gameId === gameId) {
        console.log("TwentyOneQuestionsGame: Next question", data);
        setGameState(data.state);
        // Reset ready state - both players should be false after question advances
        setIsReady(data.state.playerReady?.[odUserId] || false);
        setWaitingForOpponent(false);
      }
    };

    const handleGameEnd = (data: {
      gameId: string;
      completedQuestions: number;
      totalQuestions: number;
      state: TwentyOneQuestionsState;
    }) => {
      if (data.gameId === gameId) {
        console.log("TwentyOneQuestionsGame: Game ended", data);
        setGameState(data.state);
        if (onGameEnd) {
          onGameEnd({
            winnerId: null,
            winnerName: null,
            isDraw: true // It's not competitive, just conversation
          });
        }
      }
    };

    socket.on("game.started", handleGameStarted);
    socket.on("game.stateUpdate", handleGameStateUpdate);
    socket.on("twentyOneQuestions.playerReady", handlePlayerReady);
    socket.on("twentyOneQuestions.nextQuestion", handleNextQuestion);
    socket.on("twentyOneQuestions.gameEnd", handleGameEnd);

    return () => {
      socket.off("game.started", handleGameStarted);
      socket.off("game.stateUpdate", handleGameStateUpdate);
      socket.off("twentyOneQuestions.playerReady", handlePlayerReady);
      socket.off("twentyOneQuestions.nextQuestion", handleNextQuestion);
      socket.off("twentyOneQuestions.gameEnd", handleGameEnd);
    };
  }, [socket, gameId, odUserId, opponent, onGameEnd]);

  const handleNext = () => {
    if (!socket || isReady || !gameState) return;

    setIsReady(true);
    setWaitingForOpponent(true);
    socket.emit("twentyOneQuestions.next", { gameId });
  };

  if (!gameState) {
    return (
      <div className="bg-gray-900 rounded-lg border border-white/20 p-6">
        <p className="text-gray-400">Loading 21 Questions game...</p>
      </div>
    );
  }

  if (gameState.phase === "gameEnd") {
    return (
      <div className="bg-gray-900 rounded-lg border border-white/20 p-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Game Complete! 🎉</h2>
          <p className="text-gray-300 mb-2">
            You've completed {gameState.completedQuestions} out of {gameState.totalQuestions} questions!
          </p>
          <p className="text-gray-400 text-sm">Hope you learned something new about each other!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-lg border border-white/20 p-6">
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-white mb-2">21 Questions</h2>
        <div className="flex justify-between text-sm text-gray-300">
          <div>
            Question {gameState.currentQuestionIndex + 1} of {gameState.totalQuestions}
          </div>
          <div>
            {opponent && (
              <span>
                {isOpponentReady ? (
                  <span className="text-green-400">✓ {opponent.displayName} is ready</span>
                ) : (
                  <span className="text-gray-500">Waiting for {opponent.displayName}...</span>
                )}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="bg-gray-800 rounded-lg border border-white/10 p-8 mb-6">
        <div className="text-center">
          <p className="text-2xl text-white mb-6 leading-relaxed">
            {gameState.currentQuestion}
          </p>
          
          {isReady && !isOpponentReady && (
            <div className="mt-4 mb-4">
              <p className="text-gray-400 text-sm mb-2">You're ready! Waiting for {opponent?.displayName || "opponent"}...</p>
              <div className="flex justify-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
              </div>
            </div>
          )}

          {isReady && isOpponentReady && (
            <p className="text-green-400 mt-4 mb-4 text-sm">Both players ready! Moving to next question...</p>
          )}

          {/* Always show the button, but disable it when user has clicked */}
          <button
            onClick={handleNext}
            disabled={isReady}
            className={`mt-4 px-8 py-3 font-semibold border-2 rounded-lg transition-colors ${
              isReady
                ? "bg-gray-600 text-gray-300 cursor-not-allowed border-gray-500"
                : "bg-white text-black hover:bg-gray-200 border-white"
            }`}
          >
            {isReady ? "Waiting for opponent..." : "Next Question"}
          </button>
        </div>
      </div>

      <div className="text-center text-xs text-gray-500">
        <p>Both players need to click "Next Question" to proceed</p>
      </div>
    </div>
  );
}

