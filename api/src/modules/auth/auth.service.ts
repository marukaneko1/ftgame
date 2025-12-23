import { BadRequestException, Injectable, UnauthorizedException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
import { GoogleLoginDto } from "./dto/google-login.dto";
import { RefreshDto } from "./dto/refresh.dto";
import * as argon2 from "argon2";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { OAuth2Client } from "google-auth-library";
import { v4 as uuidv4 } from "uuid";
import { JwtPayload } from "@omegle-game/shared/src/types/auth";

@Injectable()
export class AuthService {
  private googleClient: OAuth2Client | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService
  ) {
    const clientId = this.configService.get<string>("google.clientId");
    if (clientId) {
      this.googleClient = new OAuth2Client(clientId);
    }
  }

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new BadRequestException("Email already registered");
    }
    const existingUsername = await this.prisma.user.findUnique({ where: { username: dto.username } });
    if (existingUsername) {
      throw new BadRequestException("Username already taken");
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

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException("Invalid credentials");
    }
    const valid = await argon2.verify(user.passwordHash, dto.password);
    if (!valid) {
      throw new UnauthorizedException("Invalid credentials");
    }
    this.assertNotBanned(user);
    await this.ensureWalletAndSubscription(user.id);
    return this.issueTokens(user);
  }

  async googleLogin(dto: GoogleLoginDto) {
    if (!this.googleClient) {
      throw new BadRequestException("Google OAuth not configured");
    }
    const ticket = await this.googleClient.verifyIdToken({
      idToken: dto.idToken,
      audience: this.configService.get<string>("google.clientId")
    });
    const payload = ticket.getPayload();
    if (!payload?.email || !payload.sub) {
      throw new UnauthorizedException("Invalid Google token");
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
          username: await this.sanitizeUsername(payload.email),
          avatarUrl: payload.picture,
          is18PlusVerified: false,
          wallet: { create: {} },
          subscription: { create: {} }
        }
      });
    } else if (!user.googleId) {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: { googleId: payload.sub }
      });
    }

    await this.ensureWalletAndSubscription(user.id);
    return this.issueTokens(user);
  }

  async refresh(dto: RefreshDto, refreshTokenFromCookie?: string) {
    const raw = dto.refreshToken || refreshTokenFromCookie;
    if (!raw) {
      throw new UnauthorizedException("Missing refresh token");
    }
    
    // Find the matching token by checking all recent tokens
    // Note: We check all tokens because we can't identify the user until we verify the hash
    // To improve security, we limit the search to recent tokens only
    const allRecentTokens = await this.prisma.refreshToken.findMany({
      where: { revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
      take: 100 // Limit to most recent 100 tokens for performance
    });
    
    const matched = await this.findMatchingRefreshToken(allRecentTokens, raw);
    if (!matched) {
      throw new UnauthorizedException("Invalid refresh token");
    }
    
    // Fetch user and check ban status before proceeding
    const user = await this.prisma.user.findUnique({ 
      where: { id: matched.userId },
      select: { id: true, email: true, isBanned: true, banReason: true }
    });
    if (!user) {
      throw new UnauthorizedException("Invalid refresh token");
    }
    this.assertNotBanned(user);
    
    // Revoke the old refresh token (token rotation for security)
    await this.prisma.refreshToken.update({
      where: { id: matched.id },
      data: { revokedAt: new Date() }
    });
    
    // Issue new tokens with a new refresh token
    return this.issueTokens(user);
  }

  async logout(userId: string, providedToken?: string) {
    if (!providedToken) return;
    const hashed = await this.hash(providedToken);
    await this.prisma.refreshToken.updateMany({
      where: { userId, tokenHash: hashed, revokedAt: null },
      data: { revokedAt: new Date() }
    });
  }

  private async issueTokens(user: { id: string; email: string; isBanned: boolean }) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      isBanned: user.isBanned,
      roles: []
    };
    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>("jwt.accessSecret"),
      expiresIn: this.configService.get<string>("jwt.accessExpiresIn") || "15m"
    });

    // Always create a new refresh token (token rotation)
    const refreshToken = uuidv4();
    const hashed = await this.hash(refreshToken);
    const expiresIn = this.configService.get<string>("jwt.refreshExpiresIn") || "7d";
    const expiresAt = new Date(Date.now() + this.parseExpiresInMs(expiresIn));
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: hashed,
        expiresAt
      }
    });

    return { accessToken, refreshToken };
  }

  private async ensureWalletAndSubscription(userId: string) {
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

  private async sanitizeUsername(email: string): Promise<string> {
    const base = email.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "").slice(0, 15) || "user";
    
    // Try to create a unique username with retries
    let attempts = 0;
    const maxAttempts = 10;
    
    while (attempts < maxAttempts) {
      const candidate = `${base}${Math.floor(Math.random() * 10000)}`;
      const existing = await this.prisma.user.findUnique({ 
        where: { username: candidate },
        select: { id: true }
      });
      
      if (!existing) {
        return candidate;
      }
      
      attempts++;
    }
    
    // Fallback to UUID-based username if all attempts fail
    return `${base}_${uuidv4().slice(0, 8)}`;
  }

  private async hash(value: string) {
    return argon2.hash(value);
  }

  private async findMatchingRefreshToken(
    tokens: { id: string; tokenHash: string; userId: string }[],
    raw: string
  ) {
    for (const token of tokens) {
      const valid = await argon2.verify(token.tokenHash, raw);
      if (valid) return token;
    }
    return null;
  }

  private parseExpiresInMs(expiresIn: string): number {
    const match = expiresIn.match(/^(\d+)([smhd])$/);
    if (!match) return 7 * 24 * 60 * 60 * 1000;
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

  private assertNotBanned(user: { isBanned: boolean; banReason?: string | null }) {
    if (user.isBanned) {
      throw new UnauthorizedException("Account is banned");
    }
  }
}

