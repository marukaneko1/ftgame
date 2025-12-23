import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Socket } from "socket.io";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class WsJwtGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService, private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const client: Socket = context.switchToWs().getClient<Socket>();
    const token =
      client.handshake.auth?.token ||
      client.handshake.headers?.authorization?.toString().replace("Bearer ", "") ||
      client.handshake.query?.token;

    if (!token || typeof token !== "string") {
      throw new UnauthorizedException("Missing access token");
    }

    try {
      const payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>("jwt.accessSecret")
      });
      (client as any).user = payload;
      return true;
    } catch (error: any) {
      // Don't expose token details or error specifics to prevent information leakage
      throw new UnauthorizedException("Invalid or expired access token");
    }
  }
}


