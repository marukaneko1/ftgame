import * as Joi from "joi";

// In serverless (Vercel), make some vars optional to avoid startup crashes
// They'll still fail at runtime when actually used, but we can log better errors
const isServerless = !!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_NAME;

export const validationSchema = Joi.object({
  NODE_ENV: Joi.string().valid("development", "production", "test").default("development"),
  PORT: Joi.number().default(3001),
  DATABASE_URL: isServerless 
    ? Joi.string().uri().optional().allow("")
    : Joi.string().uri().required().error(new Error('DATABASE_URL is required')),
  REDIS_URL: isServerless
    ? Joi.string().uri().optional().allow("")
    : Joi.string().uri().required().error(new Error('REDIS_URL is required')),
  JWT_ACCESS_SECRET: isServerless
    ? Joi.string().min(16).optional().default('TEMPORARY_DEFAULT_SECRET_CHANGE_IN_PRODUCTION_VERCEL')
    : Joi.string().min(16).required().error(new Error('JWT_ACCESS_SECRET is required')),
  JWT_REFRESH_SECRET: isServerless
    ? Joi.string().min(16).optional().default('TEMPORARY_DEFAULT_SECRET_CHANGE_IN_PRODUCTION_VERCEL')
    : Joi.string().min(16).required().error(new Error('JWT_REFRESH_SECRET is required')),
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


