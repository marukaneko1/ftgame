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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const common_1 = require("@nestjs/common");
const socket_io_1 = require("socket.io");
const ws_jwt_guard_1 = require("../../common/guards/ws-jwt.guard");
const matchmaking_service_1 = require("../matchmaking/matchmaking.service");
const sessions_service_1 = require("../sessions/sessions.service");
const games_service_1 = require("../games/games.service");
const tictactoe_service_1 = require("../games/tictactoe/tictactoe.service");
const chess_service_1 = require("../games/chess/chess.service");
const trivia_service_1 = require("../games/trivia/trivia.service");
const trivia_timer_service_1 = require("../games/trivia/trivia.timer.service");
const video_service_1 = require("../video/video.service");
const wallet_service_1 = require("../wallet/wallet.service");
const reports_service_1 = require("../reports/reports.service");
const rooms_service_1 = require("../rooms/rooms.service");
const uuid_1 = require("uuid");
const client_1 = require("@prisma/client");
let AppGateway = class AppGateway {
    matchmakingService;
    sessionsService;
    gamesService;
    ticTacToeService;
    chessService;
    triviaService;
    triviaTimerService;
    videoService;
    walletService;
    reportsService;
    roomsService;
    server;
    matchingIntervals = new Map();
    votingTimers = new Map();
    triviaTimers = new Map();
    constructor(matchmakingService, sessionsService, gamesService, ticTacToeService, chessService, triviaService, triviaTimerService, videoService, walletService, reportsService, roomsService) {
        this.matchmakingService = matchmakingService;
        this.sessionsService = sessionsService;
        this.gamesService = gamesService;
        this.ticTacToeService = ticTacToeService;
        this.chessService = chessService;
        this.triviaService = triviaService;
        this.triviaTimerService = triviaTimerService;
        this.videoService = videoService;
        this.walletService = walletService;
        this.reportsService = reportsService;
        this.roomsService = roomsService;
    }
    handleConnection(client) {
        client.emit("connected", { ok: true });
    }
    handleDisconnect(client) {
        const userId = client.user?.sub;
        if (userId) {
            const interval = this.matchingIntervals.get(userId);
            if (interval) {
                clearInterval(interval);
                this.matchingIntervals.delete(userId);
            }
            this.matchmakingService.leaveQueue(userId);
        }
    }
    async handleMatchJoin(client, body) {
        const user = client.user;
        client.join(this.getUserRoom(user.sub));
        try {
            const pair = await this.matchmakingService.joinQueue(user.sub, body.region, body.language, body.latitude, body.longitude);
            client.emit("match.queued", { queued: true });
            if (pair) {
                console.log(`Immediate match found for user ${user.sub} with ${pair[0].userId === user.sub ? pair[1].userId : pair[0].userId}`);
                await this.handleMatch(pair);
            }
            else {
                console.log(`No immediate match for user ${user.sub}, starting periodic matching`);
                this.startPeriodicMatching(client, user.sub, body.region, body.language, body.latitude, body.longitude);
            }
        }
        catch (error) {
            console.error("Matchmaking error:", error);
            client.emit("error", { message: error.message || "Matchmaking failed. Please check your subscription and verification status." });
        }
    }
    async handleMatch(pair) {
        const [a, b] = pair;
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
        const channelName = `session-${(0, uuid_1.v4)()}`;
        const session = await this.sessionsService.createSession(a.userId, b.userId, channelName);
        console.log(`Created session ${session.id} for users ${a.userId} and ${b.userId}`);
        const tokens = [
            { userId: a.userId, token: this.videoService.buildToken(channelName, a.userId) },
            { userId: b.userId, token: this.videoService.buildToken(channelName, b.userId) }
        ];
        const payloadFor = (recipientId) => {
            const peerId = recipientId === a.userId ? b.userId : a.userId;
            const token = tokens.find((t) => t.userId === recipientId)?.token;
            return {
                sessionId: session.id,
                peer: { id: peerId },
                video: { channelName, token: token?.token, expiresAt: token?.expiresAt }
            };
        };
        const roomA = this.getUserRoom(a.userId);
        const roomB = this.getUserRoom(b.userId);
        console.log(`Emitting match.matched to rooms ${roomA} and ${roomB}`);
        this.server.to(roomA).emit("match.matched", payloadFor(a.userId));
        this.server.to(roomB).emit("match.matched", payloadFor(b.userId));
        this.server.in(roomA).socketsJoin(`session:${session.id}`);
        this.server.in(roomB).socketsJoin(`session:${session.id}`);
    }
    startPeriodicMatching(client, userId, region, language, latitude, longitude) {
        const existingInterval = this.matchingIntervals.get(userId);
        if (existingInterval) {
            clearInterval(existingInterval);
            this.matchingIntervals.delete(userId);
        }
        const checkInterval = setInterval(async () => {
            try {
                if (!client.connected) {
                    clearInterval(checkInterval);
                    this.matchingIntervals.delete(userId);
                    return;
                }
                const pair = await this.matchmakingService.findMatch(userId, region, language, latitude, longitude);
                if (pair) {
                    clearInterval(checkInterval);
                    this.matchingIntervals.delete(userId);
                    console.log(`[Gateway] Periodic match found for user ${userId} with ${pair[0].userId === userId ? pair[1].userId : pair[0].userId}`);
                    await this.handleMatch(pair);
                }
                else {
                    const queueKey = `match_queue:${region}:${language}`;
                }
            }
            catch (error) {
                console.error("Periodic matching error:", error);
                clearInterval(checkInterval);
                this.matchingIntervals.delete(userId);
                client.emit("error", { message: "Matchmaking error occurred" });
            }
        }, 2000);
        this.matchingIntervals.set(userId, checkInterval);
        client.once("disconnect", () => {
            clearInterval(checkInterval);
            this.matchingIntervals.delete(userId);
            this.matchmakingService.leaveQueue(userId);
        });
    }
    async handleMatchLeave(client) {
        const user = client.user;
        await this.matchmakingService.leaveQueue(user.sub);
        client.emit("match.left", { ok: true });
    }
    async handleSessionJoin(client, body) {
        try {
            const user = client.user;
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
        }
        catch (error) {
            console.error("Error in session.join:", error);
            client.emit("error", { message: error.message || "Failed to join session" });
        }
    }
    async handleStartGame(client, body) {
        const user = client.user;
        const session = await this.sessionsService.getSession(body.sessionId);
        if (!session || (session.userAId !== user.sub && session.userBId !== user.sub)) {
            client.emit("error", { message: "Session not found or unauthorized" });
            return;
        }
        try {
            const game = await this.gamesService.createGame(body.sessionId, body.gameType, [session.userAId, session.userBId]);
            const startedGame = await this.gamesService.startGame(game.id);
            this.server.in(`session:${body.sessionId}`).socketsJoin(`game:${game.id}`);
            let finalState = startedGame.state;
            if (startedGame.type === client_1.GameType.TRIVIA && startedGame.state) {
                const triviaState = await this.triviaService.startGame(startedGame.id, startedGame.state);
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
                };
                this.triviaService.setState(startedGame.id, finalState);
                this.startTriviaCountdown(startedGame.id, `session:${body.sessionId}`);
            }
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
        }
        catch (error) {
            console.error("[Gateway] Failed to start game:", error);
            client.emit("error", { message: error.message || "Failed to start game" });
        }
    }
    async handleGameJoin(client, body) {
        const user = client.user;
        try {
            const game = await this.gamesService.getGame(body.gameId);
            const isPlayer = game.players.some(p => p.userId === user.sub);
            if (!isPlayer) {
                client.emit("error", { message: "You are not a player in this game" });
                return;
            }
            client.join(`game:${body.gameId}`);
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
        }
        catch (error) {
            client.emit("error", { message: error.message || "Failed to join game" });
        }
    }
    async handleGameMove(client, body) {
        const user = client.user;
        try {
            const game = await this.gamesService.getGame(body.gameId);
            if (game.type === client_1.GameType.TICTACTOE) {
                if (body.cellIndex === undefined) {
                    client.emit("game.error", { message: "Cell index required for TicTacToe" });
                    return;
                }
                const result = await this.ticTacToeService.makeMove(body.gameId, user.sub, body.cellIndex);
                if (!result.success) {
                    client.emit("game.error", { message: result.error });
                    return;
                }
                this.server.to(`game:${body.gameId}`).emit("game.stateUpdate", {
                    gameId: body.gameId,
                    state: result.state,
                    lastMove: {
                        cell: body.cellIndex,
                        player: result.state?.currentTurn === "X" ? "O" : "X"
                    }
                });
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
            }
            else if (game.type === client_1.GameType.CHESS) {
                if (!body.from || !body.to) {
                    client.emit("game.error", { message: "From and to positions required for Chess" });
                    return;
                }
                const currentState = game.state;
                if (!currentState) {
                    client.emit("game.error", { message: "Game state not found" });
                    return;
                }
                const result = this.chessService.makeMove(currentState, user.sub, body.from, body.to, body.promotionPiece);
                if (!result.success) {
                    client.emit("game.error", { message: result.error });
                    return;
                }
                await this.prisma.game.update({
                    where: { id: body.gameId },
                    data: {
                        state: result.state,
                        ...(result.gameEnded ? {
                            status: "COMPLETED",
                            endedAt: new Date(),
                            winnerUserId: result.winner || null
                        } : {})
                    }
                });
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
            }
            else if (game.type === client_1.GameType.TRIVIA) {
                client.emit("game.error", { message: "Use trivia.answer event for trivia games" });
            }
            else {
                client.emit("game.error", { message: "Game type not supported yet" });
            }
        }
        catch (error) {
            console.error("[Gateway] Game move error:", error);
            client.emit("game.error", { message: error.message || "Failed to make move" });
        }
    }
    async handleTriviaAnswer(client, body) {
        const user = client.user;
        try {
            const result = this.triviaService.submitAnswer(body.gameId, user.sub, body.questionIndex, body.answerIndex);
            if (!result.success) {
                client.emit("trivia.error", { message: result.error });
                return;
            }
            this.triviaService.setState(body.gameId, result.state);
            const roomKey = body.roundId ? `room:${body.roundId}` : `game:${body.gameId}`;
            this.server.to(roomKey).emit("trivia.playerAnswered", {
                odUserId: user.sub
            });
            if (result.allAnswered) {
                const roomKey = body.roundId ? body.roundId : `game:${body.gameId}`;
                await this.endTriviaQuestion(body.gameId, roomKey);
            }
        }
        catch (error) {
            console.error("[Gateway] Trivia answer error:", error);
            client.emit("trivia.error", { message: error.message || "Failed to submit answer" });
        }
    }
    async startTriviaCountdown(gameId, sessionIdOrRoomId) {
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
    async startTriviaQuestion(gameId, sessionIdOrRoomId) {
        const state = this.triviaService.getState(gameId);
        if (!state)
            return;
        let currentState = state;
        if (state.phase === 'countdown') {
            currentState = this.triviaService.startQuestion(state);
            this.triviaService.setState(gameId, currentState);
        }
        const question = this.triviaService.getCurrentQuestion(currentState);
        if (!question)
            return;
        const roomKey = sessionIdOrRoomId.startsWith('session:')
            ? sessionIdOrRoomId
            : `room:${sessionIdOrRoomId}`;
        this.server.to(roomKey).emit("trivia.question", {
            questionNumber: currentState.currentQuestionIndex + 1,
            totalQuestions: currentState.questions.length,
            question: question.question,
            answers: question.allAnswers,
            category: question.category,
            difficulty: question.difficulty,
            timeLimit: question.timeLimit
        });
        this.triviaTimerService.startQuestionTimer(gameId, question.timeLimit, (remaining) => {
            this.server.to(roomKey).emit("trivia.tick", { timeRemaining: remaining });
        }, () => {
            this.endTriviaQuestion(gameId, sessionIdOrRoomId);
        });
    }
    async endTriviaQuestion(gameId, sessionIdOrRoomId) {
        if (!sessionIdOrRoomId)
            return;
        this.triviaTimerService.clearTimers(gameId);
        const state = this.triviaService.getState(gameId);
        if (!state)
            return;
        const endedState = this.triviaService.endQuestion(state);
        this.triviaService.setState(gameId, endedState);
        const question = this.triviaService.getCurrentQuestion(endedState);
        if (!question)
            return;
        const correctAnswerIndex = question.allAnswers.findIndex(a => a === question.correctAnswer);
        const roomKey = sessionIdOrRoomId.startsWith('session:')
            ? sessionIdOrRoomId
            : `room:${sessionIdOrRoomId}`;
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
        await this.prisma.game.update({
            where: { id: gameId },
            data: {
                state: endedState
            }
        });
        setTimeout(async () => {
            const currentState = this.triviaService.getState(gameId);
            if (!currentState)
                return;
            if (currentState.currentQuestionIndex >= currentState.questions.length - 1) {
                const finishedState = this.triviaService.endGame(currentState);
                const endResult = this.triviaService.getGameEndResult(finishedState);
                await this.prisma.game.update({
                    where: { id: gameId },
                    data: {
                        status: "COMPLETED",
                        endedAt: new Date(),
                        winnerUserId: endResult.winnerId,
                        state: finishedState
                    }
                });
                this.server.to(roomKey).emit("trivia.gameEnd", {
                    finalScores: endResult.finalScores,
                    winnerId: endResult.winnerId,
                    winnerIds: endResult.winnerIds,
                    isDraw: endResult.isDraw
                });
                if (!sessionIdOrRoomId.startsWith('session:')) {
                    const round = await this.prisma.roomRound.findFirst({
                        where: { gameId }
                    });
                    if (round) {
                        await this.roomsService.completeRound(round.id, endResult.winnerId, endResult.isDraw);
                    }
                }
                this.triviaService.deleteState(gameId);
            }
            else {
                const nextState = this.triviaService.advanceToNextQuestion(currentState);
                this.triviaService.setState(gameId, nextState);
                setTimeout(() => {
                    this.startTriviaQuestion(gameId, sessionIdOrRoomId);
                }, 2000);
            }
        }, 4000);
    }
    get prisma() {
        return this.gamesService.prisma;
    }
    async handleGameForfeit(client, body) {
        const user = client.user;
        try {
            const game = await this.gamesService.getGame(body.gameId);
            if (game.type === client_1.GameType.TICTACTOE) {
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
            }
            else if (game.type === client_1.GameType.CHESS) {
                const currentState = game.state;
                if (!currentState) {
                    client.emit("game.error", { message: "Game state not found" });
                    return;
                }
                const result = this.chessService.forfeitGame(currentState, user.sub);
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
            }
            else {
                client.emit("game.error", { message: "Game type not supported yet" });
            }
        }
        catch (error) {
            console.error("[Gateway] Game forfeit error:", error);
            client.emit("game.error", { message: error.message || "Failed to forfeit game" });
        }
    }
    async handleSessionEnd(client, body) {
        const user = client.user;
        await this.sessionsService.endSession(body.sessionId, user.sub, "USER_LEFT");
        this.server.to(`session:${body.sessionId}`).emit("session.end", { sessionId: body.sessionId });
    }
    async handleSendGift(client, body) {
        const user = client.user;
        try {
            const session = await this.sessionsService.getSession(body.sessionId);
            if (!session) {
                client.emit("error", { message: "Session not found" });
                return;
            }
            const receiverUserId = session.userAId === user.sub ? session.userBId : session.userAId;
            if (!body.amountTokens || body.amountTokens <= 0) {
                client.emit("error", { message: "Invalid gift amount" });
                return;
            }
            const result = await this.walletService.sendGift(user.sub, receiverUserId, body.amountTokens, body.sessionId);
            console.log(`[Gateway] Gift sent: ${user.sub} -> ${receiverUserId}, amount: ${body.amountTokens}`);
            this.server.to(`session:${body.sessionId}`).emit("session.giftReceived", {
                from: user.sub,
                to: receiverUserId,
                amount: body.amountTokens,
                success: true
            });
            client.emit("wallet.updated", { balance: result.senderBalance });
        }
        catch (error) {
            console.error("[Gateway] Gift transfer failed:", error.message);
            client.emit("error", { message: error.message || "Failed to send gift" });
        }
    }
    async handleSessionReport(client, body) {
        const user = client.user;
        try {
            const session = await this.sessionsService.getSession(body.sessionId);
            if (!session) {
                client.emit("error", { message: "Session not found" });
                return;
            }
            const reportedUserId = session.userAId === user.sub ? session.userBId : session.userAId;
            const report = await this.reportsService.createReport(user.sub, reportedUserId, body.reason, body.comment, body.sessionId);
            console.log(`[Gateway] Report created: ${user.sub} reported ${reportedUserId} for ${body.reason}`);
            client.emit("session.reportSubmitted", {
                success: true,
                reportId: report.id,
                message: "Report submitted successfully. Our team will review it."
            });
        }
        catch (error) {
            console.error("[Gateway] Report creation failed:", error.message);
            client.emit("error", { message: error.message || "Failed to submit report" });
        }
    }
    async handleRoomJoin(client, body) {
        const user = client.user;
        try {
            const room = await this.roomsService.joinRoom(user.sub, body.roomId, body.password);
            client.join(`room:${body.roomId}`);
            this.server.to(`room:${body.roomId}`).emit("room.userJoined", {
                userId: user.sub,
                room
            });
            client.emit("room.joined", { room });
        }
        catch (error) {
            client.emit("room.error", { message: error.message || "Failed to join room" });
        }
    }
    async handleRoomLeave(client, body) {
        const user = client.user;
        try {
            const result = await this.roomsService.leaveRoom(user.sub, body.roomId);
            client.leave(`room:${body.roomId}`);
            if (result.roomEnded) {
                this.server.to(`room:${body.roomId}`).emit("room.ended", { roomId: body.roomId });
            }
            else {
                this.server.to(`room:${body.roomId}`).emit("room.userLeft", { userId: user.sub });
            }
            client.emit("room.left", { success: true });
        }
        catch (error) {
            client.emit("room.error", { message: error.message || "Failed to leave room" });
        }
    }
    async handleStartRound(client, body) {
        const user = client.user;
        try {
            const round = await this.roomsService.startRound(body.roomId, user.sub, body.entryFeeTokens);
            this.server.to(`room:${body.roomId}`).emit("room.roundStarted", {
                round,
                entryFeeTokens: body.entryFeeTokens
            });
        }
        catch (error) {
            client.emit("room.error", { message: error.message || "Failed to start round" });
        }
    }
    async handleJoinRound(client, body) {
        const user = client.user;
        try {
            const round = await this.roomsService.joinRound(body.roomId, body.roundId, user.sub);
            this.server.to(`room:${body.roomId}`).emit("room.roundUpdated", { round });
            const wallet = await this.walletService.getWallet(user.sub);
            client.emit("wallet.updated", { balance: wallet?.balanceTokens || 0 });
        }
        catch (error) {
            client.emit("room.error", { message: error.message || "Failed to join round" });
        }
    }
    async handleStartVoting(client, body) {
        const user = client.user;
        try {
            const result = await this.roomsService.startVoting(body.roomId, body.roundId, user.sub);
            this.server.to(`room:${body.roomId}`).emit("room.votingStarted", {
                roundId: body.roundId,
                votingEndsAt: result.votingEndsAt
            });
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
                        if (gameResult.gameType === client_1.GameType.TRIVIA && gameResult.gameId) {
                            this.startTriviaCountdown(gameResult.gameId, body.roomId);
                        }
                    }
                }
                catch (err) {
                    console.error("[Gateway] Failed to finalize voting:", err);
                }
                this.votingTimers.delete(body.roundId);
            }, 20000);
            this.votingTimers.set(body.roundId, timer);
        }
        catch (error) {
            client.emit("room.error", { message: error.message || "Failed to start voting" });
        }
    }
    async handleVote(client, body) {
        const user = client.user;
        try {
            const results = await this.roomsService.voteForGame(body.roundId, user.sub, body.gameType);
            this.server.to(`room:${body.roomId}`).emit("room.voteUpdate", {
                roundId: body.roundId,
                results
            });
        }
        catch (error) {
            client.emit("room.error", { message: error.message || "Failed to vote" });
        }
    }
    async handleRoomGameMove(client, body) {
        const user = client.user;
        try {
            const round = await this.roomsService.getRoundDetails(body.roundId);
            if (!round.gameId) {
                client.emit("room.error", { message: "No game in progress" });
                return;
            }
            const game = await this.gamesService.getGame(round.gameId);
            if (game.type === client_1.GameType.TICTACTOE) {
                if (body.cellIndex === undefined) {
                    client.emit("room.error", { message: "Cell index required for TicTacToe" });
                    return;
                }
                const result = await this.ticTacToeService.makeMove(round.gameId, user.sub, body.cellIndex);
                if (!result.success) {
                    client.emit("room.error", { message: result.error });
                    return;
                }
                this.server.to(`room:${body.roomId}`).emit("room.gameStateUpdate", {
                    roundId: body.roundId,
                    state: result.state,
                    lastMove: { cell: body.cellIndex }
                });
                if (result.winner !== null || result.isDraw) {
                    const payout = await this.roomsService.completeRound(body.roundId, result.winner || null, result.isDraw || false);
                    this.server.to(`room:${body.roomId}`).emit("room.roundEnded", {
                        roundId: body.roundId,
                        winnerId: result.winner,
                        isDraw: result.isDraw,
                        winningLine: result.winningLine,
                        payout: payout.payout
                    });
                    if (result.winner) {
                        const winnerWallet = await this.walletService.getWallet(result.winner);
                        const sockets = await this.server.in(`room:${body.roomId}`).fetchSockets();
                        for (const s of sockets) {
                            if (s.user?.sub === result.winner) {
                                s.emit("wallet.updated", { balance: winnerWallet?.balanceTokens || 0 });
                            }
                        }
                    }
                }
            }
            else if (game.type === client_1.GameType.CHESS) {
                if (!body.from || !body.to) {
                    client.emit("room.error", { message: "From and to positions required for Chess" });
                    return;
                }
                const currentState = game.state;
                if (!currentState) {
                    client.emit("room.error", { message: "Game state not found" });
                    return;
                }
                const result = this.chessService.makeMove(currentState, user.sub, body.from, body.to, body.promotionPiece);
                if (!result.success) {
                    client.emit("room.error", { message: result.error });
                    return;
                }
                await this.prisma.game.update({
                    where: { id: round.gameId },
                    data: {
                        state: result.state,
                        ...(result.gameEnded ? {
                            status: "COMPLETED",
                            endedAt: new Date(),
                            winnerUserId: result.winner || null
                        } : {})
                    }
                });
                this.server.to(`room:${body.roomId}`).emit("room.gameStateUpdate", {
                    roundId: body.roundId,
                    state: result.state,
                    lastMove: result.move ? {
                        from: body.from,
                        to: body.to,
                        notation: result.move.notation
                    } : undefined
                });
                if (result.gameEnded) {
                    const payout = await this.roomsService.completeRound(body.roundId, result.winner || null, result.isDraw || false);
                    this.server.to(`room:${body.roomId}`).emit("room.roundEnded", {
                        roundId: body.roundId,
                        winnerId: result.winner,
                        isDraw: result.isDraw,
                        reason: result.state?.isCheckmate ? "checkmate" :
                            result.state?.isStalemate ? "stalemate" :
                                result.state?.drawReason || "game_over",
                        payout: payout.payout
                    });
                    if (result.winner) {
                        const winnerWallet = await this.walletService.getWallet(result.winner);
                        const sockets = await this.server.in(`room:${body.roomId}`).fetchSockets();
                        for (const s of sockets) {
                            if (s.user?.sub === result.winner) {
                                s.emit("wallet.updated", { balance: winnerWallet?.balanceTokens || 0 });
                            }
                        }
                    }
                }
            }
            else {
                client.emit("room.error", { message: "Game type not supported" });
            }
        }
        catch (error) {
            console.error("[Gateway] Room game move error:", error);
            client.emit("room.error", { message: error.message || "Failed to make move" });
        }
    }
    async handleGetRoomState(client, body) {
        try {
            const room = await this.roomsService.getRoomDetails(body.roomId);
            client.emit("room.state", { room });
        }
        catch (error) {
            client.emit("room.error", { message: error.message || "Failed to get room state" });
        }
    }
    getUserRoom(userId) {
        return `user:${userId}`;
    }
};
exports.AppGateway = AppGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], AppGateway.prototype, "server", void 0);
__decorate([
    (0, common_1.UseGuards)(ws_jwt_guard_1.WsJwtGuard),
    (0, websockets_1.SubscribeMessage)("match.join"),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], AppGateway.prototype, "handleMatchJoin", null);
__decorate([
    (0, common_1.UseGuards)(ws_jwt_guard_1.WsJwtGuard),
    (0, websockets_1.SubscribeMessage)("match.leave"),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket]),
    __metadata("design:returntype", Promise)
], AppGateway.prototype, "handleMatchLeave", null);
__decorate([
    (0, common_1.UseGuards)(ws_jwt_guard_1.WsJwtGuard),
    (0, websockets_1.SubscribeMessage)("session.join"),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], AppGateway.prototype, "handleSessionJoin", null);
__decorate([
    (0, common_1.UseGuards)(ws_jwt_guard_1.WsJwtGuard),
    (0, websockets_1.SubscribeMessage)("session.startGame"),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], AppGateway.prototype, "handleStartGame", null);
__decorate([
    (0, common_1.UseGuards)(ws_jwt_guard_1.WsJwtGuard),
    (0, websockets_1.SubscribeMessage)("game.join"),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], AppGateway.prototype, "handleGameJoin", null);
__decorate([
    (0, common_1.UseGuards)(ws_jwt_guard_1.WsJwtGuard),
    (0, websockets_1.SubscribeMessage)("game.move"),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], AppGateway.prototype, "handleGameMove", null);
__decorate([
    (0, common_1.UseGuards)(ws_jwt_guard_1.WsJwtGuard),
    (0, websockets_1.SubscribeMessage)("trivia.answer"),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], AppGateway.prototype, "handleTriviaAnswer", null);
__decorate([
    (0, common_1.UseGuards)(ws_jwt_guard_1.WsJwtGuard),
    (0, websockets_1.SubscribeMessage)("game.forfeit"),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], AppGateway.prototype, "handleGameForfeit", null);
__decorate([
    (0, common_1.UseGuards)(ws_jwt_guard_1.WsJwtGuard),
    (0, websockets_1.SubscribeMessage)("session.end"),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], AppGateway.prototype, "handleSessionEnd", null);
__decorate([
    (0, common_1.UseGuards)(ws_jwt_guard_1.WsJwtGuard),
    (0, websockets_1.SubscribeMessage)("session.sendGift"),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], AppGateway.prototype, "handleSendGift", null);
__decorate([
    (0, common_1.UseGuards)(ws_jwt_guard_1.WsJwtGuard),
    (0, websockets_1.SubscribeMessage)("session.report"),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], AppGateway.prototype, "handleSessionReport", null);
__decorate([
    (0, common_1.UseGuards)(ws_jwt_guard_1.WsJwtGuard),
    (0, websockets_1.SubscribeMessage)("room.join"),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], AppGateway.prototype, "handleRoomJoin", null);
__decorate([
    (0, common_1.UseGuards)(ws_jwt_guard_1.WsJwtGuard),
    (0, websockets_1.SubscribeMessage)("room.leave"),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], AppGateway.prototype, "handleRoomLeave", null);
__decorate([
    (0, common_1.UseGuards)(ws_jwt_guard_1.WsJwtGuard),
    (0, websockets_1.SubscribeMessage)("room.startRound"),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], AppGateway.prototype, "handleStartRound", null);
__decorate([
    (0, common_1.UseGuards)(ws_jwt_guard_1.WsJwtGuard),
    (0, websockets_1.SubscribeMessage)("room.joinRound"),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], AppGateway.prototype, "handleJoinRound", null);
__decorate([
    (0, common_1.UseGuards)(ws_jwt_guard_1.WsJwtGuard),
    (0, websockets_1.SubscribeMessage)("room.startVoting"),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], AppGateway.prototype, "handleStartVoting", null);
__decorate([
    (0, common_1.UseGuards)(ws_jwt_guard_1.WsJwtGuard),
    (0, websockets_1.SubscribeMessage)("room.vote"),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], AppGateway.prototype, "handleVote", null);
__decorate([
    (0, common_1.UseGuards)(ws_jwt_guard_1.WsJwtGuard),
    (0, websockets_1.SubscribeMessage)("room.gameMove"),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], AppGateway.prototype, "handleRoomGameMove", null);
__decorate([
    (0, common_1.UseGuards)(ws_jwt_guard_1.WsJwtGuard),
    (0, websockets_1.SubscribeMessage)("room.getState"),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], AppGateway.prototype, "handleGetRoomState", null);
exports.AppGateway = AppGateway = __decorate([
    (0, websockets_1.WebSocketGateway)({
        namespace: "/ws",
        cors: { origin: "*", credentials: true }
    }),
    __metadata("design:paramtypes", [matchmaking_service_1.MatchmakingService,
        sessions_service_1.SessionsService,
        games_service_1.GamesService,
        tictactoe_service_1.TicTacToeService,
        chess_service_1.ChessService,
        trivia_service_1.TriviaService,
        trivia_timer_service_1.TriviaTimerService,
        video_service_1.VideoService,
        wallet_service_1.WalletService,
        reports_service_1.ReportsService,
        rooms_service_1.RoomsService])
], AppGateway);
//# sourceMappingURL=websocket.gateway.js.map