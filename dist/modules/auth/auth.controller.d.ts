import { AuthService } from "./auth.service";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
import { GoogleLoginDto } from "./dto/google-login.dto";
import { RefreshDto } from "./dto/refresh.dto";
import { Request, Response } from "express";
import { JwtPayload } from "../../common/types/auth";
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    register(dto: RegisterDto, res: Response): Promise<{
        accessToken: string;
    }>;
    login(dto: LoginDto, res: Response): Promise<{
        accessToken: string;
    }>;
    google(dto: GoogleLoginDto, res: Response): Promise<{
        accessToken: string;
    }>;
    refresh(dto: RefreshDto, req: Request, res: Response): Promise<{
        accessToken: string;
    }>;
    logout(user: JwtPayload, req: Request, res: Response): Promise<{
        success: boolean;
    }>;
    health(): {
        ok: boolean;
    };
    private setRefreshCookie;
    private getRefreshMs;
}
//# sourceMappingURL=auth.controller.d.ts.map