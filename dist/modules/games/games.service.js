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
exports.GamesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const client_1 = require("@prisma/client");
const tictactoe_service_1 = require("./tictactoe/tictactoe.service");
const chess_service_1 = require("./chess/chess.service");
const trivia_service_1 = require("./trivia/trivia.service");
let GamesService = class GamesService {
    prisma;
    ticTacToeService;
    chessService;
    triviaService;
    constructor(prisma, ticTacToeService, chessService, triviaService) {
        this.prisma = prisma;
        this.ticTacToeService = ticTacToeService;
        this.chessService = chessService;
        this.triviaService = triviaService;
    }
    async createGame(sessionId, type, playerIds) {
        let sideMappings;
        if (type === client_1.GameType.CHESS) {
            const shuffled = [...playerIds].sort(() => Math.random() - 0.5);
            sideMappings = [
                { userId: shuffled[0], side: "white" },
                { userId: shuffled[1], side: "black" }
            ];
        }
        else if (type === client_1.GameType.TRIVIA) {
            sideMappings = playerIds.map((userId, idx) => ({
                userId,
                side: `player${idx + 1}`
            }));
        }
        else {
            sideMappings = playerIds.map((userId, idx) => ({
                userId,
                side: idx === 0 ? "X" : "O"
            }));
        }
        const game = await this.prisma.game.create({
            data: {
                sessionId,
                type,
                status: client_1.GameStatus.PENDING,
                players: {
                    create: sideMappings.map(({ userId, side }) => ({
                        userId,
                        side
                    }))
                }
            },
            include: {
                players: true
            }
        });
        return game;
    }
    async startGame(gameId) {
        const game = await this.prisma.game.findUnique({
            where: { id: gameId },
            include: { players: true }
        });
        if (!game) {
            throw new common_1.NotFoundException("Game not found");
        }
        if (game.status !== client_1.GameStatus.PENDING) {
            throw new common_1.BadRequestException("Game already started or completed");
        }
        if (game.type === client_1.GameType.TRIVIA) {
            if (game.players.length < 2) {
                throw new common_1.BadRequestException("Trivia requires at least 2 players");
            }
        }
        else {
            if (game.players.length !== 2) {
                throw new common_1.BadRequestException("Game requires exactly 2 players");
            }
        }
        let state = null;
        if (game.type === client_1.GameType.TICTACTOE) {
            const playerX = game.players.find(p => p.side === "X")?.userId;
            const playerO = game.players.find(p => p.side === "O")?.userId;
            if (!playerX || !playerO) {
                throw new common_1.BadRequestException("Invalid player configuration");
            }
            state = this.ticTacToeService.initializeState(playerX, playerO);
        }
        else if (game.type === client_1.GameType.CHESS) {
            const playerWhite = game.players.find(p => p.side === "white")?.userId;
            const playerBlack = game.players.find(p => p.side === "black")?.userId;
            if (!playerWhite || !playerBlack) {
                throw new common_1.BadRequestException("Invalid player configuration for chess");
            }
            state = this.chessService.initializeState(playerWhite, playerBlack);
        }
        else if (game.type === client_1.GameType.TRIVIA) {
            const playerIds = game.players.map(p => p.userId);
            state = await this.triviaService.initializeState(playerIds);
        }
        const updatedGame = await this.prisma.game.update({
            where: { id: gameId },
            data: {
                status: client_1.GameStatus.ACTIVE,
                state: state,
                startedAt: new Date()
            },
            include: {
                players: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                displayName: true,
                                username: true
                            }
                        }
                    }
                }
            }
        });
        return updatedGame;
    }
    async getGame(gameId) {
        const game = await this.prisma.game.findUnique({
            where: { id: gameId },
            include: {
                players: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                displayName: true,
                                username: true
                            }
                        }
                    }
                },
                session: true
            }
        });
        if (!game) {
            throw new common_1.NotFoundException("Game not found");
        }
        return game;
    }
    async cancelGame(gameId) {
        const game = await this.prisma.game.findUnique({
            where: { id: gameId }
        });
        if (!game) {
            throw new common_1.NotFoundException("Game not found");
        }
        if (game.status === client_1.GameStatus.COMPLETED) {
            throw new common_1.BadRequestException("Cannot cancel a completed game");
        }
        return this.prisma.game.update({
            where: { id: gameId },
            data: {
                status: client_1.GameStatus.CANCELED,
                endedAt: new Date()
            }
        });
    }
    async getActiveGameForSession(sessionId) {
        return this.prisma.game.findFirst({
            where: {
                sessionId,
                status: { in: [client_1.GameStatus.PENDING, client_1.GameStatus.ACTIVE] }
            },
            include: {
                players: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                displayName: true,
                                username: true
                            }
                        }
                    }
                }
            },
            orderBy: { createdAt: "desc" }
        });
    }
};
exports.GamesService = GamesService;
exports.GamesService = GamesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        tictactoe_service_1.TicTacToeService,
        chess_service_1.ChessService,
        trivia_service_1.TriviaService])
], GamesService);
//# sourceMappingURL=games.service.js.map