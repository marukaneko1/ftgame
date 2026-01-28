// Local copy of shared auth types for Railway deployment
// This is needed because Railway builds from api/ directory and doesn't have access to workspace dependencies
export type AuthRole = "user" | "admin";

export interface JwtPayload {
  sub: string;
  email: string;
  isBanned: boolean;
  roles: AuthRole[];
}


