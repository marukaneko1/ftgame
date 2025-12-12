import { PrismaService } from "../../prisma/prisma.service";
import { KycStatus, SubscriptionStatus, ReportStatus } from "@prisma/client";
export declare class AdminService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getAllUsers(page?: number, limit?: number): Promise<{
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
    getUserById(userId: string): Promise<{
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
        isAdmin: boolean;
        latitude: number | null;
        longitude: number | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    verifyUser(userId: string, verified: boolean): Promise<{
        id: string;
        is18PlusVerified: boolean;
        kycStatus: import(".prisma/client").$Enums.KycStatus;
    }>;
    updateKycStatus(userId: string, status: KycStatus): Promise<{
        id: string;
        kycStatus: import(".prisma/client").$Enums.KycStatus;
    }>;
    banUser(userId: string, banReason: string): Promise<{
        id: string;
        isBanned: boolean;
        banReason: string | null;
    }>;
    unbanUser(userId: string): Promise<{
        id: string;
        isBanned: boolean;
        banReason: string | null;
    }>;
    updateSubscriptionStatus(userId: string, status: SubscriptionStatus, currentPeriodEnd?: Date): Promise<{
        id: string;
        status: import(".prisma/client").$Enums.SubscriptionStatus;
        startedAt: Date | null;
        currentPeriodEnd: Date | null;
    }>;
    getAllReports(page?: number, limit?: number, status?: ReportStatus): Promise<{
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
                id: string;
                email: string;
                username: string;
                displayName: string;
            };
            reported: {
                id: string;
                email: string;
                username: string;
                displayName: string;
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
    getReportById(reportId: string): Promise<{
        session: {
            id: string;
            createdAt: Date;
            status: import(".prisma/client").$Enums.SessionStatus;
            endedAt: Date | null;
            endReason: import(".prisma/client").$Enums.SessionEndReason | null;
        } | null;
        reporter: {
            id: string;
            email: string;
            username: string;
            displayName: string;
        };
        reported: {
            id: string;
            email: string;
            username: string;
            displayName: string;
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
    updateReportStatus(reportId: string, status: ReportStatus): Promise<{
        id: string;
        status: import(".prisma/client").$Enums.ReportStatus;
    }>;
    resolveReportAndBan(reportId: string, banReason: string): Promise<{
        success: boolean;
        message: string;
    }>;
    dismissReport(reportId: string): Promise<{
        id: string;
        status: import(".prisma/client").$Enums.ReportStatus;
    }>;
}
//# sourceMappingURL=admin.service.d.ts.map