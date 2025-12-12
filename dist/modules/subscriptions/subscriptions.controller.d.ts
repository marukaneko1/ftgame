import { SubscriptionsService } from "./subscriptions.service";
import { JwtPayload } from "@omegle-game/shared/src/types/auth";
import { Request } from "express";
export declare class SubscriptionsController {
    private readonly subscriptionsService;
    constructor(subscriptionsService: SubscriptionsService);
    me(user: JwtPayload): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.SubscriptionStatus;
        stripeSubscriptionId: string | null;
        startedAt: Date | null;
        currentPeriodEnd: Date | null;
        userId: string;
    } | null>;
    basicCheckout(user: JwtPayload): Promise<{
        checkoutUrl: string | null;
    }>;
    webhook(req: Request, signature: string): Promise<{
        received: boolean;
    }>;
}
//# sourceMappingURL=subscriptions.controller.d.ts.map