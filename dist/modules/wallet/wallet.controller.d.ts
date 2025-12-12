import { WalletService } from "./wallet.service";
import { JwtPayload } from "../../common/types/auth";
import { TokenPackDto } from "./dto/token-pack.dto";
import { Request } from "express";
export declare class WalletController {
    private readonly walletService;
    constructor(walletService: WalletService);
    me(user: JwtPayload): Promise<({
        transactions: {
            id: string;
            createdAt: Date;
            walletId: string;
            type: import(".prisma/client").$Enums.WalletTransactionType;
            amountTokens: number;
            sessionId: string | null;
            gameId: string | null;
            roomId: string | null;
            metadata: import("@prisma/client/runtime/library").JsonValue | null;
        }[];
    } & {
        id: string;
        createdAt: Date;
        userId: string;
        balanceTokens: number;
        updatedAt: Date;
    }) | null>;
    tokenPack(user: JwtPayload, dto: TokenPackDto): Promise<{
        checkoutUrl: string | null;
    }>;
    stripeWebhook(req: Request, signature: string): Promise<{
        received: boolean;
    }>;
}
//# sourceMappingURL=wallet.controller.d.ts.map