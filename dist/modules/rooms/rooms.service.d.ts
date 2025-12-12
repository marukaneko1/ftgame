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
        participants: ({
            user: {
                wallet: {
                    balanceTokens: number;
                } | null;
                displayName: string;
                username: string;
                id: string;
            };
        } & {
            id: string;
            userId: string;
            roomId: string;
            role: import(".prisma/client").$Enums.RoomRole;
            tokensInPool: number;
            joinedAt: Date;
            leftAt: Date | null;
        })[];
        host: {
            displayName: string;
            username: string;
            id: string;
        };
    } & {
        id: string;
        passwordHash: string | null;
        createdAt: Date;
        status: import(".prisma/client").$Enums.RoomStatus;
        endedAt: Date | null;
        videoChannelName: string;
        title: string;
        description: string | null;
        maxMembers: number;
        region: string;
        entryFeeTokens: number;
        isPublic: boolean;
        currentRoundId: string | null;
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
        createdAt: Date;
        status: import(".prisma/client").$Enums.RoundStatus;
        startedAt: Date | null;
        gameId: string | null;
        roomId: string;
        endedAt: Date | null;
        winnerId: string | null;
        entryFeeTokens: number;
        roundNumber: number;
        poolTokens: number;
        gameType: import(".prisma/client").$Enums.GameType | null;
        votingEndsAt: Date | null;
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
            createdAt: Date;
            status: import(".prisma/client").$Enums.RoundStatus;
            startedAt: Date | null;
            gameId: string | null;
            roomId: string;
            endedAt: Date | null;
            winnerId: string | null;
            entryFeeTokens: number;
            roundNumber: number;
            poolTokens: number;
            gameType: import(".prisma/client").$Enums.GameType | null;
            votingEndsAt: Date | null;
        };
    }[]>;
    getRoomDetails(roomId: string): Promise<RoomWithParticipants>;
    getRoundDetails(roundId: string): Promise<RoundInfo>;
}
//# sourceMappingURL=rooms.service.d.ts.map