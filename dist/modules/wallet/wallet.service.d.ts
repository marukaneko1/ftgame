import { Prisma, WalletTransactionType } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { ConfigService } from "@nestjs/config";
export declare class WalletService {
    private readonly prisma;
    private readonly configService;
    private stripe;
    private packTokens;
    constructor(prisma: PrismaService, configService: ConfigService);
    ensureWallet(userId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        balanceTokens: number;
        userId: string;
    }>;
    getWallet(userId: string): Promise<({
        transactions: {
            id: string;
            createdAt: Date;
            type: import(".prisma/client").$Enums.WalletTransactionType;
            amountTokens: number;
            metadata: Prisma.JsonValue | null;
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
    creditTokens(userId: string, amount: number, metadata?: Prisma.InputJsonValue): Promise<{
        transactions: {
            id: string;
            createdAt: Date;
            type: import(".prisma/client").$Enums.WalletTransactionType;
            amountTokens: number;
            metadata: Prisma.JsonValue | null;
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
    }>;
    debitTokens(userId: string, amount: number, type: WalletTransactionType, metadata?: Prisma.InputJsonValue, sessionId?: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        balanceTokens: number;
        userId: string;
    }>;
    sendGift(senderUserId: string, receiverUserId: string, amount: number, sessionId?: string): Promise<{
        success: boolean;
        amount: number;
        senderBalance: number;
        receiverBalance: number;
    }>;
    lockTokensForWager(userId: string, amount: number): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        balanceTokens: number;
        userId: string;
    }>;
    payoutWager(wagerId: string, winnerUserId: string): Promise<{
        payoutTokens: number;
    }>;
    createTokenPackCheckout(userId: string, packId: string): Promise<{
        checkoutUrl: string | null;
    }>;
    handleStripeWebhook(rawBody: Buffer, signature: string | undefined): Promise<{
        received: boolean;
    }>;
}
//# sourceMappingURL=wallet.service.d.ts.map