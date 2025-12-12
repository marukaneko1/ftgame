import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../../prisma/prisma.service";
export declare class VideoService {
    private readonly prisma;
    private readonly configService;
    constructor(prisma: PrismaService, configService: ConfigService);
    generateTokenForSession(sessionId: string, userId: string): Promise<{
        token: string;
        channelName: string;
        expiresAt: string;
    }>;
    getAppId(): string;
    buildToken(channelName: string, userId: string): {
        token: string;
        channelName: string;
        expiresAt: string;
    };
}
//# sourceMappingURL=video.service.d.ts.map