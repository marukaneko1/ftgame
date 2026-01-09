import { BadRequestException, Injectable, UnauthorizedException, Logger } from "@nestjs/common";
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

/**
 * SECURITY: Account lockout configuration
 */
interface LoginAttempt {
  count: number;
  lastAttempt: number;
  lockedUntil?: number;
}

// SECURITY: Constants for account lockout
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

// SECURITY: Constants for refresh token brute force protection
const MAX_REFRESH_ATTEMPTS = 10;
const REFRESH_LOCKOUT_MS = 60 * 60 * 1000; // 1 hour

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private googleClient: OAuth2Client | null = null;
  
  // SECURITY: In-memory tracking for failed attempts
  // For production, use Redis for distributed tracking
  private loginAttempts = new Map<string, LoginAttempt>();
  private refreshAttempts = new Map<string, LoginAttempt>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService
  ) {
    const clientId = this.configService.get<string>("google.clientId");
    if (clientId) {
      this.googleClient = new OAuth2Client(clientId);
    }
    
    // Cleanup old entries every 30 minutes
    setInterval(() => this.cleanupAttempts(), 30 * 60 * 1000);
  }
  
  /**
   * SECURITY: Check if account is locked out
   */
  private checkLockout(key: string, attemptsMap: Map<string, LoginAttempt>, maxAttempts: number, lockoutMs: number): void {
    const attempt = attemptsMap.get(key);
    if (!attempt) return;
    
    const now = Date.now();
    
    // Check if currently locked
    if (attempt.lockedUntil && now < attempt.lockedUntil) {
      const remainingMs = attempt.lockedUntil - now;
      const remainingMins = Math.ceil(remainingMs / 60000);
      throw new UnauthorizedException(`Account locked. Try again in ${remainingMins} minutes.`);
    }
    
    // Reset if window has passed
    if (now - attempt.lastAttempt > ATTEMPT_WINDOW_MS) {
      attemptsMap.delete(key);
    }
  }
  
  /**
   * SECURITY: Record a failed attempt
   */
  private recordFailedAttempt(key: string, attemptsMap: Map<string, LoginAttempt>, maxAttempts: number, lockoutMs: number): void {
    const now = Date.now();
    const attempt = attemptsMap.get(key) || { count: 0, lastAttempt: now };
    
    // Reset if window has passed
    if (now - attempt.lastAttempt > ATTEMPT_WINDOW_MS) {
      attempt.count = 0;
    }
    
    attempt.count++;
    attempt.lastAttempt = now;
    
    if (attempt.count >= maxAttempts) {
      attempt.lockedUntil = now + lockoutMs;
      this.logger.warn(`Account locked for key: ${key.substring(0, 8)}... after ${attempt.count} failed attempts`);
    }
    
    attemptsMap.set(key, attempt);
  }
  
  /**
   * SECURITY: Clear failed attempts on successful action
   */
  private clearAttempts(key: string, attemptsMap: Map<string, LoginAttempt>): void {
    attemptsMap.delete(key);
  }
  
  /**
   * Cleanup old attempt entries
   */
  private cleanupAttempts(): void {
    const now = Date.now();
    for (const [key, attempt] of this.loginAttempts.entries()) {
      if (now - attempt.lastAttempt > ATTEMPT_WINDOW_MS * 2) {
        this.loginAttempts.delete(key);
      }
    }
    for (const [key, attempt] of this.refreshAttempts.entries()) {
      if (now - attempt.lastAttempt > REFRESH_LOCKOUT_MS * 2) {
        this.refreshAttempts.delete(key);
      }
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
    // SECURITY: Check for account lockout before attempting login
    this.checkLockout(dto.email.toLowerCase(), this.loginAttempts, MAX_LOGIN_ATTEMPTS, LOCKOUT_DURATION_MS);
    
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user || !user.passwordHash) {
      // SECURITY: Record failed attempt even if user doesn't exist (timing attack protection)
      this.recordFailedAttempt(dto.email.toLowerCase(), this.loginAttempts, MAX_LOGIN_ATTEMPTS, LOCKOUT_DURATION_MS);
      throw new UnauthorizedException("Invalid credentials");
    }
    
    const valid = await argon2.verify(user.passwordHash, dto.password);
    if (!valid) {
      // SECURITY: Record failed attempt
      this.recordFailedAttempt(dto.email.toLowerCase(), this.loginAttempts, MAX_LOGIN_ATTEMPTS, LOCKOUT_DURATION_MS);
      throw new UnauthorizedException("Invalid credentials");
    }
    
    // SECURITY: Clear failed attempts on successful login
    this.clearAttempts(dto.email.toLowerCase(), this.loginAttempts);
    
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

  async refresh(dto: RefreshDto, refreshTokenFromCookie?: string, clientIp?: string) {
    const raw = dto.refreshToken || refreshTokenFromCookie;
    if (!raw) {
      throw new UnauthorizedException("Missing refresh token");
    }
    
    // SECURITY: Use IP-based rate limiting for refresh token brute force protection
    const rateLimitKey = clientIp || 'unknown';
    this.checkLockout(rateLimitKey, this.refreshAttempts, MAX_REFRESH_ATTEMPTS, REFRESH_LOCKOUT_MS);
    
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
      // SECURITY: Record failed refresh attempt
      this.recordFailedAttempt(rateLimitKey, this.refreshAttempts, MAX_REFRESH_ATTEMPTS, REFRESH_LOCKOUT_MS);
      throw new UnauthorizedException("Invalid refresh token");
    }
    
    // SECURITY: Clear failed attempts on successful refresh
    this.clearAttempts(rateLimitKey, this.refreshAttempts);
    
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

