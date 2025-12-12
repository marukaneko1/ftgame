import { NestFactory } from '@nestjs/core';
// @ts-ignore - dist folder exists after build
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

  try {
    console.log('Initializing NestJS app...');
    
    // Warn about missing JWT secrets
    if (!process.env.JWT_ACCESS_SECRET || !process.env.JWT_REFRESH_SECRET) {
      console.warn('⚠️  WARNING: JWT_ACCESS_SECRET and/or JWT_REFRESH_SECRET not set!');
      console.warn('⚠️  Using temporary default secrets. Authentication will work but is NOT SECURE!');
      console.warn('⚠️  Please set these in Vercel Dashboard > Settings > Environment Variables');
      console.warn('⚠️  Generate secure random strings: openssl rand -hex 32');
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
    
    // Add 404 handler
    expressApp.use((req: any, res: any, next: any) => {
      if (!res.headersSent) {
        res.status(404).json({ error: 'Not Found', path: req.path });
      }
    });
    
    // Add error handler
    expressApp.use((err: any, req: any, res: any, next: any) => {
      console.error('Express error:', err);
      if (!res.headersSent) {
        res.status(err.status || 500).json({
          error: 'Internal Server Error',
          message: err.message || 'Unknown error'
        });
      }
    });
    
    console.log('NestJS app initialized successfully');
    cachedApp = expressApp;
    return cachedApp;
  } catch (error: any) {
    console.error('Error creating NestJS app:', error);
    throw error;
  }
}

export default async function handler(req: any, res: any) {
  try {
    const app = await createApp();
    
    // Ensure response is sent even if Express doesn't handle it
    app(req, res, (err: any) => {
      if (err) {
        console.error('Express error:', err);
        if (!res.headersSent) {
          res.status(500).json({
            error: 'Internal Server Error',
            message: err?.message || 'Unknown error'
          });
        }
      }
    });
  } catch (error: any) {
    console.error('Serverless function error:', error);
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Internal Server Error',
        message: error?.message || 'Unknown error',
        stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined
      });
    }
  }
}

