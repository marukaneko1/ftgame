import { PrismaService } from "../../prisma/prisma.service";
export declare class UsersService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getMe(userId: string): Promise<{
        subscription: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: import(".prisma/client").$Enums.SubscriptionStatus;
            stripeSubscriptionId: string | null;
            startedAt: Date | null;
            currentPeriodEnd: Date | null;
            userId: string;
        } | null;
        wallet: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            balanceTokens: number;
        } | null;
        email: string;
        displayName: string;
        username: string;
        dateOfBirth: Date | null;
        id: string;
        avatarUrl: string | null;
        is18PlusVerified: boolean;
        kycStatus: import(".prisma/client").$Enums.KycStatus;
        level: number;
        xp: number;
        isBanned: boolean;
        banReason: string | null;
        latitude: number | null;
        longitude: number | null;
    } | null>;
    updateLocation(userId: string, latitude: number, longitude: number): Promise<{
        id: string;
        latitude: number | null;
        longitude: number | null;
    }>;
}
//# sourceMappingURL=users.service.d.ts.map