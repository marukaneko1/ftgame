import { OnGatewayConnection, OnGatewayDisconnect } from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
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
import { GameType } from "@prisma/client";
import { Position, PieceType } from "../games/chess/chess.types";
export declare class AppGateway implements OnGatewayConnection, OnGatewayDisconnect {
    private readonly matchmakingService;
    private readonly sessionsService;
    private readonly gamesService;
    private readonly ticTacToeService;
    private readonly chessService;
    private readonly triviaService;
    private readonly triviaTimerService;
    private readonly videoService;
    private readonly walletService;
    private readonly reportsService;
    private readonly roomsService;
    server: Server;
    private matchingIntervals;
    private votingTimers;
    private triviaTimers;
    constructor(matchmakingService: MatchmakingService, sessionsService: SessionsService, gamesService: GamesService, ticTacToeService: TicTacToeService, chessService: ChessService, triviaService: TriviaService, triviaTimerService: TriviaTimerService, videoService: VideoService, walletService: WalletService, reportsService: ReportsService, roomsService: RoomsService);
    handleConnection(client: Socket): void;
    handleDisconnect(client: Socket): void;
    handleMatchJoin(client: Socket, body: {
        region: string;
        language: string;
        latitude?: number;
        longitude?: number;
    }): Promise<void>;
    private handleMatch;
    private startPeriodicMatching;
    handleMatchLeave(client: Socket): Promise<void>;
    handleSessionJoin(client: Socket, body: {
        sessionId: string;
    }): Promise<void>;
    handleStartGame(client: Socket, body: {
        sessionId: string;
        gameType: string;
    }): Promise<void>;
    handleGameJoin(client: Socket, body: {
        gameId: string;
    }): Promise<void>;
    handleGameMove(client: Socket, body: {
        gameId: string;
        cellIndex?: number;
        from?: Position;
        to?: Position;
        promotionPiece?: PieceType;
    }): Promise<void>;
    handleTriviaAnswer(client: Socket, body: {
        gameId: string;
        roundId?: string;
        questionIndex: number;
        answerIndex: number;
    }): Promise<void>;
    private startTriviaCountdown;
    private startTriviaQuestion;
    private endTriviaQuestion;
    private get prisma();
    handleGameForfeit(client: Socket, body: {
        gameId: string;
    }): Promise<void>;
    handleSessionEnd(client: Socket, body: {
        sessionId: string;
    }): Promise<void>;
    handleSendGift(client: Socket, body: {
        sessionId: string;
        amountTokens: number;
    }): Promise<void>;
    handleSessionReport(client: Socket, body: {
        sessionId: string;
        reason: string;
        comment?: string;
    }): Promise<void>;
    handleRoomJoin(client: Socket, body: {
        roomId: string;
        password?: string;
    }): Promise<void>;
    handleRoomLeave(client: Socket, body: {
        roomId: string;
    }): Promise<void>;
    handleStartRound(client: Socket, body: {
        roomId: string;
        entryFeeTokens: number;
    }): Promise<void>;
    handleJoinRound(client: Socket, body: {
        roomId: string;
        roundId: string;
    }): Promise<void>;
    handleStartVoting(client: Socket, body: {
        roomId: string;
        roundId: string;
    }): Promise<void>;
    handleVote(client: Socket, body: {
        roomId: string;
        roundId: string;
        gameType: GameType;
    }): Promise<void>;
    handleRoomGameMove(client: Socket, body: {
        roomId: string;
        roundId: string;
        cellIndex?: number;
        from?: Position;
        to?: Position;
        promotionPiece?: PieceType;
    }): Promise<void>;
    handleGetRoomState(client: Socket, body: {
        roomId: string;
    }): Promise<void>;
    private getUserRoom;
}
//# sourceMappingURL=websocket.gateway.d.ts.map