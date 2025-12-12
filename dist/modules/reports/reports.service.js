"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const client_1 = require("@prisma/client");
let ReportsService = class ReportsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async createReport(reporterUserId, reportedUserId, reasonCode, comment, sessionId, roomId) {
        if (reporterUserId === reportedUserId) {
            throw new common_1.BadRequestException("Cannot report yourself");
        }
        const [reporter, reported] = await Promise.all([
            this.prisma.user.findUnique({ where: { id: reporterUserId }, select: { id: true } }),
            this.prisma.user.findUnique({ where: { id: reportedUserId }, select: { id: true } })
        ]);
        if (!reporter)
            throw new common_1.NotFoundException("Reporter not found");
        if (!reported)
            throw new common_1.NotFoundException("Reported user not found");
        if (sessionId) {
            const session = await this.prisma.session.findUnique({
                where: { id: sessionId },
                select: { id: true, userAId: true, userBId: true }
            });
            if (!session)
                throw new common_1.NotFoundException("Session not found");
            if (session.userAId !== reporterUserId && session.userBId !== reporterUserId) {
                throw new common_1.BadRequestException("Reporter is not part of this session");
            }
        }
        let reason;
        if (Object.values(client_1.ReportReason).includes(reasonCode)) {
            reason = reasonCode;
        }
        else {
            reason = client_1.ReportReason.OTHER;
        }
        const report = await this.prisma.report.create({
            data: {
                reporterUserId,
                reportedUserId,
                reasonCode: reason,
                comment: comment || null,
                sessionId: sessionId || null,
                roomId: roomId || null,
                status: client_1.ReportStatus.OPEN
            },
            include: {
                reporter: { select: { id: true, displayName: true, username: true } },
                reported: { select: { id: true, displayName: true, username: true } }
            }
        });
        console.log(`[Reports] Created report ${report.id}: ${reporter.id} reported ${reported.id} for ${reason}`);
        return report;
    }
    async getReportsByUser(userId, limit = 20) {
        return this.prisma.report.findMany({
            where: { reporterUserId: userId },
            orderBy: { createdAt: "desc" },
            take: limit,
            include: {
                reported: { select: { id: true, displayName: true, username: true } }
            }
        });
    }
    async getReportsAgainstUser(userId, limit = 20) {
        return this.prisma.report.findMany({
            where: { reportedUserId: userId },
            orderBy: { createdAt: "desc" },
            take: limit,
            include: {
                reporter: { select: { id: true, displayName: true, username: true } }
            }
        });
    }
    async getOpenReports(limit = 50) {
        return this.prisma.report.findMany({
            where: { status: client_1.ReportStatus.OPEN },
            orderBy: { createdAt: "asc" },
            take: limit,
            include: {
                reporter: { select: { id: true, displayName: true, username: true } },
                reported: { select: { id: true, displayName: true, username: true } },
                session: { select: { id: true, createdAt: true } }
            }
        });
    }
    async updateReportStatus(reportId, status) {
        const report = await this.prisma.report.findUnique({
            where: { id: reportId }
        });
        if (!report)
            throw new common_1.NotFoundException("Report not found");
        return this.prisma.report.update({
            where: { id: reportId },
            data: { status }
        });
    }
};
exports.ReportsService = ReportsService;
exports.ReportsService = ReportsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ReportsService);
//# sourceMappingURL=reports.service.js.map