import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
// Conditionally import AppModule - for serverless, we need a version without WebSocket
import { AppModule } from '../dist/app.module';
import express, { Request, Response, NextFunction } from 'express';
import cookieParser from 'cookie-parser';
import { raw } from 'express';
import { ValidationPipe, ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { config } from 'dotenv';
import { resolve } from 'path';
import { existsSync } from 'fs';

// CRITICAL: Load environment variables for local Vercel simulation
// Load .env first, then .env.local (which overrides .env)
// This ensures .env.local (with remote database) takes precedence
// When running `vercel dev` from api/, process.cwd() is the api/ directory
const cwd = process.cwd();
const envPath = resolve(cwd, '.env');
const envLocalPath = resolve(cwd, '.env.local');

console.log('[Serverless] process.cwd():', cwd);
console.log('[Serverless] Looking for .env.local at:', envLocalPath);
console.log('[Serverless] .env.local exists:', existsSync(envLocalPath));

// Load .env first
try {
  config({ path: envPath });
  console.log('[Serverless] Loaded .env from:', envPath);
} catch (error) {
  console.warn('[Serverless] Could not load .env:', error);
}

// Load .env.local second (overwrites .env values)
// This is critical - it ensures local Vercel simulation uses remote database
try {
  const result = config({ path: envLocalPath, override: true });
  if (!result.error) {
    console.log('[Serverless] Loaded .env.local from:', envLocalPath);
    console.log('[Serverless] DATABASE_URL:', process.env.DATABASE_URL?.substring(0, 60) + '...');
  } else {
    console.warn('[Serverless] Could not load .env.local:', result.error);
  }
} catch (error) {
  console.warn('[Serverless] Error loading .env.local:', error);
}

// Mark as serverless environment
process.env.IS_SERVERLESS = 'true';

let cachedApp: express.Express;

async function createApp(): Promise<express.Express> {
  if (cachedApp) {
    return cachedApp;
  }

  try {
    const expressApp = express();
    
    // CRITICAL: Add CORS headers middleware FIRST (before path stripping)
    // This ensures CORS headers are set even if path stripping or NestJS fails
    expressApp.use((req: Request, res: Response, next: NextFunction) => {
      const origin = req.headers.origin;
      setCorsHeaders(res, origin);
      next();
    });
    
    const app = await NestFactory.create(AppModule, new ExpressAdapter(expressApp));
    
    // Set global prefix - Vercel sends /api/auth/register, routes should be at /api/auth/register
    // Controllers are @Controller('auth'), with prefix becomes /api/auth
    // So incoming /api/auth/register matches /api/auth/register route
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

  // Add global exception filter for better error messages in development
  class CustomExceptionFilter implements ExceptionFilter {
    catch(exception: any, host: ArgumentsHost) {
      const ctx = host.switchToHttp();
      const response = ctx.getResponse();
      const request = ctx.getRequest();
      
      const status = exception instanceof HttpException 
        ? exception.getStatus() 
        : HttpStatus.INTERNAL_SERVER_ERROR;
      
      const message = exception instanceof HttpException 
        ? exception.getResponse() 
        : exception?.message || 'Internal server error';
      
      const isDev = process.env.NODE_ENV === 'development' || process.env.VERCEL_ENV === 'development';
      
      console.error('[Serverless] Exception caught:', exception?.name || exception?.constructor?.name, exception?.message);
      console.error('[Serverless] Exception stack:', exception?.stack);
      console.error('[Serverless] DATABASE_URL:', process.env.DATABASE_URL ? 'SET' : 'NOT SET');
      console.error('[Serverless] REDIS_URL:', process.env.REDIS_URL ? 'SET' : 'NOT SET');
      
      const errorResponse: any = {
        statusCode: status,
        message: typeof message === 'string' ? message : (message as any)?.message || exception?.message || 'Internal server error',
        error: exception?.name || exception?.constructor?.name || 'Error',
      };
      
      if (isDev) {
        errorResponse.stack = exception?.stack;
        errorResponse.path = request.url;
        errorResponse.method = request.method;
        errorResponse.databaseUrlSet = !!process.env.DATABASE_URL;
        errorResponse.redisUrlSet = !!process.env.REDIS_URL;
        if (exception?.cause) errorResponse.cause = exception.cause;
        if (exception?.code) errorResponse.code = exception.code;
      }
      
      response.status(status).json(errorResponse);
    }
  }
  app.useGlobalFilters(new CustomExceptionFilter());

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
  
  // CRITICAL: Set CORS headers FIRST, before any processing
  // This ensures headers are always set, even if there's an error
  setCorsHeaders(res, origin);
  
  try {
    // SECURITY: Handle CORS preflight requests explicitly (must be before NestJS app)
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    // Handle root path with simple API info
    if (req.url === '/' || req.path === '/') {
      return res.status(200).json({
        message: 'FT Game API',
        version: '1.0.0',
        status: 'online',
        endpoints: {
          auth: '/api/auth',
          users: '/api/users',
          games: '/api/games',
          video: '/api/video'
        }
      });
    }

    // Debug endpoint to check environment variables (only in development)
    if (req.url === '/api/debug/env' && (process.env.NODE_ENV === 'development' || process.env.VERCEL_ENV === 'development')) {
      return res.status(200).json({
        cwd: process.cwd(),
        databaseUrlSet: !!process.env.DATABASE_URL,
        databaseUrlPrefix: process.env.DATABASE_URL ? process.env.DATABASE_URL.substring(0, 50) + '...' : 'NOT SET',
        redisUrlSet: !!process.env.REDIS_URL,
        jwtAccessSecretSet: !!process.env.JWT_ACCESS_SECRET,
        allowedOrigins: process.env.ALLOWED_ORIGINS,
        isServerless: process.env.IS_SERVERLESS,
        nodeEnv: process.env.NODE_ENV,
        vercelEnv: process.env.VERCEL_ENV
      });
    }

    // Vercel rewrite sends /api/auth/register to this function as /api/auth/register
    // NestJS with setGlobalPrefix('api') expects /api/auth/register
    // Routes match directly - no path manipulation needed
    let app: express.Express;
    try {
      app = await createApp();
    } catch (createError: any) {
      // Error during app creation - log and return
      console.error('[Serverless] Failed to create app:', createError);
      console.error('[Serverless] Create error name:', createError?.name);
      console.error('[Serverless] Create error message:', createError?.message);
      console.error('[Serverless] Create error stack:', createError?.stack);
      console.error('[Serverless] DATABASE_URL during create:', process.env.DATABASE_URL ? process.env.DATABASE_URL.substring(0, 50) + '...' : 'NOT SET');
      
      const isDev = process.env.NODE_ENV === 'development' || process.env.VERCEL_ENV === 'development';
      
      return res.status(500).json({
        error: 'Failed to initialize application',
        message: createError?.message || 'Unknown error during app initialization',
        errorType: createError?.name || 'Error',
        stack: isDev ? createError?.stack : undefined,
        databaseUrlSet: !!process.env.DATABASE_URL,
        redisUrlSet: !!process.env.REDIS_URL
      });
    }
    
    // Wrap the app handler to catch any errors NestJS might throw
    // Also add error handler middleware to catch unhandled errors
    app.on('error', (error: any) => {
      console.error('[Serverless] Express app error:', error);
    });
    
    try {
      await app(req, res);
    } catch (nestError: any) {
      // NestJS threw an error - ensure CORS headers are still set
      setCorsHeaders(res, origin);
      console.error('[Serverless] NestJS handler error:', nestError);
      console.error('[Serverless] Error name:', nestError?.name);
      console.error('[Serverless] Error message:', nestError?.message);
      console.error('[Serverless] Error code:', nestError?.code);
      console.error('[Serverless] Error stack:', nestError?.stack);
      
      // Log environment info for debugging
      console.error('[Serverless] DATABASE_URL:', process.env.DATABASE_URL ? process.env.DATABASE_URL.substring(0, 50) + '...' : 'NOT SET');
      console.error('[Serverless] REDIS_URL:', process.env.REDIS_URL ? 'SET' : 'NOT SET');
      
      // If response hasn't been sent yet, send error response
      if (!res.headersSent) {
        // Always show error details in development/local
        const isDev = process.env.NODE_ENV === 'development' || process.env.VERCEL_ENV === 'development';
        
        res.status(500).json({ 
          error: 'Internal Server Error', 
          message: nestError?.message || 'Unknown error',
          errorType: nestError?.name || 'Error',
          errorCode: nestError?.code,
          // Show stack in development/local
          stack: isDev ? nestError?.stack : undefined,
          // Show if it's a validation error
          isValidationError: nestError?.response?.statusCode === 400,
          // Additional debug info in development
          ...(isDev && {
            cause: nestError?.cause,
            databaseUrlSet: !!process.env.DATABASE_URL,
            redisUrlSet: !!process.env.REDIS_URL
          })
        });
      } else {
        console.error('[Serverless] Response already sent, cannot send error details');
      }
    }
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
    
    // Only send response if headers haven't been sent
    if (!res.headersSent) {
      const isProd = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';
      
      res.status(500).json({ 
        error: 'Internal Server Error', 
        message: error?.message || 'Unknown error',
        errorType: error?.name || 'Error',
        // Only show stack in development
        stack: !isProd ? error?.stack : undefined,
        // Helpful hints for common errors
        hint: error?.code === 'P1001' ? 'Database connection failed. Check DATABASE_URL.' :
              error?.message?.includes('JWT') ? 'JWT configuration error. Check JWT_ACCESS_SECRET and JWT_REFRESH_SECRET.' :
              error?.message?.includes('REDIS') ? 'Redis connection error. Check REDIS_URL.' :
              undefined
      });
    }
  }
}

