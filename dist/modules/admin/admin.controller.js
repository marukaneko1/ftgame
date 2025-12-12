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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminController = void 0;
const common_1 = require("@nestjs/common");
const admin_service_1 = require("./admin.service");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const admin_guard_1 = require("../../common/guards/admin.guard");
const client_1 = require("@prisma/client");
const class_validator_1 = require("class-validator");
class VerifyUserDto {
    verified;
}
__decorate([
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], VerifyUserDto.prototype, "verified", void 0);
class UpdateKycStatusDto {
    status;
}
__decorate([
    (0, class_validator_1.IsEnum)(client_1.KycStatus),
    __metadata("design:type", String)
], UpdateKycStatusDto.prototype, "status", void 0);
class BanUserDto {
    reason;
}
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], BanUserDto.prototype, "reason", void 0);
class UpdateSubscriptionDto {
    status;
    currentPeriodEnd;
}
__decorate([
    (0, class_validator_1.IsEnum)(client_1.SubscriptionStatus),
    __metadata("design:type", String)
], UpdateSubscriptionDto.prototype, "status", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateSubscriptionDto.prototype, "currentPeriodEnd", void 0);
class UpdateReportStatusDto {
    status;
}
__decorate([
    (0, class_validator_1.IsEnum)(client_1.ReportStatus),
    __metadata("design:type", String)
], UpdateReportStatusDto.prototype, "status", void 0);
class ResolveReportDto {
    banReason;
}
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ResolveReportDto.prototype, "banReason", void 0);
let AdminController = class AdminController {
    adminService;
    constructor(adminService) {
        this.adminService = adminService;
    }
    async getAllUsers(page, limit) {
        const pageNum = page ? parseInt(page, 10) : 1;
        const limitNum = limit ? parseInt(limit, 10) : 50;
        return this.adminService.getAllUsers(pageNum, limitNum);
    }
    async getUserById(id) {
        return this.adminService.getUserById(id);
    }
    async verifyUser(id, dto) {
        return this.adminService.verifyUser(id, dto.verified);
    }
    async updateKycStatus(id, dto) {
        return this.adminService.updateKycStatus(id, dto.status);
    }
    async banUser(id, dto) {
        return this.adminService.banUser(id, dto.reason || "Banned by administrator");
    }
    async unbanUser(id) {
        return this.adminService.unbanUser(id);
    }
    async updateSubscription(id, dto) {
        const currentPeriodEnd = dto.currentPeriodEnd ? new Date(dto.currentPeriodEnd) : undefined;
        return this.adminService.updateSubscriptionStatus(id, dto.status, currentPeriodEnd);
    }
    async getAllReports(page, limit, status) {
        const pageNum = page ? parseInt(page, 10) : 1;
        const limitNum = limit ? parseInt(limit, 10) : 50;
        return this.adminService.getAllReports(pageNum, limitNum, status);
    }
    async getReportById(id) {
        return this.adminService.getReportById(id);
    }
    async updateReportStatus(id, dto) {
        return this.adminService.updateReportStatus(id, dto.status);
    }
    async resolveReportAndBan(id, dto) {
        return this.adminService.resolveReportAndBan(id, dto.banReason);
    }
    async dismissReport(id) {
        return this.adminService.dismissReport(id);
    }
};
exports.AdminController = AdminController;
__decorate([
    (0, common_1.Get)("users"),
    __param(0, (0, common_1.Query)("page")),
    __param(1, (0, common_1.Query)("limit")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getAllUsers", null);
__decorate([
    (0, common_1.Get)("users/:id"),
    __param(0, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getUserById", null);
__decorate([
    (0, common_1.Patch)("users/:id/verify"),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, VerifyUserDto]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "verifyUser", null);
__decorate([
    (0, common_1.Patch)("users/:id/kyc-status"),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, UpdateKycStatusDto]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "updateKycStatus", null);
__decorate([
    (0, common_1.Patch)("users/:id/ban"),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, BanUserDto]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "banUser", null);
__decorate([
    (0, common_1.Patch)("users/:id/unban"),
    __param(0, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "unbanUser", null);
__decorate([
    (0, common_1.Patch)("users/:id/subscription"),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, UpdateSubscriptionDto]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "updateSubscription", null);
__decorate([
    (0, common_1.Get)("reports"),
    __param(0, (0, common_1.Query)("page")),
    __param(1, (0, common_1.Query)("limit")),
    __param(2, (0, common_1.Query)("status")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getAllReports", null);
__decorate([
    (0, common_1.Get)("reports/:id"),
    __param(0, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getReportById", null);
__decorate([
    (0, common_1.Patch)("reports/:id/status"),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, UpdateReportStatusDto]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "updateReportStatus", null);
__decorate([
    (0, common_1.Post)("reports/:id/resolve-ban"),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, ResolveReportDto]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "resolveReportAndBan", null);
__decorate([
    (0, common_1.Post)("reports/:id/dismiss"),
    __param(0, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "dismissReport", null);
exports.AdminController = AdminController = __decorate([
    (0, common_1.Controller)("admin"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, admin_guard_1.AdminGuard),
    __metadata("design:paramtypes", [admin_service_1.AdminService])
], AdminController);
//# sourceMappingURL=admin.controller.js.map