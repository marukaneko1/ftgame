import { OnModuleDestroy } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { ConfigService } from "@nestjs/config";
interface QueueRequest {
    userId: string;
    region: string;
    language: string;
    latitude?: number;
    longitude?: number;
    enqueuedAt: number;
}
export declare class MatchmakingService implements OnModuleDestroy {
    private readonly prisma;
    private redis;
    private readonly logger;
    private userQueues;
    private cleanupInterval;
    private readonly STALE_ENTRY_MS;
    constructor(prisma: PrismaService, configService: ConfigService);
    private ensureRedis;
    private cleanupStaleEntries;
    onModuleDestroy(): void;
    joinQueue(userId: string, region: string, language: string, latitude?: number, longitude?: number): Promise<[QueueRequest, QueueRequest] | null>;
    leaveQueue(userId: string): Promise<void>;
    findMatch(userId: string, region: string, language: string, latitude?: number, longitude?: number): Promise<[QueueRequest, QueueRequest] | null>;
    private findClosestMatch;
    private calculateDistance;
    private toRad;
    queueKey(region: string, language: string): string;
    private ensureEligible;
}
export {};
//# sourceMappingURL=matchmaking.service.d.ts.map