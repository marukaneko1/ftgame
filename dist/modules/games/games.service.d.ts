import { PrismaService } from "../../prisma/prisma.service";
import { GameType } from "@prisma/client";
import { TicTacToeService } from "./tictactoe/tictactoe.service";
import { ChessService } from "./chess/chess.service";
import { TriviaService } from "./trivia/trivia.service";
export declare class GamesService {
    private readonly prisma;
    private readonly ticTacToeService;
    private readonly chessService;
    private readonly triviaService;
    constructor(prisma: PrismaService, ticTacToeService: TicTacToeService, chessService: ChessService, triviaService: TriviaService);
    createGame(sessionId: string, type: GameType, playerIds: string[]): Promise<{
        players: {
            id: string;
            createdAt: Date;
            side: string;
            score: number;
            result: string | null;
            userId: string;
            gameId: string;
        }[];
    } & {
        type: import(".prisma/client").$Enums.GameType;
        id: string;
        status: import(".prisma/client").$Enums.GameStatus;
        state: import("@prisma/client/runtime/library").JsonValue | null;
        startedAt: Date | null;
        endedAt: Date | null;
        createdAt: Date;
        sessionId: string | null;
        winnerUserId: string | null;
    }>;
    startGame(gameId: string): Promise<{
        players: ({
            user: {
                id: string;
                displayName: string;
                username: string;
            };
        } & {
            id: string;
            createdAt: Date;
            side: string;
            score: number;
            result: string | null;
            userId: string;
            gameId: string;
        })[];
    } & {
        type: import(".prisma/client").$Enums.GameType;
        id: string;
        status: import(".prisma/client").$Enums.GameStatus;
        state: import("@prisma/client/runtime/library").JsonValue | null;
        startedAt: Date | null;
        endedAt: Date | null;
        createdAt: Date;
        sessionId: string | null;
        winnerUserId: string | null;
    }>;
    getGame(gameId: string): Promise<{
        session: {
            id: string;
            status: import(".prisma/client").$Enums.SessionStatus;
            startedAt: Date | null;
            endedAt: Date | null;
            createdAt: Date;
            endReason: import(".prisma/client").$Enums.SessionEndReason | null;
            videoChannelName: string;
            userAId: string;
            userBId: string;
        } | null;
        players: ({
            user: {
                id: string;
                displayName: string;
                username: string;
            };
        } & {
            id: string;
            createdAt: Date;
            side: string;
            score: number;
            result: string | null;
            userId: string;
            gameId: string;
        })[];
    } & {
        type: import(".prisma/client").$Enums.GameType;
        id: string;
        status: import(".prisma/client").$Enums.GameStatus;
        state: import("@prisma/client/runtime/library").JsonValue | null;
        startedAt: Date | null;
        endedAt: Date | null;
        createdAt: Date;
        sessionId: string | null;
        winnerUserId: string | null;
    }>;
    cancelGame(gameId: string): Promise<{
        type: import(".prisma/client").$Enums.GameType;
        id: string;
        status: import(".prisma/client").$Enums.GameStatus;
        state: import("@prisma/client/runtime/library").JsonValue | null;
        startedAt: Date | null;
        endedAt: Date | null;
        createdAt: Date;
        sessionId: string | null;
        winnerUserId: string | null;
    }>;
    getActiveGameForSession(sessionId: string): Promise<({
        players: ({
            user: {
                id: string;
                displayName: string;
                username: string;
            };
        } & {
            id: string;
            createdAt: Date;
            side: string;
            score: number;
            result: string | null;
            userId: string;
            gameId: string;
        })[];
    } & {
        type: import(".prisma/client").$Enums.GameType;
        id: string;
        status: import(".prisma/client").$Enums.GameStatus;
        state: import("@prisma/client/runtime/library").JsonValue | null;
        startedAt: Date | null;
        endedAt: Date | null;
        createdAt: Date;
        sessionId: string | null;
        winnerUserId: string | null;
    }) | null>;
}
//# sourceMappingURL=games.service.d.ts.map