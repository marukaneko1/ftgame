import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { JwtPayload } from "@omegle-game/shared/src/types/auth";

export const CurrentUser = createParamDecorator((data: unknown, ctx: ExecutionContext): JwtPayload | undefined => {
  const request = ctx.switchToHttp().getRequest();
  return request.user as JwtPayload | undefined;
});


