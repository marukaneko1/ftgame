import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { VideoService } from "./video.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { JwtPayload } from "../../common/types/auth";

@Controller("video")
export class VideoController {
  constructor(private readonly videoService: VideoService) {}

  @UseGuards(JwtAuthGuard)
  @Get("token")
  async getToken(@CurrentUser() user: JwtPayload, @Query("sessionId") sessionId: string) {
    return this.videoService.generateTokenForSession(sessionId, user.sub);
  }

  @Get("app-id")
  getAppId() {
    // Public endpoint - just returns app ID for frontend initialization
    return { appId: this.videoService.getAppId() };
  }
}


