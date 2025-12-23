import { AuthService } from "../src/modules/auth/auth.service";
import { createPrismaMock } from "./mocks/prisma.mock";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import * as argon2 from "argon2";

jest.mock("google-auth-library", () => {
  return {
    OAuth2Client: jest.fn().mockImplementation(() => ({
      verifyIdToken: jest.fn().mockResolvedValue({
        getPayload: () => ({
          email: "google@test.com",
          sub: "google-sub",
          name: "Google User",
          picture: "pic"
        })
      })
    }))
  };
});

describe("AuthService", () => {
  let prisma: any;
  let authService: AuthService;
  let jwtService: JwtService;
  let configService: ConfigService;

  beforeEach(() => {
    prisma = createPrismaMock();
    jwtService = {
      signAsync: jest.fn().mockResolvedValue("access-token")
    } as any;
    configService = {
      get: jest.fn((key: string) => {
        if (key === "google.clientId") return "google-client";
        if (key === "jwt.accessSecret") return "access-secret";
        if (key === "jwt.accessExpiresIn") return "15m";
        if (key === "jwt.refreshExpiresIn") return "7d";
        return undefined;
      })
    } as any;
    authService = new AuthService(prisma, jwtService, configService);
  });

  it("registers a user and returns tokens", async () => {
    const result = await authService.register({
      email: "test@example.com",
      password: "password123",
      displayName: "Test User",
      username: "testuser"
    });
    expect(result.accessToken).toBeDefined();
    expect(result.refreshToken).toBeDefined();
  });

  it("logs in with correct credentials", async () => {
    await authService.register({
      email: "test@example.com",
      password: "password123",
      displayName: "Test User",
      username: "testuser"
    });
    const result = await authService.login({
      email: "test@example.com",
      password: "password123"
    });
    expect(result.accessToken).toBeDefined();
    expect(result.refreshToken).toBeDefined();
  });

  it("refreshes tokens using a valid refresh token", async () => {
    await authService.register({
      email: "test@example.com",
      password: "password123",
      displayName: "Test User",
      username: "testuser"
    });
    const login = await authService.login({
      email: "test@example.com",
      password: "password123"
    });
    const refreshed = await authService.refresh({ refreshToken: login.refreshToken });
    expect(refreshed.accessToken).toBeDefined();
  });

  it("logs out and revokes refresh token", async () => {
    await authService.register({
      email: "test@example.com",
      password: "password123",
      displayName: "Test User",
      username: "testuser"
    });
    const login = await authService.login({
      email: "test@example.com",
      password: "password123"
    });
    await authService.logout("user-1", login.refreshToken);
    expect(prisma.refreshToken.updateMany).toHaveBeenCalled();
  });

  it("logs in with Google idToken", async () => {
    const result = await authService.googleLogin({ idToken: "fake-id-token" });
    expect(result.accessToken).toBeDefined();
    expect(result.refreshToken).toBeDefined();
  });

  it("rejects login when password mismatch", async () => {
    const passwordHash = await argon2.hash("password123");
    prisma.__helpers.seedUser({
      id: "u1",
      email: "test@example.com",
      passwordHash,
      displayName: "User",
      username: "user1",
      isBanned: false
    });
    await expect(
      authService.login({ email: "test@example.com", password: "wrong" })
    ).rejects.toThrow("Invalid credentials");
  });
});


