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
exports.VideoService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const prisma_service_1 = require("../../prisma/prisma.service");
const agora_access_token_1 = require("agora-access-token");
let VideoService = class VideoService {
    prisma;
    configService;
    constructor(prisma, configService) {
        this.prisma = prisma;
        this.configService = configService;
    }
    async generateTokenForSession(sessionId, userId) {
        const session = await this.prisma.session.findUnique({
            where: { id: sessionId },
            select: { id: true, userAId: true, userBId: true, videoChannelName: true }
        });
        if (!session)
            throw new common_1.ForbiddenException("Session not found");
        if (session.userAId !== userId && session.userBId !== userId) {
            throw new common_1.ForbiddenException("Not a participant in session");
        }
        return this.buildToken(session.videoChannelName, userId);
    }
    getAppId() {
        const appId = this.configService.get("agora.appId");
        if (!appId || appId.trim() === "") {
            throw new Error("AGORA_APP_ID is not configured");
        }
        return appId.trim();
    }
    buildToken(channelName, userId) {
        const appId = this.configService.get("agora.appId")?.trim();
        const appCertificate = this.configService.get("agora.appCertificate")?.trim();
        if (!appId || !appCertificate) {
            throw new Error("Agora credentials missing. Please set AGORA_APP_ID and AGORA_APP_CERTIFICATE in your .env file");
        }
        const expireSeconds = 60 * 60;
        const currentTimestamp = Math.floor(Date.now() / 1000);
        const privilegeExpiredTs = currentTimestamp + expireSeconds;
        const token = agora_access_token_1.RtcTokenBuilder.buildTokenWithAccount(appId, appCertificate, channelName, userId, agora_access_token_1.RtcRole.PUBLISHER, privilegeExpiredTs);
        return { token, channelName, expiresAt: new Date(privilegeExpiredTs * 1000).toISOString() };
    }
};
exports.VideoService = VideoService;
exports.VideoService = VideoService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService, config_1.ConfigService])
], VideoService);
//# sourceMappingURL=video.service.js.map