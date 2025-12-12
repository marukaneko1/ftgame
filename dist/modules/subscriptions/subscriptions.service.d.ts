import { PrismaService } from "../../prisma/prisma.service";
import { ConfigService } from "@nestjs/config";
export declare class SubscriptionsService {
    private readonly prisma;
    private readonly configService;
    private stripe;
    private logger;
    constructor(prisma: PrismaService, configService: ConfigService);
    private ensureStripe;
    getMySubscription(userId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.SubscriptionStatus;
        stripeSubscriptionId: string | null;
        startedAt: Date | null;
        currentPeriodEnd: Date | null;
        userId: string;
    } | null>;
    createBasicCheckoutSession(userId: string): Promise<{
        checkoutUrl: string | null;
    }>;
    handleWebhook(rawBody: Buffer, signature: string | undefined): Promise<{
        received: boolean;
    }>;
    private activateSubscription;
}
//# sourceMappingURL=subscriptions.service.d.ts.map