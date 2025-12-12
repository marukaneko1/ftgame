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
exports.WsJwtGuard = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
let WsJwtGuard = class WsJwtGuard {
    jwtService;
    configService;
    constructor(jwtService, configService) {
        this.jwtService = jwtService;
        this.configService = configService;
    }
    canActivate(context) {
        const client = context.switchToWs().getClient();
        const token = client.handshake.auth?.token ||
            client.handshake.headers?.authorization?.toString().replace("Bearer ", "") ||
            client.handshake.query?.token;
        if (!token || typeof token !== "string") {
            console.error("[WsJwtGuard] Missing token. Auth:", client.handshake.auth, "Headers:", client.handshake.headers?.authorization, "Query:", client.handshake.query?.token);
            throw new common_1.UnauthorizedException("Missing access token");
        }
        try {
            const payload = this.jwtService.verify(token, {
                secret: this.configService.get("jwt.accessSecret")
            });
            client.user = payload;
            return true;
        }
        catch (error) {
            console.error("[WsJwtGuard] Token verification failed:", error.message, "Token preview:", token.substring(0, 20) + "...");
            throw new common_1.UnauthorizedException(`Invalid or expired access token: ${error.message}`);
        }
    }
};
exports.WsJwtGuard = WsJwtGuard;
exports.WsJwtGuard = WsJwtGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [jwt_1.JwtService, config_1.ConfigService])
], WsJwtGuard);
//# sourceMappingURL=ws-jwt.guard.js.map