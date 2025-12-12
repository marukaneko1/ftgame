"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.validationSchema = void 0;
const Joi = __importStar(require("joi"));
const isServerless = !!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_NAME;
exports.validationSchema = Joi.object({
    NODE_ENV: Joi.string().valid("development", "production", "test").default("development"),
    PORT: Joi.number().default(3001),
    DATABASE_URL: isServerless
        ? Joi.string().uri().optional().allow("")
        : Joi.string().uri().required().error(new Error('DATABASE_URL is required')),
    REDIS_URL: isServerless
        ? Joi.string().uri().optional().allow("")
        : Joi.string().uri().required().error(new Error('REDIS_URL is required')),
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