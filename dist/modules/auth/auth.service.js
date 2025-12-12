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
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const argon2 = require("argon2");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const google_auth_library_1 = require("google-auth-library");
const uuid_1 = require("uuid");
let AuthService = class AuthService {
    prisma;
    jwtService;
    configService;
    googleClient = null;
    constructor(prisma, jwtService, configService) {
        this.prisma = prisma;
        this.jwtService = jwtService;
        this.configService = configService;
        const clientId = this.configService.get("google.clientId");
        if (clientId) {
            this.googleClient = new google_auth_library_1.OAuth2Client(clientId);
        }
    }
    async register(dto) {
        const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
        if (existing) {
            throw new common_1.BadRequestException("Email already registered");
        }
        const existingUsername = await this.prisma.user.findUnique({ where: { username: dto.username } });
        if (existingUsername) {
            throw new common_1.BadRequestException("Username already taken");
        }
        const passwordHash = await argon2.hash(dto.password);
        const user = await this.prisma.user.create({
            data: {
                email: dto.email,
                passwordHash,
                displayName: dto.displayName,
                username: dto.username,
                dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
                wallet: {
                    create: {}
                },
                subscription: {
                    create: {}
                }
            }
        });
        const tokens = await this.issueTokens(user);
        return tokens;
    }
    async login(dto) {
        const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
        if (!user || !user.passwordHash) {
            throw new common_1.UnauthorizedException("Invalid credentials");
        }
        const valid = await argon2.verify(user.passwordHash, dto.password);
        if (!valid) {
            throw new common_1.UnauthorizedException("Invalid credentials");
        }
        this.assertNotBanned(user);
        await this.ensureWalletAndSubscription(user.id);
        return this.issueTokens(user);
    }
    async googleLogin(dto) {
        if (!this.googleClient) {
            throw new common_1.BadRequestException("Google OAuth not configured");
        }
        const ticket = await this.googleClient.verifyIdToken({
            idToken: dto.idToken,
            audience: this.configService.get("google.clientId")
        });
        const payload = ticket.getPayload();
        if (!payload?.email || !payload.sub) {
            throw new common_1.UnauthorizedException("Invalid Google token");
        }
        let user = await this.prisma.user.findFirst({
            where: {
                OR: [{ googleId: payload.sub }, { email: payload.email }]
            }
        });
        if (!user) {
            user = await this.prisma.user.create({
                data: {
                    email: payload.email,
                    googleId: payload.sub,
                    displayName: payload.name || payload.email.split("@")[0],
                    username: this.sanitizeUsername(payload.email),
                    avatarUrl: payload.picture,
                    is18PlusVerified: false,
                    wallet: { create: {} },
                    subscription: { create: {} }
                }
            });
        }
        else if (!user.googleId) {
            user = await this.prisma.user.update({
                where: { id: user.id },
                data: { googleId: payload.sub }
            });
        }
        await this.ensureWalletAndSubscription(user.id);
        return this.issueTokens(user);
    }
    async refresh(dto, refreshTokenFromCookie) {
        const raw = dto.refreshToken || refreshTokenFromCookie;
        if (!raw) {
            throw new common_1.UnauthorizedException("Missing refresh token");
        }
        const tokens = await this.prisma.refreshToken.findMany({
            where: { revokedAt: null, expiresAt: { gt: new Date() } },
            orderBy: { createdAt: "desc" },
            take: 20
        });
        const matched = await this.findMatchingRefreshToken(tokens, raw);
        if (!matched) {
            throw new common_1.UnauthorizedException("Invalid refresh token");
        }
        const user = await this.prisma.user.findUnique({ where: { id: matched.userId } });
        if (!user) {
            throw new common_1.UnauthorizedException("Invalid refresh token");
        }
        this.assertNotBanned(user);
        return this.issueTokens(user, matched.id);
    }
    async logout(userId, providedToken) {
        if (!providedToken)
            return;
        const hashed = await this.hash(providedToken);
        await this.prisma.refreshToken.updateMany({
            where: { userId, tokenHash: hashed, revokedAt: null },
            data: { revokedAt: new Date() }
        });
    }
    async issueTokens(user, reuseTokenId) {
        const payload = {
            sub: user.id,
            email: user.email,
            isBanned: user.isBanned,
            roles: []
        };
        const accessToken = await this.jwtService.signAsync(payload, {
            secret: this.configService.get("jwt.accessSecret"),
            expiresIn: this.configService.get("jwt.accessExpiresIn") || "15m"
        });
        let refreshTokenId = reuseTokenId;
        let refreshToken;
        if (!reuseTokenId) {
            refreshToken = (0, uuid_1.v4)();
            const hashed = await this.hash(refreshToken);
            const expiresIn = this.configService.get("jwt.refreshExpiresIn") || "7d";
            const expiresAt = new Date(Date.now() + this.parseExpiresInMs(expiresIn));
            const created = await this.prisma.refreshToken.create({
                data: {
                    userId: user.id,
                    tokenHash: hashed,
                    expiresAt
                }
            });
            refreshTokenId = created.id;
        }
        return { accessToken, refreshToken };
    }
    async ensureWalletAndSubscription(userId) {
        await this.prisma.wallet.upsert({
            where: { userId },
            update: {},
            create: { userId }
        });
        await this.prisma.subscription.upsert({
            where: { userId },
            update: {},
            create: { userId }
        });
    }
    sanitizeUsername(email) {
        const base = email.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "").slice(0, 15) || "user";
        return `${base}${Math.floor(Math.random() * 1000)}`;
    }
    async hash(value) {
        return argon2.hash(value);
    }
    async findMatchingRefreshToken(tokens, raw) {
        for (const token of tokens) {
            const valid = await argon2.verify(token.tokenHash, raw);
            if (valid)
                return token;
        }
        return null;
    }
    parseExpiresInMs(expiresIn) {
        const match = expiresIn.match(/^(\d+)([smhd])$/);
        if (!match)
            return 7 * 24 * 60 * 60 * 1000;
        const value = parseInt(match[1], 10);
        const unit = match[2];
        switch (unit) {
            case "s":
                return value * 1000;
            case "m":
                return value * 60 * 1000;
            case "h":
                return value * 60 * 60 * 1000;
            case "d":
            default:
                return value * 24 * 60 * 60 * 1000;
        }
    }
    assertNotBanned(user) {
        if (user.isBanned) {
            throw new common_1.UnauthorizedException("Account is banned");
        }
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        jwt_1.JwtService,
        config_1.ConfigService])
], AuthService);
//# sourceMappingURL=auth.service.js.map