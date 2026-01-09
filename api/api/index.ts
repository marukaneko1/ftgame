import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
// Conditionally import AppModule - for serverless, we need a version without WebSocket
import { AppModule } from '../dist/app.module';
import express, { Request, Response, NextFunction } from 'express';
import cookieParser from 'cookie-parser';
import { raw } from 'express';
import { ValidationPipe } from '@nestjs/common';

// Mark as serverless environment
process.env.IS_SERVERLESS = 'true';

let cachedApp: express.Express;

async function createApp(): Promise<express.Express> {
  if (cachedApp) {
    return cachedApp;
  }

  try {
    const expressApp = express();
    
    // CRITICAL: Strip /api prefix BEFORE creating NestJS app
    // Vercel rewrite sends /api/auth/login to this function as /api/auth/login
    // NestJS with setGlobalPrefix('api') expects routes without /api prefix
    // So we strip /api from the path before NestJS sees it
    expressApp.use((req: Request, res: Response, next: NextFunction) => {
      if (req.path && req.path.startsWith('/api/')) {
        // Strip /api prefix from path
        req.url = req.url.replace(/^\/api/, '');
        (req as any).path = req.path.replace(/^\/api/, '');
        if (req.originalUrl) {
          (req as any).originalUrl = req.originalUrl.replace(/^\/api/, '');
        }
      }
      next();
    });
    
    const app = await NestFactory.create(AppModule, new ExpressAdapter(expressApp));
    app.setGlobalPrefix('api');
  
  // Add security headers
  expressApp.use((req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'");
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    next();
  });

  // CORS configuration - must allow Vercel frontend domains
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
    : [process.env.WEB_BASE_URL || 'http://localhost:3000'];
  
  // Add common Vercel patterns to allowed origins
  const isVercel = process.env.VERCEL === '1' || process.env.VERCEL_ENV;
  if (isVercel) {
    // Allow any vercel.app subdomain in production (be more restrictive in production)
    // In production, you should set ALLOWED_ORIGINS explicitly
  }

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman, etc.) in development only
      if (!origin) {
        const isDev = process.env.NODE_ENV === 'development';
        return callback(null, isDev);
      }
      
      // In development, allow localhost
      const isDev = process.env.NODE_ENV === 'development';
      if (isDev && (origin.includes('localhost') || origin.includes('127.0.0.1'))) {
        return callback(null, true);
      }
      
      // Check if origin is in allowed list
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      
      // In production on Vercel, allow vercel.app subdomains (for flexibility)
      // You should set ALLOWED_ORIGINS explicitly for better security
      if (origin.includes('.vercel.app')) {
        return callback(null, true);
      }
      
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['Content-Type'],
    maxAge: 86400, // 24 hours
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
  } catch (error: any) {
    console.error('Failed to create NestJS app:', error);
    console.error('Error stack:', error?.stack);
    throw error;
  }
}

// Helper to set CORS headers
function setCorsHeaders(res: Response, origin: string | undefined) {
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
    : [process.env.WEB_BASE_URL || 'http://localhost:3000'];
  
  const isDev = process.env.NODE_ENV === 'development';
  const isAllowed = origin && (
    allowedOrigins.includes(origin) || 
    origin.includes('.vercel.app') ||
    (isDev && (origin.includes('localhost') || origin.includes('127.0.0.1')))
  );
  
  if (isAllowed) {
    res.setHeader('Access-Control-Allow-Origin', origin!);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Max-Age', '86400');
  }
}

export default async function handler(req: Request, res: Response) {
  const origin = req.headers.origin;
  
  try {
    // SECURITY: Handle CORS preflight requests explicitly (must be before NestJS app)
    if (req.method === 'OPTIONS') {
      setCorsHeaders(res, origin);
      return res.status(200).end();
    }

    const app = await createApp();
    return app(req, res);
  } catch (error: any) {
    console.error('Serverless function error:', error);
    
    // CRITICAL: Set CORS headers even on error responses
    setCorsHeaders(res, origin);
    
    // Check if it's a database connection error
    const isDbError = error?.message?.includes('database') || 
                     error?.message?.includes('localhost:5433') ||
                     error?.code === 'P1001';
    
    if (isDbError) {
      return res.status(503).json({ 
        error: 'Service Unavailable', 
        message: 'Database connection failed. Please check DATABASE_URL environment variable.',
        hint: 'Make sure DATABASE_URL is set in Vercel environment variables and points to a remote database (not localhost).'
      });
    }
    
    res.status(500).json({ 
      error: 'Internal Server Error', 
      message: error?.message || 'Unknown error',
      stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined
    });
  }
}

