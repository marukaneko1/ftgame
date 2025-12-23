export type GameType = "chess" | "trivia" | "tictactoe";
export type GameStatus = "pending" | "active" | "completed" | "canceled";

export interface GameState {
  board?: unknown;
  trivia?: {
    question: string;
    options: string[];
    correctIndex?: number;
  };
  scores?: Record<string, number>;
}

export interface GameSummary {
  id: string;
  type: GameType;
  status: GameStatus;
  startedAt?: string | null;
  endedAt?: string | null;
  winnerUserId?: string | null;
}


