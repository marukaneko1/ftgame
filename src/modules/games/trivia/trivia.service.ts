import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  TriviaState,
  TriviaQuestion,
  PlayerScore,
  PlayerAnswer,
  TriviaConfig,
  GamePhase,
  TriviaGameEndResult,
  AnswerSubmissionResult,
  Difficulty,
  Category,
} from './trivia.types';
import { DEFAULT_CONFIG, BASE_POINTS } from './trivia.constants';
import { TriviaQuestionService } from './trivia.question.service';
import { TriviaTimerService } from './trivia.timer.service';

@Injectable()
export class TriviaService {
  // In-memory game states (for active games)
  private gameStates = new Map<string, TriviaState>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly questionService: TriviaQuestionService,
    private readonly timerService: TriviaTimerService
  ) {}

  // ============ INITIALIZATION ============

  async initializeState(
    playerIds: string[],
    config?: Partial<TriviaConfig>
  ): Promise<TriviaState> {
    if (playerIds.length < 2) {
      throw new BadRequestException('Trivia requires at least 2 players');
    }

    // Merge config with defaults
    const finalConfig: TriviaConfig = {
      ...DEFAULT_CONFIG,
      ...config,
      pointsPerQuestion: {
        ...DEFAULT_CONFIG.pointsPerQuestion,
        ...config?.pointsPerQuestion,
      },
    };

    // Initialize player scores
    const players: PlayerScore[] = playerIds.map((odUserId) => ({
      odUserId,
      displayName: '', // Will be filled from DB
      totalPoints: 0,
      correctAnswers: 0,
      wrongAnswers: 0,
      unanswered: 0,
      averageTime: 0,
      streak: 0,
      maxStreak: 0,
    }));

    // Create initial state
    const state: TriviaState = {
      players,
      playerCount: playerIds.length,
      config: finalConfig,
      questions: [],
      currentQuestionIndex: -1,
      phase: 'waiting',
      questionStartedAt: null,
      timeRemaining: 0,
      currentAnswers: [],
      answerHistory: [],
      isFinished: false,
      winnerId: null,
      winnerIds: [],
      createdAt: Date.now(),
      startedAt: null,
      endedAt: null,
    };

    return state;
  }

  // ============ GAME FLOW ============

  async startGame(gameId: string, state: TriviaState): Promise<TriviaState> {
    // Load questions
    const questions = await this.questionService.getQuestions(
      state.config.questionCount,
      state.config.category === 'mixed' ? undefined : state.config.category,
      state.config.difficulty === 'mixed' ? undefined : state.config.difficulty
    );

    // Shuffle answers for each question
    const shuffledQuestions = questions.map((q) =>
      this.questionService.shuffleAnswers(q)
    );

    // Update state
    const newState: TriviaState = {
      ...state,
      questions: shuffledQuestions,
      phase: 'countdown',
      currentQuestionIndex: 0,
      timeRemaining: 3, // 3-2-1 countdown
      startedAt: Date.now(),
    };

    this.gameStates.set(gameId, newState);
    return newState;
  }

  advanceToNextQuestion(state: TriviaState): TriviaState {
    const newIndex = state.currentQuestionIndex + 1;

    if (newIndex >= state.questions.length) {
      // Game over
      return this.endGame(state);
    }

    return {
      ...state,
      currentQuestionIndex: newIndex,
      phase: 'question',
      currentAnswers: [],
      questionStartedAt: Date.now(),
      timeRemaining: state.questions[newIndex].timeLimit,
    };
  }

  startQuestion(state: TriviaState): TriviaState {
    return {
      ...state,
      phase: 'question',
      questionStartedAt: Date.now(),
      timeRemaining: state.questions[state.currentQuestionIndex].timeLimit,
      currentAnswers: [],
    };
  }

  endQuestion(state: TriviaState): TriviaState {
    // Calculate points for all answers
    const updatedState = this.updateScores(state);

    // Move to reveal phase
    return {
      ...updatedState,
      phase: 'reveal',
    };
  }

  // ============ PLAYER ACTIONS ============

  submitAnswer(
    gameId: string,
    odUserId: string,
    questionIndex: number,
    answerIndex: number
  ): AnswerSubmissionResult {
    const state = this.gameStates.get(gameId);
    if (!state) {
      throw new NotFoundException('Game state not found');
    }

    // Validate it's the current question
    if (questionIndex !== state.currentQuestionIndex) {
      return {
        success: false,
        state,
        allAnswered: false,
        error: 'Invalid question index',
      };
    }

    // Check if player already answered
    const existingAnswer = state.currentAnswers.find(
      (a) => a.odUserId === odUserId
    );
    if (existingAnswer) {
      return {
        success: false,
        state,
        allAnswered: false,
        error: 'Already answered this question',
      };
    }

    // Get current question
    const question = state.questions[state.currentQuestionIndex];
    if (!question) {
      return {
        success: false,
        state,
        allAnswered: false,
        error: 'Question not found',
      };
    }

    // Get player display name
    const player = state.players.find((p) => p.odUserId === odUserId);
    if (!player) {
      return {
        success: false,
        state,
        allAnswered: false,
        error: 'Player not found',
      };
    }

    // Get selected answer
    const selectedAnswer = question.allAnswers[answerIndex];
    if (!selectedAnswer) {
      return {
        success: false,
        state,
        allAnswered: false,
        error: 'Invalid answer index',
      };
    }

    // Check if correct
    const isCorrect = selectedAnswer === question.correctAnswer;
    const answeredAt = Date.now();
    const timeToAnswer =
      state.questionStartedAt
        ? answeredAt - state.questionStartedAt
        : question.timeLimit * 1000;

    // Calculate points (will be recalculated when question ends)
    const answerOrder =
      state.currentAnswers.filter((a) => a.isCorrect).length + 1;
    const pointsEarned = isCorrect
      ? this.calculatePoints(
          state,
          question,
          true,
          timeToAnswer,
          answerOrder
        )
      : 0;

    // Create answer record
    const answer: PlayerAnswer = {
      odUserId,
      odUserDisplayName: player.displayName,
      questionIndex,
      selectedAnswer,
      selectedAnswerIndex: answerIndex,
      answeredAt,
      isCorrect,
      pointsEarned,
      timeToAnswer,
    };

    // Add to current answers
    const newAnswers = [...state.currentAnswers, answer];
    const allAnswered = newAnswers.length >= state.players.length;

    const newState: TriviaState = {
      ...state,
      currentAnswers: newAnswers,
    };

    this.gameStates.set(gameId, newState);

    return {
      success: true,
      state: newState,
      allAnswered,
    };
  }

  // ============ SCORING ============

  private calculatePoints(
    state: TriviaState,
    question: TriviaQuestion,
    isCorrect: boolean,
    timeToAnswer: number,
    answerOrder: number
  ): number {
    if (!isCorrect) return 0;

    let points = BASE_POINTS[question.difficulty];

    // Speed bonus
    if (state.config.speedBonusEnabled) {
      const maxTime = question.timeLimit * 1000;
      const speedRatio = Math.max(0, 1 - timeToAnswer / maxTime);
      const speedBonus = Math.floor(
        speedRatio * state.config.maxSpeedBonus
      );
      points += speedBonus;
    }

    // First correct answer bonus
    if (answerOrder === 1) {
      points += 25;
    }

    return points;
  }

  updateScores(state: TriviaState): TriviaState {
    const question = state.questions[state.currentQuestionIndex];
    if (!question) return state;

    // Recalculate all points with correct answer order
    const correctAnswers = state.currentAnswers
      .filter((a) => a.selectedAnswer === question.correctAnswer)
      .sort((a, b) => a.answeredAt - b.answeredAt);

    // Update currentAnswers with correct points
    const updatedAnswers = state.currentAnswers.map((answer) => {
      const answerOrder =
        correctAnswers.findIndex((a) => a.odUserId === answer.odUserId) + 1;
      const points =
        answer.isCorrect && answerOrder > 0
          ? this.calculatePoints(
              state,
              question,
              true,
              answer.timeToAnswer,
              answerOrder
            )
          : 0;

      return {
        ...answer,
        pointsEarned: points,
      };
    });

    // Update player scores
    const updatedPlayers = state.players.map((player) => {
      const answer = updatedAnswers.find(
        (a) => a.odUserId === player.odUserId
      );

      if (!answer) {
        // Player didn't answer
        return {
          ...player,
          unanswered: player.unanswered + 1,
          streak: 0,
        };
      }

      const wasCorrect = answer.isCorrect;
      const newStreak = wasCorrect ? player.streak + 1 : 0;

      // Calculate average time
      const totalQuestions = player.correctAnswers + player.wrongAnswers + 1;
      const newAverageTime =
        (player.averageTime * (totalQuestions - 1) + answer.timeToAnswer) /
        totalQuestions;

      return {
        ...player,
        totalPoints: player.totalPoints + answer.pointsEarned,
        correctAnswers: player.correctAnswers + (wasCorrect ? 1 : 0),
        wrongAnswers: player.wrongAnswers + (wasCorrect ? 0 : 1),
        averageTime: newAverageTime,
        streak: newStreak,
        maxStreak: Math.max(player.maxStreak, newStreak),
      };
    });

    // Add to answer history
    const newAnswerHistory = [...state.answerHistory, updatedAnswers];

    return {
      ...state,
      players: updatedPlayers,
      currentAnswers: updatedAnswers,
      answerHistory: newAnswerHistory,
    };
  }

  // ============ GAME END ============

  endGame(state: TriviaState): TriviaState {
    // Determine winner(s)
    const sortedPlayers = [...state.players].sort(
      (a, b) => b.totalPoints - a.totalPoints
    );
    const topScore = sortedPlayers[0]?.totalPoints || 0;
    const winners = sortedPlayers.filter((p) => p.totalPoints === topScore);

    return {
      ...state,
      phase: 'finished',
      isFinished: true,
      winnerId: winners.length === 1 ? winners[0].odUserId : null,
      winnerIds: winners.map((w) => w.odUserId),
      endedAt: Date.now(),
    };
  }

  getGameEndResult(state: TriviaState): TriviaGameEndResult {
    return {
      winnerId: state.winnerId,
      winnerIds: state.winnerIds,
      isDraw: state.winnerIds.length > 1,
      finalScores: state.players,
      reason: 'completed',
    };
  }

  handlePlayerLeave(gameId: string, odUserId: string): TriviaState | null {
    const state = this.gameStates.get(gameId);
    if (!state) return null;

    // Remove player from state
    const updatedPlayers = state.players.filter(
      (p) => p.odUserId !== odUserId
    );

    if (updatedPlayers.length < 2 && state.phase !== 'finished') {
      // Not enough players, end game
      const endedState = this.endGame({
        ...state,
        players: updatedPlayers,
      });
      this.gameStates.set(gameId, endedState);
      return endedState;
    }

    const newState: TriviaState = {
      ...state,
      players: updatedPlayers,
      playerCount: updatedPlayers.length,
    };

    this.gameStates.set(gameId, newState);
    return newState;
  }

  // ============ UTILITIES ============

  getCurrentQuestion(state: TriviaState): TriviaQuestion | null {
    if (
      state.currentQuestionIndex < 0 ||
      state.currentQuestionIndex >= state.questions.length
    ) {
      return null;
    }
    return state.questions[state.currentQuestionIndex];
  }

  haveAllPlayersAnswered(state: TriviaState): boolean {
    return state.currentAnswers.length >= state.players.length;
  }

  getTimeRemaining(state: TriviaState): number {
    if (!state.questionStartedAt) return 0;
    const elapsed = Date.now() - state.questionStartedAt;
    const question = this.getCurrentQuestion(state);
    if (!question) return 0;
    return Math.max(0, question.timeLimit * 1000 - elapsed);
  }

  getLeaderboard(state: TriviaState): PlayerScore[] {
    return [...state.players].sort((a, b) => b.totalPoints - a.totalPoints);
  }

  // Get/Set state helpers
  getState(gameId: string): TriviaState | undefined {
    return this.gameStates.get(gameId);
  }

  setState(gameId: string, state: TriviaState) {
    this.gameStates.set(gameId, state);
  }

  deleteState(gameId: string) {
    this.gameStates.delete(gameId);
    this.timerService.clearTimers(gameId);
  }
}

