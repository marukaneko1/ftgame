import { PrismaService } from "../../prisma/prisma.service";
import { GameType } from "@prisma/client";
import { CreateRoomDto, RoomWithParticipants, RoundInfo } from "./rooms.types";
import { TicTacToeService } from "../games/tictactoe/tictactoe.service";
import { ChessService } from "../games/chess/chess.service";
import { TriviaService } from "../games/trivia/trivia.service";
export declare class RoomsService {
    private readonly prisma;
    private readonly ticTacToeService;
    private readonly chessService;
    private readonly triviaService;
    constructor(prisma: PrismaService, ticTacToeService: TicTacToeService, chessService: ChessService, triviaService: TriviaService);
    createRoom(hostUserId: string, dto: CreateRoomDto): Promise<{
        host: {
            id: string;
            displayName: string;
            username: string;
        };
        participants: ({
            user: {
                id: string;
                displayName: string;
                username: string;
                wallet: {
                    balanceTokens: number;
                } | null;
            };
        } & {
            id: string;
            role: import(".prisma/client").$Enums.RoomRole;
            tokensInPool: number;
            joinedAt: Date;
            leftAt: Date | null;
            userId: string;
            roomId: string;
        })[];
    } & {
        id: string;
        title: string;
        description: string | null;
        passwordHash: string | null;
        maxMembers: number;
        region: string;
        entryFeeTokens: number;
        status: import(".prisma/client").$Enums.RoomStatus;
        videoChannelName: string;
        isPublic: boolean;
        currentRoundId: string | null;
        createdAt: Date;
        endedAt: Date | null;
        hostUserId: string;
    }>;
    joinRoom(userId: string, roomId: string, password?: string): Promise<RoomWithParticipants>;
    leaveRoom(userId: string, roomId: string): Promise<{
        roomEnded: boolean;
    }>;
    endRoom(roomId: string, userId: string): Promise<{
        success: boolean;
    }>;
    startRound(roomId: string, hostUserId: string, entryFeeTokens: number): Promise<{
        id: string;
        entryFeeTokens: number;
        status: import(".prisma/client").$Enums.RoundStatus;
        createdAt: Date;
        endedAt: Date | null;
        roomId: string;
        roundNumber: number;
        poolTokens: number;
        gameType: import(".prisma/client").$Enums.GameType | null;
        gameId: string | null;
        winnerId: string | null;
        votingEndsAt: Date | null;
        startedAt: Date | null;
    }>;
    joinRound(roomId: string, roundId: string, userId: string): Promise<RoundInfo>;
    startVoting(roomId: string, roundId: string, hostUserId: string): Promise<{
        votingEndsAt: Date;
        roundId: string;
    }>;
    voteForGame(roundId: string, odUserId: string, gameType: GameType): Promise<{
        gameType: GameType;
        voteCount: number;
    }[]>;
    getVotingResults(roundId: string): Promise<{
        gameType: GameType;
        voteCount: number;
    }[]>;
    finalizeVotingAndStartGame(roundId: string): Promise<{
        gameType: import(".prisma/client").$Enums.GameType;
        roundId: string;
        gameId: string;
        gameState: any;
        players: {
            odUserId: string;
            side: string;
        }[];
    } | null>;
    completeRound(roundId: string, winnerId: string | null, isDraw?: boolean): Promise<{
        winnerId: string | null;
        payout: number;
    }>;
    getPublicRooms(region?: string): Promise<{
        id: string;
        title: string;
        description: string | null;
        hostName: string;
        region: string;
        entryFeeTokens: number;
        hasPassword: boolean;
        participantCount: number;
        maxMembers: number;
        status: import(".prisma/client").$Enums.RoomStatus;
        currentRound: {
            id: string;
            entryFeeTokens: number;
            status: import(".prisma/client").$Enums.RoundStatus;
            createdAt: Date;
            endedAt: Date | null;
            roomId: string;
            roundNumber: number;
            poolTokens: number;
            gameType: import(".prisma/client").$Enums.GameType | null;
            gameId: string | null;
            winnerId: string | null;
            votingEndsAt: Date | null;
            startedAt: Date | null;
        };
    }[]>;
    getRoomDetails(roomId: string): Promise<RoomWithParticipants>;
    getRoundDetails(roundId: string): Promise<RoundInfo>;
}
//# sourceMappingURL=rooms.service.d.ts.map