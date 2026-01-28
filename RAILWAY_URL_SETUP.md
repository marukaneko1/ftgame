# Your Railway API URL is Ready! 🎉

## Your Public API URL:
```
https://omegle-gameapi-production.up.railway.app
```

## Next Steps:

### 1. Test Your API URL

Test the health endpoint:
```bash
curl https://omegle-gameapi-production.up.railway.app/api/auth/health
```

Should return: `{"ok": true}`

**Note:** This might fail until you set environment variables (DATABASE_URL, REDIS_URL, etc.)

### 2. Set Environment Variables in Railway

Go to Railway Dashboard → `@omegle-game/api` → **Variables** tab

**Required Variables:**
```bash
# Database (Neon PostgreSQL)
DATABASE_URL=postgresql://user:password@host/database?sslmode=require

# Redis (Upstash)
REDIS_URL=redis://default:password@host:port

# JWT Secrets (generate secure random strings - min 32 chars)
JWT_ACCESS_SECRET=your-super-secret-access-key-min-32-chars
JWT_REFRESH_SECRET=your-super-secret-refresh-key-min-32-chars
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# CORS Origins (your Vercel frontend URL)
ALLOWED_ORIGINS=https://ftgame-theta.vercel.app
WEB_BASE_URL=https://ftgame-theta.vercel.app

# Node Environment
NODE_ENV=production

# Port (Railway sets this automatically, but good to have)
PORT=8080
```

**Optional Variables:**
```bash
AGORA_APP_ID=your-agora-app-id
AGORA_APP_CERTIFICATE=your-agora-certificate
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
GOOGLE_CLIENT_ID=your-google-client-id
```

**After adding variables**, Railway will automatically redeploy the service.

### 3. Update Vercel Environment Variables

Go to Vercel Dashboard → Your Frontend Project → **Settings** → **Environment Variables**

**Add these variables:**
```bash
NEXT_PUBLIC_API_URL=https://omegle-gameapi-production.up.railway.app
NEXT_PUBLIC_WS_URL=wss://omegle-gameapi-production.up.railway.app
```

**Important:**
- ✅ Use `wss://` (not `ws://`) for WebSocket in production
- ✅ Set for **All Environments** (Production, Preview, Development)
- ✅ After adding, **redeploy your Vercel frontend** for changes to take effect

### 4. Run Database Migrations

In Railway Dashboard → `@omegle-game/api` → **Shell** tab (or **Deploy** → **Shell**):

```bash
cd api
npx prisma migrate deploy
```

This applies all pending migrations to your production database.

### 5. Create Admin User

In Railway Shell:
```bash
cd api
node create-admin.js admin@example.com admin123
```

### 6. Test the Connection

#### Test API Health:
```bash
curl https://omegle-gameapi-production.up.railway.app/api/auth/health
```

Should return: `{"ok": true}`

#### Test from Frontend:
1. Go to your Vercel frontend URL
2. Open browser console (F12)
3. Try to log in
4. Check for any CORS or connection errors

### 7. Monitor Logs

In Railway Dashboard → `@omegle-game/api` → **Logs** tab:
- Watch for startup messages
- Check for any errors
- Verify database and Redis connections

## Quick Checklist:

- [x] Railway API URL generated: `omegle-gameapi-production.up.railway.app`
- [ ] Railway environment variables set
- [ ] Vercel environment variables updated
- [ ] Database migrations run
- [ ] Admin user created
- [ ] API health check returns success
- [ ] Frontend can connect to API
- [ ] WebSocket connection works

## Troubleshooting

**CORS Errors?**
- Verify `ALLOWED_ORIGINS` includes your Vercel frontend URL
- Check that service is online in Railway
- Ensure `NEXT_PUBLIC_API_URL` is correct in Vercel

**Database Connection Errors?**
- Verify `DATABASE_URL` is correct in Railway
- Check that Neon database allows connections
- Run migrations if you haven't already

**WebSocket Connection Fails?**
- Make sure you're using `wss://` (not `ws://`)
- Check Railway logs for WebSocket errors
- Verify service is running and accessible

## Your URLs:

**Backend API:** `https://omegle-gameapi-production.up.railway.app`
**WebSocket:** `wss://omegle-gameapi-production.up.railway.app`

## Success! 🎉

Your backend is now live on Railway with WebSocket support!


