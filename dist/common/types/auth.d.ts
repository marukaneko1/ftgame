export type AuthRole = "user" | "admin";
export interface JwtPayload {
    sub: string;
    email: string;
    isBanned: boolean;
    roles: AuthRole[];
}
//# sourceMappingURL=auth.d.ts.map