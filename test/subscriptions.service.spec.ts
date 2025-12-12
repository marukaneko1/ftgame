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
        data: {
          object: {
            mode: "subscription",
            subscription: "sub_1",
            metadata: { userId: "user-1" }
          }
        }
      }))
    },
    subscriptions: {
      retrieve: jest.fn().mockResolvedValue({
        current_period_end: Math.floor(Date.now() / 1000) + 1000
      })
    }
  }));
  return { __esModule: true, default: StripeMock };
});

import { SubscriptionsService } from "../src/modules/subscriptions/subscriptions.service";
import { createPrismaMock } from "./mocks/prisma.mock";
import { SubscriptionStatus } from "@prisma/client";

describe("SubscriptionsService", () => {
  let prisma: any;
  let service: SubscriptionsService;
  const config: any = {
    get: (key: string) => {
      if (key === "stripe.secretKey") return "sk_test";
      if (key === "stripe.webhookSecret") return "whsec_test";
      if (key === "stripe.basicPriceId") return "price_basic";
      if (key === "urls.webBaseUrl") return "http://localhost:3000";
      return undefined;
    }
  };

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new SubscriptionsService(prisma, config);
    prisma.__helpers.seedUser({
      id: "user-1",
      email: "a@test.com",
      displayName: "A",
      username: "usera",
      isBanned: false
    });
    prisma.__helpers.setSubscription("user-1", SubscriptionStatus.INACTIVE);
  });

  it("returns checkout url stub", async () => {
    const session = await service.createBasicCheckoutSession("user-1");
    expect(session.checkoutUrl).toContain("http");
  });

  it("activates subscription on paid event", async () => {
    const payload = Buffer.from(JSON.stringify({}));
    await service.handleWebhook(payload, "sig");
    const sub = await service.getMySubscription("user-1");
    expect(sub?.status).toBe(SubscriptionStatus.ACTIVE);
    expect(sub?.currentPeriodEnd).toBeDefined();
  });

  it("cancels subscription on cancel event", async () => {
    const stripe: any = (service as any).stripe;
    stripe.webhooks.constructEvent = jest.fn().mockReturnValue({
      type: "customer.subscription.deleted",
      data: { object: { metadata: { userId: "user-1" } } }
    });
    const payload = Buffer.from(JSON.stringify({}));
    await service.handleWebhook(payload, "sig");
    const sub = await service.getMySubscription("user-1");
    expect(sub?.status).toBe(SubscriptionStatus.CANCELED);
  });
});

