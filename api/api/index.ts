import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { AppModule } from '../dist/app.module';
import * as express from 'express';
import * as cookieParser from 'cookie-parser';
import { raw } from 'express';
import { ValidationPipe } from '@nestjs/common';

let cachedApp: express.Express;

async function createApp(): Promise<express.Express> {
  if (cachedApp) {
    return cachedApp;
  }

  const expressApp = express();
  const app = await NestFactory.create(AppModule, new ExpressAdapter(expressApp));
  
  app.setGlobalPrefix('api');
  
  // Add security headers
  expressApp.use((req, res, next) => {
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'");
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    next();
  });

  // CORS configuration
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
    : [process.env.WEB_BASE_URL || 'http://localhost:3000'];

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) {
        const isDev = process.env.NODE_ENV === 'development';
        return callback(null, isDev);
      }
      const isDev = process.env.NODE_ENV === 'development';
      if (isDev && (origin.includes('localhost') || origin.includes('127.0.0.1'))) {
        return callback(null, true);
      }
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  expressApp.use(cookieParser());
  expressApp.use('/api/subscriptions/webhook', raw({ type: 'application/json', limit: '1mb' }));
  expressApp.use('/api/wallet/stripe/webhook', raw({ type: 'application/json', limit: '1mb' }));
  
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.init();
  cachedApp = expressApp;
  return cachedApp;
}

export default async function handler(req: express.Request, res: express.Response) {
  const app = await createApp();
  return app(req, res);
}

