import { RoomsService } from "./rooms.service";
declare class CreateRoomBody {
    title: string;
    description?: string;
    password?: string;
    maxMembers?: number;
    region?: string;
    entryFeeTokens?: number;
    isPublic?: boolean;
}
declare class JoinRoomBody {
    password?: string;
}
export declare class RoomsController {
    private readonly roomsService;
    constructor(roomsService: RoomsService);
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
    getRoomDetails(id: string): Promise<import("./rooms.types").RoomWithParticipants>;
    createRoom(req: any, body: CreateRoomBody): Promise<{
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
    joinRoom(req: any, id: string, body: JoinRoomBody): Promise<import("./rooms.types").RoomWithParticipants>;
    leaveRoom(req: any, id: string): Promise<{
        roomEnded: boolean;
    }>;
    endRoom(req: any, id: string): Promise<{
        success: boolean;
    }>;
}
export {};
//# sourceMappingURL=rooms.controller.d.ts.map