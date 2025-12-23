import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  UseGuards
} from "@nestjs/common";
import { AuthService } from "./auth.service";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
import { GoogleLoginDto } from "./dto/google-login.dto";
import { RefreshDto } from "./dto/refresh.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { Request, Response } from "express";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { JwtPayload } from "@omegle-game/shared/src/types/auth";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("register")
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    const tokens = await this.authService.register(dto);
    this.setRefreshCookie(res, tokens.refreshToken);
    return { accessToken: tokens.accessToken };
  }

  @Post("login")
  @HttpCode(200)
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const tokens = await this.authService.login(dto);
    this.setRefreshCookie(res, tokens.refreshToken);
    return { accessToken: tokens.accessToken };
  }

  @Post("google")
  async google(@Body() dto: GoogleLoginDto, @Res({ passthrough: true }) res: Response) {
    const tokens = await this.authService.googleLogin(dto);
    this.setRefreshCookie(res, tokens.refreshToken);
    return { accessToken: tokens.accessToken };
  }

  @Post("refresh")
  async refresh(@Body() dto: RefreshDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const tokens = await this.authService.refresh(dto, req.cookies?.refresh_token as string);
    if (tokens.refreshToken) {
      this.setRefreshCookie(res, tokens.refreshToken);
    }
    return { accessToken: tokens.accessToken };
  }

  @Post("logout")
  @UseGuards(JwtAuthGuard)
  async logout(
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ) {
    await this.authService.logout(user.sub, (req.cookies?.refresh_token as string) || undefined);
    res.clearCookie("refresh_token");
    return { success: true };
  }

  @Get("health")
  @HttpCode(200)
  health() {
    return { ok: true };
  }

  private setRefreshCookie(res: Response, token?: string) {
    if (!token) return;
    res.cookie("refresh_token", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: this.getRefreshMs()
    });
  }

  private getRefreshMs() {
    const value = process.env.JWT_REFRESH_EXPIRES_IN || "7d";
    const match = value.match(/^(\d+)([smhd])$/);
    if (!match) return 7 * 24 * 60 * 60 * 1000;
    const num = parseInt(match[1], 10);
    const unit = match[2];
    switch (unit) {
      case "s":
        return num * 1000;
      case "m":
        return num * 60 * 1000;
      case "h":
        return num * 60 * 60 * 1000;
      case "d":
      default:
        return num * 24 * 60 * 60 * 1000;
    }
  }
}


