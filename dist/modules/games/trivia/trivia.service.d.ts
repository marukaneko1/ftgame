import { PrismaService } from '../../../prisma/prisma.service';
import { TriviaState, TriviaQuestion, PlayerScore, TriviaConfig, TriviaGameEndResult, AnswerSubmissionResult } from './trivia.types';
import { TriviaQuestionService } from './trivia.question.service';
import { TriviaTimerService } from './trivia.timer.service';
export declare class TriviaService {
    private readonly prisma;
    private readonly questionService;
    private readonly timerService;
    private gameStates;
    constructor(prisma: PrismaService, questionService: TriviaQuestionService, timerService: TriviaTimerService);
    initializeState(playerIds: string[], config?: Partial<TriviaConfig>): Promise<TriviaState>;
    startGame(gameId: string, state: TriviaState): Promise<TriviaState>;
    advanceToNextQuestion(state: TriviaState): TriviaState;
    startQuestion(state: TriviaState): TriviaState;
    endQuestion(state: TriviaState): TriviaState;
    submitAnswer(gameId: string, odUserId: string, questionIndex: number, answerIndex: number): AnswerSubmissionResult;
    private calculatePoints;
    updateScores(state: TriviaState): TriviaState;
    endGame(state: TriviaState): TriviaState;
    getGameEndResult(state: TriviaState): TriviaGameEndResult;
    handlePlayerLeave(gameId: string, odUserId: string): TriviaState | null;
    getCurrentQuestion(state: TriviaState): TriviaQuestion | null;
    haveAllPlayersAnswered(state: TriviaState): boolean;
    getTimeRemaining(state: TriviaState): number;
    getLeaderboard(state: TriviaState): PlayerScore[];
    getState(gameId: string): TriviaState | undefined;
    setState(gameId: string, state: TriviaState): void;
    deleteState(gameId: string): void;
}
//# sourceMappingURL=trivia.service.d.ts.map