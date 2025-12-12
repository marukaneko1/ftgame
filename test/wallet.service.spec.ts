jest.mock("stripe", () => {
  const StripeMock = jest.fn().mockImplementation(() => ({
    checkout: {
      sessions: {
        create: jest.fn().mockResolvedValue({ url: "https://fake-checkout" })
      }
    },
    webhooks: {
      constructEvent: jest.fn(() => ({
        type: "checkout.session.completed",
        data: { object: { metadata: { userId: "user-1", packId: "small" } } }
      }))
    }
  }));
  return { __esModule: true, default: StripeMock };
});

import { WalletService } from "../src/modules/wallet/wallet.service";
import { createPrismaMock } from "./mocks/prisma.mock";
import { WalletTransactionType, WagerStatus } from "@prisma/client";

describe("WalletService", () => {
  let prisma: any;
  let service: WalletService;
  const config: any = {
    get: (key: string) => {
      if (key === "stripe.secretKey") return "sk_test";
      if (key === "stripe.webhookSecret") return "whsec_test";
      if (key === "stripe.tokenPackPriceId") return "price_token_pack";
      if (key === "urls.webBaseUrl") return "http://localhost:3000";
      return undefined;
    }
  };

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new WalletService(prisma, config);
    prisma.__helpers.seedUser({
      id: "user-1",
      email: "a@test.com",
      displayName: "A",
      username: "usera",
      isBanned: false
    });
    prisma.__helpers.setWallet("user-1", 100);
  });

  it("credits tokens and records a purchase transaction", async () => {
    const wallet = await service.creditTokens("user-1", 50, { source: "test" });
    expect(wallet.balanceTokens).toBe(150);
    expect(wallet.transactions[0].type).toBe(WalletTransactionType.PURCHASE);
  });

  it("rejects debit when balance insufficient", async () => {
    await expect(
      service.debitTokens("user-1", 1000, WalletTransactionType.GIFT_SENT)
    ).rejects.toThrow("Insufficient tokens");
  });

  it("locks tokens for wager", async () => {
    await service.lockTokensForWager("user-1", 30);
    const wallet = await prisma.wallet.findUnique({ where: { userId: "user-1" } });
    expect(wallet.balanceTokens).toBe(70);
  });

  it("pays out wager to winner minus rake", async () => {
    prisma.__helpers.setWallet("winner-1", 0);
    prisma.__helpers.seedUser({
      id: "winner-1",
      email: "w@test.com",
      displayName: "Winner",
      username: "winner",
      isBanned: false
    });
    prisma.__helpers.seedWager({
      id: "wager-1",
      status: WagerStatus.LOCKED,
      gameId: "game-1",
      participants: [
        { userId: "winner-1", stakeTokens: 50 },
        { userId: "user-1", stakeTokens: 50 }
      ]
    });

    const result = await service.payoutWager("wager-1", "winner-1");
    expect(result.payoutTokens).toBe(95); // 5% rake
    const wallet = await prisma.wallet.findUnique({ where: { userId: "winner-1" } });
    expect(wallet.balanceTokens).toBe(95);
  });
});

