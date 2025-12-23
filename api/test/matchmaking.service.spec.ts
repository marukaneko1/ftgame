import { MatchmakingService } from "../src/modules/matchmaking/matchmaking.service";
import { createPrismaMock } from "./mocks/prisma.mock";
import { ConfigService } from "@nestjs/config";
import { SubscriptionStatus } from "@prisma/client";

jest.mock("ioredis", () => {
  const RedisMock = jest.fn().mockImplementation(() => {
    const queue: string[] = [];
    return {
      on: jest.fn(),
      quit: jest.fn(),
      async rpush(_key: string, payload: string) {
        queue.push(payload);
        return queue.length;
      },
      async llen() {
        return queue.length;
      },
      async lpop(_key: string, count?: number) {
        if (!count) return queue.shift() ?? null;
        const items = queue.splice(0, count);
        return items.length ? items : null;
      },
      async lrange() {
        return [...queue];
      },
      async lrem(_key: string, _count: number, value: string) {
        const before = queue.length;
        for (let i = queue.length - 1; i >= 0; i -= 1) {
          if (queue[i] === value) queue.splice(i, 1);
        }
        return before - queue.length;
      }
    };
  });
  return { __esModule: true, default: RedisMock };
});

describe("MatchmakingService", () => {
  let prisma: any;
  let service: MatchmakingService;

  beforeEach(() => {
    prisma = createPrismaMock();
    const configService = {
      get: jest.fn(() => "redis://localhost:6379")
    } as unknown as ConfigService;
    service = new MatchmakingService(prisma, configService);
  });

  it("rejects banned users", async () => {
    prisma.__helpers.seedUser({
      id: "user-1",
      email: "a@test.com",
      displayName: "A",
      username: "usera",
      isBanned: true,
      is18PlusVerified: true
    });
    prisma.__helpers.setSubscription("user-1", SubscriptionStatus.ACTIVE);
    await expect(service.joinQueue("user-1", "us", "en")).rejects.toThrow("Not eligible");
  });

  it("rejects users without active subscription", async () => {
    prisma.__helpers.seedUser({
      id: "user-1",
      email: "a@test.com",
      displayName: "A",
      username: "usera",
      isBanned: false,
      is18PlusVerified: true
    });
    prisma.__helpers.setSubscription("user-1", SubscriptionStatus.INACTIVE);
    await expect(service.joinQueue("user-1", "us", "en")).rejects.toThrow("Not eligible");
  });

  it("pairs two eligible users", async () => {
    prisma.__helpers.seedUser({
      id: "user-1",
      email: "a@test.com",
      displayName: "A",
      username: "usera",
      isBanned: false,
      is18PlusVerified: true
    });
    prisma.__helpers.setSubscription("user-1", SubscriptionStatus.ACTIVE);

    prisma.__helpers.seedUser({
      id: "user-2",
      email: "b@test.com",
      displayName: "B",
      username: "userb",
      isBanned: false,
      is18PlusVerified: true
    });
    prisma.__helpers.setSubscription("user-2", SubscriptionStatus.ACTIVE);

    const firstJoin = await service.joinQueue("user-1", "us", "en");
    expect(firstJoin).toBeNull();
    const pair = await service.joinQueue("user-2", "us", "en");
    expect(pair).not.toBeNull();
    if (pair) {
      const ids = pair.map((p) => p.userId);
      expect(ids).toContain("user-1");
      expect(ids).toContain("user-2");
    }
  });
});


