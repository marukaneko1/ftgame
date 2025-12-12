import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { GameStatus, GameType } from "@prisma/client";
import { TicTacToeService } from "./tictactoe/tictactoe.service";
import { ChessService } from "./chess/chess.service";
import { TriviaService } from "./trivia/trivia.service";

@Injectable()
export class GamesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ticTacToeService: TicTacToeService,
    private readonly chessService: ChessService,
    private readonly triviaService: TriviaService
  ) {}

  async createGame(sessionId: string, type: GameType, playerIds: string[]) {
    // Determine side assignment based on game type
    let sideMappings: { userId: string; side: string }[];
    
    if (type === GameType.CHESS) {
      // For chess, randomly assign white/black
      const shuffled = [...playerIds].sort(() => Math.random() - 0.5);
      sideMappings = [
        { userId: shuffled[0], side: "white" },
        { userId: shuffled[1], side: "black" }
      ];
    } else if (type === GameType.TRIVIA) {
      // For trivia, players don't need sides, but we'll assign sequential IDs
      sideMappings = playerIds.map((userId, idx) => ({
        userId,
        side: `player${idx + 1}`
      }));
    } else {
      // For TicTacToe: X goes first
      sideMappings = playerIds.map((userId, idx) => ({
        userId,
        side: idx === 0 ? "X" : "O"
      }));
    }
    
    // Create the game record
    const game = await this.prisma.game.create({
      data: {
        sessionId,
        type,
        status: GameStatus.PENDING,
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

  /**
   * Start a game and initialize its state
   */
  async startGame(gameId: string) {
    const game = await this.prisma.game.findUnique({
      where: { id: gameId },
      include: { players: true }
    });

    if (!game) {
      throw new NotFoundException("Game not found");
    }

    if (game.status !== GameStatus.PENDING) {
      throw new BadRequestException("Game already started or completed");
    }

    // Check player count based on game type
    if (game.type === GameType.TRIVIA) {
      if (game.players.length < 2) {
        throw new BadRequestException("Trivia requires at least 2 players");
      }
    } else {
      if (game.players.length !== 2) {
        throw new BadRequestException("Game requires exactly 2 players");
      }
    }

    // Initialize state based on game type
    let state: any = null;
    
    if (game.type === GameType.TICTACTOE) {
      const playerX = game.players.find(p => p.side === "X")?.userId;
      const playerO = game.players.find(p => p.side === "O")?.userId;
      
      if (!playerX || !playerO) {
        throw new BadRequestException("Invalid player configuration");
      }
      
      state = this.ticTacToeService.initializeState(playerX, playerO);
    } else if (game.type === GameType.CHESS) {
      const playerWhite = game.players.find(p => p.side === "white")?.userId;
      const playerBlack = game.players.find(p => p.side === "black")?.userId;
      
      if (!playerWhite || !playerBlack) {
        throw new BadRequestException("Invalid player configuration for chess");
      }
      
      state = this.chessService.initializeState(playerWhite, playerBlack);
    } else if (game.type === GameType.TRIVIA) {
      // Get player IDs
      const playerIds = game.players.map(p => p.userId);
      state = await this.triviaService.initializeState(playerIds);
    }

    // Update game to active with initial state
    const updatedGame = await this.prisma.game.update({
      where: { id: gameId },
      data: {
        status: GameStatus.ACTIVE,
        state: state as any,
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

  /**
   * Get a game by ID with players
   */
  async getGame(gameId: string) {
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
      throw new NotFoundException("Game not found");
    }

    return game;
  }

  /**
   * Cancel a game
   */
  async cancelGame(gameId: string) {
    const game = await this.prisma.game.findUnique({
      where: { id: gameId }
    });

    if (!game) {
      throw new NotFoundException("Game not found");
    }

    if (game.status === GameStatus.COMPLETED) {
      throw new BadRequestException("Cannot cancel a completed game");
    }

    return this.prisma.game.update({
      where: { id: gameId },
      data: {
        status: GameStatus.CANCELED,
        endedAt: new Date()
      }
    });
  }

  /**
   * Get active game for a session
   */
  async getActiveGameForSession(sessionId: string) {
    return this.prisma.game.findFirst({
      where: {
        sessionId,
        status: { in: [GameStatus.PENDING, GameStatus.ACTIVE] }
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
}

