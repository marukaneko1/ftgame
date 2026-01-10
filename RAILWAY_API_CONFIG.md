# Railway API Service Configuration

## ⚠️ Important: Configure the BACKEND API, NOT the Frontend!

You need to configure the **`@omegle-game/api`** service, NOT `@omegle-game/web`.

## Correct Settings for `@omegle-game/api` Service:

### Settings → Deploy:

**Root Directory:** 
```
api
```
⚠️ **CRITICAL:** Must be set to `api` (not empty, not `/`)

**Pre-deploy Command (Optional):**
```
npm install && npm run prisma:generate
```
Or leave empty if you want migrations to run manually.

**Custom Start Command:**
```
npm start
```
Or leave empty (defaults to `npm start` which runs `node dist/main.js`)

### Settings → Variables:

Add these environment variables:

```bash
# Database (Neon PostgreSQL)
DATABASE_URL=postgresql://user:password@host/database?sslmode=require

# Redis (Upstash)
REDIS_URL=redis://default:password@host:port

# JWT Secrets
JWT_ACCESS_SECRET=your-super-secret-access-key-min-32-chars
JWT_REFRESH_SECRET=your-super-secret-refresh-key-min-32-chars
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# CORS Origins (your Vercel frontend URLs)
ALLOWED_ORIGINS=https://ftgame-theta.vercel.app
WEB_BASE_URL=https://ftgame-theta.vercel.app

# Port (Railway sets this automatically, but good to have)
PORT=3001

# Node Environment
NODE_ENV=production
```

### Settings → Regions:

**Region:** US East (Virginia, USA) or your preference
**Instances:** 1

## What NOT to Configure:

❌ **Don't configure `@omegle-game/web` on Railway**
- The frontend should stay on Vercel
- You don't need the `npm run migrate` command on the web service
- The `npm run start --workspace=@omegle-game/web` command is for frontend, not backend

## Quick Fix Steps:

1. In Railway dashboard, check if you have TWO services:
   - `@omegle-game/web` (frontend - can be deleted/ignored)
   - `@omegle-game/api` (backend - THIS is what you need)

2. If `@omegle-game/api` doesn't exist:
   - Click "New Service" in Railway
   - Select "GitHub Repo"
   - Choose your repo
   - Set **Root Directory:** `api`

3. Configure `@omegle-game/api` with the settings above

4. Delete or ignore `@omegle-game/web` service (frontend stays on Vercel)

## After Configuration:

Once the API service is deployed, you'll get a URL like:
`https://your-api.up.railway.app`

Update your Vercel environment variables:
```bash
NEXT_PUBLIC_API_URL=https://your-api.up.railway.app
NEXT_PUBLIC_WS_URL=wss://your-api.up.railway.app
```

## Run Migrations:

After first deployment, in Railway Shell for the API service:
```bash
cd api
npx prisma migrate deploy
```

## Create Admin User:

In Railway Shell for the API service:
```bash
cd api
node create-admin.js admin@example.com admin123
```

