import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { RoomStatus, RoomRole, RoundStatus, GameType, GameStatus, WalletTransactionType } from "@prisma/client";
import { CreateRoomDto, RoomWithParticipants, RoomParticipantInfo, RoundInfo } from "./rooms.types";
import { TicTacToeService } from "../games/tictactoe/tictactoe.service";
import { ChessService } from "../games/chess/chess.service";
import { TriviaService } from "../games/trivia/trivia.service";
import { v4 as uuidv4 } from "uuid";
import * as argon2 from "argon2";

const VOTING_DURATION_MS = 20000; // 20 seconds for voting

@Injectable()
export class RoomsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ticTacToeService: TicTacToeService,
    private readonly chessService: ChessService,
    private readonly triviaService: TriviaService
  ) {}

  // ==================== ROOM MANAGEMENT ====================

  async createRoom(hostUserId: string, dto: CreateRoomDto) {
    // Verify host has sufficient tokens if entry fee > 0
    if (dto.entryFeeTokens && dto.entryFeeTokens > 0) {
      const wallet = await this.prisma.wallet.findUnique({ where: { userId: hostUserId } });
      if (!wallet || wallet.balanceTokens < dto.entryFeeTokens) {
        throw new BadRequestException("Insufficient tokens to create room with entry fee");
      }
    }

    const passwordHash = dto.password ? await argon2.hash(dto.password) : null;
    const channelName = `room-${uuidv4()}`;

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
        status: RoomStatus.LIVE,
        // Auto-join host as HOST role
        participants: {
          create: {
            userId: hostUserId,
            role: RoomRole.HOST
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

  async joinRoom(userId: string, roomId: string, password?: string) {
    const room = await this.prisma.room.findUnique({
      where: { id: roomId },
      include: {
        participants: true
      }
    });

    if (!room) {
      throw new NotFoundException("Room not found");
    }

    if (room.status === RoomStatus.ENDED) {
      throw new BadRequestException("Room has ended");
    }

    // Check if already in room
    const existingParticipant = room.participants.find(p => p.userId === userId);
    if (existingParticipant && !existingParticipant.leftAt) {
      throw new BadRequestException("Already in this room");
    }

    // Check room capacity
    const activeParticipants = room.participants.filter(p => !p.leftAt);
    if (activeParticipants.length >= room.maxMembers) {
      throw new BadRequestException("Room is full");
    }

    // Verify password if set
    if (room.passwordHash) {
      if (!password) {
        throw new BadRequestException("Password required");
      }
      const valid = await argon2.verify(room.passwordHash, password);
      if (!valid) {
        throw new BadRequestException("Invalid password");
      }
    }

    // Deduct entry fee if applicable
    if (room.entryFeeTokens > 0) {
      const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
      if (!wallet || wallet.balanceTokens < room.entryFeeTokens) {
        throw new BadRequestException("Insufficient tokens for entry fee");
      }

      await this.prisma.wallet.update({
        where: { userId },
        data: {
          balanceTokens: { decrement: room.entryFeeTokens },
          transactions: {
            create: {
              type: WalletTransactionType.WAGER_LOCK,
              amountTokens: room.entryFeeTokens,
              roomId,
              metadata: { reason: "room_entry_fee" }
            }
          }
        }
      });
    }

    // Join or rejoin room
    if (existingParticipant) {
      // Rejoin
      await this.prisma.roomParticipant.update({
        where: { id: existingParticipant.id },
        data: { leftAt: null, tokensInPool: room.entryFeeTokens }
      });
    } else {
      // New join
      await this.prisma.roomParticipant.create({
        data: {
          roomId,
          userId,
          role: RoomRole.PLAYER,
          tokensInPool: room.entryFeeTokens
        }
      });
    }

    return this.getRoomDetails(roomId);
  }

  async leaveRoom(userId: string, roomId: string) {
    const participant = await this.prisma.roomParticipant.findFirst({
      where: { roomId, userId, leftAt: null }
    });

    if (!participant) {
      throw new BadRequestException("Not in this room");
    }

    const room = await this.prisma.room.findUnique({ where: { id: roomId } });
    if (!room) throw new NotFoundException("Room not found");

    // If host leaves, end the room
    if (room.hostUserId === userId) {
      await this.endRoom(roomId, userId);
      return { roomEnded: true };
    }

    // Mark as left
    await this.prisma.roomParticipant.update({
      where: { id: participant.id },
      data: { leftAt: new Date() }
    });

    // Refund tokens if not in a game
    if (participant.tokensInPool > 0 && room.status === RoomStatus.LIVE) {
      await this.prisma.wallet.update({
        where: { userId },
        data: {
          balanceTokens: { increment: participant.tokensInPool },
          transactions: {
            create: {
              type: WalletTransactionType.REFUND,
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

  async endRoom(roomId: string, userId: string) {
    const room = await this.prisma.room.findUnique({
      where: { id: roomId },
      include: { participants: true }
    });

    if (!room) throw new NotFoundException("Room not found");
    if (room.hostUserId !== userId) throw new ForbiddenException("Only host can end room");

    // Refund all participants' tokens
    for (const p of room.participants) {
      if (p.tokensInPool > 0 && !p.leftAt) {
        await this.prisma.wallet.update({
          where: { userId: p.userId },
          data: {
            balanceTokens: { increment: p.tokensInPool },
            transactions: {
              create: {
                type: WalletTransactionType.REFUND,
                amountTokens: p.tokensInPool,
                roomId,
                metadata: { reason: "room_ended_refund" }
              }
            }
          }
        });
      }
    }

    // Update room status
    await this.prisma.room.update({
      where: { id: roomId },
      data: {
        status: RoomStatus.ENDED,
        endedAt: new Date()
      }
    });

    // Mark all participants as left
    await this.prisma.roomParticipant.updateMany({
      where: { roomId, leftAt: null },
      data: { leftAt: new Date(), tokensInPool: 0 }
    });

    return { success: true };
  }

  // ==================== ROUND MANAGEMENT ====================

  async startRound(roomId: string, hostUserId: string, entryFeeTokens: number) {
    const room = await this.prisma.room.findUnique({
      where: { id: roomId },
      include: {
        participants: { where: { leftAt: null } },
        rounds: { orderBy: { roundNumber: "desc" }, take: 1 }
      }
    });

    if (!room) throw new NotFoundException("Room not found");
    if (room.hostUserId !== hostUserId) throw new ForbiddenException("Only host can start rounds");
    if (room.status === RoomStatus.IN_GAME) throw new BadRequestException("Game already in progress");
    if (room.participants.length < 2) throw new BadRequestException("Need at least 2 players");

    const nextRoundNumber = (room.rounds[0]?.roundNumber || 0) + 1;

    // Create new round
    const round = await this.prisma.roomRound.create({
      data: {
        roomId,
        roundNumber: nextRoundNumber,
        entryFeeTokens,
        status: RoundStatus.WAITING
      }
    });

    // Update room
    await this.prisma.room.update({
      where: { id: roomId },
      data: { currentRoundId: round.id }
    });

    return round;
  }

  async joinRound(roomId: string, roundId: string, userId: string) {
    const round = await this.prisma.roomRound.findUnique({
      where: { id: roundId },
      include: { participants: true }
    });

    if (!round) throw new NotFoundException("Round not found");
    if (round.status !== RoundStatus.WAITING) throw new BadRequestException("Round not accepting players");

    const roomParticipant = await this.prisma.roomParticipant.findFirst({
      where: { roomId, userId, leftAt: null }
    });

    if (!roomParticipant) throw new BadRequestException("Not in this room");

    // Check if already in round
    const existing = round.participants.find(p => p.roomParticipantId === roomParticipant.id);
    if (existing) throw new BadRequestException("Already in this round");

    // Check and deduct tokens
    if (round.entryFeeTokens > 0) {
      const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
      if (!wallet || wallet.balanceTokens < round.entryFeeTokens) {
        throw new BadRequestException("Insufficient tokens");
      }

      await this.prisma.$transaction([
        this.prisma.wallet.update({
          where: { userId },
          data: {
            balanceTokens: { decrement: round.entryFeeTokens },
            transactions: {
              create: {
                type: WalletTransactionType.WAGER_LOCK,
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
    } else {
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

  async startVoting(roomId: string, roundId: string, hostUserId: string) {
    const room = await this.prisma.room.findUnique({ where: { id: roomId } });
    if (!room) throw new NotFoundException("Room not found");
    if (room.hostUserId !== hostUserId) throw new ForbiddenException("Only host can start voting");

    const round = await this.prisma.roomRound.findUnique({
      where: { id: roundId },
      include: { participants: true }
    });

    if (!round) throw new NotFoundException("Round not found");
    if (round.status !== RoundStatus.WAITING) throw new BadRequestException("Round not in waiting state");
    if (round.participants.length < 2) throw new BadRequestException("Need at least 2 players in round");

    const votingEndsAt = new Date(Date.now() + VOTING_DURATION_MS);

    await this.prisma.$transaction([
      this.prisma.roomRound.update({
        where: { id: roundId },
        data: { status: RoundStatus.VOTING, votingEndsAt }
      }),
      this.prisma.room.update({
        where: { id: roomId },
        data: { status: RoomStatus.VOTING }
      })
    ]);

    return { votingEndsAt, roundId };
  }

  async voteForGame(roundId: string, odUserId: string, gameType: GameType) {
    const round = await this.prisma.roomRound.findUnique({ where: { id: roundId } });
    if (!round) throw new NotFoundException("Round not found");
    if (round.status !== RoundStatus.VOTING) throw new BadRequestException("Voting not active");

    // Upsert vote
    await this.prisma.roundVote.upsert({
      where: { roundId_odUserId: { roundId, odUserId } },
      update: { gameType },
      create: { roundId, odUserId, gameType }
    });

    return this.getVotingResults(roundId);
  }

  async getVotingResults(roundId: string) {
    const votes = await this.prisma.roundVote.findMany({ where: { roundId } });
    
    const results: Record<string, number> = {};
    for (const vote of votes) {
      results[vote.gameType] = (results[vote.gameType] || 0) + 1;
    }

    return Object.entries(results)
      .map(([gt, count]) => ({ gameType: gt as GameType, voteCount: count }))
      .sort((a, b) => b.voteCount - a.voteCount);
  }

  async finalizeVotingAndStartGame(roundId: string) {
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

    if (!round) throw new NotFoundException("Round not found");
    if (round.status !== RoundStatus.VOTING) return null;

    const results = await this.getVotingResults(roundId);
    const winningGame = results[0]?.gameType || GameType.TICTACTOE; // Default to TicTacToe

    // Get participants for the game
    const playerIds = round.participants.map(p => p.roomParticipant.userId);
    
    // Check minimum players based on game type
    const minPlayers = winningGame === GameType.TRIVIA ? 2 : 2;
    if (playerIds.length < minPlayers) {
      throw new BadRequestException(`Need at least ${minPlayers} participants to start a game`);
    }

    // Initialize game state based on game type
    let gameState: any = null;
    let sideMappings: { odUserId: string; side: string }[] = [];

    if (winningGame === GameType.TICTACTOE) {
      // Take first 2 for TicTacToe
      const tttPlayers = playerIds.slice(0, 2);
      gameState = this.ticTacToeService.initializeState(tttPlayers[0], tttPlayers[1]);
      sideMappings = [
        { odUserId: tttPlayers[0], side: "X" },
        { odUserId: tttPlayers[1], side: "O" }
      ];
    } else if (winningGame === GameType.CHESS) {
      // Take first 2 for Chess, randomly assign colors
      const chessPlayers = playerIds.slice(0, 2);
      const shuffled = [...chessPlayers].sort(() => Math.random() - 0.5);
      gameState = this.chessService.initializeState(shuffled[0], shuffled[1]);
      sideMappings = [
        { odUserId: shuffled[0], side: "white" },
        { odUserId: shuffled[1], side: "black" }
      ];
    } else if (winningGame === GameType.TRIVIA) {
      // Trivia supports 2+ players
      gameState = await this.triviaService.initializeState(playerIds);
      sideMappings = playerIds.map((odUserId, idx) => ({
        odUserId,
        side: `player${idx + 1}`
      }));
    }

    // Create game record
    const game = await this.prisma.game.create({
      data: {
        type: winningGame,
        status: GameStatus.ACTIVE,
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

    // For trivia, start the game immediately to load questions
    let finalGameState = gameState;
    if (winningGame === GameType.TRIVIA) {
      const startedState = await this.triviaService.startGame(game.id, gameState);
      // Update display names - fetch user data from database
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

    // Update round with game info
    await this.prisma.$transaction([
      this.prisma.roomRound.update({
        where: { id: roundId },
        data: {
          status: RoundStatus.IN_GAME,
          gameType: winningGame,
          gameId: game.id,
          startedAt: new Date()
        }
      }),
      this.prisma.room.update({
        where: { id: round.roomId },
        data: { status: RoomStatus.IN_GAME }
      }),
      this.prisma.game.update({
        where: { id: game.id },
        data: {
          state: finalGameState as any
        }
      })
    ]);

    return { gameType: winningGame, roundId, gameId: game.id, gameState: finalGameState, players: sideMappings };
  }

  // ==================== GAME COMPLETION ====================

  async completeRound(roundId: string, winnerId: string | null, isDraw: boolean = false) {
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

    if (!round) throw new NotFoundException("Round not found");

    if (isDraw) {
      // Refund all participants
      for (const p of round.participants) {
        if (p.tokensStaked > 0) {
          await this.prisma.wallet.update({
            where: { userId: p.roomParticipant.userId },
            data: {
              balanceTokens: { increment: p.tokensStaked },
              transactions: {
                create: {
                  type: WalletTransactionType.REFUND,
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
    } else if (winnerId) {
      // Payout winner
      const payout = round.poolTokens;
      if (payout > 0) {
        await this.prisma.wallet.update({
          where: { userId: winnerId },
          data: {
            balanceTokens: { increment: payout },
            transactions: {
              create: {
                type: WalletTransactionType.WAGER_PAYOUT,
                amountTokens: payout,
                roomId: round.roomId,
                metadata: { reason: "round_win", roundId }
              }
            }
          }
        });
      }

      // Update participant results
      for (const p of round.participants) {
        const isWinner = p.roomParticipant.userId === winnerId;
        await this.prisma.roundParticipant.update({
          where: { id: p.id },
          data: { result: isWinner ? "win" : "loss" }
        });
      }
    }

    // Update round status
    await this.prisma.$transaction([
      this.prisma.roomRound.update({
        where: { id: roundId },
        data: {
          status: RoundStatus.COMPLETED,
          winnerId,
          endedAt: new Date()
        }
      }),
      this.prisma.room.update({
        where: { id: round.roomId },
        data: { status: RoomStatus.LIVE }
      })
    ]);

    return { winnerId, payout: isDraw ? 0 : round.poolTokens };
  }

  // ==================== QUERIES ====================

  async getPublicRooms(region?: string) {
    const where: any = {
      isPublic: true,
      status: { not: RoomStatus.ENDED }
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
          where: { status: { not: RoundStatus.COMPLETED } },
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

  async getRoomDetails(roomId: string): Promise<RoomWithParticipants> {
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

    if (!room) throw new NotFoundException("Room not found");

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

  async getRoundDetails(roundId: string): Promise<RoundInfo> {
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

    if (!round) throw new NotFoundException("Round not found");

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
}

