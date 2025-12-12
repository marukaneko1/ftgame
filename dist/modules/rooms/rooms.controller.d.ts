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
    getRoomDetails(id: string): Promise<import("./rooms.types").RoomWithParticipants>;
    createRoom(req: any, body: CreateRoomBody): Promise<{
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