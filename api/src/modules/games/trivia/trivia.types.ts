export interface TriviaQuestion {
  question: string;
  allAnswers: string[];
  correctAnswer: string;
  category?: string;
}

export interface TriviaAnswer {
  odUserId: string;
  odUserDisplayName: string;
  selectedAnswer: string;
  selectedAnswerIndex: number;
  isCorrect: boolean;
  pointsEarned: number;
  timeToAnswer: number;
}

export interface TriviaPlayer {
  odUserId: string;
  displayName: string;
  score: number;
}

export interface TriviaState {
  phase: "themeSelection" | "countdown" | "question" | "result" | "gameEnd";
  currentQuestionIndex: number;
  questions: TriviaQuestion[];
  players: TriviaPlayer[];
  currentAnswers: TriviaAnswer[];
  playerCount: number;
  themeSelections?: Map<string, string>; // Map of userId -> selected theme
  selectedTheme?: string; // Final selected theme after both players choose
}

export interface TriviaConfig {
  totalQuestions: number;
  timePerQuestion: number; // seconds
  category?: string;
  pointsPerQuestion: {
    correct: number; // Base points (10)
    speedBonus: number; // Max speed bonus (up to 10, so total max is 20)
  };
}

export type TriviaTheme = "geography" | "science" | "history" | "sports" | "entertainment" | "mixed";



