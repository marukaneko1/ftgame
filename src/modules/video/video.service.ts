import { ForbiddenException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../../prisma/prisma.service";
import { RtcRole, RtcTokenBuilder } from "agora-access-token";

@Injectable()
export class VideoService {
  constructor(private readonly prisma: PrismaService, private readonly configService: ConfigService) {}

  async generateTokenForSession(sessionId: string, userId: string) {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      select: { id: true, userAId: true, userBId: true, videoChannelName: true }
    });
    if (!session) throw new ForbiddenException("Session not found");
    if (session.userAId !== userId && session.userBId !== userId) {
      throw new ForbiddenException("Not a participant in session");
    }
    return this.buildToken(session.videoChannelName, userId);
  }

  getAppId() {
    const appId = this.configService.get<string>("agora.appId");
    if (!appId || appId.trim() === "") {
      throw new Error("AGORA_APP_ID is not configured");
    }
    return appId.trim();
  }

  buildToken(channelName: string, userId: string) {
    const appId = this.configService.get<string>("agora.appId")?.trim();
    const appCertificate = this.configService.get<string>("agora.appCertificate")?.trim();
    if (!appId || !appCertificate) {
      throw new Error("Agora credentials missing. Please set AGORA_APP_ID and AGORA_APP_CERTIFICATE in your .env file");
    }
    const expireSeconds = 60 * 60; // 1 hour
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const privilegeExpiredTs = currentTimestamp + expireSeconds;

    const token = RtcTokenBuilder.buildTokenWithAccount(
      appId,
      appCertificate,
      channelName,
      userId,
      RtcRole.PUBLISHER,
      privilegeExpiredTs
    );
    return { token, channelName, expiresAt: new Date(privilegeExpiredTs * 1000).toISOString() };
  }
}


