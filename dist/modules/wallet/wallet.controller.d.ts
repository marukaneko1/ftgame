import { WalletService } from "./wallet.service";
import { JwtPayload } from "@omegle-game/shared/src/types/auth";
import { TokenPackDto } from "./dto/token-pack.dto";
import { Request } from "express";
export declare class WalletController {
    private readonly walletService;
    constructor(walletService: WalletService);
    me(user: JwtPayload): Promise<({
        transactions: {
            id: string;
            createdAt: Date;
            type: import(".prisma/client").$Enums.WalletTransactionType;
            amountTokens: number;
            metadata: import("@prisma/client/runtime/library").JsonValue | null;
            sessionId: string | null;
            gameId: string | null;
            roomId: string | null;
            walletId: string;
        }[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        balanceTokens: number;
        userId: string;
    }) | null>;
    tokenPack(user: JwtPayload, dto: TokenPackDto): Promise<{
        checkoutUrl: string | null;
    }>;
    stripeWebhook(req: Request, signature: string): Promise<{
        received: boolean;
    }>;
}
//# sourceMappingURL=wallet.controller.d.ts.map