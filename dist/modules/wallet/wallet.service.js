"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var WalletService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WalletService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../../prisma/prisma.service");
const stripe_1 = __importDefault(require("stripe"));
const config_1 = require("@nestjs/config");
let WalletService = WalletService_1 = class WalletService {
    prisma;
    configService;
    stripe = null;
    logger = new common_1.Logger(WalletService_1.name);
    packTokens = {
        small: 500,
        medium: 1200,
        large: 3000
    };
    constructor(prisma, configService) {
        this.prisma = prisma;
        this.configService = configService;
        const secretKey = this.configService.get("stripe.secretKey");
        if (secretKey) {
            try {
                this.stripe = new stripe_1.default(secretKey);
                this.logger.log('Stripe initialized successfully');
            }
            catch (error) {
                this.logger.warn(`Failed to initialize Stripe: ${error?.message || 'Unknown error'}. Wallet payment features will not work.`);
            }
        }
        else {
            this.logger.warn('STRIPE_SECRET_KEY not configured. Wallet payment features will not work.');
        }
    }
    ensureStripe() {
        if (!this.stripe) {
            throw new common_1.BadRequestException('Stripe is not configured. STRIPE_SECRET_KEY environment variable is required for payment features.');
        }
        return this.stripe;
    }
    async ensureWallet(userId) {
        return this.prisma.wallet.upsert({
            where: { userId },
            update: {},
            create: { userId }
        });
    }
    async getWallet(userId) {
        await this.ensureWallet(userId);
        return this.prisma.wallet.findUnique({
            where: { userId },
            include: {
                transactions: {
                    orderBy: { createdAt: "desc" },
                    take: 20
                }
            }
        });
    }
    async creditTokens(userId, amount, metadata) {
        if (amount <= 0)
            throw new common_1.BadRequestException("Amount must be positive");
        return this.prisma.$transaction(async (tx) => {
            const wallet = await tx.wallet.update({
                where: { userId },
                data: {
                    balanceTokens: { increment: amount },
                    transactions: {
                        create: {
                            type: client_1.WalletTransactionType.PURCHASE,
                            amountTokens: amount,
                            metadata
                        }
                    }
                },
                include: { transactions: true }
            });
            return wallet;
        });
    }
    async debitTokens(userId, amount, type, metadata, sessionId) {
        if (amount <= 0)
            throw new common_1.BadRequestException("Amount must be positive");
        return this.prisma.$transaction(async (tx) => {
            const wallet = await tx.wallet.findUnique({ where: { userId }, select: { balanceTokens: true } });
            if (!wallet)
                throw new common_1.NotFoundException("Wallet not found");
            if (wallet.balanceTokens < amount)
                throw new common_1.BadRequestException("Insufficient tokens");
            return tx.wallet.update({
                where: { userId },
                data: {
                    balanceTokens: { decrement: amount },
                    transactions: {
                        create: {
                            type,
                            amountTokens: amount,
                            sessionId,
                            metadata
                        }
                    }
                }
            });
        });
    }
    async sendGift(senderUserId, receiverUserId, amount, sessionId) {
        if (amount <= 0)
            throw new common_1.BadRequestException("Amount must be positive");
        await this.ensureWallet(senderUserId);
        await this.ensureWallet(receiverUserId);
        return this.prisma.$transaction(async (tx) => {
            const senderWallet = await tx.wallet.findUnique({
                where: { userId: senderUserId },
                select: { id: true, balanceTokens: true }
            });
            if (!senderWallet)
                throw new common_1.NotFoundException("Sender wallet not found");
            if (senderWallet.balanceTokens < amount)
                throw new common_1.BadRequestException("Insufficient tokens");
            await tx.wallet.update({
                where: { userId: senderUserId },
                data: {
                    balanceTokens: { decrement: amount },
                    transactions: {
                        create: {
                            type: client_1.WalletTransactionType.GIFT_SENT,
                            amountTokens: amount,
                            sessionId,
                            metadata: { recipientId: receiverUserId }
                        }
                    }
                }
            });
            const receiverWallet = await tx.wallet.update({
                where: { userId: receiverUserId },
                data: {
                    balanceTokens: { increment: amount },
                    transactions: {
                        create: {
                            type: client_1.WalletTransactionType.GIFT_RECEIVED,
                            amountTokens: amount,
                            sessionId,
                            metadata: { senderId: senderUserId }
                        }
                    }
                },
                select: { balanceTokens: true }
            });
            return {
                success: true,
                amount,
                senderBalance: senderWallet.balanceTokens - amount,
                receiverBalance: receiverWallet.balanceTokens
            };
        });
    }
    async lockTokensForWager(userId, amount) {
        return this.debitTokens(userId, amount, client_1.WalletTransactionType.WAGER_LOCK, { reason: "wager_lock" });
    }
    async payoutWager(wagerId, winnerUserId) {
        const wager = await this.prisma.wager.findUnique({
            where: { id: wagerId },
            include: { participants: true, game: true }
        });
        if (!wager)
            throw new common_1.NotFoundException("Wager not found");
        if (wager.status !== client_1.WagerStatus.LOCKED)
            throw new common_1.BadRequestException("Wager not locked");
        const totalPot = wager.participants.reduce((sum, p) => sum + p.stakeTokens, 0);
        const rake = Math.floor(totalPot * 0.05);
        const payout = totalPot - rake;
        await this.prisma.$transaction(async (tx) => {
            await tx.wager.update({
                where: { id: wager.id },
                data: { status: client_1.WagerStatus.PAID_OUT, totalPotTokens: totalPot, rakeTokens: rake }
            });
            await tx.wallet.update({
                where: { userId: winnerUserId },
                data: {
                    balanceTokens: { increment: payout },
                    transactions: {
                        create: {
                            type: client_1.WalletTransactionType.WAGER_PAYOUT,
                            amountTokens: payout,
                            gameId: wager.gameId,
                            metadata: { wagerId }
                        }
                    }
                }
            });
        });
        return { payoutTokens: payout };
    }
    async createTokenPackCheckout(userId, packId) {
        const stripe = this.ensureStripe();
        const priceId = this.configService.get("stripe.tokenPackPriceId");
        if (!priceId)
            throw new common_1.BadRequestException("Stripe token pack price not configured");
        const tokens = this.packTokens[packId];
        if (!tokens)
            throw new common_1.BadRequestException("Invalid packId");
        const successUrl = `${this.configService.get("urls.webBaseUrl")}/wallet?checkout=success`;
        const cancelUrl = `${this.configService.get("urls.webBaseUrl")}/wallet?checkout=cancel`;
        const session = await stripe.checkout.sessions.create({
            mode: "payment",
            line_items: [{ price: priceId, quantity: 1 }],
            success_url: successUrl,
            cancel_url: cancelUrl,
            metadata: { userId, packId }
        });
        return { checkoutUrl: session.url };
    }
    async handleStripeWebhook(rawBody, signature) {
        const stripe = this.ensureStripe();
        const webhookSecret = this.configService.get("stripe.webhookSecret");
        if (!webhookSecret)
            throw new common_1.BadRequestException("STRIPE_WEBHOOK_SECRET missing");
        if (!signature)
            throw new common_1.BadRequestException("Missing Stripe signature");
        let event;
        try {
            event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
        }
        catch (err) {
            throw new common_1.BadRequestException("Invalid Stripe signature");
        }
        if (event.type === "checkout.session.completed") {
            const session = event.data.object;
            if (session.metadata?.userId && session.metadata?.packId) {
                const tokens = this.packTokens[session.metadata.packId];
                if (!tokens)
                    return { received: true };
                const existing = await this.prisma.walletTransaction.findFirst({
                    where: {
                        metadata: { equals: { stripeEventId: event.id } }
                    }
                });
                if (existing)
                    return { received: true };
                await this.creditTokens(session.metadata.userId, tokens, { stripeEventId: event.id, packId: session.metadata.packId });
            }
        }
        return { received: true };
    }
};
exports.WalletService = WalletService;
exports.WalletService = WalletService = WalletService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService, config_1.ConfigService])
], WalletService);
//# sourceMappingURL=wallet.service.js.map