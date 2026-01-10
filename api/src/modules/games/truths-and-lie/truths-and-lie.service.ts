import { Injectable, Logger } from "@nestjs/common";
import { TruthsAndLieState, TruthsAndLieConfig } from "./truths-and-lie.types";

const DEFAULT_CONFIG: TruthsAndLieConfig = {
  timeLimit: 20 // 20 seconds
};

@Injectable()
export class TruthsAndLieService {
  private readonly logger = new Logger(TruthsAndLieService.name);
  private gameStates = new Map<string, TruthsAndLieState>();
  private gameTimers = new Map<string, NodeJS.Timeout>();

  /**
   * Initialize game state
   */
  initializeState(
    gameId: string,
    playerIds: string[],
    config?: Partial<TruthsAndLieConfig>
  ): TruthsAndLieState {
    // Randomly choose chooser and guesser
    const shuffled = [...playerIds].sort(() => Math.random() - 0.5);
    const chooserId = shuffled[0];
    const guesserId = shuffled[1];

    const state: TruthsAndLieState = {
      phase: "waitingForStatements",
      chooserId,
      guesserId,
      statements: [],
      selectedStatementIndex: null,
      isCorrect: null,
      winnerId: null,
      timeRemaining: (config?.timeLimit || DEFAULT_CONFIG.timeLimit),
      startedAt: null
    };

    this.gameStates.set(gameId, state);
    return state;
  }

  /**
   * Submit statements from chooser
   */
  submitStatements(
    gameId: string,
    chooserId: string,
    statements: string[],
    lieIndex: number
  ): TruthsAndLieState {
    const state = this.gameStates.get(gameId);
    if (!state) {
      throw new Error("Game state not found");
    }

    if (state.chooserId !== chooserId) {
      throw new Error("Only the chooser can submit statements");
    }

    if (state.phase !== "waitingForStatements") {
      throw new Error("Cannot submit statements in current phase");
    }

    if (statements.length !== 3) {
      throw new Error("Must provide exactly 3 statements");
    }

    if (lieIndex < 0 || lieIndex >= 3) {
      throw new Error("Lie index must be between 0 and 2");
    }

    // Create statements with isLie flag
    const formattedStatements = statements.map((text, index) => ({
      text,
      isLie: index === lieIndex,
      index
    }));

    const updatedState: TruthsAndLieState = {
      ...state,
      statements: formattedStatements,
      phase: "guessing",
      startedAt: Date.now()
    };

    this.gameStates.set(gameId, updatedState);
    return updatedState;
  }

  /**
   * Submit guess from guesser
   */
  submitGuess(
    gameId: string,
    guesserId: string,
    selectedIndex: number
  ): TruthsAndLieState {
    const state = this.gameStates.get(gameId);
    if (!state) {
      throw new Error("Game state not found");
    }

    if (state.guesserId !== guesserId) {
      throw new Error("Only the guesser can submit a guess");
    }

    if (state.phase !== "guessing") {
      throw new Error("Cannot submit guess in current phase");
    }

    if (selectedIndex < 0 || selectedIndex >= state.statements.length) {
      throw new Error("Invalid statement index");
    }

    const selectedStatement = state.statements[selectedIndex];
    const isCorrect = selectedStatement.isLie;

    // Determine winner: if correct, guesser wins; if wrong, chooser wins
    const winnerId = isCorrect ? state.guesserId : state.chooserId;

    const updatedState: TruthsAndLieState = {
      ...state,
      selectedStatementIndex: selectedIndex,
      isCorrect,
      winnerId,
      phase: "result"
    };

    this.gameStates.set(gameId, updatedState);
    return updatedState;
  }

  /**
   * Get current state
   */
  getState(gameId: string): TruthsAndLieState | null {
    return this.gameStates.get(gameId) || null;
  }

  /**
   * Set state
   */
  setState(gameId: string, state: TruthsAndLieState): void {
    this.gameStates.set(gameId, state);
  }

  /**
   * End game
   */
  endGame(gameId: string): TruthsAndLieState | null {
    const state = this.gameStates.get(gameId);
    if (!state) return null;

    const endedState: TruthsAndLieState = {
      ...state,
      phase: "gameEnd"
    };

    this.gameStates.set(gameId, endedState);
    this.clearTimer(gameId);
    return endedState;
  }

  /**
   * Clear timer for game
   */
  clearTimer(gameId: string): void {
    const timer = this.gameTimers.get(gameId);
    if (timer) {
      clearTimeout(timer);
      this.gameTimers.delete(gameId);
    }
  }

  /**
   * Set timer for game
   */
  setTimer(gameId: string, callback: () => void, delay: number): void {
    this.clearTimer(gameId);
    const timer = setTimeout(() => {
      this.gameTimers.delete(gameId);
      callback();
    }, delay);
    this.gameTimers.set(gameId, timer);
  }

  /**
   * Delete game state
   */
  deleteState(gameId: string): void {
    this.clearTimer(gameId);
    this.gameStates.delete(gameId);
  }
}






