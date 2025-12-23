"use client";

import { useEffect, useState } from "react";
import { Socket } from "socket.io-client";

interface TruthsAndLieState {
  phase: "waitingForStatements" | "guessing" | "result" | "gameEnd";
  chooserId: string;
  guesserId: string;
  statements: Array<{
    text: string;
    isLie: boolean;
    index: number;
  }>;
  selectedStatementIndex: number | null;
  isCorrect: boolean | null;
  winnerId: string | null;
  timeRemaining: number;
  startedAt: number | null;
}

interface GamePlayer {
  odUserId: string;
  side: string;
  displayName: string;
}

interface TruthsAndLieGameProps {
  gameId: string;
  socket: Socket;
  odUserId: string;
  initialState?: TruthsAndLieState;
  initialPlayers?: GamePlayer[];
  onGameEnd?: (result: GameEndResult) => void;
}

interface GameEndResult {
  winnerId: string | null;
  winnerName: string | null;
  isDraw: boolean;
}

export default function TruthsAndLieGame({
  gameId,
  socket,
  odUserId,
  initialState,
  initialPlayers,
  onGameEnd
}: TruthsAndLieGameProps) {
  const [gameState, setGameState] = useState<TruthsAndLieState | null>(initialState || null);
  const [statements, setStatements] = useState<string[]>(["", "", ""]);
  const [lieIndex, setLieIndex] = useState<number | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  const isChooser = gameState?.chooserId === odUserId;
  const isGuesser = gameState?.guesserId === odUserId;
  const opponent = initialPlayers?.find(p => p.odUserId !== odUserId);

  useEffect(() => {
    if (initialState) {
      setGameState(initialState);
    } else {
      // If no initial state, try to get it from socket events
      console.log("TruthsAndLieGame: No initial state, waiting for game.started event");
    }
  }, [initialState]);

  useEffect(() => {
    if (!socket) return;

    // Listen for game.started event in case state comes later
    const handleGameStarted = (data: { gameId: string; gameType: string; state: any; players: any[] }) => {
      if (data.gameId === gameId && (data.gameType === "TRUTHS_AND_LIE" || data.gameType?.toUpperCase() === "TRUTHS_AND_LIE")) {
        console.log("TruthsAndLieGame: Received game.started event", data);
        if (data.state) {
          setGameState(data.state);
        }
      }
    };

    const handleGameStateUpdate = (data: { gameId: string; state: TruthsAndLieState }) => {
      if (data.gameId === gameId) {
        console.log("TruthsAndLieGame: State updated", data);
        // If we're the guesser and statements are being sent, make sure we update them
        if (data.state.statements && data.state.statements.length > 0) {
          setGameState(data.state);
        } else {
          setGameState(data.state);
        }
      }
    };

    const handleStatementsSubmitted = (data: {
      gameId: string;
      statements: string[];
      phase: string;
    }) => {
      if (data.gameId === gameId) {
        console.log("TruthsAndLieGame: Statements submitted", data);
        // Update state with statements (without revealing which is the lie)
        setGameState(prev => prev ? {
          ...prev,
          phase: data.phase as any,
          statements: data.statements.map((text, index) => ({
            text,
            isLie: false, // Don't reveal which is the lie
            index
          }))
        } : null);
        setTimeRemaining(20);
        setHasSubmitted(false);
        setSelectedIndex(null);
      }
    };

    const handleGuessingStarted = (data: { gameId: string; timeLimit: number }) => {
      if (data.gameId === gameId) {
        setTimeRemaining(data.timeLimit);
        setHasSubmitted(false);
      }
    };

    const handleResult = (data: {
      gameId: string;
      selectedIndex: number;
      isCorrect: boolean;
      winnerId: string;
      lieIndex: number;
      phase: string;
      timedOut?: boolean;
    }) => {
      if (data.gameId === gameId) {
        console.log("TruthsAndLieGame: Result received", data);
        // Update state with result and reveal which statement is the lie
        setGameState(prev => {
          if (!prev) return null;
          // Update statements to reveal which one is the lie
          const updatedStatements = prev.statements.map((s, index) => ({
            ...s,
            isLie: index === data.lieIndex
          }));
          return {
            ...prev,
            phase: data.phase as any,
            selectedStatementIndex: data.selectedIndex,
            isCorrect: data.isCorrect,
            winnerId: data.winnerId,
            statements: updatedStatements
          };
        });
        setTimeRemaining(null);
      }
    };

    const handleGameEnd = (data: {
      gameId: string;
      winnerId: string | null;
      state: TruthsAndLieState;
    }) => {
      if (data.gameId === gameId) {
        setGameState(data.state);
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

    socket.on("game.started", handleGameStarted);
    socket.on("game.stateUpdate", handleGameStateUpdate);
    socket.on("truthsAndLie.statementsSubmitted", handleStatementsSubmitted);
    socket.on("truthsAndLie.guessingStarted", handleGuessingStarted);
    socket.on("truthsAndLie.result", handleResult);
    socket.on("truthsAndLie.gameEnd", handleGameEnd);

    // Timer countdown
    let timerInterval: NodeJS.Timeout | null = null;
    if (timeRemaining !== null && timeRemaining > 0 && gameState?.phase === "guessing") {
      timerInterval = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev === null || prev <= 1) {
            if (timerInterval) clearInterval(timerInterval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      socket.off("game.started", handleGameStarted);
      socket.off("game.stateUpdate", handleGameStateUpdate);
      socket.off("truthsAndLie.statementsSubmitted", handleStatementsSubmitted);
      socket.off("truthsAndLie.guessingStarted", handleGuessingStarted);
      socket.off("truthsAndLie.result", handleResult);
      socket.off("truthsAndLie.gameEnd", handleGameEnd);
      if (timerInterval) clearInterval(timerInterval);
    };
  }, [socket, gameId, timeRemaining, gameState?.phase, onGameEnd, initialPlayers]);

  const handleStatementChange = (index: number, value: string) => {
    const newStatements = [...statements];
    newStatements[index] = value;
    setStatements(newStatements);
  };

  const handleSubmitStatements = () => {
    if (statements.some(s => !s.trim()) || lieIndex === null) {
      alert("Please fill in all 3 statements and select which one is the lie");
      return;
    }

    socket.emit("truthsAndLie.submitStatements", {
      gameId,
      statements: statements.map(s => s.trim()),
      lieIndex
    });

    setHasSubmitted(true);
  };

  const handleSelectStatement = (index: number) => {
    if (hasSubmitted || gameState?.phase !== "guessing") return;
    setSelectedIndex(index);
  };

  const handleSubmitGuess = () => {
    if (selectedIndex === null || hasSubmitted || !socket) return;

    socket.emit("truthsAndLie.submitGuess", {
      gameId,
      selectedIndex
    });

    setHasSubmitted(true);
  };

  if (!gameState) {
    return (
      <div className="bg-gray-900 rounded-lg border border-white/20 p-6">
        <p className="text-gray-400">Loading game...</p>
      </div>
    );
  }

  // Waiting for statements phase (chooser)
  if (gameState.phase === "waitingForStatements" && isChooser) {
    return (
      <div className="bg-gray-900 rounded-lg border border-white/20 p-6">
        <h2 className="text-2xl font-bold text-white mb-4 text-center">Two Truths and a Lie</h2>
        <p className="text-gray-400 text-center mb-6">
          Create 3 statements about yourself. Two must be true, one must be a lie. Your opponent will try to guess which is the lie.
        </p>

        <div className="space-y-4 mb-6">
          {[0, 1, 2].map((index) => (
            <div key={index}>
              <label className="block text-sm font-semibold text-gray-300 mb-2">
                Statement {index + 1}
              </label>
              <textarea
                value={statements[index]}
                onChange={(e) => handleStatementChange(index, e.target.value)}
                placeholder={`Enter statement ${index + 1}...`}
                className="w-full p-3 bg-gray-800 border border-gray-700 rounded text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500"
                rows={2}
                disabled={hasSubmitted}
              />
            </div>
          ))}
        </div>

        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-300 mb-2">
            Which statement is the lie?
          </label>
          <div className="grid grid-cols-3 gap-3">
            {[0, 1, 2].map((index) => (
              <button
                key={index}
                onClick={() => setLieIndex(index)}
                disabled={hasSubmitted}
                className={`p-3 rounded border-2 transition-all ${
                  lieIndex === index
                    ? "bg-yellow-600 border-yellow-400 text-white"
                    : "bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
                } ${hasSubmitted ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                Statement {index + 1}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleSubmitStatements}
          disabled={hasSubmitted || statements.some(s => !s.trim()) || lieIndex === null}
          className="w-full bg-white px-6 py-3 text-black font-semibold hover:bg-gray-200 border-2 border-white disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {hasSubmitted ? "Submitted!" : "Submit Statements"}
        </button>
      </div>
    );
  }

  // Waiting for statements phase (guesser)
  if (gameState.phase === "waitingForStatements" && isGuesser) {
    return (
      <div className="bg-gray-900 rounded-lg border border-white/20 p-6">
        <h2 className="text-2xl font-bold text-white mb-4 text-center">Two Truths and a Lie</h2>
        <p className="text-gray-400 text-center">
          Waiting for {opponent?.displayName || "opponent"} to create their statements...
        </p>
      </div>
    );
  }

  // Guessing phase (guesser)
  if (gameState.phase === "guessing" && isGuesser) {
    // Check if statements exist, if not show loading
    if (!gameState.statements || gameState.statements.length === 0) {
      return (
        <div className="bg-gray-900 rounded-lg border border-white/20 p-6">
          <h2 className="text-2xl font-bold text-white mb-4 text-center">Two Truths and a Lie</h2>
          <p className="text-gray-400 text-center">Loading statements...</p>
        </div>
      );
    }
    
    const displayStatements = gameState.statements.map(s => s.text);

    return (
      <div className="bg-gray-900 rounded-lg border border-white/20 p-6">
        <h2 className="text-2xl font-bold text-white mb-4 text-center">Which is the Lie?</h2>
        <p className="text-gray-400 text-center mb-2">
          {opponent?.displayName || "Your opponent"} has created 3 statements. Two are true, one is a lie.
        </p>
        <p className="text-yellow-400 text-center mb-6 font-semibold">
          You have {timeRemaining !== null ? `${timeRemaining}s` : "20s"} to choose!
        </p>

        <div className="space-y-3 mb-6">
          {displayStatements.map((statement, index) => (
            <button
              key={index}
              onClick={() => handleSelectStatement(index)}
              disabled={hasSubmitted}
              className={`w-full text-left p-4 rounded border-2 transition-all ${
                selectedIndex === index
                  ? "bg-yellow-600 border-yellow-400 text-white"
                  : hasSubmitted
                  ? "bg-gray-800 border-gray-700 text-gray-500 cursor-not-allowed"
                  : "bg-gray-800 border-gray-600 text-white hover:bg-gray-700 hover:border-gray-500"
              }`}
            >
              <span className="font-semibold mr-2">{index + 1}.</span>
              {statement}
            </button>
          ))}
        </div>

        {!hasSubmitted && (
          <button
            onClick={handleSubmitGuess}
            disabled={selectedIndex === null}
            className="w-full bg-white px-6 py-3 text-black font-semibold hover:bg-gray-200 border-2 border-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Submit Guess
          </button>
        )}

        {hasSubmitted && (
          <p className="text-center text-gray-400">Guess submitted! Waiting for result...</p>
        )}
      </div>
    );
  }

  // Guessing phase (chooser - waiting)
  if (gameState.phase === "guessing" && isChooser) {
    return (
      <div className="bg-gray-900 rounded-lg border border-white/20 p-6">
        <h2 className="text-2xl font-bold text-white mb-4 text-center">Two Truths and a Lie</h2>
        <p className="text-gray-400 text-center">
          {opponent?.displayName || "Your opponent"} is guessing which statement is the lie...
        </p>
        {timeRemaining !== null && (
          <p className="text-yellow-400 text-center mt-2 font-semibold">
            {timeRemaining}s remaining
          </p>
        )}
      </div>
    );
  }

  // Result phase
  if (gameState.phase === "result") {
    const isWinner = gameState.winnerId === odUserId;
    const displayStatements = gameState.statements.map(s => s.text);
    // Find which statement is the lie - check the statements array
    let lieIndex = gameState.statements.findIndex(s => s.isLie);
    
    // If lieIndex not found (shouldn't happen if handleResult worked), log warning
    if (lieIndex === -1) {
      console.warn("Lie index not found in statements array");
    }

    return (
      <div className="bg-gray-900 rounded-lg border border-white/20 p-6">
        <h2 className="text-2xl font-bold text-white mb-4 text-center">Result</h2>

        <div className={`p-4 rounded mb-4 ${
          isWinner ? "bg-green-900/30 border border-green-500" : "bg-red-900/30 border border-red-500"
        }`}>
          <p className={`text-center font-semibold text-lg ${
            isWinner ? "text-green-400" : "text-red-400"
          }`}>
            {isWinner ? "✓ You Win!" : "✗ You Lost"}
          </p>
          {isGuesser && (
            <p className="text-center text-gray-300 mt-2">
              {gameState.isCorrect
                ? "You correctly identified the lie!"
                : "You guessed wrong. The lie was statement " + (lieIndex + 1)}
            </p>
          )}
          {isChooser && (
            <p className="text-center text-gray-300 mt-2">
              {gameState.isCorrect
                ? "Your opponent guessed correctly!"
                : "Your opponent guessed wrong!"}
            </p>
          )}
        </div>

        <div className="space-y-2 mb-4">
          <h3 className="text-lg font-semibold text-white">Statements:</h3>
          {displayStatements.map((statement, index) => {
            // Check if this statement is the lie from the statements array
            const isLie = gameState.statements[index]?.isLie || false;
            return (
              <div
                key={index}
                className={`p-3 rounded ${
                  isLie
                    ? "bg-red-900/20 border border-red-500"
                    : "bg-gray-800 border border-gray-700"
                }`}
              >
                <span className="font-semibold mr-2">{index + 1}.</span>
                {statement}
                {isLie ? (
                  <span className="ml-2 text-red-400 font-semibold">(LIE)</span>
                ) : (
                  <span className="ml-2 text-green-400 font-semibold">(TRUE)</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Game end
  if (gameState.phase === "gameEnd") {
    const isWinner = gameState.winnerId === odUserId;
    const winner = initialPlayers?.find(p => p.odUserId === gameState.winnerId);

    return (
      <div className="bg-gray-900 rounded-lg border border-white/20 p-6">
        <div className="text-center">
          {isWinner ? (
            <>
              <div className="text-6xl mb-4">🏆</div>
              <h2 className="text-3xl font-bold text-yellow-400 mb-2">You Win!</h2>
            </>
          ) : (
            <>
              <h2 className="text-3xl font-bold text-white mb-2">Game Over</h2>
              <p className="text-xl text-gray-300">
                {winner?.displayName || "Opponent"} wins!
              </p>
            </>
          )}
        </div>
      </div>
    );
  }

  return null;
}

