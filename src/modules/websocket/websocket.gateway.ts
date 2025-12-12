import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer
} from "@nestjs/websockets";
import { UseGuards } from "@nestjs/common";
import { Server, Socket } from "socket.io";
import { WsJwtGuard } from "../../common/guards/ws-jwt.guard";
import { MatchmakingService } from "../matchmaking/matchmaking.service";
import { SessionsService } from "../sessions/sessions.service";
import { GamesService } from "../games/games.service";
import { TicTacToeService } from "../games/tictactoe/tictactoe.service";
import { ChessService } from "../games/chess/chess.service";
import { TriviaService } from "../games/trivia/trivia.service";
import { TriviaTimerService } from "../games/trivia/trivia.timer.service";
import { VideoService } from "../video/video.service";
import { WalletService } from "../wallet/wallet.service";
import { ReportsService } from "../reports/reports.service";
import { RoomsService } from "../rooms/rooms.service";
import { v4 as uuidv4 } from "uuid";
import { GameType, RoundStatus } from "@prisma/client";
import { Position, PieceType } from "../games/chess/chess.types";

@WebSocketGateway({
  namespace: "/ws",
  cors: { origin: "*", credentials: true }
})
export class AppGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;
  
  private matchingIntervals = new Map<string, NodeJS.Timeout>();

  // Track voting timers for rooms
  private votingTimers = new Map<string, NodeJS.Timeout>();

  // Track trivia timers
  private triviaTimers = new Map<string, NodeJS.Timeout>();

  constructor(
    private readonly matchmakingService: MatchmakingService,
    private readonly sessionsService: SessionsService,
    private readonly gamesService: GamesService,
    private readonly ticTacToeService: TicTacToeService,
    private readonly chessService: ChessService,
    private readonly triviaService: TriviaService,
    private readonly triviaTimerService: TriviaTimerService,
    private readonly videoService: VideoService,
    private readonly walletService: WalletService,
    private readonly reportsService: ReportsService,
    private readonly roomsService: RoomsService
  ) {}

  handleConnection(client: Socket) {
    // WsJwtGuard will attach user payload to client in message handlers.
    client.emit("connected", { ok: true });
  }

  handleDisconnect(client: Socket) {
    const userId = (client as any).user?.sub;
    if (userId) {
      // Clear any running matching interval
      const interval = this.matchingIntervals.get(userId);
      if (interval) {
        clearInterval(interval);
        this.matchingIntervals.delete(userId);
      }
      this.matchmakingService.leaveQueue(userId);
    }
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage("match.join")
  async handleMatchJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { region: string; language: string; latitude?: number; longitude?: number }
  ) {
    const user = (client as any).user;
    client.join(this.getUserRoom(user.sub));
    
    try {
      const pair = await this.matchmakingService.joinQueue(
        user.sub,
        body.region,
        body.language,
        body.latitude,
        body.longitude
      );
      client.emit("match.queued", { queued: true });
      
      if (pair) {
        // Immediate match found
        console.log(`Immediate match found for user ${user.sub} with ${pair[0].userId === user.sub ? pair[1].userId : pair[0].userId}`);
        await this.handleMatch(pair);
      } else {
        // No immediate match, start periodic checking
        console.log(`No immediate match for user ${user.sub}, starting periodic matching`);
        this.startPeriodicMatching(client, user.sub, body.region, body.language, body.latitude, body.longitude);
      }
    } catch (error: any) {
      console.error("Matchmaking error:", error);
      client.emit("error", { message: error.message || "Matchmaking failed. Please check your subscription and verification status." });
    }
  }

  private async handleMatch(pair: [any, any]) {
    const [a, b] = pair;
    
    // Clear any matching intervals for both users
    const intervalA = this.matchingIntervals.get(a.userId);
    if (intervalA) {
      clearInterval(intervalA);
      this.matchingIntervals.delete(a.userId);
    }
    const intervalB = this.matchingIntervals.get(b.userId);
    if (intervalB) {
      clearInterval(intervalB);
      this.matchingIntervals.delete(b.userId);
    }
    
    const channelName = `session-${uuidv4()}`;
    const session = await this.sessionsService.createSession(a.userId, b.userId, channelName);
    console.log(`Created session ${session.id} for users ${a.userId} and ${b.userId}`);
    
    const tokens = [
      { userId: a.userId, token: this.videoService.buildToken(channelName, a.userId) },
      { userId: b.userId, token: this.videoService.buildToken(channelName, b.userId) }
    ];
    const payloadFor = (recipientId: string) => {
      const peerId = recipientId === a.userId ? b.userId : a.userId;
      const token = tokens.find((t) => t.userId === recipientId)?.token;
      return {
        sessionId: session.id,
        peer: { id: peerId },
        video: { channelName, token: token?.token, expiresAt: token?.expiresAt }
      };
    };
    
    // Emit to both users
    const roomA = this.getUserRoom(a.userId);
    const roomB = this.getUserRoom(b.userId);
    console.log(`Emitting match.matched to rooms ${roomA} and ${roomB}`);
    
    this.server.to(roomA).emit("match.matched", payloadFor(a.userId));
    this.server.to(roomB).emit("match.matched", payloadFor(b.userId));
    this.server.in(roomA).socketsJoin(`session:${session.id}`);
    this.server.in(roomB).socketsJoin(`session:${session.id}`);
  }

  private startPeriodicMatching(client: Socket, userId: string, region: string, language: string, latitude?: number, longitude?: number) {
      // Clear any existing interval for this user
      const existingInterval = this.matchingIntervals.get(userId);
      if (existingInterval) {
        clearInterval(existingInterval);
        this.matchingIntervals.delete(userId);
      }
    
    const checkInterval = setInterval(async () => {
      try {
        // Check if client is still connected
        if (!client.connected) {
          clearInterval(checkInterval);
          this.matchingIntervals.delete(userId);
          return;
        }
        
        // Try to find a match by checking queue again (with distance-based matching)
        const pair = await this.matchmakingService.findMatch(userId, region, language, latitude, longitude);
        if (pair) {
          clearInterval(checkInterval);
          this.matchingIntervals.delete(userId);
          console.log(`[Gateway] Periodic match found for user ${userId} with ${pair[0].userId === userId ? pair[1].userId : pair[0].userId}`);
          await this.handleMatch(pair);
        } else {
          // Log periodic check (but not too frequently)
          const queueKey = `match_queue:${region}:${language}`;
          // This is just for debugging - we can remove the console.log later
        }
      } catch (error) {
        console.error("Periodic matching error:", error);
        clearInterval(checkInterval);
        this.matchingIntervals.delete(userId);
        client.emit("error", { message: "Matchmaking error occurred" });
      }
    }, 2000); // Check every 2 seconds
    
    this.matchingIntervals.set(userId, checkInterval);

    // Clean up interval when client disconnects
    client.once("disconnect", () => {
      clearInterval(checkInterval);
      this.matchingIntervals.delete(userId);
      this.matchmakingService.leaveQueue(userId);
    });
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage("match.leave")
  async handleMatchLeave(@ConnectedSocket() client: Socket) {
    const user = (client as any).user;
    await this.matchmakingService.leaveQueue(user.sub);
    client.emit("match.left", { ok: true });
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage("session.join")
  async handleSessionJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { sessionId: string }
  ) {
    try {
      const user = (client as any).user;
      if (!user || !user.sub) {
        client.emit("error", { message: "Authentication required" });
        return;
      }
      const session = await this.sessionsService.getSession(body.sessionId);
      if (!session) {
        client.emit("error", { message: "Session not found" });
        return;
      }
      if (session.userAId !== user.sub && session.userBId !== user.sub) {
        client.emit("error", { message: "Not authorized for this session" });
        return;
      }
      client.join(`session:${body.sessionId}`);
      const peerId = session.userAId === user.sub ? session.userBId : session.userAId;
      const channelName = session.videoChannelName;
      const token = this.videoService.buildToken(channelName, user.sub);
      client.emit("session.ready", {
        sessionId: session.id,
        peer: { id: peerId },
        video: { channelName, token: token.token, expiresAt: token.expiresAt }
      });
    } catch (error: any) {
      console.error("Error in session.join:", error);
      client.emit("error", { message: error.message || "Failed to join session" });
    }
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage("session.startGame")
  async handleStartGame(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { sessionId: string; gameType: string }
  ) {
    const user = (client as any).user;
    const session = await this.sessionsService.getSession(body.sessionId);
    if (!session || (session.userAId !== user.sub && session.userBId !== user.sub)) {
      client.emit("error", { message: "Session not found or unauthorized" });
      return;
    }
    
    try {
      // Create the game
      const game = await this.gamesService.createGame(
        body.sessionId,
        body.gameType as GameType,
        [session.userAId, session.userBId]
      );
      
      // Start the game (initialize state)
      const startedGame = await this.gamesService.startGame(game.id);
      
      // Join both users to the game room
      this.server.in(`session:${body.sessionId}`).socketsJoin(`game:${game.id}`);
      
      // For trivia, start the game immediately after initialization
      let finalState = startedGame.state;
      if (startedGame.type === GameType.TRIVIA && startedGame.state) {
        const triviaState = await this.triviaService.startGame(startedGame.id, startedGame.state as any);
        // Update display names for players
        const playersWithNames = triviaState.players.map(p => {
          const gamePlayer = startedGame.players.find(gp => gp.userId === p.odUserId);
          return {
            ...p,
            displayName: gamePlayer?.user.displayName || ''
          };
        });
        finalState = {
          ...triviaState,
          players: playersWithNames
        } as any;
        
        // Store state in trivia service
        this.triviaService.setState(startedGame.id, finalState as any);
        
        // Start countdown
        this.startTriviaCountdown(startedGame.id, `session:${body.sessionId}`);
      }
      
      // Emit game started event with full game data
      this.server.to(`session:${body.sessionId}`).emit("game.started", {
        gameId: startedGame.id,
        gameType: startedGame.type,
        state: finalState,
        players: startedGame.players.map(p => ({
          odUserId: p.userId,
          side: p.side,
          displayName: p.user.displayName
        }))
      });
      
      console.log(`[Gateway] Game ${startedGame.id} (${startedGame.type}) started for session ${body.sessionId}`);
    } catch (error: any) {
      console.error("[Gateway] Failed to start game:", error);
      client.emit("error", { message: error.message || "Failed to start game" });
    }
  }

  // ==================== GAME EVENTS ====================

  @UseGuards(WsJwtGuard)
  @SubscribeMessage("game.join")
  async handleGameJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { gameId: string }
  ) {
    const user = (client as any).user;
    
    try {
      const game = await this.gamesService.getGame(body.gameId);
      
      // Verify user is a player in this game
      const isPlayer = game.players.some(p => p.userId === user.sub);
      if (!isPlayer) {
        client.emit("error", { message: "You are not a player in this game" });
        return;
      }
      
      // Join game room
      client.join(`game:${body.gameId}`);
      
      // Send current game state
      client.emit("game.state", {
        gameId: game.id,
        gameType: game.type,
        status: game.status,
        state: game.state,
        players: game.players.map(p => ({
          odUserId: p.userId,
          side: p.side,
          displayName: p.user.displayName
        }))
      });
    } catch (error: any) {
      client.emit("error", { message: error.message || "Failed to join game" });
    }
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage("game.move")
  async handleGameMove(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { gameId: string; cellIndex?: number; from?: Position; to?: Position; promotionPiece?: PieceType }
  ) {
    const user = (client as any).user;
    
    try {
      const game = await this.gamesService.getGame(body.gameId);
      
      // Handle different game types
      if (game.type === GameType.TICTACTOE) {
        if (body.cellIndex === undefined) {
          client.emit("game.error", { message: "Cell index required for TicTacToe" });
          return;
        }
        
        const result = await this.ticTacToeService.makeMove(body.gameId, user.sub, body.cellIndex);
        
        if (!result.success) {
          client.emit("game.error", { message: result.error });
          return;
        }
        
        // Broadcast state update to all players in the game
        this.server.to(`game:${body.gameId}`).emit("game.stateUpdate", {
          gameId: body.gameId,
          state: result.state,
          lastMove: {
            cell: body.cellIndex,
            player: result.state?.currentTurn === "X" ? "O" : "X" // The player who just moved
          }
        });
        
        // Check if game ended (winner is set OR it's a draw)
        if (result.winner !== null || result.isDraw) {
          const winnerPlayer = result.winner 
            ? game.players.find(p => p.userId === result.winner)
            : null;
          
          this.server.to(`game:${body.gameId}`).emit("game.end", {
            gameId: body.gameId,
            winnerId: result.winner,
            winnerName: winnerPlayer?.user.displayName || null,
            isDraw: result.isDraw,
            reason: result.isDraw ? "draw" : "win",
            winningLine: result.winningLine
          });
          
          console.log(`[Gateway] Game ${body.gameId} ended - Winner: ${result.winner || "Draw"}`);
        }
      } else if (game.type === GameType.CHESS) {
        if (!body.from || !body.to) {
          client.emit("game.error", { message: "From and to positions required for Chess" });
          return;
        }
        
        // Get current game state
        const currentState = game.state as any;
        if (!currentState) {
          client.emit("game.error", { message: "Game state not found" });
          return;
        }
        
        // Make the chess move
        const result = this.chessService.makeMove(
          currentState,
          user.sub,
          body.from,
          body.to,
          body.promotionPiece
        );
        
        if (!result.success) {
          client.emit("game.error", { message: result.error });
          return;
        }
        
        // Update game state in database
        await this.prisma.game.update({
          where: { id: body.gameId },
          data: {
            state: result.state as any,
            ...(result.gameEnded ? {
              status: "COMPLETED",
              endedAt: new Date(),
              winnerUserId: result.winner || null
            } : {})
          }
        });
        
        // Broadcast state update
        this.server.to(`game:${body.gameId}`).emit("game.stateUpdate", {
          gameId: body.gameId,
          state: result.state,
          lastMove: result.move ? {
            from: body.from,
            to: body.to,
            notation: result.move.notation,
            piece: result.move.piece
          } : undefined
        });
        
        // Check if game ended
        if (result.gameEnded) {
          const winnerPlayer = result.winner 
            ? game.players.find(p => p.userId === result.winner)
            : null;
          
          this.server.to(`game:${body.gameId}`).emit("game.end", {
            gameId: body.gameId,
            winnerId: result.winner,
            winnerName: winnerPlayer?.user.displayName || null,
            isDraw: result.isDraw,
            reason: result.state?.isCheckmate ? "checkmate" : 
                    result.state?.isStalemate ? "stalemate" :
                    result.state?.drawReason || "game_over"
          });
          
          console.log(`[Gateway] Chess game ${body.gameId} ended - Winner: ${result.winner || "Draw"}`);
        }
      } else if (game.type === GameType.TRIVIA) {
        // Trivia uses trivia.answer event, not game.move
        client.emit("game.error", { message: "Use trivia.answer event for trivia games" });
      } else {
        client.emit("game.error", { message: "Game type not supported yet" });
      }
    } catch (error: any) {
      console.error("[Gateway] Game move error:", error);
      client.emit("game.error", { message: error.message || "Failed to make move" });
    }
  }

  // ==================== TRIVIA EVENTS ====================

  @UseGuards(WsJwtGuard)
  @SubscribeMessage("trivia.answer")
  async handleTriviaAnswer(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { gameId: string; roundId?: string; questionIndex: number; answerIndex: number }
  ) {
    const user = (client as any).user;
    
    try {
      const result = this.triviaService.submitAnswer(
        body.gameId,
        user.sub,
        body.questionIndex,
        body.answerIndex
      );
      
      if (!result.success) {
        client.emit("trivia.error", { message: result.error });
        return;
      }
      
      // Update state in service
      this.triviaService.setState(body.gameId, result.state);
      
      // Notify others that this player answered (without revealing answer)
      const roomKey = body.roundId ? `room:${body.roundId}` : `game:${body.gameId}`;
      this.server.to(roomKey).emit("trivia.playerAnswered", {
        odUserId: user.sub
      });
      
      // If all players answered, end question early
      if (result.allAnswered) {
        const roomKey = body.roundId ? body.roundId : `game:${body.gameId}`;
        await this.endTriviaQuestion(body.gameId, roomKey);
      }
    } catch (error: any) {
      console.error("[Gateway] Trivia answer error:", error);
      client.emit("trivia.error", { message: error.message || "Failed to submit answer" });
    }
  }

  private async startTriviaCountdown(gameId: string, sessionIdOrRoomId: string) {
    let countdown = 3;
    
    const countdownInterval = setInterval(() => {
      const roomKey = sessionIdOrRoomId.startsWith('session:') 
        ? sessionIdOrRoomId 
        : `room:${sessionIdOrRoomId}`;
        
      this.server.to(roomKey).emit("trivia.countdown", {
        secondsRemaining: countdown
      });
      
      countdown--;
      
      if (countdown < 0) {
        clearInterval(countdownInterval);
        this.startTriviaQuestion(gameId, sessionIdOrRoomId);
      }
    }, 1000);
  }

  private async startTriviaQuestion(gameId: string, sessionIdOrRoomId: string) {
    const state = this.triviaService.getState(gameId);
    if (!state) return;
    
    // If still in countdown phase, advance to question
    let currentState = state;
    if (state.phase === 'countdown') {
      currentState = this.triviaService.startQuestion(state);
      this.triviaService.setState(gameId, currentState);
    }
    
    const question = this.triviaService.getCurrentQuestion(currentState);
    if (!question) return;
    
    const roomKey = sessionIdOrRoomId.startsWith('session:') 
      ? sessionIdOrRoomId 
      : `room:${sessionIdOrRoomId}`;
    
    // Send question to all players
    this.server.to(roomKey).emit("trivia.question", {
      questionNumber: currentState.currentQuestionIndex + 1,
      totalQuestions: currentState.questions.length,
      question: question.question,
      answers: question.allAnswers,
      category: question.category,
      difficulty: question.difficulty,
      timeLimit: question.timeLimit
    });
    
    // Start timer
    this.triviaTimerService.startQuestionTimer(
      gameId,
      question.timeLimit,
      (remaining) => {
        this.server.to(roomKey).emit("trivia.tick", { timeRemaining: remaining });
      },
      () => {
        this.endTriviaQuestion(gameId, sessionIdOrRoomId);
      }
    );
  }

  private async endTriviaQuestion(gameId: string, sessionIdOrRoomId: string | undefined) {
    if (!sessionIdOrRoomId) return;
    this.triviaTimerService.clearTimers(gameId);
    
    const state = this.triviaService.getState(gameId);
    if (!state) return;
    
    const endedState = this.triviaService.endQuestion(state);
    this.triviaService.setState(gameId, endedState);
    
    const question = this.triviaService.getCurrentQuestion(endedState);
    if (!question) return;
    
    const correctAnswerIndex = question.allAnswers.findIndex(
      a => a === question.correctAnswer
    );
    
    const roomKey = sessionIdOrRoomId.startsWith('session:') 
      ? sessionIdOrRoomId 
      : `room:${sessionIdOrRoomId}`;
    
    // Send results
    this.server.to(roomKey).emit("trivia.questionResult", {
      correctAnswer: question.correctAnswer,
      correctAnswerIndex,
      results: endedState.currentAnswers.map(answer => ({
        odUserId: answer.odUserId,
        displayName: answer.odUserDisplayName,
        selectedAnswer: answer.selectedAnswer,
        selectedAnswerIndex: answer.selectedAnswerIndex,
        isCorrect: answer.isCorrect,
        pointsEarned: answer.pointsEarned,
        timeToAnswer: answer.timeToAnswer
      })),
      scores: endedState.players
    });
    
    // Update state in database
    await this.prisma.game.update({
      where: { id: gameId },
      data: {
        state: endedState as any
      }
    });
    
    // After delay, either next question or end game
    setTimeout(async () => {
      const currentState = this.triviaService.getState(gameId);
      if (!currentState) return;
      
      if (currentState.currentQuestionIndex >= currentState.questions.length - 1) {
        // Game over
        const finishedState = this.triviaService.endGame(currentState);
        const endResult = this.triviaService.getGameEndResult(finishedState);
        
        await this.prisma.game.update({
          where: { id: gameId },
          data: {
            status: "COMPLETED",
            endedAt: new Date(),
            winnerUserId: endResult.winnerId,
            state: finishedState as any
          }
        });
        
        this.server.to(roomKey).emit("trivia.gameEnd", {
          finalScores: endResult.finalScores,
          winnerId: endResult.winnerId,
          winnerIds: endResult.winnerIds,
          isDraw: endResult.isDraw
        });
        
        // Handle room token payouts if applicable
        if (!sessionIdOrRoomId.startsWith('session:')) {
          // It's a room game
          // Find round by gameId
          const round = await this.prisma.roomRound.findFirst({
            where: { gameId }
          });
          if (round) {
            await this.roomsService.completeRound(
              round.id,
              endResult.winnerId,
              endResult.isDraw
            );
          }
        }
        
        this.triviaService.deleteState(gameId);
      } else {
        // Next question
        const nextState = this.triviaService.advanceToNextQuestion(currentState);
        this.triviaService.setState(gameId, nextState);
        
        // Brief pause, then start next question
        setTimeout(() => {
          this.startTriviaQuestion(gameId, sessionIdOrRoomId);
        }, 2000);
      }
    }, 4000); // 4 second delay between questions
  }
  
  // Prisma instance for direct db access
  private get prisma() {
    return (this.gamesService as any).prisma;
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage("game.forfeit")
  async handleGameForfeit(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { gameId: string }
  ) {
    const user = (client as any).user;
    
    try {
      const game = await this.gamesService.getGame(body.gameId);
      
      if (game.type === GameType.TICTACTOE) {
        const result = await this.ticTacToeService.forfeitGame(body.gameId, user.sub);
        
        const winnerPlayer = game.players.find(p => p.userId === result.winnerId);
        
        this.server.to(`game:${body.gameId}`).emit("game.end", {
          gameId: body.gameId,
          winnerId: result.winnerId,
          winnerName: winnerPlayer?.user.displayName || null,
          isDraw: false,
          reason: "forfeit",
          forfeitedBy: user.sub
        });
        
        console.log(`[Gateway] Game ${body.gameId} forfeited by ${user.sub}`);
      } else if (game.type === GameType.CHESS) {
        // Get current game state
        const currentState = game.state as any;
        if (!currentState) {
          client.emit("game.error", { message: "Game state not found" });
          return;
        }
        
        const result = this.chessService.forfeitGame(currentState, user.sub);
        
        // Update game in database
        await this.prisma.game.update({
          where: { id: body.gameId },
          data: {
            status: "COMPLETED",
            endedAt: new Date(),
            winnerUserId: result.winnerId
          }
        });
        
        const winnerPlayer = game.players.find(p => p.userId === result.winnerId);
        
        this.server.to(`game:${body.gameId}`).emit("game.end", {
          gameId: body.gameId,
          winnerId: result.winnerId,
          winnerName: winnerPlayer?.user.displayName || null,
          isDraw: false,
          reason: "resignation",
          forfeitedBy: user.sub
        });
        
        console.log(`[Gateway] Chess game ${body.gameId} forfeited by ${user.sub}`);
      } else {
        client.emit("game.error", { message: "Game type not supported yet" });
      }
    } catch (error: any) {
      console.error("[Gateway] Game forfeit error:", error);
      client.emit("game.error", { message: error.message || "Failed to forfeit game" });
    }
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage("session.end")
  async handleSessionEnd(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { sessionId: string }
  ) {
    const user = (client as any).user;
    await this.sessionsService.endSession(body.sessionId, user.sub, "USER_LEFT");
    this.server.to(`session:${body.sessionId}`).emit("session.end", { sessionId: body.sessionId });
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage("session.sendGift")
  async handleSendGift(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { sessionId: string; amountTokens: number }
  ) {
    const user = (client as any).user;
    
    try {
      // Get session to find the recipient
      const session = await this.sessionsService.getSession(body.sessionId);
      if (!session) {
        client.emit("error", { message: "Session not found" });
        return;
      }
      
      // Determine recipient (the other user in the session)
      const receiverUserId = session.userAId === user.sub ? session.userBId : session.userAId;
      
      // Validate amount
      if (!body.amountTokens || body.amountTokens <= 0) {
        client.emit("error", { message: "Invalid gift amount" });
        return;
      }
      
      // Perform the actual gift transfer
      const result = await this.walletService.sendGift(
        user.sub,
        receiverUserId,
        body.amountTokens,
        body.sessionId
      );
      
      console.log(`[Gateway] Gift sent: ${user.sub} -> ${receiverUserId}, amount: ${body.amountTokens}`);
      
      // Notify both users
      this.server.to(`session:${body.sessionId}`).emit("session.giftReceived", {
        from: user.sub,
        to: receiverUserId,
        amount: body.amountTokens,
        success: true
      });
      
      // Notify sender of their new balance
      client.emit("wallet.updated", { balance: result.senderBalance });
      
    } catch (error: any) {
      console.error("[Gateway] Gift transfer failed:", error.message);
      client.emit("error", { message: error.message || "Failed to send gift" });
    }
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage("session.report")
  async handleSessionReport(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { sessionId: string; reason: string; comment?: string }
  ) {
    const user = (client as any).user;
    
    try {
      // Get session to find the reported user
      const session = await this.sessionsService.getSession(body.sessionId);
      if (!session) {
        client.emit("error", { message: "Session not found" });
        return;
      }
      
      // Determine reported user (the other user in the session)
      const reportedUserId = session.userAId === user.sub ? session.userBId : session.userAId;
      
      // Create the report in database
      const report = await this.reportsService.createReport(
        user.sub,
        reportedUserId,
        body.reason as any, // Will be converted to enum in service
        body.comment,
        body.sessionId
      );
      
      console.log(`[Gateway] Report created: ${user.sub} reported ${reportedUserId} for ${body.reason}`);
      
      client.emit("session.reportSubmitted", { 
        success: true, 
        reportId: report.id,
        message: "Report submitted successfully. Our team will review it."
      });
      
    } catch (error: any) {
      console.error("[Gateway] Report creation failed:", error.message);
      client.emit("error", { message: error.message || "Failed to submit report" });
    }
  }

  // ==================== ROOM EVENTS ====================

  @UseGuards(WsJwtGuard)
  @SubscribeMessage("room.join")
  async handleRoomJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { roomId: string; password?: string }
  ) {
    const user = (client as any).user;
    
    try {
      const room = await this.roomsService.joinRoom(user.sub, body.roomId, body.password);
      
      // Join socket room
      client.join(`room:${body.roomId}`);
      
      // Notify all room participants
      this.server.to(`room:${body.roomId}`).emit("room.userJoined", {
        userId: user.sub,
        room
      });
      
      client.emit("room.joined", { room });
    } catch (error: any) {
      client.emit("room.error", { message: error.message || "Failed to join room" });
    }
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage("room.leave")
  async handleRoomLeave(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { roomId: string }
  ) {
    const user = (client as any).user;
    
    try {
      const result = await this.roomsService.leaveRoom(user.sub, body.roomId);
      
      client.leave(`room:${body.roomId}`);
      
      if (result.roomEnded) {
        this.server.to(`room:${body.roomId}`).emit("room.ended", { roomId: body.roomId });
      } else {
        this.server.to(`room:${body.roomId}`).emit("room.userLeft", { userId: user.sub });
      }
      
      client.emit("room.left", { success: true });
    } catch (error: any) {
      client.emit("room.error", { message: error.message || "Failed to leave room" });
    }
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage("room.startRound")
  async handleStartRound(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { roomId: string; entryFeeTokens: number }
  ) {
    const user = (client as any).user;
    
    try {
      const round = await this.roomsService.startRound(body.roomId, user.sub, body.entryFeeTokens);
      
      this.server.to(`room:${body.roomId}`).emit("room.roundStarted", {
        round,
        entryFeeTokens: body.entryFeeTokens
      });
    } catch (error: any) {
      client.emit("room.error", { message: error.message || "Failed to start round" });
    }
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage("room.joinRound")
  async handleJoinRound(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { roomId: string; roundId: string }
  ) {
    const user = (client as any).user;
    
    try {
      const round = await this.roomsService.joinRound(body.roomId, body.roundId, user.sub);
      
      // Broadcast updated round to all
      this.server.to(`room:${body.roomId}`).emit("room.roundUpdated", { round });
      
      // Update user's wallet balance
      const wallet = await this.walletService.getWallet(user.sub);
      client.emit("wallet.updated", { balance: wallet?.balanceTokens || 0 });
    } catch (error: any) {
      client.emit("room.error", { message: error.message || "Failed to join round" });
    }
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage("room.startVoting")
  async handleStartVoting(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { roomId: string; roundId: string }
  ) {
    const user = (client as any).user;
    
    try {
      const result = await this.roomsService.startVoting(body.roomId, body.roundId, user.sub);
      
      // Notify all participants
      this.server.to(`room:${body.roomId}`).emit("room.votingStarted", {
        roundId: body.roundId,
        votingEndsAt: result.votingEndsAt
      });
      
      // Set timer to auto-finalize voting
      const timer = setTimeout(async () => {
        try {
          const gameResult = await this.roomsService.finalizeVotingAndStartGame(body.roundId);
          if (gameResult) {
            this.server.to(`room:${body.roomId}`).emit("room.gameStarting", {
              roundId: body.roundId,
              gameType: gameResult.gameType,
              gameId: gameResult.gameId,
              gameState: gameResult.gameState,
              players: gameResult.players
            });
            
            // Start trivia countdown if trivia game
            if (gameResult.gameType === GameType.TRIVIA && gameResult.gameId) {
              this.startTriviaCountdown(gameResult.gameId, body.roomId);
            }
          }
        } catch (err) {
          console.error("[Gateway] Failed to finalize voting:", err);
        }
        this.votingTimers.delete(body.roundId);
      }, 20000); // 20 seconds
      
      this.votingTimers.set(body.roundId, timer);
    } catch (error: any) {
      client.emit("room.error", { message: error.message || "Failed to start voting" });
    }
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage("room.vote")
  async handleVote(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { roomId: string; roundId: string; gameType: GameType }
  ) {
    const user = (client as any).user;
    
    try {
      const results = await this.roomsService.voteForGame(body.roundId, user.sub, body.gameType);
      
      // Broadcast vote results to all
      this.server.to(`room:${body.roomId}`).emit("room.voteUpdate", {
        roundId: body.roundId,
        results
      });
    } catch (error: any) {
      client.emit("room.error", { message: error.message || "Failed to vote" });
    }
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage("room.gameMove")
  async handleRoomGameMove(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { roomId: string; roundId: string; cellIndex?: number; from?: Position; to?: Position; promotionPiece?: PieceType }
  ) {
    const user = (client as any).user;
    
    try {
      // Get round to find the game ID
      const round = await this.roomsService.getRoundDetails(body.roundId);
      
      if (!round.gameId) {
        client.emit("room.error", { message: "No game in progress" });
        return;
      }
      
      // Get the game to determine type
      const game = await this.gamesService.getGame(round.gameId);
      
      if (game.type === GameType.TICTACTOE) {
        if (body.cellIndex === undefined) {
          client.emit("room.error", { message: "Cell index required for TicTacToe" });
          return;
        }
        
        // Make the move using TicTacToe service
        const result = await this.ticTacToeService.makeMove(round.gameId, user.sub, body.cellIndex);
        
        if (!result.success) {
          client.emit("room.error", { message: result.error });
          return;
        }
        
        // Broadcast state update
        this.server.to(`room:${body.roomId}`).emit("room.gameStateUpdate", {
          roundId: body.roundId,
          state: result.state,
          lastMove: { cell: body.cellIndex }
        });
        
        // Check if game ended (winner is set OR it's a draw)
        if (result.winner !== null || result.isDraw) {
          const payout = await this.roomsService.completeRound(
            body.roundId,
            result.winner || null,
            result.isDraw || false
          );
          
          this.server.to(`room:${body.roomId}`).emit("room.roundEnded", {
            roundId: body.roundId,
            winnerId: result.winner,
            isDraw: result.isDraw,
            winningLine: result.winningLine,
            payout: payout.payout
          });
          
          // Update winner's wallet
          if (result.winner) {
            const winnerWallet = await this.walletService.getWallet(result.winner);
            // Find the winner's socket and emit wallet update
            const sockets = await this.server.in(`room:${body.roomId}`).fetchSockets();
            for (const s of sockets) {
              if ((s as any).user?.sub === result.winner) {
                s.emit("wallet.updated", { balance: winnerWallet?.balanceTokens || 0 });
              }
            }
          }
        }
      } else if (game.type === GameType.CHESS) {
        if (!body.from || !body.to) {
          client.emit("room.error", { message: "From and to positions required for Chess" });
          return;
        }
        
        // Get current game state
        const currentState = game.state as any;
        if (!currentState) {
          client.emit("room.error", { message: "Game state not found" });
          return;
        }
        
        // Make the chess move
        const result = this.chessService.makeMove(
          currentState,
          user.sub,
          body.from,
          body.to,
          body.promotionPiece
        );
        
        if (!result.success) {
          client.emit("room.error", { message: result.error });
          return;
        }
        
        // Update game state in database
        await this.prisma.game.update({
          where: { id: round.gameId },
          data: {
            state: result.state as any,
            ...(result.gameEnded ? {
              status: "COMPLETED",
              endedAt: new Date(),
              winnerUserId: result.winner || null
            } : {})
          }
        });
        
        // Broadcast state update
        this.server.to(`room:${body.roomId}`).emit("room.gameStateUpdate", {
          roundId: body.roundId,
          state: result.state,
          lastMove: result.move ? {
            from: body.from,
            to: body.to,
            notation: result.move.notation
          } : undefined
        });
        
        // Check if game ended
        if (result.gameEnded) {
          const payout = await this.roomsService.completeRound(
            body.roundId,
            result.winner || null,
            result.isDraw || false
          );
          
          this.server.to(`room:${body.roomId}`).emit("room.roundEnded", {
            roundId: body.roundId,
            winnerId: result.winner,
            isDraw: result.isDraw,
            reason: result.state?.isCheckmate ? "checkmate" : 
                    result.state?.isStalemate ? "stalemate" :
                    result.state?.drawReason || "game_over",
            payout: payout.payout
          });
          
          // Update winner's wallet
          if (result.winner) {
            const winnerWallet = await this.walletService.getWallet(result.winner);
            const sockets = await this.server.in(`room:${body.roomId}`).fetchSockets();
            for (const s of sockets) {
              if ((s as any).user?.sub === result.winner) {
                s.emit("wallet.updated", { balance: winnerWallet?.balanceTokens || 0 });
              }
            }
          }
        }
      } else {
        client.emit("room.error", { message: "Game type not supported" });
      }
    } catch (error: any) {
      console.error("[Gateway] Room game move error:", error);
      client.emit("room.error", { message: error.message || "Failed to make move" });
    }
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage("room.getState")
  async handleGetRoomState(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { roomId: string }
  ) {
    try {
      const room = await this.roomsService.getRoomDetails(body.roomId);
      client.emit("room.state", { room });
    } catch (error: any) {
      client.emit("room.error", { message: error.message || "Failed to get room state" });
    }
  }

  private getUserRoom(userId: string) {
    return `user:${userId}`;
  }
}

