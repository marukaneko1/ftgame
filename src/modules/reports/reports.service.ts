import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { ReportReason, ReportStatus } from "@prisma/client";

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new report against a user
   */
  async createReport(
    reporterUserId: string,
    reportedUserId: string,
    reasonCode: ReportReason | string,
    comment?: string,
    sessionId?: string,
    roomId?: string
  ) {
    // Validate reporter and reported are different users
    if (reporterUserId === reportedUserId) {
      throw new BadRequestException("Cannot report yourself");
    }

    // Verify both users exist
    const [reporter, reported] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: reporterUserId }, select: { id: true } }),
      this.prisma.user.findUnique({ where: { id: reportedUserId }, select: { id: true } })
    ]);

    if (!reporter) throw new NotFoundException("Reporter not found");
    if (!reported) throw new NotFoundException("Reported user not found");

    // Validate session if provided
    if (sessionId) {
      const session = await this.prisma.session.findUnique({ 
        where: { id: sessionId },
        select: { id: true, userAId: true, userBId: true }
      });
      if (!session) throw new NotFoundException("Session not found");
      // Verify reporter is part of the session
      if (session.userAId !== reporterUserId && session.userBId !== reporterUserId) {
        throw new BadRequestException("Reporter is not part of this session");
      }
    }

    // Convert string reason to enum if needed
    let reason: ReportReason;
    if (Object.values(ReportReason).includes(reasonCode as ReportReason)) {
      reason = reasonCode as ReportReason;
    } else {
      // Default to OTHER for unknown reasons
      reason = ReportReason.OTHER;
    }

    // Create the report
    const report = await this.prisma.report.create({
      data: {
        reporterUserId,
        reportedUserId,
        reasonCode: reason,
        comment: comment || null,
        sessionId: sessionId || null,
        roomId: roomId || null,
        status: ReportStatus.OPEN
      },
      include: {
        reporter: { select: { id: true, displayName: true, username: true } },
        reported: { select: { id: true, displayName: true, username: true } }
      }
    });

    console.log(`[Reports] Created report ${report.id}: ${reporter.id} reported ${reported.id} for ${reason}`);

    return report;
  }

  /**
   * Get reports made by a user
   */
  async getReportsByUser(userId: string, limit = 20) {
    return this.prisma.report.findMany({
      where: { reporterUserId: userId },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        reported: { select: { id: true, displayName: true, username: true } }
      }
    });
  }

  /**
   * Get reports against a user
   */
  async getReportsAgainstUser(userId: string, limit = 20) {
    return this.prisma.report.findMany({
      where: { reportedUserId: userId },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        reporter: { select: { id: true, displayName: true, username: true } }
      }
    });
  }

  /**
   * Get all open reports (for moderation)
   */
  async getOpenReports(limit = 50) {
    return this.prisma.report.findMany({
      where: { status: ReportStatus.OPEN },
      orderBy: { createdAt: "asc" },
      take: limit,
      include: {
        reporter: { select: { id: true, displayName: true, username: true } },
        reported: { select: { id: true, displayName: true, username: true } },
        session: { select: { id: true, createdAt: true } }
      }
    });
  }

  /**
   * Update report status (for moderation)
   */
  async updateReportStatus(reportId: string, status: ReportStatus) {
    const report = await this.prisma.report.findUnique({
      where: { id: reportId }
    });

    if (!report) throw new NotFoundException("Report not found");

    return this.prisma.report.update({
      where: { id: reportId },
      data: { status }
    });
  }
}

