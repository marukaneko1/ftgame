"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validationSchema = void 0;
const Joi = require("joi");
exports.validationSchema = Joi.object({
    NODE_ENV: Joi.string().valid("development", "production", "test").default("development"),
    PORT: Joi.number().default(3001),
    DATABASE_URL: Joi.string().uri().required(),
    REDIS_URL: Joi.string().uri().required(),
    JWT_ACCESS_SECRET: Joi.string().min(16).required(),
    JWT_REFRESH_SECRET: Joi.string().min(16).required(),
    JWT_ACCESS_EXPIRES_IN: Joi.string().default("15m"),
    JWT_REFRESH_EXPIRES_IN: Joi.string().default("7d"),
    GOOGLE_CLIENT_ID: Joi.string().allow("").optional(),
    STRIPE_SECRET_KEY: Joi.string().allow("").optional(),
    STRIPE_WEBHOOK_SECRET: Joi.string().allow("").optional(),
    STRIPE_BASIC_PRICE_ID: Joi.string().allow("").optional(),
    STRIPE_TOKEN_PACK_PRICE_ID: Joi.string().allow("").optional(),
    AGORA_APP_ID: Joi.string().allow("").optional(),
    AGORA_APP_CERTIFICATE: Joi.string().allow("").optional(),
    PERSONA_API_KEY: Joi.string().allow("").optional(),
    PERSONA_WEBHOOK_SECRET: Joi.string().allow("").optional(),
    WEB_BASE_URL: Joi.string().uri().default("http://localhost:3000"),
    API_BASE_URL: Joi.string().uri().default("http://localhost:3001")
});
//# sourceMappingURL=env.validation.js.map