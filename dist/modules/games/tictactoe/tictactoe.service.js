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
exports.TicTacToeService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../prisma/prisma.service");
const client_1 = require("@prisma/client");
const tictactoe_types_1 = require("./tictactoe.types");
let TicTacToeService = class TicTacToeService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    initializeState(playerXId, playerOId) {
        return {
            board: Array(9).fill(null),
            currentTurn: "X",
            moveHistory: [],
            playerX: playerXId,
            playerO: playerOId,
            startedAt: Date.now()
        };
    }
    getPlayerSymbol(state, userId) {
        if (state.playerX === userId)
            return "X";
        if (state.playerO === userId)
            return "O";
        return null;
    }
    getCurrentPlayerId(state) {
        return state.currentTurn === "X" ? state.playerX : state.playerO;
    }
    async makeMove(gameId, userId, cellIndex) {
        const game = await this.prisma.game.findUnique({
            where: { id: gameId },
            include: { players: true }
        });
        if (!game) {
            return { success: false, error: "Game not found" };
        }
        if (game.status !== client_1.GameStatus.ACTIVE) {
            return { success: false, error: "Game is not active" };
        }
        const state = game.state;
        if (!state) {
            return { success: false, error: "Invalid game state" };
        }
        const playerSymbol = this.getPlayerSymbol(state, userId);
        if (!playerSymbol) {
            return { success: false, error: "You are not a player in this game" };
        }
        if (state.currentTurn !== playerSymbol) {
            return { success: false, error: "It's not your turn" };
        }
        if (cellIndex < 0 || cellIndex > 8) {
            return { success: false, error: "Invalid cell index" };
        }
        if (state.board[cellIndex] !== null) {
            return { success: false, error: "Cell is already occupied" };
        }
        const newBoard = [...state.board];
        newBoard[cellIndex] = playerSymbol;
        const move = {
            cell: cellIndex,
            player: playerSymbol,
            timestamp: Date.now()
        };
        const newState = {
            ...state,
            board: newBoard,
            currentTurn: playerSymbol === "X" ? "O" : "X",
            moveHistory: [...state.moveHistory, move]
        };
        const gameEnd = this.checkGameEnd(newBoard, state);
        if (gameEnd) {
            await this.prisma.game.update({
                where: { id: gameId },
                data: {
                    state: newState,
                    status: client_1.GameStatus.COMPLETED,
                    winnerUserId: gameEnd.winnerId,
                    endedAt: new Date()
                }
            });
            if (gameEnd.winnerId) {
                const loserId = gameEnd.winnerId === state.playerX ? state.playerO : state.playerX;
                await this.prisma.gamePlayer.updateMany({
                    where: { gameId, userId: gameEnd.winnerId },
                    data: { result: "win" }
                });
                await this.prisma.gamePlayer.updateMany({
                    where: { gameId, userId: loserId },
                    data: { result: "loss" }
                });
            }
            else {
                await this.prisma.gamePlayer.updateMany({
                    where: { gameId },
                    data: { result: "draw" }
                });
            }
            return {
                success: true,
                state: newState,
                winner: gameEnd.winnerId,
                isDraw: gameEnd.isDraw,
                winningLine: gameEnd.winningLine
            };
        }
        await this.prisma.game.update({
            where: { id: gameId },
            data: { state: newState }
        });
        return {
            success: true,
            state: newState,
            winner: null,
            isDraw: false
        };
    }
    checkGameEnd(board, state) {
        for (const combo of tictactoe_types_1.WINNING_COMBINATIONS) {
            const [a, b, c] = combo;
            if (board[a] && board[a] === board[b] && board[a] === board[c]) {
                const winnerSymbol = board[a];
                const winnerId = winnerSymbol === "X" ? state.playerX : state.playerO;
                return {
                    winnerId,
                    winnerSymbol,
                    isDraw: false,
                    reason: "win",
                    winningLine: combo
                };
            }
        }
        const isDraw = board.every(cell => cell !== null);
        if (isDraw) {
            return {
                winnerId: null,
                winnerSymbol: null,
                isDraw: true,
                reason: "draw"
            };
        }
        return null;
    }
    async forfeitGame(gameId, forfeitingUserId) {
        const game = await this.prisma.game.findUnique({
            where: { id: gameId },
            include: { players: true }
        });
        if (!game) {
            throw new common_1.BadRequestException("Game not found");
        }
        if (game.status !== client_1.GameStatus.ACTIVE) {
            throw new common_1.BadRequestException("Game is not active");
        }
        const state = game.state;
        if (!state) {
            throw new common_1.BadRequestException("Invalid game state");
        }
        let winnerId;
        if (state.playerX === forfeitingUserId) {
            winnerId = state.playerO;
        }
        else if (state.playerO === forfeitingUserId) {
            winnerId = state.playerX;
        }
        else {
            throw new common_1.BadRequestException("User is not a player in this game");
        }
        await this.prisma.game.update({
            where: { id: gameId },
            data: {
                status: client_1.GameStatus.COMPLETED,
                winnerUserId: winnerId,
                endedAt: new Date()
            }
        });
        await this.prisma.gamePlayer.updateMany({
            where: { gameId, userId: winnerId },
            data: { result: "win" }
        });
        await this.prisma.gamePlayer.updateMany({
            where: { gameId, userId: forfeitingUserId },
            data: { result: "forfeit" }
        });
        return {
            winnerId,
            winnerSymbol: winnerId === state.playerX ? "X" : "O",
            isDraw: false,
            reason: "forfeit"
        };
    }
    getValidMoves(board) {
        return board
            .map((cell, index) => (cell === null ? index : -1))
            .filter(index => index !== -1);
    }
};
exports.TicTacToeService = TicTacToeService;
exports.TicTacToeService = TicTacToeService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], TicTacToeService);
//# sourceMappingURL=tictactoe.service.js.map