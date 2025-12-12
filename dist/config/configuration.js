"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = () => ({
    env: process.env.NODE_ENV || "development",
    port: parseInt(process.env.PORT ?? "3001", 10),
    databaseUrl: process.env.DATABASE_URL,
    redisUrl: process.env.REDIS_URL,
    jwt: {
        accessSecret: process.env.JWT_ACCESS_SECRET || (process.env.VERCEL ? 'TEMPORARY_DEFAULT_SECRET_CHANGE_IN_PRODUCTION_VERCEL' : undefined),
        refreshSecret: process.env.JWT_REFRESH_SECRET || (process.env.VERCEL ? 'TEMPORARY_DEFAULT_SECRET_CHANGE_IN_PRODUCTION_VERCEL' : undefined),
        accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "15m",
        refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d"
    },
    google: {
        clientId: process.env.GOOGLE_CLIENT_ID
    },
    stripe: {
        secretKey: process.env.STRIPE_SECRET_KEY,
        webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
        basicPriceId: process.env.STRIPE_BASIC_PRICE_ID,
        tokenPackPriceId: process.env.STRIPE_TOKEN_PACK_PRICE_ID
    },
    agora: {
        appId: process.env.AGORA_APP_ID,
        appCertificate: process.env.AGORA_APP_CERTIFICATE
    },
    persona: {
        apiKey: process.env.PERSONA_API_KEY,
        webhookSecret: process.env.PERSONA_WEBHOOK_SECRET
    },
    urls: {
        webBaseUrl: process.env.WEB_BASE_URL || "http://localhost:3000",
        apiBaseUrl: process.env.API_BASE_URL || "http://localhost:3001"
    }
});
//# sourceMappingURL=configuration.js.map