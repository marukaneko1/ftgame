import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { SubscriptionStatus } from "@prisma/client";
import Stripe from "stripe";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class SubscriptionsService {
  private stripe: Stripe | null = null;
  private logger = new Logger(SubscriptionsService.name);

  constructor(private readonly prisma: PrismaService, private readonly configService: ConfigService) {
    const secretKey = this.configService.get<string>("stripe.secretKey");
    if (secretKey) {
      this.stripe = new Stripe(secretKey);
    } else {
      this.logger.warn("STRIPE_SECRET_KEY not configured - Stripe features will be disabled");
    }
  }

  async getMySubscription(userId: string) {
    return this.prisma.subscription.findUnique({ where: { userId } });
  }

  async createBasicCheckoutSession(userId: string) {
    if (!this.stripe) {
      throw new BadRequestException("Stripe is not configured");
    }
    const priceId = this.configService.get<string>("stripe.basicPriceId");
    if (!priceId) throw new BadRequestException("Stripe basic price not configured");
    const successUrl = `${this.configService.get("urls.webBaseUrl")}/dashboard?checkout=success`;
    const cancelUrl = `${this.configService.get("urls.webBaseUrl")}/dashboard?checkout=cancel`;

    const session = await this.stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: { userId }
    });
    return { checkoutUrl: session.url };
  }

  async handleWebhook(rawBody: Buffer, signature: string | undefined) {
    if (!this.stripe) {
      throw new BadRequestException("Stripe is not configured");
    }
    const webhookSecret = this.configService.get<string>("stripe.webhookSecret");
    if (!webhookSecret) {
      throw new Error("STRIPE_WEBHOOK_SECRET missing");
    }
    if (!signature) {
      throw new BadRequestException("Missing Stripe signature");
    }

    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch (err) {
      this.logger.error(`Stripe signature verification failed: ${err}`);
      throw new BadRequestException("Invalid Stripe signature");
    }

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode === "subscription" && session.subscription && session.metadata?.userId) {
          await this.activateSubscription(session.metadata.userId, session.subscription.toString());
        }
        break;
      }
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.userId;
        if (userId) {
          await this.prisma.subscription.update({
            where: { userId },
            data: { status: SubscriptionStatus.CANCELED }
          });
        }
        break;
      }
      default:
        this.logger.log(`Unhandled Stripe event ${event.type}`);
    }

    return { received: true };
  }

  private async activateSubscription(userId: string, stripeSubscriptionId: string) {
    const existing = await this.prisma.subscription.findUnique({ where: { userId } });
    // Idempotent: if already active and ids match, skip.
    if (existing?.status === SubscriptionStatus.ACTIVE && existing.stripeSubscriptionId === stripeSubscriptionId) {
      return existing;
    }

    // Fetch subscription for period end
    if (!this.stripe) {
      throw new BadRequestException("Stripe is not configured");
    }
    const subscription = await this.stripe.subscriptions.retrieve(stripeSubscriptionId);
    const currentPeriodEnd = subscription.current_period_end
      ? new Date(subscription.current_period_end * 1000)
      : null;

    return this.prisma.subscription.update({
      where: { userId },
      data: {
        status: SubscriptionStatus.ACTIVE,
        stripeSubscriptionId,
        startedAt: existing?.startedAt ?? new Date(),
        currentPeriodEnd
      }
    });
  }
}

