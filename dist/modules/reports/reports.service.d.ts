import { PrismaService } from "../../prisma/prisma.service";
import { ReportReason, ReportStatus } from "@prisma/client";
export declare class ReportsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    createReport(reporterUserId: string, reportedUserId: string, reasonCode: ReportReason | string, comment?: string, sessionId?: string, roomId?: string): Promise<{
        reporter: {
            displayName: string;
            username: string;
            id: string;
        };
        reported: {
            displayName: string;
            username: string;
            id: string;
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
    getReportsByUser(userId: string, limit?: number): Promise<({
        reported: {
            displayName: string;
            username: string;
            id: string;
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
    })[]>;
    getReportsAgainstUser(userId: string, limit?: number): Promise<({
        reporter: {
            displayName: string;
            username: string;
            id: string;
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
    })[]>;
    getOpenReports(limit?: number): Promise<({
        session: {
            id: string;
            createdAt: Date;
        } | null;
        reporter: {
            displayName: string;
            username: string;
            id: string;
        };
        reported: {
            displayName: string;
            username: string;
            id: string;
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
    })[]>;
    updateReportStatus(reportId: string, status: ReportStatus): Promise<{
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
}
//# sourceMappingURL=reports.service.d.ts.map