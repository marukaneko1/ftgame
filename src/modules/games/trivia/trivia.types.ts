// Question difficulty levels
export type Difficulty = 'easy' | 'medium' | 'hard';

// Question categories
export type Category = 
  | 'general'
  | 'science'
  | 'history'
  | 'geography'
  | 'entertainment'
  | 'sports'
  | 'art'
  | 'music'
  | 'movies'
  | 'technology';

// A single trivia question
export interface TriviaQuestion {
  id: string;
  category: Category;
  difficulty: Difficulty;
  question: string;
  correctAnswer: string;
  incorrectAnswers: string[];
  allAnswers: string[]; // Shuffled correct + incorrect
  timeLimit: number; // seconds
}

// Player's answer for a question
export interface PlayerAnswer {
  odUserId: string;
  odUserDisplayName: string;
  questionIndex: number;
  selectedAnswer: string | null; // null if didn't answer in time
  selectedAnswerIndex: number | null; // 0-3 index
  answeredAt: number; // timestamp
  isCorrect: boolean;
  pointsEarned: number;
  timeToAnswer: number; // milliseconds
}

// Player score tracking
export interface PlayerScore {
  odUserId: string;
  displayName: string;
  totalPoints: number;
  correctAnswers: number;
  wrongAnswers: number;
  unanswered: number;
  averageTime: number; // average time to answer in ms
  streak: number; // current correct answer streak
  maxStreak: number; // longest streak achieved
}

// Game configuration
export interface TriviaConfig {
  questionCount: number; // 5, 10, 15, or 20
  timePerQuestion: number; // seconds (15, 20, 30)
  difficulty: Difficulty | 'mixed';
  category: Category | 'mixed';
  pointsPerQuestion: {
    easy: number;    // e.g., 100
    medium: number;  // e.g., 200
    hard: number;    // e.g., 300
  };
  speedBonusEnabled: boolean;
  maxSpeedBonus: number; // e.g., 50 extra points for fastest answer
}

// Game phases
export type GamePhase = 
  | 'waiting'      // Waiting for players/config
  | 'countdown'    // 3-2-1 before first question
  | 'question'     // Showing question, accepting answers
  | 'reveal'       // Showing correct answer
  | 'scores'       // Showing updated scores
  | 'finished';    // Game over

// Full game state
export interface TriviaState {
  // Players
  players: PlayerScore[];
  playerCount: number;
  
  // Game configuration
  config: TriviaConfig;
  
  // Questions
  questions: TriviaQuestion[];
  currentQuestionIndex: number;
  
  // Current question state
  phase: GamePhase;
  questionStartedAt: number | null; // timestamp
  timeRemaining: number; // seconds
  currentAnswers: PlayerAnswer[]; // answers for current question
  
  // All answers history
  answerHistory: PlayerAnswer[][];
  
  // Game status
  isFinished: boolean;
  winnerId: string | null;
  winnerIds: string[]; // for ties
  
  // Timing
  createdAt: number;
  startedAt: number | null;
  endedAt: number | null;
}

// Game end result
export interface TriviaGameEndResult {
  winnerId: string | null;
  winnerIds: string[];
  isDraw: boolean;
  finalScores: PlayerScore[];
  reason: 'completed' | 'forfeit' | 'timeout' | 'not_enough_players';
}

// Answer submission result
export interface AnswerSubmissionResult {
  success: boolean;
  state: TriviaState;
  allAnswered: boolean;
  error?: string;
}

