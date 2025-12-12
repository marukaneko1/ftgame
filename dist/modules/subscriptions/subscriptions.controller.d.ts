import { SubscriptionsService } from "./subscriptions.service";
import { JwtPayload } from "../../common/types/auth";
import { Request } from "express";
export declare class SubscriptionsController {
    private readonly subscriptionsService;
    constructor(subscriptionsService: SubscriptionsService);
    me(user: JwtPayload): Promise<{
        id: string;
        status: import(".prisma/client").$Enums.SubscriptionStatus;
        startedAt: Date | null;
        createdAt: Date;
        userId: string;
        updatedAt: Date;
        stripeSubscriptionId: string | null;
        currentPeriodEnd: Date | null;
    } | null>;
    basicCheckout(user: JwtPayload): Promise<{
        checkoutUrl: string | null;
    }>;
    webhook(req: Request, signature: string): Promise<{
        received: boolean;
    }>;
}
//# sourceMappingURL=subscriptions.controller.d.ts.map