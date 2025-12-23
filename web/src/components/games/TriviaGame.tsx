"use client";

import { useEffect, useState } from "react";
import { Socket } from "socket.io-client";

type TriviaTheme = "geography" | "science" | "history" | "sports" | "entertainment" | "mixed";

interface TriviaState {
  phase: "themeSelection" | "countdown" | "question" | "result" | "gameEnd";
  currentQuestionIndex: number;
  questions: Array<{
    question: string;
    allAnswers: string[];
    correctAnswer: string;
    category?: string;
  }>;
  players: Array<{
    odUserId: string;
    displayName: string;
    score: number;
  }>;
  currentAnswers: Array<{
    odUserId: string;
    selectedAnswer: string;
    selectedAnswerIndex: number;
    isCorrect: boolean;
    pointsEarned: number;
    timeToAnswer: number;
  }>;
  playerCount: number;
  selectedTheme?: string;
}

interface GamePlayer {
  odUserId: string;
  side: string;
  displayName: string;
}

interface TriviaGameProps {
  gameId: string;
  socket: Socket;
  odUserId: string;
  initialState?: TriviaState;
  initialPlayers?: GamePlayer[];
  onGameEnd?: (result: GameEndResult) => void;
}

interface GameEndResult {
  winnerId: string | null;
  winnerName: string | null;
  isDraw: boolean;
  finalScores: Array<{ odUserId: string; displayName: string; score: number }>;
}

const THEMES: { value: TriviaTheme; label: string; emoji: string }[] = [
  { value: "geography", label: "Geography", emoji: "🌍" },
  { value: "science", label: "Science", emoji: "🔬" },
  { value: "history", label: "History", emoji: "📜" },
  { value: "sports", label: "Sports", emoji: "⚽" },
  { value: "entertainment", label: "Entertainment", emoji: "🎬" },
  { value: "mixed", label: "Mixed", emoji: "🎲" }
];

export default function TriviaGame({
  gameId,
  socket,
  odUserId,
  initialState,
  initialPlayers,
  onGameEnd
}: TriviaGameProps) {
  const [gameState, setGameState] = useState<TriviaState | null>(initialState || null);
  const [selectedTheme, setSelectedTheme] = useState<TriviaTheme | null>(null);
  const [themeSelectionStatus, setThemeSelectionStatus] = useState<{ [key: string]: string }>({});
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [playersAnsweredCount, setPlayersAnsweredCount] = useState(0);
  const [questionStartTime, setQuestionStartTime] = useState<number | null>(null);
  const [showWinnerAnimation, setShowWinnerAnimation] = useState(false);
  const [winnerData, setWinnerData] = useState<{ name: string; score: number; isDraw: boolean } | null>(null);
  const [isTabVisible, setIsTabVisible] = useState(true);
  const [gameStarted, setGameStarted] = useState(false);

  useEffect(() => {
    if (initialState) {
      setGameState(initialState);
    }
  }, [initialState]);

  useEffect(() => {
    if (!socket) return;

    // Listen for game state updates
    const handleGameStateUpdate = (data: { gameId: string; state: TriviaState }) => {
      if (data.gameId === gameId) {
        setGameState(data.state);
        // Reset answer state when moving to a new question
        if (data.state.phase === "question") {
          setSelectedAnswer(null);
          setHasAnswered(false);
          setPlayersAnsweredCount(0);
          setTimeRemaining(null);
        }
      }
    };

    // Listen for theme selection
    const handleThemeSelected = (data: {
      gameId: string;
      userId: string;
      theme: string;
      allPlayersSelected: boolean;
      selectedTheme?: string;
    }) => {
      if (data.gameId === gameId) {
        setThemeSelectionStatus(prev => ({
          ...prev,
          [data.userId]: data.theme
        }));
        if (data.allPlayersSelected && data.selectedTheme) {
          setGameState(prev => prev ? { ...prev, selectedTheme: data.selectedTheme, phase: "countdown" } : null);
        }
      }
    };

    // Listen for question start
    const handleQuestionStart = (data: { gameId: string; questionIndex: number; timeLimit: number }) => {
      if (data.gameId === gameId) {
        setSelectedAnswer(null);
        setHasAnswered(false);
        setTimeRemaining(data.timeLimit);
        setPlayersAnsweredCount(0);
        setQuestionStartTime(Date.now());
      }
    };

    // Listen for player answered event
    const handlePlayerAnswered = (data: { odUserId: string }) => {
      setPlayersAnsweredCount((prev) => prev + 1);
    };

    // Listen for question result
    const handleQuestionResult = (data: {
      gameId: string;
      correctAnswer: string;
      correctAnswerIndex: number;
      results: Array<{
        odUserId: string;
        displayName: string;
        selectedAnswer: string;
        selectedAnswerIndex: number;
        isCorrect: boolean;
        pointsEarned: number;
        timeToAnswer: number;
      }>;
      scores: Array<{ odUserId: string; displayName: string; score: number }>;
    }) => {
      if (data.gameId === gameId) {
        setGameState((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            phase: "result",
            currentAnswers: data.results,
            players: data.scores
          };
        });
        setHasAnswered(true);
      }
    };

    // Listen for game end
    const handleGameEnd = (data: {
      gameId: string;
      finalScores: Array<{ odUserId: string; displayName: string; score: number }>;
      winnerId: string | null;
      winnerIds?: string[];
      isDraw: boolean;
    }) => {
      if (data.gameId === gameId) {
        const winner = data.finalScores.find((p) => p.odUserId === data.winnerId);
        const winnerName = winner?.displayName || (data.isDraw ? null : "Unknown");
        
        setWinnerData({
          name: winnerName || "",
          score: winner?.score || 0,
          isDraw: data.isDraw
        });
        setShowWinnerAnimation(true);
        
        if (onGameEnd) {
          onGameEnd({
            winnerId: data.winnerId,
            winnerName,
            isDraw: data.isDraw,
            finalScores: data.finalScores
          });
        }
        setGameState((prev) => {
          if (!prev) return prev;
          return { ...prev, phase: "gameEnd" };
        });
      }
    };

    // Listen for game errors
    const handleGameError = (data: { message: string }) => {
      console.error("Game error:", data.message);
      // If error is about answer submission, allow user to try again
      if (data.message.includes("answer") || data.message.includes("Question")) {
        setHasAnswered(false);
      }
    };

    socket.on("game.stateUpdate", handleGameStateUpdate);
    socket.on("trivia.themeSelected", handleThemeSelected);
    socket.on("trivia.questionStart", handleQuestionStart);
    socket.on("trivia.playerAnswered", handlePlayerAnswered);
    socket.on("trivia.questionResult", handleQuestionResult);
    socket.on("trivia.gameEnd", handleGameEnd);
    socket.on("game.error", handleGameError);

    // Timer countdown
    let timerInterval: NodeJS.Timeout | null = null;
    if (timeRemaining !== null && timeRemaining > 0) {
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
      socket.off("game.stateUpdate", handleGameStateUpdate);
      socket.off("trivia.themeSelected", handleThemeSelected);
      socket.off("trivia.questionStart", handleQuestionStart);
      socket.off("trivia.playerAnswered", handlePlayerAnswered);
      socket.off("trivia.questionResult", handleQuestionResult);
      socket.off("trivia.gameEnd", handleGameEnd);
      socket.off("game.error", handleGameError);
      if (timerInterval) clearInterval(timerInterval);
    };
  }, [socket, gameId, timeRemaining, onGameEnd]);

  // Track if game has started (after theme selection)
  useEffect(() => {
    if (gameState && gameState.phase !== "themeSelection" && !gameStarted) {
      setGameStarted(true);
    }
  }, [gameState?.phase, gameStarted]);

  // Prevent page exit/navigation once game starts
  useEffect(() => {
    if (!gameStarted) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "Are you sure you want to leave? The game is in progress!";
      return e.returnValue;
    };

    const handlePopState = (e: PopStateEvent) => {
      if (gameState && gameState.phase !== "gameEnd" && gameState.phase !== "themeSelection") {
        window.history.pushState(null, "", window.location.href);
        alert("Cannot exit the game while it's in progress!");
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    window.history.pushState(null, "", window.location.href);
    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("popstate", handlePopState);
    };
  }, [gameStarted, gameState?.phase]);

  // Tab visibility detection - auto-submit wrong answer if tab is switched
  useEffect(() => {
    if (!gameState || gameState.phase !== "question" || hasAnswered || !socket) return;

    const handleVisibilityChange = () => {
      const isVisible = !document.hidden;
      setIsTabVisible(isVisible);

      // If tab becomes hidden during a question, auto-submit wrong answer
      if (!isVisible && !hasAnswered && gameState.phase === "question") {
        // Submit a wrong answer (index -1 or first wrong answer)
        const currentQuestion = gameState.questions[gameState.currentQuestionIndex];
        if (currentQuestion) {
          // Find the first wrong answer index
          let wrongAnswerIndex = 0;
          for (let i = 0; i < currentQuestion.allAnswers.length; i++) {
            if (currentQuestion.allAnswers[i] !== currentQuestion.correctAnswer) {
              wrongAnswerIndex = i;
              break;
            }
          }

          // Auto-submit wrong answer
          socket.emit("trivia.answer", {
            gameId,
            questionIndex: gameState.currentQuestionIndex,
            answerIndex: wrongAnswerIndex
          });

          setHasAnswered(true);
          setSelectedAnswer(wrongAnswerIndex);
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [gameState?.phase, gameState?.currentQuestionIndex, hasAnswered, socket, gameId]);

  // Reset answer state when new question starts
  useEffect(() => {
    if (gameState?.phase === "question") {
      setSelectedAnswer(null);
      setHasAnswered(false);
      setPlayersAnsweredCount(0);
      setIsTabVisible(true); // Reset visibility state for new question
    }
  }, [gameState?.currentQuestionIndex, gameState?.phase]);

  const handleThemeSelect = (theme: TriviaTheme) => {
    if (selectedTheme || !socket) return;
    setSelectedTheme(theme);
    socket.emit("trivia.selectTheme", {
      gameId,
      theme
    });
  };

  const handleAnswerSelect = (answerIndex: number) => {
    if (hasAnswered || !gameState || gameState.phase !== "question") return;
    setSelectedAnswer(answerIndex);
  };

  const handleSubmitAnswer = () => {
    if (selectedAnswer === null || hasAnswered || !gameState || !socket) return;
    
    // Set hasAnswered immediately to prevent double-clicks, but we'll handle errors
    setHasAnswered(true);
    
    socket.emit("trivia.answer", {
      gameId,
      questionIndex: gameState.currentQuestionIndex,
      answerIndex: selectedAnswer
    });
  };

  if (!gameState) {
    return (
      <div className="bg-gray-900 rounded-lg border border-white/20 p-6">
        <p className="text-gray-400">Loading trivia game...</p>
      </div>
    );
  }

  // Theme Selection Phase
  if (gameState.phase === "themeSelection") {
    const opponent = gameState.players.find(p => p.odUserId !== odUserId);
    const opponentSelected = opponent && themeSelectionStatus[opponent.odUserId];
    
    return (
      <div className="bg-gray-900 rounded-lg border border-white/20 p-6">
        <h2 className="text-2xl font-bold text-white mb-4 text-center">Choose a Theme</h2>
        <p className="text-gray-400 text-center mb-6">
          Both players will select a theme. If you choose the same, that theme will be used. Otherwise, one will be randomly selected.
        </p>
        
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          {THEMES.map((theme) => (
            <button
              key={theme.value}
              onClick={() => handleThemeSelect(theme.value)}
              disabled={!!selectedTheme}
              className={`p-4 rounded-lg border-2 transition-all ${
                selectedTheme === theme.value
                  ? "bg-yellow-600 border-yellow-400 text-white"
                  : selectedTheme
                  ? "bg-gray-800 border-gray-700 text-gray-500 cursor-not-allowed"
                  : "bg-gray-800 border-gray-600 text-white hover:bg-gray-700 hover:border-gray-500"
              }`}
            >
              <div className="text-3xl mb-2">{theme.emoji}</div>
              <div className="font-semibold">{theme.label}</div>
            </button>
          ))}
        </div>

        <div className="text-center space-y-2">
          <p className="text-gray-400">
            {selectedTheme ? "✓ You selected: " + THEMES.find(t => t.value === selectedTheme)?.label : "Select a theme above"}
          </p>
          {opponentSelected && (
            <p className="text-gray-400">
              Opponent selected: {THEMES.find(t => t.value === opponentSelected)?.label}
            </p>
          )}
          {selectedTheme && !gameState.selectedTheme && (
            <p className="text-yellow-400">Waiting for opponent to select...</p>
          )}
        </div>
      </div>
    );
  }

  // Countdown Phase
  if (gameState.phase === "countdown") {
    return (
      <div className="bg-gray-900 rounded-lg border border-white/20 p-6">
        <div className="text-center">
          <p className="text-2xl font-bold text-white mb-2">Get Ready!</p>
          <p className="text-gray-400 mb-4">Theme: {THEMES.find(t => t.value === gameState.selectedTheme)?.emoji} {THEMES.find(t => t.value === gameState.selectedTheme)?.label}</p>
          <p className="text-gray-400">Trivia game starting soon...</p>
        </div>
      </div>
    );
  }

  // Validate game state structure
  if (!gameState.questions || !Array.isArray(gameState.questions) || gameState.questions.length === 0) {
    return (
      <div className="bg-gray-900 rounded-lg border border-white/20 p-6">
        <p className="text-gray-400">Waiting for trivia questions...</p>
      </div>
    );
  }

  const currentQuestion = gameState.questions[gameState.currentQuestionIndex];
  const playerScore = gameState.players.find((p) => p.odUserId === odUserId)?.score || 0;
  const opponent = gameState.players.find((p) => p.odUserId !== odUserId);

  // Game End with Winner Animation
  if (gameState.phase === "gameEnd" || showWinnerAnimation) {
    const winner = gameState.players.reduce((max, p) => 
      p.score > (max?.score || 0) ? p : max
    );
    const isDraw = gameState.players[0].score === gameState.players[1].score;
    const isWinner = winner.odUserId === odUserId && !isDraw;

    return (
      <div className="bg-gray-900 rounded-lg border border-white/20 p-6 relative overflow-hidden">
        {/* Winner Animation */}
        {showWinnerAnimation && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-50 animate-fade-in">
            <div className="text-center animate-bounce">
              {isDraw ? (
                <>
                  <div className="text-6xl mb-4">🤝</div>
                  <h2 className="text-4xl font-bold text-yellow-400 mb-2">It's a Tie!</h2>
                  <p className="text-xl text-white">Both players scored {winner.score} points!</p>
                </>
              ) : (
                <>
                  <div className="text-8xl mb-4 animate-pulse">🏆</div>
                  <h2 className="text-5xl font-bold text-yellow-400 mb-2">
                    {isWinner ? "You Win!" : `${winner.displayName} Wins!`}
                  </h2>
                  <p className="text-2xl text-white mb-4">
                    {isWinner ? "Congratulations!" : "Better luck next time!"}
                  </p>
                  <div className="text-xl text-gray-300">
                    Final Score: {winner.score} points
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Final Scores */}
        <div className={showWinnerAnimation ? "opacity-30" : ""}>
          <h2 className="text-2xl font-bold text-white mb-4 text-center">Game Over!</h2>
          <div className="space-y-4">
            <div className="text-center mb-6">
              {isDraw ? (
                <p className="text-xl text-yellow-400">It's a tie!</p>
              ) : (
                <div className="flex items-center justify-center gap-3">
                  <span className="text-4xl">🏆</span>
                  <p className="text-xl text-green-400">
                    {winner.displayName} wins with {winner.score} points!
                  </p>
                </div>
              )}
            </div>
            <div className="space-y-2">
              {gameState.players.map((player) => {
                const isPlayerWinner = player.odUserId === winner.odUserId && !isDraw;
                return (
                  <div
                    key={player.odUserId}
                    className={`p-4 rounded flex items-center justify-between ${
                      isPlayerWinner
                        ? "bg-green-900/30 border-2 border-green-500"
                        : "bg-gray-800 border border-gray-700"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {isPlayerWinner && <span className="text-2xl">🏆</span>}
                      <span className={`text-lg font-semibold ${isPlayerWinner ? "text-green-400" : "text-white"}`}>
                        {player.displayName}
                      </span>
                    </div>
                    <span className={`text-lg font-bold ${isPlayerWinner ? "text-green-400" : "text-gray-300"}`}>
                      {player.score} points
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Result Phase
  if (gameState.phase === "result") {
    const userResult = gameState.currentAnswers.find((a) => a.odUserId === odUserId);
    
    return (
      <div className="bg-gray-900 rounded-lg border border-white/20 p-6">
        <h2 className="text-xl font-bold text-white mb-4">
          Question {gameState.currentQuestionIndex + 1} of {gameState.questions.length}
        </h2>
        
        {userResult && (
          <div className={`p-4 rounded mb-4 ${
            userResult.isCorrect ? "bg-green-900/30 border border-green-500" : "bg-red-900/30 border border-red-500"
          }`}>
            <p className="text-white font-semibold mb-2">
              {userResult.isCorrect ? "✓ Correct!" : "✗ Incorrect"}
            </p>
            <p className="text-gray-300">Your answer: {userResult.selectedAnswer}</p>
            <p className="text-gray-300">Correct answer: {currentQuestion.correctAnswer}</p>
            {userResult.pointsEarned > 0 && (
              <p className="text-green-400 font-bold text-lg">+{userResult.pointsEarned} points</p>
            )}
            {!userResult.isCorrect && (
              <p className="text-red-400">+0 points (wrong answer)</p>
            )}
          </div>
        )}

        <div className="space-y-2 mb-4">
          <h3 className="text-lg font-semibold text-white">Scores:</h3>
          {gameState.players.map((player) => (
            <div key={player.odUserId} className="flex justify-between bg-gray-800 p-2 rounded">
              <span className="text-white">{player.displayName}</span>
              <span className="text-gray-300">{player.score} points</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Question Phase
  return (
    <div className="bg-gray-900 rounded-lg border border-white/20 p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-white">
          Question {gameState.currentQuestionIndex + 1} of {gameState.questions.length}
        </h2>
        <div className="text-right">
          <div className="text-sm text-gray-400">Your Score</div>
          <div className="text-2xl font-bold text-white">{playerScore}</div>
        </div>
      </div>

      {timeRemaining !== null && timeRemaining > 0 && (
        <div className="text-center mb-4">
          <div className={`text-lg font-semibold ${!isTabVisible ? "text-red-500" : "text-yellow-400"}`}>
            Time remaining: {timeRemaining}s
            {!isTabVisible && (
              <span className="ml-2 text-red-500 text-sm">⚠️ Tab switched - answer will be marked wrong!</span>
            )}
          </div>
        </div>
      )}

      <div className="mb-6">
        <h3 className="text-lg font-semibold text-white mb-4">{currentQuestion.question}</h3>
        
        <div className="space-y-3">
          {currentQuestion.allAnswers.map((answer, index) => {
            const isSelected = selectedAnswer === index;
            const isDisabled = hasAnswered;
            
            return (
              <button
                key={index}
                onClick={() => handleAnswerSelect(index)}
                disabled={isDisabled}
                className={`w-full text-left p-4 rounded border-2 transition-all ${
                  isSelected
                    ? "bg-yellow-600 border-yellow-400 text-white"
                    : isDisabled
                    ? "bg-gray-800 border-gray-700 text-gray-500 cursor-not-allowed"
                    : "bg-gray-800 border-gray-600 text-white hover:bg-gray-700 hover:border-gray-500"
                }`}
              >
                <span className="font-semibold mr-2">{String.fromCharCode(65 + index)}.</span>
                {answer}
              </button>
            );
          })}
        </div>
      </div>

      {!hasAnswered && (
        <div className="flex justify-center mb-4">
          <button
            onClick={handleSubmitAnswer}
            disabled={selectedAnswer === null}
            className="bg-white px-6 py-2 text-black font-semibold hover:bg-gray-200 border-2 border-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Submit Answer
          </button>
        </div>
      )}

      {hasAnswered && (
        <div className="text-center text-gray-400 mb-4">
          <p>✓ Answer submitted! Waiting for other players...</p>
        </div>
      )}

      <div className="mt-4 text-center text-sm text-gray-400">
        {playersAnsweredCount} / {gameState.playerCount} players answered
      </div>
    </div>
  );
}
