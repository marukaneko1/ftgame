# Vercel Deployment Setup Guide

## Critical Environment Variables

Your backend needs these environment variables set in Vercel:

### Required Variables

1. **DATABASE_URL** (REQUIRED)
   - Format: `postgresql://user:password@host:port/database?sslmode=require`
   - **Cannot use `localhost`** - must be a remote database
   - Options:
     - **Neon** (Free tier available): https://neon.tech
     - **Supabase** (Free tier): https://supabase.com
     - **Railway** (Free tier): https://railway.app
     - **Vercel Postgres** (Integrated): Add in Vercel dashboard
   - Example (Neon): `postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/dbname?sslmode=require`

2. **REDIS_URL** (REQUIRED)
   - Format: `redis://user:password@host:port` or `rediss://user:password@host:port` (SSL)
   - Options:
     - **Upstash** (Free tier): https://upstash.com
     - **Redis Cloud** (Free tier): https://redis.com/cloud
   - Example (Upstash): `redis://default:password@xxx.upstash.io:6379`

3. **JWT_ACCESS_SECRET** (REQUIRED)
   - Generate: `openssl rand -base64 32`
   - Minimum 16 characters

4. **JWT_REFRESH_SECRET** (REQUIRED)
   - Generate: `openssl rand -base64 32`
   - Minimum 16 characters, different from access secret

### Optional but Recommended

5. **ALLOWED_ORIGINS** (Recommended)
   - Comma-separated list of allowed origins
   - Example: `https://ftgame-theta.vercel.app,https://ftgame-git-main-marukaneko1s-projects.vercel.app`
   - If not set, defaults to `WEB_BASE_URL` or allows all `.vercel.app` domains

6. **WEB_BASE_URL** (Recommended)
   - Your frontend URL
   - Example: `https://ftgame-theta.vercel.app`

7. **NODE_ENV** (Optional)
   - Set to `production` for production builds

### Optional Service Variables

8. **GOOGLE_CLIENT_ID** (Optional - for Google OAuth)
9. **STRIPE_SECRET_KEY** (Optional - for payments)
10. **STRIPE_WEBHOOK_SECRET** (Optional - for Stripe webhooks)
11. **STRIPE_BASIC_PRICE_ID** (Optional)
12. **STRIPE_TOKEN_PACK_PRICE_ID** (Optional)
13. **AGORA_APP_ID** (Optional - for video)
14. **AGORA_APP_CERTIFICATE** (Optional - for video)
15. **PERSONA_API_KEY** (Optional - for KYC)
16. **PERSONA_WEBHOOK_SECRET** (Optional)

## How to Set Environment Variables in Vercel

1. Go to your Vercel project dashboard
2. Click **Settings** → **Environment Variables**
3. Add each variable:
   - **Name**: The variable name (e.g., `DATABASE_URL`)
   - **Value**: The value (e.g., `postgresql://...`)
   - **Environment**: Select `Production`, `Preview`, and/or `Development`
4. Click **Save**
5. **Redeploy** your function (or wait for next deployment)

## Quick Setup for Database (Recommended: Neon)

1. Go to https://neon.tech
2. Sign up/login
3. Create a new project
4. Copy the connection string
5. Add it as `DATABASE_URL` in Vercel
6. Run migrations:
   ```bash
   # Set DATABASE_URL locally first
   export DATABASE_URL="your-neon-connection-string"
   cd api
   npx prisma migrate deploy
   ```

## Quick Setup for Redis (Recommended: Upstash)

1. Go to https://upstash.com
2. Sign up/login
3. Create a new Redis database
4. Copy the connection string
5. Add it as `REDIS_URL` in Vercel

## Testing Your Setup

After setting environment variables:

1. Go to Vercel dashboard → Your API project → **Deployments**
2. Click the latest deployment → **View Function Logs**
3. Check for errors:
   - ✅ "Database connected successfully" = Good!
   - ❌ "Can't reach database server" = Check DATABASE_URL
   - ❌ "CORS error" = Check ALLOWED_ORIGINS/WEB_BASE_URL

## Troubleshooting

### "Can't reach database server at localhost:5433"
- **Cause**: DATABASE_URL not set or using localhost
- **Fix**: Set DATABASE_URL to a remote database (Neon, Supabase, etc.)

### "CORS policy: No 'Access-Control-Allow-Origin' header"
- **Cause**: Frontend origin not allowed
- **Fix**: Add your frontend URL to ALLOWED_ORIGINS or set WEB_BASE_URL

### "Internal Server Error" or function crashes
- Check Vercel function logs for the actual error
- Common issues:
  - Missing environment variables
  - Database connection timeout
  - WebSocket module (doesn't work in serverless - needs separate server)

## Note: WebSocket Limitation

**Vercel serverless functions cannot handle WebSockets** (persistent connections required).

Your backend uses WebSockets for real-time game communication. You have two options:

1. **Deploy backend to Railway/Render/Fly.io** (supports WebSockets)
2. **Separate WebSocket server**: Keep REST API on Vercel, deploy WebSocket server separately

For now, REST API endpoints will work, but WebSocket features (real-time game updates) won't work until deployed to a platform that supports persistent connections.


