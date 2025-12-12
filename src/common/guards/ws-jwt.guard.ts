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
      console.error("[WsJwtGuard] Missing token. Auth:", client.handshake.auth, "Headers:", client.handshake.headers?.authorization, "Query:", client.handshake.query?.token);
      throw new UnauthorizedException("Missing access token");
    }

    try {
      const payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>("jwt.accessSecret")
      });
      (client as any).user = payload;
      return true;
    } catch (error: any) {
      console.error("[WsJwtGuard] Token verification failed:", error.message, "Token preview:", token.substring(0, 20) + "...");
      throw new UnauthorizedException(`Invalid or expired access token: ${error.message}`);
    }
  }
}


