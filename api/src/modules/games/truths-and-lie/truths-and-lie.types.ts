export interface TruthsAndLieState {
  phase: "waitingForStatements" | "guessing" | "result" | "gameEnd";
  chooserId: string; // User who creates the statements
  guesserId: string; // User who guesses
  statements: Array<{
    text: string;
    isLie: boolean;
    index: number;
  }>;
  selectedStatementIndex: number | null; // Which statement the guesser selected
  isCorrect: boolean | null; // Whether the guess was correct
  winnerId: string | null; // Winner of the round
  timeRemaining: number; // Seconds remaining
  startedAt: number | null; // Timestamp when guessing phase started
}

export interface TruthsAndLieConfig {
  timeLimit: number; // 20 seconds
}





