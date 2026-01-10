import { Injectable, Logger } from "@nestjs/common";
import {
  TwentyOneQuestionsState,
  TwentyOneQuestionsConfig,
  ICE_BREAKER_QUESTIONS
} from "./twenty-one-questions.types";

const DEFAULT_CONFIG: TwentyOneQuestionsConfig = {
  totalQuestions: 21 // Default to 21 questions
};

@Injectable()
export class TwentyOneQuestionsService {
  private readonly logger = new Logger(TwentyOneQuestionsService.name);
  private gameStates = new Map<string, TwentyOneQuestionsState>();

  /**
   * Initialize game state with random questions
   */
  initializeState(
    gameId: string,
    playerIds: string[],
    config?: Partial<TwentyOneQuestionsConfig>
  ): TwentyOneQuestionsState {
    const totalQuestions = (config?.totalQuestions ?? DEFAULT_CONFIG.totalQuestions) || 21;

    // Randomly select questions from the pool (without replacement)
    const shuffled = [...ICE_BREAKER_QUESTIONS]
      .map((_, index) => index)
      .sort(() => Math.random() - 0.5);
    
    const selectedQuestionIds = shuffled.slice(0, Math.min(totalQuestions, ICE_BREAKER_QUESTIONS.length));
    const firstQuestion = ICE_BREAKER_QUESTIONS[selectedQuestionIds[0]];

    const state: TwentyOneQuestionsState = {
      phase: "playing",
      currentQuestionIndex: 0,
      currentQuestion: firstQuestion,
      questionIds: selectedQuestionIds,
      playerReady: {
        [playerIds[0]]: false,
        [playerIds[1]]: false
      },
      totalQuestions: selectedQuestionIds.length,
      completedQuestions: 0,
      players: playerIds
    };

    this.gameStates.set(gameId, state);
    this.logger.log(`Initialized 21 Questions game ${gameId} with ${selectedQuestionIds.length} questions`);
    return state;
  }

  /**
   * Mark player as ready for next question
   */
  markPlayerReady(
    gameId: string,
    playerId: string
  ): { state: TwentyOneQuestionsState; allReady: boolean; nextQuestion?: string } {
    const state = this.gameStates.get(gameId);
    if (!state) {
      throw new Error("Game state not found");
    }

    if (!state.players.includes(playerId)) {
      throw new Error("Player is not in this game");
    }

    if (state.phase !== "playing" && state.phase !== "questionComplete") {
      throw new Error("Cannot mark ready in current phase");
    }

    // Mark player as ready
    const updatedReady = {
      ...state.playerReady,
      [playerId]: true
    };

    const allReady = state.players.every(player => updatedReady[player] === true);

    // If all players are ready, move to next question
    if (allReady) {
      const nextIndex = state.currentQuestionIndex + 1;
      
      if (nextIndex >= state.questionIds.length) {
        // Game completed
        const updatedState: TwentyOneQuestionsState = {
          ...state,
          phase: "gameEnd",
          playerReady: {
            [state.players[0]]: false,
            [state.players[1]]: false
          },
          completedQuestions: state.completedQuestions + 1
        };
        this.gameStates.set(gameId, updatedState);
        return { state: updatedState, allReady: true };
      }

      // Move to next question
      const nextQuestionId = state.questionIds[nextIndex];
      const nextQuestion = ICE_BREAKER_QUESTIONS[nextQuestionId];

      const updatedState: TwentyOneQuestionsState = {
        ...state,
        currentQuestionIndex: nextIndex,
        currentQuestion: nextQuestion,
        playerReady: {
          [state.players[0]]: false,
          [state.players[1]]: false
        },
        completedQuestions: state.completedQuestions + 1,
        phase: "playing"
      };

      this.gameStates.set(gameId, updatedState);
      return {
        state: updatedState,
        allReady: true,
        nextQuestion
      };
    } else {
      // Not all players ready yet
      const updatedState: TwentyOneQuestionsState = {
        ...state,
        playerReady: updatedReady,
        phase: "questionComplete"
      };
      this.gameStates.set(gameId, updatedState);
      return { state: updatedState, allReady: false };
    }
  }

  /**
   * Get current state
   */
  getState(gameId: string): TwentyOneQuestionsState | null {
    return this.gameStates.get(gameId) || null;
  }

  /**
   * Set state
   */
  setState(gameId: string, state: TwentyOneQuestionsState): void {
    this.gameStates.set(gameId, state);
  }

  /**
   * Delete game state
   */
  deleteState(gameId: string): void {
    this.gameStates.delete(gameId);
  }
}

