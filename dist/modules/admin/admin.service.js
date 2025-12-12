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
exports.AdminService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const client_1 = require("@prisma/client");
let AdminService = class AdminService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getAllUsers(page = 1, limit = 50) {
        const skip = (page - 1) * limit;
        const [users, total] = await Promise.all([
            this.prisma.user.findMany({
                skip,
                take: limit,
                select: {
                    id: true,
                    email: true,
                    displayName: true,
                    username: true,
                    avatarUrl: true,
                    dateOfBirth: true,
                    is18PlusVerified: true,
                    kycStatus: true,
                    level: true,
                    xp: true,
                    isBanned: true,
                    banReason: true,
                    isAdmin: true,
                    latitude: true,
                    longitude: true,
                    createdAt: true,
                    updatedAt: true,
                    subscription: {
                        select: {
                            id: true,
                            status: true,
                            startedAt: true,
                            currentPeriodEnd: true
                        }
                    },
                    wallet: {
                        select: {
                            id: true,
                            balanceTokens: true
                        }
                    }
                },
                orderBy: { createdAt: "desc" }
            }),
            this.prisma.user.count()
        ]);
        return {
            users,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        };
    }
    async getUserById(userId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                displayName: true,
                username: true,
                avatarUrl: true,
                dateOfBirth: true,
                is18PlusVerified: true,
                kycStatus: true,
                level: true,
                xp: true,
                isBanned: true,
                banReason: true,
                isAdmin: true,
                latitude: true,
                longitude: true,
                createdAt: true,
                updatedAt: true,
                subscription: {
                    select: {
                        id: true,
                        status: true,
                        startedAt: true,
                        currentPeriodEnd: true,
                        stripeSubscriptionId: true
                    }
                },
                wallet: {
                    select: {
                        id: true,
                        balanceTokens: true,
                        createdAt: true,
                        updatedAt: true
                    }
                }
            }
        });
        if (!user) {
            throw new common_1.NotFoundException("User not found");
        }
        return user;
    }
    async verifyUser(userId, verified) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId }
        });
        if (!user) {
            throw new common_1.NotFoundException("User not found");
        }
        return this.prisma.user.update({
            where: { id: userId },
            data: {
                is18PlusVerified: verified,
                kycStatus: verified ? client_1.KycStatus.VERIFIED : client_1.KycStatus.PENDING
            },
            select: {
                id: true,
                is18PlusVerified: true,
                kycStatus: true
            }
        });
    }
    async updateKycStatus(userId, status) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId }
        });
        if (!user) {
            throw new common_1.NotFoundException("User not found");
        }
        return this.prisma.user.update({
            where: { id: userId },
            data: { kycStatus: status },
            select: {
                id: true,
                kycStatus: true
            }
        });
    }
    async banUser(userId, banReason) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId }
        });
        if (!user) {
            throw new common_1.NotFoundException("User not found");
        }
        return this.prisma.user.update({
            where: { id: userId },
            data: {
                isBanned: true,
                banReason
            },
            select: {
                id: true,
                isBanned: true,
                banReason: true
            }
        });
    }
    async unbanUser(userId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId }
        });
        if (!user) {
            throw new common_1.NotFoundException("User not found");
        }
        return this.prisma.user.update({
            where: { id: userId },
            data: {
                isBanned: false,
                banReason: null
            },
            select: {
                id: true,
                isBanned: true,
                banReason: true
            }
        });
    }
    async updateSubscriptionStatus(userId, status, currentPeriodEnd) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: { subscription: true }
        });
        if (!user) {
            throw new common_1.NotFoundException("User not found");
        }
        const subscriptionData = {
            status,
            updatedAt: new Date()
        };
        if (status === client_1.SubscriptionStatus.ACTIVE) {
            if (!user.subscription) {
                subscriptionData.userId = userId;
                subscriptionData.startedAt = new Date();
                subscriptionData.currentPeriodEnd = currentPeriodEnd || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
            }
            else {
                subscriptionData.startedAt = user.subscription.startedAt || new Date();
                subscriptionData.currentPeriodEnd = currentPeriodEnd || user.subscription.currentPeriodEnd || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
            }
        }
        else if (status === client_1.SubscriptionStatus.CANCELED || status === client_1.SubscriptionStatus.INACTIVE) {
        }
        if (user.subscription) {
            return this.prisma.subscription.update({
                where: { id: user.subscription.id },
                data: subscriptionData,
                select: {
                    id: true,
                    status: true,
                    startedAt: true,
                    currentPeriodEnd: true
                }
            });
        }
        else {
            return this.prisma.subscription.create({
                data: subscriptionData,
                select: {
                    id: true,
                    status: true,
                    startedAt: true,
                    currentPeriodEnd: true
                }
            });
        }
    }
    async getAllReports(page = 1, limit = 50, status) {
        const skip = (page - 1) * limit;
        const where = status ? { status } : {};
        const [reports, total] = await Promise.all([
            this.prisma.report.findMany({
                where,
                skip,
                take: limit,
                select: {
                    id: true,
                    reasonCode: true,
                    comment: true,
                    status: true,
                    createdAt: true,
                    reporter: {
                        select: {
                            id: true,
                            displayName: true,
                            username: true,
                            email: true
                        }
                    },
                    reported: {
                        select: {
                            id: true,
                            displayName: true,
                            username: true,
                            email: true,
                            isBanned: true
                        }
                    },
                    session: {
                        select: {
                            id: true,
                            createdAt: true,
                            status: true
                        }
                    }
                },
                orderBy: { createdAt: "desc" }
            }),
            this.prisma.report.count({ where })
        ]);
        return {
            reports,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        };
    }
    async getReportById(reportId) {
        const report = await this.prisma.report.findUnique({
            where: { id: reportId },
            include: {
                reporter: {
                    select: {
                        id: true,
                        displayName: true,
                        username: true,
                        email: true
                    }
                },
                reported: {
                    select: {
                        id: true,
                        displayName: true,
                        username: true,
                        email: true,
                        isBanned: true,
                        banReason: true
                    }
                },
                session: {
                    select: {
                        id: true,
                        createdAt: true,
                        endedAt: true,
                        status: true,
                        endReason: true
                    }
                }
            }
        });
        if (!report) {
            throw new common_1.NotFoundException("Report not found");
        }
        return report;
    }
    async updateReportStatus(reportId, status) {
        const report = await this.prisma.report.findUnique({
            where: { id: reportId }
        });
        if (!report) {
            throw new common_1.NotFoundException("Report not found");
        }
        return this.prisma.report.update({
            where: { id: reportId },
            data: { status },
            select: {
                id: true,
                status: true
            }
        });
    }
    async resolveReportAndBan(reportId, banReason) {
        const report = await this.prisma.report.findUnique({
            where: { id: reportId }
        });
        if (!report) {
            throw new common_1.NotFoundException("Report not found");
        }
        await this.prisma.$transaction([
            this.prisma.report.update({
                where: { id: reportId },
                data: { status: client_1.ReportStatus.ACTIONED }
            }),
            this.prisma.user.update({
                where: { id: report.reportedUserId },
                data: {
                    isBanned: true,
                    banReason
                }
            })
        ]);
        return { success: true, message: "Report resolved and user banned" };
    }
    async dismissReport(reportId) {
        const report = await this.prisma.report.findUnique({
            where: { id: reportId }
        });
        if (!report) {
            throw new common_1.NotFoundException("Report not found");
        }
        return this.prisma.report.update({
            where: { id: reportId },
            data: { status: client_1.ReportStatus.REVIEWED },
            select: {
                id: true,
                status: true
            }
        });
    }
};
exports.AdminService = AdminService;
exports.AdminService = AdminService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AdminService);
//# sourceMappingURL=admin.service.js.map