import { Body, Controller, Get, Logger, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { AdminService } from "./admin.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { AdminGuard } from "../../common/guards/admin.guard";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { KycStatus, SubscriptionStatus, ReportStatus } from "@prisma/client";
import { IsEnum, IsBoolean, IsString, IsOptional, IsDateString } from "class-validator";
import { JwtPayload } from "../../types/auth";

class VerifyUserDto {
  @IsBoolean()
  verified!: boolean;
}

class UpdateKycStatusDto {
  @IsEnum(KycStatus)
  status!: KycStatus;
}

class BanUserDto {
  @IsString()
  @IsOptional()
  reason?: string;
}

class UpdateSubscriptionDto {
  @IsEnum(SubscriptionStatus)
  status!: SubscriptionStatus;

  @IsDateString()
  @IsOptional()
  currentPeriodEnd?: string;
}

class UpdateReportStatusDto {
  @IsEnum(ReportStatus)
  status!: ReportStatus;
}

class ResolveReportDto {
  @IsString()
  banReason!: string;
}

@Controller("admin")
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminController {
  private readonly logger = new Logger(AdminController.name);
  
  constructor(private readonly adminService: AdminService) {}
  
  /**
   * SECURITY: Log all admin actions for audit trail
   */
  private logAdminAction(adminId: string, action: string, targetId: string, details?: Record<string, any>) {
    this.logger.log({
      type: 'ADMIN_ACTION',
      adminId,
      action,
      targetId,
      details,
      timestamp: new Date().toISOString()
    });
  }

  @Get("users")
  async getAllUsers(@Query("page") page?: string, @Query("limit") limit?: string) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 50;
    return this.adminService.getAllUsers(pageNum, limitNum);
  }

  @Get("users/:id")
  async getUserById(@Param("id") id: string) {
    return this.adminService.getUserById(id);
  }

  @Patch("users/:id/verify")
  async verifyUser(@Param("id") id: string, @Body() dto: VerifyUserDto, @CurrentUser() admin: JwtPayload) {
    this.logAdminAction(admin.sub, 'VERIFY_USER', id, { verified: dto.verified });
    return this.adminService.verifyUser(id, dto.verified);
  }

  @Patch("users/:id/kyc-status")
  async updateKycStatus(@Param("id") id: string, @Body() dto: UpdateKycStatusDto, @CurrentUser() admin: JwtPayload) {
    this.logAdminAction(admin.sub, 'UPDATE_KYC_STATUS', id, { status: dto.status });
    return this.adminService.updateKycStatus(id, dto.status);
  }

  @Patch("users/:id/ban")
  async banUser(@Param("id") id: string, @Body() dto: BanUserDto, @CurrentUser() admin: JwtPayload) {
    this.logAdminAction(admin.sub, 'BAN_USER', id, { reason: dto.reason });
    return this.adminService.banUser(id, dto.reason || "Banned by administrator");
  }

  @Patch("users/:id/unban")
  async unbanUser(@Param("id") id: string, @CurrentUser() admin: JwtPayload) {
    this.logAdminAction(admin.sub, 'UNBAN_USER', id);
    return this.adminService.unbanUser(id);
  }

  @Patch("users/:id/subscription")
  async updateSubscription(@Param("id") id: string, @Body() dto: UpdateSubscriptionDto, @CurrentUser() admin: JwtPayload) {
    this.logAdminAction(admin.sub, 'UPDATE_SUBSCRIPTION', id, { status: dto.status, currentPeriodEnd: dto.currentPeriodEnd });
    const currentPeriodEnd = dto.currentPeriodEnd ? new Date(dto.currentPeriodEnd) : undefined;
    return this.adminService.updateSubscriptionStatus(id, dto.status, currentPeriodEnd);
  }

  // ==================== REPORTS ====================

  @Get("reports")
  async getAllReports(
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("status") status?: ReportStatus
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 50;
    return this.adminService.getAllReports(pageNum, limitNum, status);
  }

  @Get("reports/:id")
  async getReportById(@Param("id") id: string) {
    return this.adminService.getReportById(id);
  }

  @Patch("reports/:id/status")
  async updateReportStatus(@Param("id") id: string, @Body() dto: UpdateReportStatusDto, @CurrentUser() admin: JwtPayload) {
    this.logAdminAction(admin.sub, 'UPDATE_REPORT_STATUS', id, { status: dto.status });
    return this.adminService.updateReportStatus(id, dto.status);
  }

  @Post("reports/:id/resolve-ban")
  async resolveReportAndBan(@Param("id") id: string, @Body() dto: ResolveReportDto, @CurrentUser() admin: JwtPayload) {
    this.logAdminAction(admin.sub, 'RESOLVE_REPORT_BAN', id, { banReason: dto.banReason });
    return this.adminService.resolveReportAndBan(id, dto.banReason);
  }

  @Post("reports/:id/dismiss")
  async dismissReport(@Param("id") id: string, @CurrentUser() admin: JwtPayload) {
    this.logAdminAction(admin.sub, 'DISMISS_REPORT', id);
    return this.adminService.dismissReport(id);
  }
}
