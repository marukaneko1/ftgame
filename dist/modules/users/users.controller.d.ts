import { UsersService } from "./users.service";
import { JwtPayload } from "../../common/types/auth";
declare class UpdateLocationDto {
    latitude: number;
    longitude: number;
}
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
    me(user: JwtPayload): Promise<{
        id: string;
        wallet: {
            id: string;
            createdAt: Date;
            balanceTokens: number;
            updatedAt: Date;
        } | null;
        subscription: {
            id: string;
            status: import(".prisma/client").$Enums.SubscriptionStatus;
            startedAt: Date | null;
            createdAt: Date;
            userId: string;
            updatedAt: Date;
            stripeSubscriptionId: string | null;
            currentPeriodEnd: Date | null;
        } | null;
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