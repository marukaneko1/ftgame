import { AdminService } from "./admin.service";
import { KycStatus, SubscriptionStatus, ReportStatus } from "@prisma/client";
declare class VerifyUserDto {
    verified: boolean;
}
declare class UpdateKycStatusDto {
    status: KycStatus;
}
declare class BanUserDto {
    reason?: string;
}
declare class UpdateSubscriptionDto {
    status: SubscriptionStatus;
    currentPeriodEnd?: string;
}
declare class UpdateReportStatusDto {
    status: ReportStatus;
}
declare class ResolveReportDto {
    banReason: string;
}
export declare class AdminController {
    private readonly adminService;
    constructor(adminService: AdminService);
    getAllUsers(page?: string, limit?: string): Promise<{
        users: {
            subscription: {
                id: string;
                status: import(".prisma/client").$Enums.SubscriptionStatus;
                startedAt: Date | null;
                currentPeriodEnd: Date | null;
            } | null;
            wallet: {
                id: string;
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
            isAdmin: boolean;
            latitude: number | null;
            longitude: number | null;
            createdAt: Date;
            updatedAt: Date;
        }[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }>;
    getUserById(id: string): Promise<{
        subscription: {
            id: string;
            status: import(".prisma/client").$Enums.SubscriptionStatus;
            stripeSubscriptionId: string | null;
            startedAt: Date | null;
            currentPeriodEnd: Date | null;
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
        isAdmin: boolean;
        latitude: number | null;
        longitude: number | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    verifyUser(id: string, dto: VerifyUserDto): Promise<{
        id: string;
        is18PlusVerified: boolean;
        kycStatus: import(".prisma/client").$Enums.KycStatus;
    }>;
    updateKycStatus(id: string, dto: UpdateKycStatusDto): Promise<{
        id: string;
        kycStatus: import(".prisma/client").$Enums.KycStatus;
    }>;
    banUser(id: string, dto: BanUserDto): Promise<{
        id: string;
        isBanned: boolean;
        banReason: string | null;
    }>;
    unbanUser(id: string): Promise<{
        id: string;
        isBanned: boolean;
        banReason: string | null;
    }>;
    updateSubscription(id: string, dto: UpdateSubscriptionDto): Promise<{
        id: string;
        status: import(".prisma/client").$Enums.SubscriptionStatus;
        startedAt: Date | null;
        currentPeriodEnd: Date | null;
    }>;
    getAllReports(page?: string, limit?: string, status?: ReportStatus): Promise<{
        reports: {
            session: {
                id: string;
                createdAt: Date;
                status: import(".prisma/client").$Enums.SessionStatus;
            } | null;
            id: string;
            createdAt: Date;
            status: import(".prisma/client").$Enums.ReportStatus;
            reporter: {
                email: string;
                displayName: string;
                username: string;
                id: string;
            };
            reported: {
                email: string;
                displayName: string;
                username: string;
                id: string;
                isBanned: boolean;
            };
            reasonCode: import(".prisma/client").$Enums.ReportReason;
            comment: string | null;
        }[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }>;
    getReportById(id: string): Promise<{
        session: {
            id: string;
            createdAt: Date;
            status: import(".prisma/client").$Enums.SessionStatus;
            endedAt: Date | null;
            endReason: import(".prisma/client").$Enums.SessionEndReason | null;
        } | null;
        reporter: {
            email: string;
            displayName: string;
            username: string;
            id: string;
        };
        reported: {
            email: string;
            displayName: string;
            username: string;
            id: string;
            isBanned: boolean;
            banReason: string | null;
        };
    } & {
        id: string;
        createdAt: Date;
        status: import(".prisma/client").$Enums.ReportStatus;
        sessionId: string | null;
        roomId: string | null;
        reasonCode: import(".prisma/client").$Enums.ReportReason;
        comment: string | null;
        reporterUserId: string;
        reportedUserId: string;
    }>;
    updateReportStatus(id: string, dto: UpdateReportStatusDto): Promise<{
        id: string;
        status: import(".prisma/client").$Enums.ReportStatus;
    }>;
    resolveReportAndBan(id: string, dto: ResolveReportDto): Promise<{
        success: boolean;
        message: string;
    }>;
    dismissReport(id: string): Promise<{
        id: string;
        status: import(".prisma/client").$Enums.ReportStatus;
    }>;
}
export {};
//# sourceMappingURL=admin.controller.d.ts.map