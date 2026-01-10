# Running Locally with Vercel Simulation

This guide shows you how to run your application locally while simulating the Vercel serverless environment.

## Prerequisites

1. **Vercel CLI installed** (already installed: `which vercel`)
2. **Vercel account linked** (run `vercel login` if not already)

## Option 1: Simulate Full Vercel Environment (Recommended)

This simulates both the backend (serverless functions) and frontend exactly as they run on Vercel.

### Step 1: Link Backend to Vercel Project

```bash
cd api
vercel link
# Follow prompts to link to your existing API project (ftgame-api)
# Or create a new project
```

### Step 2: Set Environment Variables Locally

Create `api/.env.local` or use Vercel's environment variables:

```bash
cd api
vercel env pull .env.local
```

Or manually create `api/.env.local` with:
```env
DATABASE_URL=your_database_url
REDIS_URL=your_redis_url
JWT_ACCESS_SECRET=your_jwt_access_secret
JWT_REFRESH_SECRET=your_jwt_refresh_secret
ALLOWED_ORIGINS=http://localhost:3000
WEB_BASE_URL=http://localhost:3000
VERCEL=1
VERCEL_ENV=development
NODE_ENV=development
```

### Step 3: Link Frontend to Vercel Project

```bash
cd web
vercel link
# Follow prompts to link to your existing frontend project
```

### Step 4: Run with Vercel Dev

**Terminal 1 - Backend (API):**
```bash
cd api
vercel dev --listen 3001
```
This will:
- Simulate serverless functions at `http://localhost:3001`
- Use the same routing as production
- Apply rewrites and serverless function configuration

**Terminal 2 - Frontend (Web):**
```bash
cd web
NEXT_PUBLIC_API_URL=http://localhost:3001 vercel dev --listen 3000
```
This will:
- Run Next.js with Vercel optimizations
- Point to your local Vercel API
- Simulate the frontend exactly as on Vercel

**Or use the convenience script:**
```bash
npm run dev:vercel
```

## Option 2: Hybrid Approach (Backend Vercel, Frontend Next.js Dev)

Simulate only the backend with Vercel, but use standard Next.js dev for frontend (faster hot reload).

**Terminal 1 - Backend (Vercel):**
```bash
cd api
vercel dev --listen 3001
```

**Terminal 2 - Frontend (Next.js Dev):**
```bash
cd web
NEXT_PUBLIC_API_URL=http://localhost:3001 npm run dev
```

## Option 3: Full Local Development (No Vercel Simulation)

Standard local development without Vercel simulation:

```bash
npm run dev
```

This runs:
- Backend: NestJS on `http://localhost:3001` (standard dev mode)
- Frontend: Next.js on `http://localhost:3000`

## Environment Variables for Local Vercel Simulation

When running `vercel dev`, make sure you have these environment variables set:

### Backend (api/.env.local)
- `DATABASE_URL` - Your database connection string
- `REDIS_URL` - Your Redis connection string  
- `JWT_ACCESS_SECRET` - JWT secret for access tokens
- `JWT_REFRESH_SECRET` - JWT secret for refresh tokens
- `ALLOWED_ORIGINS` - `http://localhost:3000` for local dev
- `WEB_BASE_URL` - `http://localhost:3000`
- `VERCEL=1` - Simulates Vercel environment
- `VERCEL_ENV=development` - Development environment

### Frontend (web/.env.local)
- `NEXT_PUBLIC_API_URL` - `http://localhost:3001` (pointing to Vercel dev API)

## Testing Cookie Settings

When testing locally with Vercel simulation:
- Cookies with `sameSite: "none"` and `secure: true` won't work on `http://localhost`
- Vercel dev will detect this and use `sameSite: "lax"` and `secure: false` automatically
- To test production cookie settings, use HTTPS locally (see below)

## Testing with HTTPS (Production Cookie Settings)

To test with production cookie settings (`sameSite: "none"`, `secure: true`):

1. **Use ngrok or similar:**
```bash
# Install ngrok: brew install ngrok (or download from ngrok.com)
ngrok http 3000
```

2. **Update environment variables:**
- `ALLOWED_ORIGINS=https://your-ngrok-url.ngrok.io`
- `WEB_BASE_URL=https://your-ngrok-url.ngrok.io`
- Point `NEXT_PUBLIC_API_URL` to your Vercel production API (since ngrok can't forward to localhost:3001)

Or use `mkcert` to create local SSL certificates for true local HTTPS.

## Troubleshooting

### "Command not found: vercel"
```bash
npm install -g vercel
```

### "Not linked to a project"
```bash
cd api  # or cd web
vercel link
```

### Cookie issues in local dev
- Vercel dev automatically adjusts cookie settings for localhost
- Production cookie settings only work with HTTPS
- Test cookie behavior with ngrok or mkcert

### Port already in use
```bash
# Use different ports
vercel dev --listen 3002  # for API
vercel dev --listen 3003  # for Web
```

### Environment variables not loading
- Make sure `.env.local` is in the correct directory (`api/` or `web/`)
- Or use `vercel env pull .env.local` to pull from Vercel

## Differences from Production

1. **WebSockets**: Vercel serverless functions don't support WebSockets, so real-time features won't work with `vercel dev`
2. **Cold Starts**: Local dev doesn't simulate cold starts
3. **Edge Functions**: Some edge-specific features may behave differently
4. **Caching**: Local dev doesn't simulate Vercel's CDN caching

## Recommended Workflow

1. **Development**: Use `npm run dev` (standard local dev) for faster iteration
2. **Pre-deploy Testing**: Use `npm run dev:vercel` to test Vercel-specific behavior
3. **Production**: Deploy to Vercel for final testing


