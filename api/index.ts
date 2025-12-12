import { NestFactory } from '@nestjs/core';
import { AppModule } from '../dist/app.module';
import { ExpressAdapter } from '@nestjs/platform-express';
const express = require('express');
import { ValidationPipe } from '@nestjs/common';
const cookieParser = require('cookie-parser');
import { raw } from 'express';

let cachedApp: any;

async function createApp() {
  if (cachedApp) {
    return cachedApp;
  }

  const expressApp = express();
  const app = await NestFactory.create(
    AppModule,
    new ExpressAdapter(expressApp),
  );

  app.setGlobalPrefix('api');
  
  // Enable CORS
  app.enableCors({
    origin: process.env.WEB_BASE_URL || '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  app.use(cookieParser());
  app.use('/api/subscriptions/webhook', raw({ type: 'application/json' }));
  app.use('/api/wallet/stripe/webhook', raw({ type: 'application/json' }));
  
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

export default async function handler(req: any, res: any) {
  const app = await createApp();
  app(req, res);
}

