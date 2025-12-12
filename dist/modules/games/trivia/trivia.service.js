"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TriviaService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../prisma/prisma.service");
const trivia_constants_1 = require("./trivia.constants");
const trivia_question_service_1 = require("./trivia.question.service");
const trivia_timer_service_1 = require("./trivia.timer.service");
let TriviaService = class TriviaService {
    prisma;
    questionService;
    timerService;
    gameStates = new Map();
    constructor(prisma, questionService, timerService) {
        this.prisma = prisma;
        this.questionService = questionService;
        this.timerService = timerService;
    }
    async initializeState(playerIds, config) {
        if (playerIds.length < 2) {
            throw new common_1.BadRequestException('Trivia requires at least 2 players');
        }
        const finalConfig = {
            ...trivia_constants_1.DEFAULT_CONFIG,
            ...config,
            pointsPerQuestion: {
                ...trivia_constants_1.DEFAULT_CONFIG.pointsPerQuestion,
                ...config?.pointsPerQuestion,
            },
        };
        const players = playerIds.map((odUserId) => ({
            odUserId,
            displayName: '',
            totalPoints: 0,
            correctAnswers: 0,
            wrongAnswers: 0,
            unanswered: 0,
            averageTime: 0,
            streak: 0,
            maxStreak: 0,
        }));
        const state = {
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
    async startGame(gameId, state) {
        const questions = await this.questionService.getQuestions(state.config.questionCount, state.config.category === 'mixed' ? undefined : state.config.category, state.config.difficulty === 'mixed' ? undefined : state.config.difficulty);
        const shuffledQuestions = questions.map((q) => this.questionService.shuffleAnswers(q));
        const newState = {
            ...state,
            questions: shuffledQuestions,
            phase: 'countdown',
            currentQuestionIndex: 0,
            timeRemaining: 3,
            startedAt: Date.now(),
        };
        this.gameStates.set(gameId, newState);
        return newState;
    }
    advanceToNextQuestion(state) {
        const newIndex = state.currentQuestionIndex + 1;
        if (newIndex >= state.questions.length) {
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
    startQuestion(state) {
        return {
            ...state,
            phase: 'question',
            questionStartedAt: Date.now(),
            timeRemaining: state.questions[state.currentQuestionIndex].timeLimit,
            currentAnswers: [],
        };
    }
    endQuestion(state) {
        const updatedState = this.updateScores(state);
        return {
            ...updatedState,
            phase: 'reveal',
        };
    }
    submitAnswer(gameId, odUserId, questionIndex, answerIndex) {
        const state = this.gameStates.get(gameId);
        if (!state) {
            throw new common_1.NotFoundException('Game state not found');
        }
        if (questionIndex !== state.currentQuestionIndex) {
            return {
                success: false,
                state,
                allAnswered: false,
                error: 'Invalid question index',
            };
        }
        const existingAnswer = state.currentAnswers.find((a) => a.odUserId === odUserId);
        if (existingAnswer) {
            return {
                success: false,
                state,
                allAnswered: false,
                error: 'Already answered this question',
            };
        }
        const question = state.questions[state.currentQuestionIndex];
        if (!question) {
            return {
                success: false,
                state,
                allAnswered: false,
                error: 'Question not found',
            };
        }
        const player = state.players.find((p) => p.odUserId === odUserId);
        if (!player) {
            return {
                success: false,
                state,
                allAnswered: false,
                error: 'Player not found',
            };
        }
        const selectedAnswer = question.allAnswers[answerIndex];
        if (!selectedAnswer) {
            return {
                success: false,
                state,
                allAnswered: false,
                error: 'Invalid answer index',
            };
        }
        const isCorrect = selectedAnswer === question.correctAnswer;
        const answeredAt = Date.now();
        const timeToAnswer = state.questionStartedAt
            ? answeredAt - state.questionStartedAt
            : question.timeLimit * 1000;
        const answerOrder = state.currentAnswers.filter((a) => a.isCorrect).length + 1;
        const pointsEarned = isCorrect
            ? this.calculatePoints(state, question, true, timeToAnswer, answerOrder)
            : 0;
        const answer = {
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
        const newAnswers = [...state.currentAnswers, answer];
        const allAnswered = newAnswers.length >= state.players.length;
        const newState = {
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
    calculatePoints(state, question, isCorrect, timeToAnswer, answerOrder) {
        if (!isCorrect)
            return 0;
        let points = trivia_constants_1.BASE_POINTS[question.difficulty];
        if (state.config.speedBonusEnabled) {
            const maxTime = question.timeLimit * 1000;
            const speedRatio = Math.max(0, 1 - timeToAnswer / maxTime);
            const speedBonus = Math.floor(speedRatio * state.config.maxSpeedBonus);
            points += speedBonus;
        }
        if (answerOrder === 1) {
            points += 25;
        }
        return points;
    }
    updateScores(state) {
        const question = state.questions[state.currentQuestionIndex];
        if (!question)
            return state;
        const correctAnswers = state.currentAnswers
            .filter((a) => a.selectedAnswer === question.correctAnswer)
            .sort((a, b) => a.answeredAt - b.answeredAt);
        const updatedAnswers = state.currentAnswers.map((answer) => {
            const answerOrder = correctAnswers.findIndex((a) => a.odUserId === answer.odUserId) + 1;
            const points = answer.isCorrect && answerOrder > 0
                ? this.calculatePoints(state, question, true, answer.timeToAnswer, answerOrder)
                : 0;
            return {
                ...answer,
                pointsEarned: points,
            };
        });
        const updatedPlayers = state.players.map((player) => {
            const answer = updatedAnswers.find((a) => a.odUserId === player.odUserId);
            if (!answer) {
                return {
                    ...player,
                    unanswered: player.unanswered + 1,
                    streak: 0,
                };
            }
            const wasCorrect = answer.isCorrect;
            const newStreak = wasCorrect ? player.streak + 1 : 0;
            const totalQuestions = player.correctAnswers + player.wrongAnswers + 1;
            const newAverageTime = (player.averageTime * (totalQuestions - 1) + answer.timeToAnswer) /
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
        const newAnswerHistory = [...state.answerHistory, updatedAnswers];
        return {
            ...state,
            players: updatedPlayers,
            currentAnswers: updatedAnswers,
            answerHistory: newAnswerHistory,
        };
    }
    endGame(state) {
        const sortedPlayers = [...state.players].sort((a, b) => b.totalPoints - a.totalPoints);
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
    getGameEndResult(state) {
        return {
            winnerId: state.winnerId,
            winnerIds: state.winnerIds,
            isDraw: state.winnerIds.length > 1,
            finalScores: state.players,
            reason: 'completed',
        };
    }
    handlePlayerLeave(gameId, odUserId) {
        const state = this.gameStates.get(gameId);
        if (!state)
            return null;
        const updatedPlayers = state.players.filter((p) => p.odUserId !== odUserId);
        if (updatedPlayers.length < 2 && state.phase !== 'finished') {
            const endedState = this.endGame({
                ...state,
                players: updatedPlayers,
            });
            this.gameStates.set(gameId, endedState);
            return endedState;
        }
        const newState = {
            ...state,
            players: updatedPlayers,
            playerCount: updatedPlayers.length,
        };
        this.gameStates.set(gameId, newState);
        return newState;
    }
    getCurrentQuestion(state) {
        if (state.currentQuestionIndex < 0 ||
            state.currentQuestionIndex >= state.questions.length) {
            return null;
        }
        return state.questions[state.currentQuestionIndex];
    }
    haveAllPlayersAnswered(state) {
        return state.currentAnswers.length >= state.players.length;
    }
    getTimeRemaining(state) {
        if (!state.questionStartedAt)
            return 0;
        const elapsed = Date.now() - state.questionStartedAt;
        const question = this.getCurrentQuestion(state);
        if (!question)
            return 0;
        return Math.max(0, question.timeLimit * 1000 - elapsed);
    }
    getLeaderboard(state) {
        return [...state.players].sort((a, b) => b.totalPoints - a.totalPoints);
    }
    getState(gameId) {
        return this.gameStates.get(gameId);
    }
    setState(gameId, state) {
        this.gameStates.set(gameId, state);
    }
    deleteState(gameId) {
        this.gameStates.delete(gameId);
        this.timerService.clearTimers(gameId);
    }
};
exports.TriviaService = TriviaService;
exports.TriviaService = TriviaService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        trivia_question_service_1.TriviaQuestionService,
        trivia_timer_service_1.TriviaTimerService])
], TriviaService);
//# sourceMappingURL=trivia.service.js.map