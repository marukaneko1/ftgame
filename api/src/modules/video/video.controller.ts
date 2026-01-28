import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { VideoService } from "./video.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { JwtPayload } from "../../types/auth";

@Controller("video")
export class VideoController {
  constructor(private readonly videoService: VideoService) {}

  @UseGuards(JwtAuthGuard)
  @Get("token")
  async getToken(@CurrentUser() user: JwtPayload, @Query("sessionId") sessionId: string) {
    return this.videoService.generateTokenForSession(sessionId, user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Get("room-token")
  async getRoomToken(@CurrentUser() user: JwtPayload, @Query("roomId") roomId: string) {
    return this.videoService.generateTokenForRoom(roomId, user.sub);
  }

  @Get("app-id")
  getAppId() {
    // Public endpoint - just returns app ID for frontend initialization
    // Return null if not configured instead of throwing error
    try {
      return { appId: this.videoService.getAppId() };
    } catch (error: any) {
      // Return null appId if Agora is not configured (allows app to work without video)
      return { appId: null };
    }
  }
}


