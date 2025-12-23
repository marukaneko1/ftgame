import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { AdminService } from "./admin.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { AdminGuard } from "../../common/guards/admin.guard";
import { KycStatus, SubscriptionStatus, ReportStatus } from "@prisma/client";
import { IsEnum, IsBoolean, IsString, IsOptional, IsDateString } from "class-validator";

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
  constructor(private readonly adminService: AdminService) {}

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
  async verifyUser(@Param("id") id: string, @Body() dto: VerifyUserDto) {
    return this.adminService.verifyUser(id, dto.verified);
  }

  @Patch("users/:id/kyc-status")
  async updateKycStatus(@Param("id") id: string, @Body() dto: UpdateKycStatusDto) {
    return this.adminService.updateKycStatus(id, dto.status);
  }

  @Patch("users/:id/ban")
  async banUser(@Param("id") id: string, @Body() dto: BanUserDto) {
    return this.adminService.banUser(id, dto.reason || "Banned by administrator");
  }

  @Patch("users/:id/unban")
  async unbanUser(@Param("id") id: string) {
    return this.adminService.unbanUser(id);
  }

  @Patch("users/:id/subscription")
  async updateSubscription(@Param("id") id: string, @Body() dto: UpdateSubscriptionDto) {
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
  async updateReportStatus(@Param("id") id: string, @Body() dto: UpdateReportStatusDto) {
    return this.adminService.updateReportStatus(id, dto.status);
  }

  @Post("reports/:id/resolve-ban")
  async resolveReportAndBan(@Param("id") id: string, @Body() dto: ResolveReportDto) {
    return this.adminService.resolveReportAndBan(id, dto.banReason);
  }

  @Post("reports/:id/dismiss")
  async dismissReport(@Param("id") id: string) {
    return this.adminService.dismissReport(id);
  }
}
