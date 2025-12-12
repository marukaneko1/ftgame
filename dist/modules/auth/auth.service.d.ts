import { PrismaService } from "../../prisma/prisma.service";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
import { GoogleLoginDto } from "./dto/google-login.dto";
import { RefreshDto } from "./dto/refresh.dto";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
export declare class AuthService {
    private readonly prisma;
    private readonly jwtService;
    private readonly configService;
    private googleClient;
    constructor(prisma: PrismaService, jwtService: JwtService, configService: ConfigService);
    register(dto: RegisterDto): Promise<{
        accessToken: string;
        refreshToken: string | undefined;
    }>;
    login(dto: LoginDto): Promise<{
        accessToken: string;
        refreshToken: string | undefined;
    }>;
    googleLogin(dto: GoogleLoginDto): Promise<{
        accessToken: string;
        refreshToken: string | undefined;
    }>;
    refresh(dto: RefreshDto, refreshTokenFromCookie?: string): Promise<{
        accessToken: string;
        refreshToken: string | undefined;
    }>;
    logout(userId: string, providedToken?: string): Promise<void>;
    private issueTokens;
    private ensureWalletAndSubscription;
    private sanitizeUsername;
    private hash;
    private findMatchingRefreshToken;
    private parseExpiresInMs;
    private assertNotBanned;
}
//# sourceMappingURL=auth.service.d.ts.map