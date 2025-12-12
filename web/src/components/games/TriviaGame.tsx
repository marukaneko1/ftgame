"use client";

import { useState, useEffect, useCallback } from "react";

// Types matching backend
type Difficulty = 'easy' | 'medium' | 'hard';
type Category = 'general' | 'science' | 'history' | 'geography' | 'entertainment' | 'sports' | 'art' | 'music' | 'movies' | 'technology';
type GamePhase = 'waiting' | 'countdown' | 'question' | 'reveal' | 'scores' | 'finished';

interface PlayerScore {
  odUserId: string;
  displayName: string;
  totalPoints: number;
  correctAnswers: number;
  wrongAnswers: number;
  unanswered: number;
  averageTime: number;
  streak: number;
  maxStreak: number;
}

interface TriviaQuestion {
  id: string;
  category: Category;
  difficulty: Difficulty;
  question: string;
  correctAnswer: string;
  incorrectAnswers: string[];
  allAnswers: string[];
  timeLimit: number;
}

interface TriviaState {
  players: PlayerScore[];
  playerCount: number;
  questions: TriviaQuestion[];
  currentQuestionIndex: number;
  phase: GamePhase;
  questionStartedAt: number | null;
  timeRemaining: number;
  currentAnswers: any[];
  answerHistory: any[][];
  isFinished: boolean;
  winnerId: string | null;
  winnerIds: string[];
  createdAt: number;
  startedAt: number | null;
  endedAt: number | null;
}

interface TriviaGameProps {
  gameState: TriviaState;
  odUserId: string;
  onAnswer: (questionIndex: number, answerIndex: number) => void;
  onReady?: () => void;
  socket?: any;
}

const DIFFICULTY_STARS: Record<Difficulty, string> = {
  easy: '★☆☆',
  medium: '★★☆',
  hard: '★★★',
};

const CATEGORY_NAMES: Record<Category, string> = {
  general: 'General Knowledge',
  science: 'Science & Nature',
  history: 'History',
  geography: 'Geography',
  entertainment: 'Entertainment',
  sports: 'Sports',
  art: 'Art',
  music: 'Music',
  movies: 'Film',
  technology: 'Computers',
};

export default function TriviaGame({ gameState, odUserId, onAnswer, onReady, socket }: TriviaGameProps) {
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [localTimeRemaining, setLocalTimeRemaining] = useState(0);
  const [currentQuestionData, setCurrentQuestionData] = useState<any>(null);

  // Use currentQuestionData if available (from socket), otherwise use gameState
  const currentQuestion = currentQuestionData || gameState.questions[gameState.currentQuestionIndex];
  const myScore = gameState.players.find(p => p.odUserId === odUserId);
  const sortedPlayers = [...gameState.players].sort((a, b) => b.totalPoints - a.totalPoints);

  // Listen for trivia.question event to get question data
  useEffect(() => {
    if (!socket) return;

    const handleQuestion = (data: { question: string; answers: string[]; category: string; difficulty: string; timeLimit: number }) => {
      setCurrentQuestionData({
        question: data.question,
        allAnswers: data.answers,
        category: data.category,
        difficulty: data.difficulty,
        timeLimit: data.timeLimit
      });
      setLocalTimeRemaining(data.timeLimit);
      setSelectedAnswer(null);
      setHasAnswered(false);
    };

    socket.on("trivia.question", handleQuestion);
    return () => {
      socket.off("trivia.question", handleQuestion);
    };
  }, [socket]);

  // Update local timer
  useEffect(() => {
    if (gameState.phase === 'question' && gameState.timeRemaining > 0) {
      setLocalTimeRemaining(gameState.timeRemaining);
      const interval = setInterval(() => {
        setLocalTimeRemaining((prev) => {
          const newTime = Math.max(0, prev - 1);
          if (newTime === 0) {
            clearInterval(interval);
          }
          return newTime;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [gameState.phase, gameState.timeRemaining]);

  // Reset answer state when new question starts
  useEffect(() => {
    if (gameState.phase === 'question') {
      setSelectedAnswer(null);
      setHasAnswered(false);
    }
  }, [gameState.currentQuestionIndex, gameState.phase]);

  const handleAnswerSelect = (answerIndex: number) => {
    if (hasAnswered || gameState.phase !== 'question') return;
    setSelectedAnswer(answerIndex);
  };

  const handleSubmitAnswer = () => {
    if (selectedAnswer === null || hasAnswered) return;
    setHasAnswered(true);
    onAnswer(gameState.currentQuestionIndex, selectedAnswer);
  };

  // Countdown screen
  if (gameState.phase === 'countdown') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] bg-gray-900 rounded-lg border border-white/20 p-8">
        <div className="text-8xl font-bold text-white mb-4">
          {gameState.timeRemaining > 0 ? gameState.timeRemaining : 'GO!'}
        </div>
        <p className="text-gray-400 text-lg">Get ready for the first question!</p>
      </div>
    );
  }

  // Question screen
  if (gameState.phase === 'question' && currentQuestion) {
    const progressPercent = ((currentQuestion.timeLimit - localTimeRemaining) / currentQuestion.timeLimit) * 100;
    const answeredCount = gameState.currentAnswers.length;

    return (
      <div className="bg-gray-900 rounded-lg border border-white/20 p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-400">Question</span>
            <span className="text-lg font-bold text-white">
              {gameState.currentQuestionIndex + 1} / {gameState.questions.length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">{CATEGORY_NAMES[currentQuestion.category as Category] || currentQuestion.category}</span>
            <span className="text-xs text-yellow-400">{DIFFICULTY_STARS[currentQuestion.difficulty as Difficulty] || '★☆☆'}</span>
          </div>
        </div>

        {/* Timer */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">Time remaining</span>
            <span className={`text-lg font-bold ${localTimeRemaining <= 5 ? 'text-red-400' : 'text-green-400'}`}>
              {localTimeRemaining}s
            </span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${localTimeRemaining <= 5 ? 'bg-red-500' : 'bg-green-500'}`}
              style={{ width: `${100 - progressPercent}%` }}
            />
          </div>
        </div>

        {/* Question */}
        <div className="bg-gray-800 p-6 rounded-lg mb-6">
          <h2 className="text-xl font-semibold text-white text-center">
            {currentQuestion.question}
          </h2>
        </div>

        {/* Answers */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {currentQuestion.allAnswers.map((answer: string, index: number) => {
            const isSelected = selectedAnswer === index;
            const letters = ['A', 'B', 'C', 'D'];
            
            return (
              <button
                key={index}
                onClick={() => handleAnswerSelect(index)}
                disabled={hasAnswered}
                className={`p-4 rounded-lg border-2 text-left transition-all ${
                  isSelected
                    ? 'bg-yellow-600 border-yellow-400 text-white'
                    : hasAnswered
                    ? 'bg-gray-800 border-gray-600 text-gray-400 cursor-not-allowed'
                    : 'bg-gray-800 border-gray-600 text-white hover:border-gray-400 hover:bg-gray-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold">{letters[index]}.</span>
                  <span>{answer}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Submit button */}
        {selectedAnswer !== null && !hasAnswered && (
          <div className="text-center">
            <button
              onClick={handleSubmitAnswer}
              className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg font-semibold text-lg"
            >
              Submit Answer
            </button>
          </div>
        )}

        {hasAnswered && (
          <div className="text-center text-green-400 font-semibold">
            ✓ Answer submitted! Waiting for other players...
          </div>
        )}

        {/* Players answered count */}
        <div className="mt-4 text-center text-sm text-gray-400">
          {answeredCount} / {gameState.playerCount} players answered
        </div>
      </div>
    );
  }

  // Reveal screen
  if (gameState.phase === 'reveal' && currentQuestion) {
    const correctIndex = currentQuestion.allAnswers.findIndex(
      (a: string) => a === currentQuestion.correctAnswer
    );
    const myAnswer = gameState.currentAnswers.find(a => a.odUserId === odUserId);
    const letters = ['A', 'B', 'C', 'D'];

    return (
      <div className="bg-gray-900 rounded-lg border border-white/20 p-6">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-white mb-2">
            {myAnswer?.isCorrect ? '✓ Correct!' : '✗ Incorrect'}
          </h2>
          <p className="text-gray-400">
            The correct answer was: <span className="text-green-400 font-bold">{currentQuestion.correctAnswer}</span>
          </p>
        </div>

        {/* Answer grid */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {currentQuestion.allAnswers.map((answer: string, index: number) => {
            const isCorrect = index === correctIndex;
            const isMyAnswer = myAnswer?.selectedAnswerIndex === index;
            
            return (
              <div
                key={index}
                className={`p-4 rounded-lg border-2 ${
                  isCorrect
                    ? 'bg-green-900 border-green-500'
                    : isMyAnswer
                    ? 'bg-red-900 border-red-500'
                    : 'bg-gray-800 border-gray-600'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold">{letters[index]}.</span>
                  <span className={isCorrect ? 'text-green-300 font-semibold' : isMyAnswer ? 'text-red-300' : 'text-gray-300'}>
                    {answer}
                  </span>
                  {isCorrect && <span className="ml-auto text-green-400">✓</span>}
                  {isMyAnswer && !isCorrect && <span className="ml-auto text-red-400">✗</span>}
                </div>
              </div>
            );
          })}
        </div>

        {/* Results */}
        <div className="bg-gray-800 p-4 rounded-lg mb-4">
          <h3 className="text-white font-semibold mb-2">Results:</h3>
          <div className="space-y-2">
            {gameState.currentAnswers.map((answer) => {
              const player = gameState.players.find(p => p.odUserId === answer.odUserId);
              return (
                <div key={answer.odUserId} className="flex items-center justify-between text-sm">
                  <span className={answer.odUserId === odUserId ? 'text-yellow-400 font-semibold' : 'text-gray-300'}>
                    {player?.displayName || answer.odUserDisplayName || 'Player'}:
                  </span>
                  <span className={answer.isCorrect ? 'text-green-400' : 'text-red-400'}>
                    {answer.isCorrect ? `✓ +${answer.pointsEarned} pts` : '✗ 0 pts'}
                    {answer.isCorrect && ` (${(answer.timeToAnswer / 1000).toFixed(1)}s)`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="text-center text-gray-400 text-sm">
          Next question starting soon...
        </div>
      </div>
    );
  }

  // Scores screen
  if (gameState.phase === 'scores') {
    return (
      <div className="bg-gray-900 rounded-lg border border-white/20 p-6">
        <h2 className="text-2xl font-bold text-white mb-4 text-center">Current Scores</h2>
        <div className="space-y-2">
          {sortedPlayers.map((player, index) => {
            const medals = ['🥇', '🥈', '🥉'];
            const isMe = player.odUserId === odUserId;
            return (
              <div
                key={player.odUserId}
                className={`p-3 rounded-lg flex items-center justify-between ${
                  isMe ? 'bg-yellow-900 border-2 border-yellow-500' : 'bg-gray-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{index < 3 ? medals[index] : `${index + 1}.`}</span>
                  <span className={isMe ? 'text-yellow-400 font-semibold' : 'text-white'}>
                    {player.displayName || 'Player'}
                  </span>
                  {isMe && <span className="text-xs text-gray-400">(You)</span>}
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-white">{player.totalPoints} pts</div>
                  <div className="text-xs text-gray-400">
                    {player.correctAnswers}/{player.correctAnswers + player.wrongAnswers + player.unanswered} correct
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Game over screen
  if (gameState.phase === 'finished') {
    const winner = sortedPlayers[0];
    const isWinner = winner?.odUserId === odUserId;

    return (
      <div className="bg-gray-900 rounded-lg border border-white/20 p-8">
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold text-white mb-2">🏆 Game Over 🏆</h1>
          {isWinner && <p className="text-2xl text-yellow-400 font-semibold">You Won!</p>}
        </div>

        {/* Winner */}
        {winner && (
          <div className="bg-yellow-900 border-2 border-yellow-500 p-6 rounded-lg mb-6 text-center">
            <p className="text-xl font-bold text-yellow-400">🥇 Winner</p>
            <p className="text-2xl text-white mt-2">{winner.displayName || 'Player'}</p>
            <p className="text-lg text-yellow-300 mt-1">{winner.totalPoints} points</p>
          </div>
        )}

        {/* Final standings */}
        <div className="mb-6">
          <h2 className="text-xl font-bold text-white mb-4">Final Standings</h2>
          <div className="space-y-2">
            {sortedPlayers.map((player, index) => {
              const medals = ['🥇', '🥈', '🥉'];
              const isMe = player.odUserId === odUserId;
              return (
                <div
                  key={player.odUserId}
                  className={`p-4 rounded-lg flex items-center justify-between ${
                    isMe ? 'bg-yellow-900 border border-yellow-500' : 'bg-gray-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{index < 3 ? medals[index] : `${index + 1}.`}</span>
                    <span className={isMe ? 'text-yellow-400 font-semibold' : 'text-white'}>
                      {player.displayName || 'Player'}
                    </span>
                    {isMe && <span className="text-xs text-gray-400">(You)</span>}
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-white">{player.totalPoints} pts</div>
                    <div className="text-xs text-gray-400">
                      {player.correctAnswers}/{gameState.questions.length} correct
                      {player.streak > 0 && ` • ${player.streak} streak`}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Waiting screen
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] bg-gray-900 rounded-lg border border-white/20 p-8">
      <p className="text-gray-400 text-lg">Waiting to start...</p>
    </div>
  );
}

