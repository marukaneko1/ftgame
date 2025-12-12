export type Difficulty = 'easy' | 'medium' | 'hard';
export type Category = 'general' | 'science' | 'history' | 'geography' | 'entertainment' | 'sports' | 'art' | 'music' | 'movies' | 'technology';
export interface TriviaQuestion {
    id: string;
    category: Category;
    difficulty: Difficulty;
    question: string;
    correctAnswer: string;
    incorrectAnswers: string[];
    allAnswers: string[];
    timeLimit: number;
}
export interface PlayerAnswer {
    odUserId: string;
    odUserDisplayName: string;
    questionIndex: number;
    selectedAnswer: string | null;
    selectedAnswerIndex: number | null;
    answeredAt: number;
    isCorrect: boolean;
    pointsEarned: number;
    timeToAnswer: number;
}
export interface PlayerScore {
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
export interface TriviaConfig {
    questionCount: number;
    timePerQuestion: number;
    difficulty: Difficulty | 'mixed';
    category: Category | 'mixed';
    pointsPerQuestion: {
        easy: number;
        medium: number;
        hard: number;
    };
    speedBonusEnabled: boolean;
    maxSpeedBonus: number;
}
export type GamePhase = 'waiting' | 'countdown' | 'question' | 'reveal' | 'scores' | 'finished';
export interface TriviaState {
    players: PlayerScore[];
    playerCount: number;
    config: TriviaConfig;
    questions: TriviaQuestion[];
    currentQuestionIndex: number;
    phase: GamePhase;
    questionStartedAt: number | null;
    timeRemaining: number;
    currentAnswers: PlayerAnswer[];
    answerHistory: PlayerAnswer[][];
    isFinished: boolean;
    winnerId: string | null;
    winnerIds: string[];
    createdAt: number;
    startedAt: number | null;
    endedAt: number | null;
}
export interface TriviaGameEndResult {
    winnerId: string | null;
    winnerIds: string[];
    isDraw: boolean;
    finalScores: PlayerScore[];
    reason: 'completed' | 'forfeit' | 'timeout' | 'not_enough_players';
}
export interface AnswerSubmissionResult {
    success: boolean;
    state: TriviaState;
    allAnswered: boolean;
    error?: string;
}
//# sourceMappingURL=trivia.types.d.ts.map