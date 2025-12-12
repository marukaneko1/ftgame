import { UsersService } from "./users.service";
import { JwtPayload } from "@omegle-game/shared/src/types/auth";
declare class UpdateLocationDto {
    latitude: number;
    longitude: number;
}
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
    me(user: JwtPayload): Promise<{
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
        id: string;
        email: string;
        username: string;
        displayName: string;
        avatarUrl: string | null;
        dateOfBirth: Date | null;
        is18PlusVerified: boolean;
        kycStatus: import(".prisma/client").$Enums.KycStatus;
        level: number;
        xp: number;
        isBanned: boolean;
        banReason: string | null;
        latitude: number | null;
        longitude: number | null;
    } | null>;
    updateLocation(user: JwtPayload, dto: UpdateLocationDto): Promise<{
        id: string;
        latitude: number | null;
        longitude: number | null;
    }>;
}
export {};
//# sourceMappingURL=users.controller.d.ts.map