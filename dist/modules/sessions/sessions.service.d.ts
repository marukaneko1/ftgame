import { PrismaService } from "../../prisma/prisma.service";
import { SessionEndReason } from "@prisma/client";
export declare class SessionsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    createSession(userAId: string, userBId: string, videoChannelName: string): Promise<{
        id: string;
        createdAt: Date;
        status: import(".prisma/client").$Enums.SessionStatus;
        startedAt: Date | null;
        endedAt: Date | null;
        endReason: import(".prisma/client").$Enums.SessionEndReason | null;
        videoChannelName: string;
        userAId: string;
        userBId: string;
    }>;
    getSession(sessionId: string): Promise<{
        id: string;
        createdAt: Date;
        status: import(".prisma/client").$Enums.SessionStatus;
        startedAt: Date | null;
        endedAt: Date | null;
        endReason: import(".prisma/client").$Enums.SessionEndReason | null;
        videoChannelName: string;
        userAId: string;
        userBId: string;
    } | null>;
    endSession(sessionId: string, userId: string, reason: SessionEndReason): Promise<{
        id: string;
        createdAt: Date;
        status: import(".prisma/client").$Enums.SessionStatus;
        startedAt: Date | null;
        endedAt: Date | null;
        endReason: import(".prisma/client").$Enums.SessionEndReason | null;
        videoChannelName: string;
        userAId: string;
        userBId: string;
    }>;
}
//# sourceMappingURL=sessions.service.d.ts.map