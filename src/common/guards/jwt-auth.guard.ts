import { ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {
  handleRequest<TUser = any>(err: any, user: any, info: any, _context: ExecutionContext, _status?: any): TUser {
    if (err || !user) {
      throw err || new UnauthorizedException("Invalid or missing access token");
    }
    return user;
  }

  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }
}


