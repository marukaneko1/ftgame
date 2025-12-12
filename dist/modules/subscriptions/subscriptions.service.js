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
var SubscriptionsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubscriptionsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const client_1 = require("@prisma/client");
const stripe_1 = __importDefault(require("stripe"));
const config_1 = require("@nestjs/config");
let SubscriptionsService = SubscriptionsService_1 = class SubscriptionsService {
    prisma;
    configService;
    stripe;
    logger = new common_1.Logger(SubscriptionsService_1.name);
    constructor(prisma, configService) {
        this.prisma = prisma;
        this.configService = configService;
        const secretKey = this.configService.get("stripe.secretKey");
        if (!secretKey)
            throw new Error("STRIPE_SECRET_KEY missing");
        this.stripe = new stripe_1.default(secretKey);
    }
    async getMySubscription(userId) {
        return this.prisma.subscription.findUnique({ where: { userId } });
    }
    async createBasicCheckoutSession(userId) {
        const priceId = this.configService.get("stripe.basicPriceId");
        if (!priceId)
            throw new common_1.BadRequestException("Stripe basic price not configured");
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
    async handleWebhook(rawBody, signature) {
        const webhookSecret = this.configService.get("stripe.webhookSecret");
        if (!webhookSecret) {
            throw new Error("STRIPE_WEBHOOK_SECRET missing");
        }
        if (!signature) {
            throw new common_1.BadRequestException("Missing Stripe signature");
        }
        let event;
        try {
            event = this.stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
        }
        catch (err) {
            this.logger.error(`Stripe signature verification failed: ${err}`);
            throw new common_1.BadRequestException("Invalid Stripe signature");
        }
        switch (event.type) {
            case "checkout.session.completed": {
                const session = event.data.object;
                if (session.mode === "subscription" && session.subscription && session.metadata?.userId) {
                    await this.activateSubscription(session.metadata.userId, session.subscription.toString());
                }
                break;
            }
            case "customer.subscription.deleted": {
                const subscription = event.data.object;
                const userId = subscription.metadata?.userId;
                if (userId) {
                    await this.prisma.subscription.update({
                        where: { userId },
                        data: { status: client_1.SubscriptionStatus.CANCELED }
                    });
                }
                break;
            }
            default:
                this.logger.log(`Unhandled Stripe event ${event.type}`);
        }
        return { received: true };
    }
    async activateSubscription(userId, stripeSubscriptionId) {
        const existing = await this.prisma.subscription.findUnique({ where: { userId } });
        if (existing?.status === client_1.SubscriptionStatus.ACTIVE && existing.stripeSubscriptionId === stripeSubscriptionId) {
            return existing;
        }
        const subscription = await this.stripe.subscriptions.retrieve(stripeSubscriptionId);
        const currentPeriodEnd = subscription.current_period_end
            ? new Date(subscription.current_period_end * 1000)
            : null;
        return this.prisma.subscription.update({
            where: { userId },
            data: {
                status: client_1.SubscriptionStatus.ACTIVE,
                stripeSubscriptionId,
                startedAt: existing?.startedAt ?? new Date(),
                currentPeriodEnd
            }
        });
    }
};
exports.SubscriptionsService = SubscriptionsService;
exports.SubscriptionsService = SubscriptionsService = SubscriptionsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService, config_1.ConfigService])
], SubscriptionsService);
//# sourceMappingURL=subscriptions.service.js.map