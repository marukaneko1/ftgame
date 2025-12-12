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
exports.RoomsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const client_1 = require("@prisma/client");
const tictactoe_service_1 = require("../games/tictactoe/tictactoe.service");
const chess_service_1 = require("../games/chess/chess.service");
const trivia_service_1 = require("../games/trivia/trivia.service");
const uuid_1 = require("uuid");
const argon2 = require("argon2");
const VOTING_DURATION_MS = 20000;
let RoomsService = class RoomsService {
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
    async createRoom(hostUserId, dto) {
        if (dto.entryFeeTokens && dto.entryFeeTokens > 0) {
            const wallet = await this.prisma.wallet.findUnique({ where: { userId: hostUserId } });
            if (!wallet || wallet.balanceTokens < dto.entryFeeTokens) {
                throw new common_1.BadRequestException("Insufficient tokens to create room with entry fee");
            }
        }
        const passwordHash = dto.password ? await argon2.hash(dto.password) : null;
        const channelName = `room-${(0, uuid_1.v4)()}`;
        const room = await this.prisma.room.create({
            data: {
                hostUserId,
                title: dto.title,
                description: dto.description,
                passwordHash,
                maxMembers: dto.maxMembers || 8,
                region: dto.region || "global",
                entryFeeTokens: dto.entryFeeTokens || 0,
                isPublic: dto.isPublic !== false,
                videoChannelName: channelName,
                status: client_1.RoomStatus.LIVE,
                participants: {
                    create: {
                        userId: hostUserId,
                        role: client_1.RoomRole.HOST
                    }
                }
            },
            include: {
                participants: {
                    include: {
                        user: {
                            select: { id: true, displayName: true, username: true, wallet: { select: { balanceTokens: true } } }
                        }
                    }
                },
                host: { select: { id: true, displayName: true, username: true } }
            }
        });
        return room;
    }
    async joinRoom(userId, roomId, password) {
        const room = await this.prisma.room.findUnique({
            where: { id: roomId },
            include: {
                participants: true
            }
        });
        if (!room) {
            throw new common_1.NotFoundException("Room not found");
        }
        if (room.status === client_1.RoomStatus.ENDED) {
            throw new common_1.BadRequestException("Room has ended");
        }
        const existingParticipant = room.participants.find(p => p.userId === userId);
        if (existingParticipant && !existingParticipant.leftAt) {
            throw new common_1.BadRequestException("Already in this room");
        }
        const activeParticipants = room.participants.filter(p => !p.leftAt);
        if (activeParticipants.length >= room.maxMembers) {
            throw new common_1.BadRequestException("Room is full");
        }
        if (room.passwordHash) {
            if (!password) {
                throw new common_1.BadRequestException("Password required");
            }
            const valid = await argon2.verify(room.passwordHash, password);
            if (!valid) {
                throw new common_1.BadRequestException("Invalid password");
            }
        }
        if (room.entryFeeTokens > 0) {
            const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
            if (!wallet || wallet.balanceTokens < room.entryFeeTokens) {
                throw new common_1.BadRequestException("Insufficient tokens for entry fee");
            }
            await this.prisma.wallet.update({
                where: { userId },
                data: {
                    balanceTokens: { decrement: room.entryFeeTokens },
                    transactions: {
                        create: {
                            type: client_1.WalletTransactionType.WAGER_LOCK,
                            amountTokens: room.entryFeeTokens,
                            roomId,
                            metadata: { reason: "room_entry_fee" }
                        }
                    }
                }
            });
        }
        if (existingParticipant) {
            await this.prisma.roomParticipant.update({
                where: { id: existingParticipant.id },
                data: { leftAt: null, tokensInPool: room.entryFeeTokens }
            });
        }
        else {
            await this.prisma.roomParticipant.create({
                data: {
                    roomId,
                    userId,
                    role: client_1.RoomRole.PLAYER,
                    tokensInPool: room.entryFeeTokens
                }
            });
        }
        return this.getRoomDetails(roomId);
    }
    async leaveRoom(userId, roomId) {
        const participant = await this.prisma.roomParticipant.findFirst({
            where: { roomId, userId, leftAt: null }
        });
        if (!participant) {
            throw new common_1.BadRequestException("Not in this room");
        }
        const room = await this.prisma.room.findUnique({ where: { id: roomId } });
        if (!room)
            throw new common_1.NotFoundException("Room not found");
        if (room.hostUserId === userId) {
            await this.endRoom(roomId, userId);
            return { roomEnded: true };
        }
        await this.prisma.roomParticipant.update({
            where: { id: participant.id },
            data: { leftAt: new Date() }
        });
        if (participant.tokensInPool > 0 && room.status === client_1.RoomStatus.LIVE) {
            await this.prisma.wallet.update({
                where: { userId },
                data: {
                    balanceTokens: { increment: participant.tokensInPool },
                    transactions: {
                        create: {
                            type: client_1.WalletTransactionType.REFUND,
                            amountTokens: participant.tokensInPool,
                            roomId,
                            metadata: { reason: "room_leave_refund" }
                        }
                    }
                }
            });
        }
        return { roomEnded: false };
    }
    async endRoom(roomId, userId) {
        const room = await this.prisma.room.findUnique({
            where: { id: roomId },
            include: { participants: true }
        });
        if (!room)
            throw new common_1.NotFoundException("Room not found");
        if (room.hostUserId !== userId)
            throw new common_1.ForbiddenException("Only host can end room");
        for (const p of room.participants) {
            if (p.tokensInPool > 0 && !p.leftAt) {
                await this.prisma.wallet.update({
                    where: { userId: p.userId },
                    data: {
                        balanceTokens: { increment: p.tokensInPool },
                        transactions: {
                            create: {
                                type: client_1.WalletTransactionType.REFUND,
                                amountTokens: p.tokensInPool,
                                roomId,
                                metadata: { reason: "room_ended_refund" }
                            }
                        }
                    }
                });
            }
        }
        await this.prisma.room.update({
            where: { id: roomId },
            data: {
                status: client_1.RoomStatus.ENDED,
                endedAt: new Date()
            }
        });
        await this.prisma.roomParticipant.updateMany({
            where: { roomId, leftAt: null },
            data: { leftAt: new Date(), tokensInPool: 0 }
        });
        return { success: true };
    }
    async startRound(roomId, hostUserId, entryFeeTokens) {
        const room = await this.prisma.room.findUnique({
            where: { id: roomId },
            include: {
                participants: { where: { leftAt: null } },
                rounds: { orderBy: { roundNumber: "desc" }, take: 1 }
            }
        });
        if (!room)
            throw new common_1.NotFoundException("Room not found");
        if (room.hostUserId !== hostUserId)
            throw new common_1.ForbiddenException("Only host can start rounds");
        if (room.status === client_1.RoomStatus.IN_GAME)
            throw new common_1.BadRequestException("Game already in progress");
        if (room.participants.length < 2)
            throw new common_1.BadRequestException("Need at least 2 players");
        const nextRoundNumber = (room.rounds[0]?.roundNumber || 0) + 1;
        const round = await this.prisma.roomRound.create({
            data: {
                roomId,
                roundNumber: nextRoundNumber,
                entryFeeTokens,
                status: client_1.RoundStatus.WAITING
            }
        });
        await this.prisma.room.update({
            where: { id: roomId },
            data: { currentRoundId: round.id }
        });
        return round;
    }
    async joinRound(roomId, roundId, userId) {
        const round = await this.prisma.roomRound.findUnique({
            where: { id: roundId },
            include: { participants: true }
        });
        if (!round)
            throw new common_1.NotFoundException("Round not found");
        if (round.status !== client_1.RoundStatus.WAITING)
            throw new common_1.BadRequestException("Round not accepting players");
        const roomParticipant = await this.prisma.roomParticipant.findFirst({
            where: { roomId, userId, leftAt: null }
        });
        if (!roomParticipant)
            throw new common_1.BadRequestException("Not in this room");
        const existing = round.participants.find(p => p.roomParticipantId === roomParticipant.id);
        if (existing)
            throw new common_1.BadRequestException("Already in this round");
        if (round.entryFeeTokens > 0) {
            const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
            if (!wallet || wallet.balanceTokens < round.entryFeeTokens) {
                throw new common_1.BadRequestException("Insufficient tokens");
            }
            await this.prisma.$transaction([
                this.prisma.wallet.update({
                    where: { userId },
                    data: {
                        balanceTokens: { decrement: round.entryFeeTokens },
                        transactions: {
                            create: {
                                type: client_1.WalletTransactionType.WAGER_LOCK,
                                amountTokens: round.entryFeeTokens,
                                roomId,
                                metadata: { reason: "round_entry", roundId }
                            }
                        }
                    }
                }),
                this.prisma.roomRound.update({
                    where: { id: roundId },
                    data: { poolTokens: { increment: round.entryFeeTokens } }
                }),
                this.prisma.roundParticipant.create({
                    data: {
                        roundId,
                        roomParticipantId: roomParticipant.id,
                        tokensStaked: round.entryFeeTokens
                    }
                })
            ]);
        }
        else {
            await this.prisma.roundParticipant.create({
                data: {
                    roundId,
                    roomParticipantId: roomParticipant.id,
                    tokensStaked: 0
                }
            });
        }
        return this.getRoundDetails(roundId);
    }
    async startVoting(roomId, roundId, hostUserId) {
        const room = await this.prisma.room.findUnique({ where: { id: roomId } });
        if (!room)
            throw new common_1.NotFoundException("Room not found");
        if (room.hostUserId !== hostUserId)
            throw new common_1.ForbiddenException("Only host can start voting");
        const round = await this.prisma.roomRound.findUnique({
            where: { id: roundId },
            include: { participants: true }
        });
        if (!round)
            throw new common_1.NotFoundException("Round not found");
        if (round.status !== client_1.RoundStatus.WAITING)
            throw new common_1.BadRequestException("Round not in waiting state");
        if (round.participants.length < 2)
            throw new common_1.BadRequestException("Need at least 2 players in round");
        const votingEndsAt = new Date(Date.now() + VOTING_DURATION_MS);
        await this.prisma.$transaction([
            this.prisma.roomRound.update({
                where: { id: roundId },
                data: { status: client_1.RoundStatus.VOTING, votingEndsAt }
            }),
            this.prisma.room.update({
                where: { id: roomId },
                data: { status: client_1.RoomStatus.VOTING }
            })
        ]);
        return { votingEndsAt, roundId };
    }
    async voteForGame(roundId, odUserId, gameType) {
        const round = await this.prisma.roomRound.findUnique({ where: { id: roundId } });
        if (!round)
            throw new common_1.NotFoundException("Round not found");
        if (round.status !== client_1.RoundStatus.VOTING)
            throw new common_1.BadRequestException("Voting not active");
        await this.prisma.roundVote.upsert({
            where: { roundId_odUserId: { roundId, odUserId } },
            update: { gameType },
            create: { roundId, odUserId, gameType }
        });
        return this.getVotingResults(roundId);
    }
    async getVotingResults(roundId) {
        const votes = await this.prisma.roundVote.findMany({ where: { roundId } });
        const results = {};
        for (const vote of votes) {
            results[vote.gameType] = (results[vote.gameType] || 0) + 1;
        }
        return Object.entries(results)
            .map(([gt, count]) => ({ gameType: gt, voteCount: count }))
            .sort((a, b) => b.voteCount - a.voteCount);
    }
    async finalizeVotingAndStartGame(roundId) {
        const round = await this.prisma.roomRound.findUnique({
            where: { id: roundId },
            include: {
                room: true,
                participants: {
                    include: {
                        roomParticipant: true
                    }
                }
            }
        });
        if (!round)
            throw new common_1.NotFoundException("Round not found");
        if (round.status !== client_1.RoundStatus.VOTING)
            return null;
        const results = await this.getVotingResults(roundId);
        const winningGame = results[0]?.gameType || client_1.GameType.TICTACTOE;
        const playerIds = round.participants.map(p => p.roomParticipant.userId);
        const minPlayers = winningGame === client_1.GameType.TRIVIA ? 2 : 2;
        if (playerIds.length < minPlayers) {
            throw new common_1.BadRequestException(`Need at least ${minPlayers} participants to start a game`);
        }
        let gameState = null;
        let sideMappings = [];
        if (winningGame === client_1.GameType.TICTACTOE) {
            const tttPlayers = playerIds.slice(0, 2);
            gameState = this.ticTacToeService.initializeState(tttPlayers[0], tttPlayers[1]);
            sideMappings = [
                { odUserId: tttPlayers[0], side: "X" },
                { odUserId: tttPlayers[1], side: "O" }
            ];
        }
        else if (winningGame === client_1.GameType.CHESS) {
            const chessPlayers = playerIds.slice(0, 2);
            const shuffled = [...chessPlayers].sort(() => Math.random() - 0.5);
            gameState = this.chessService.initializeState(shuffled[0], shuffled[1]);
            sideMappings = [
                { odUserId: shuffled[0], side: "white" },
                { odUserId: shuffled[1], side: "black" }
            ];
        }
        else if (winningGame === client_1.GameType.TRIVIA) {
            gameState = await this.triviaService.initializeState(playerIds);
            sideMappings = playerIds.map((odUserId, idx) => ({
                odUserId,
                side: `player${idx + 1}`
            }));
        }
        const game = await this.prisma.game.create({
            data: {
                type: winningGame,
                status: client_1.GameStatus.ACTIVE,
                state: gameState,
                startedAt: new Date(),
                players: {
                    create: sideMappings.map(({ odUserId, side }) => ({
                        userId: odUserId,
                        side
                    }))
                }
            }
        });
        let finalGameState = gameState;
        if (winningGame === client_1.GameType.TRIVIA) {
            const startedState = await this.triviaService.startGame(game.id, gameState);
            const playersWithNames = await Promise.all(startedState.players.map(async (p) => {
                const user = await this.prisma.user.findUnique({
                    where: { id: p.odUserId },
                    select: { displayName: true }
                });
                return {
                    ...p,
                    displayName: user?.displayName || ''
                };
            }));
            finalGameState = {
                ...startedState,
                players: playersWithNames
            };
        }
        await this.prisma.$transaction([
            this.prisma.roomRound.update({
                where: { id: roundId },
                data: {
                    status: client_1.RoundStatus.IN_GAME,
                    gameType: winningGame,
                    gameId: game.id,
                    startedAt: new Date()
                }
            }),
            this.prisma.room.update({
                where: { id: round.roomId },
                data: { status: client_1.RoomStatus.IN_GAME }
            }),
            this.prisma.game.update({
                where: { id: game.id },
                data: {
                    state: finalGameState
                }
            })
        ]);
        return { gameType: winningGame, roundId, gameId: game.id, gameState: finalGameState, players: sideMappings };
    }
    async completeRound(roundId, winnerId, isDraw = false) {
        const round = await this.prisma.roomRound.findUnique({
            where: { id: roundId },
            include: {
                participants: {
                    include: {
                        roomParticipant: true
                    }
                },
                room: true
            }
        });
        if (!round)
            throw new common_1.NotFoundException("Round not found");
        if (isDraw) {
            for (const p of round.participants) {
                if (p.tokensStaked > 0) {
                    await this.prisma.wallet.update({
                        where: { userId: p.roomParticipant.userId },
                        data: {
                            balanceTokens: { increment: p.tokensStaked },
                            transactions: {
                                create: {
                                    type: client_1.WalletTransactionType.REFUND,
                                    amountTokens: p.tokensStaked,
                                    roomId: round.roomId,
                                    metadata: { reason: "draw_refund", roundId }
                                }
                            }
                        }
                    });
                    await this.prisma.roundParticipant.update({
                        where: { id: p.id },
                        data: { result: "draw" }
                    });
                }
            }
        }
        else if (winnerId) {
            const payout = round.poolTokens;
            if (payout > 0) {
                await this.prisma.wallet.update({
                    where: { userId: winnerId },
                    data: {
                        balanceTokens: { increment: payout },
                        transactions: {
                            create: {
                                type: client_1.WalletTransactionType.WAGER_PAYOUT,
                                amountTokens: payout,
                                roomId: round.roomId,
                                metadata: { reason: "round_win", roundId }
                            }
                        }
                    }
                });
            }
            for (const p of round.participants) {
                const isWinner = p.roomParticipant.userId === winnerId;
                await this.prisma.roundParticipant.update({
                    where: { id: p.id },
                    data: { result: isWinner ? "win" : "loss" }
                });
            }
        }
        await this.prisma.$transaction([
            this.prisma.roomRound.update({
                where: { id: roundId },
                data: {
                    status: client_1.RoundStatus.COMPLETED,
                    winnerId,
                    endedAt: new Date()
                }
            }),
            this.prisma.room.update({
                where: { id: round.roomId },
                data: { status: client_1.RoomStatus.LIVE }
            })
        ]);
        return { winnerId, payout: isDraw ? 0 : round.poolTokens };
    }
    async getPublicRooms(region) {
        const where = {
            isPublic: true,
            status: { not: client_1.RoomStatus.ENDED }
        };
        if (region && region !== "global") {
            where.region = region;
        }
        const rooms = await this.prisma.room.findMany({
            where,
            include: {
                host: { select: { id: true, displayName: true, username: true } },
                participants: {
                    where: { leftAt: null },
                    include: {
                        user: { select: { id: true, displayName: true } }
                    }
                },
                rounds: {
                    where: { status: { not: client_1.RoundStatus.COMPLETED } },
                    take: 1,
                    orderBy: { roundNumber: "desc" }
                }
            },
            orderBy: { createdAt: "desc" }
        });
        return rooms.map(room => ({
            id: room.id,
            title: room.title,
            description: room.description,
            hostName: room.host.displayName,
            region: room.region,
            entryFeeTokens: room.entryFeeTokens,
            hasPassword: !!room.passwordHash,
            participantCount: room.participants.length,
            maxMembers: room.maxMembers,
            status: room.status,
            currentRound: room.rounds[0] || null
        }));
    }
    async getRoomDetails(roomId) {
        const room = await this.prisma.room.findUnique({
            where: { id: roomId },
            include: {
                host: { select: { id: true, displayName: true, username: true } },
                participants: {
                    where: { leftAt: null },
                    include: {
                        user: {
                            select: {
                                id: true,
                                displayName: true,
                                username: true,
                                wallet: { select: { balanceTokens: true } }
                            }
                        }
                    }
                },
                rounds: {
                    orderBy: { roundNumber: "desc" },
                    take: 1,
                    include: {
                        participants: {
                            include: {
                                roomParticipant: {
                                    include: {
                                        user: { select: { id: true, displayName: true } }
                                    }
                                }
                            }
                        },
                        votes: true
                    }
                }
            }
        });
        if (!room)
            throw new common_1.NotFoundException("Room not found");
        const currentRound = room.rounds[0];
        return {
            id: room.id,
            title: room.title,
            description: room.description,
            hostUserId: room.hostUserId,
            maxMembers: room.maxMembers,
            region: room.region,
            entryFeeTokens: room.entryFeeTokens,
            status: room.status,
            isPublic: room.isPublic,
            currentRoundId: room.currentRoundId,
            participantCount: room.participants.length,
            participants: room.participants.map(p => ({
                odUserId: p.user.id,
                displayName: p.user.displayName,
                username: p.user.username,
                role: p.role,
                tokensInPool: p.tokensInPool,
                walletBalance: p.user.wallet?.balanceTokens || 0
            })),
            currentRound: currentRound ? {
                id: currentRound.id,
                roundNumber: currentRound.roundNumber,
                entryFeeTokens: currentRound.entryFeeTokens,
                poolTokens: currentRound.poolTokens,
                status: currentRound.status,
                gameType: currentRound.gameType,
                gameId: currentRound.gameId,
                votingEndsAt: currentRound.votingEndsAt,
                participants: currentRound.participants.map(p => ({
                    odUserId: p.roomParticipant.user.id,
                    displayName: p.roomParticipant.user.displayName,
                    tokensStaked: p.tokensStaked
                })),
                votes: currentRound.votes.map(v => ({ odUserId: v.odUserId, gameType: v.gameType }))
            } : null
        };
    }
    async getRoundDetails(roundId) {
        const round = await this.prisma.roomRound.findUnique({
            where: { id: roundId },
            include: {
                participants: {
                    include: {
                        roomParticipant: {
                            include: {
                                user: { select: { id: true, displayName: true } }
                            }
                        }
                    }
                },
                votes: true
            }
        });
        if (!round)
            throw new common_1.NotFoundException("Round not found");
        return {
            id: round.id,
            roundNumber: round.roundNumber,
            entryFeeTokens: round.entryFeeTokens,
            poolTokens: round.poolTokens,
            status: round.status,
            gameType: round.gameType,
            gameId: round.gameId,
            votingEndsAt: round.votingEndsAt,
            participants: round.participants.map(p => ({
                odUserId: p.roomParticipant.user.id,
                displayName: p.roomParticipant.user.displayName,
                tokensStaked: p.tokensStaked
            })),
            votes: round.votes.map(v => ({ odUserId: v.odUserId, gameType: v.gameType }))
        };
    }
};
exports.RoomsService = RoomsService;
exports.RoomsService = RoomsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        tictactoe_service_1.TicTacToeService,
        chess_service_1.ChessService,
        trivia_service_1.TriviaService])
], RoomsService);
//# sourceMappingURL=rooms.service.js.map