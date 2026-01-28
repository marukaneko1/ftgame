# Railway Deployment - Next Steps ✅

Both services are now deployed successfully! Here's what to do next:

## 1. Get Your Railway API URL

In Railway dashboard:
1. Go to `@omegle-game/api` service
2. Click on **"Settings"** tab
3. Go to **"Networking"** section
4. Find your **Service URL** (should be something like: `https://your-api-name.up.railway.app`)
5. **Copy this URL** - you'll need it for Vercel

## 2. Set Environment Variables in Railway

In Railway dashboard → `@omegle-game/api` → **"Variables"** tab, add:

```bash
# Database (Neon PostgreSQL)
DATABASE_URL=postgresql://user:password@host/database?sslmode=require

# Redis (Upstash)
REDIS_URL=redis://default:password@host:port

# JWT Secrets (generate secure random strings)
JWT_ACCESS_SECRET=your-super-secret-access-key-min-32-chars
JWT_REFRESH_SECRET=your-super-secret-refresh-key-min-32-chars
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# CORS Origins (your Vercel frontend URLs)
ALLOWED_ORIGINS=https://ftgame-theta.vercel.app
WEB_BASE_URL=https://ftgame-theta.vercel.app

# Node Environment
NODE_ENV=production

# Port (Railway sets this automatically, but good to have)
PORT=3001

# Optional: Other services
AGORA_APP_ID=your-agora-app-id
AGORA_APP_CERTIFICATE=your-agora-certificate
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

**Important:** After adding variables, Railway will automatically redeploy the service.

## 3. Update Vercel Environment Variables

In Vercel dashboard → Your frontend project → **Settings** → **Environment Variables**:

### Add/Update these variables:

```bash
NEXT_PUBLIC_API_URL=https://your-api-name.up.railway.app
NEXT_PUBLIC_WS_URL=wss://your-api-name.up.railway.app
```

**Important:**
- Replace `https://your-api-name.up.railway.app` with your actual Railway API URL
- Use `wss://` (not `ws://`) for WebSocket URL in production
- Make sure to set these for **All Environments** (Production, Preview, Development)

After adding variables, **redeploy your Vercel frontend** for changes to take effect.

## 4. Run Database Migrations

In Railway dashboard:
1. Go to `@omegle-game/api` service
2. Click **"Shell"** tab (or "Deploy" → "Shell")
3. Run:
```bash
cd api
npx prisma migrate deploy
```

This will apply all pending migrations to your production database.

## 5. Create Admin User

In Railway Shell:
```bash
cd api
node create-admin.js admin@example.com admin123
```

This creates an admin user for testing.

## 6. Test the Connection

### Test API Health:
```bash
curl https://your-api-name.up.railway.app/api/auth/health
```

Should return: `{"ok": true}`

### Test from Frontend:
1. Go to your Vercel frontend URL
2. Try to log in
3. Check browser console for any CORS or connection errors

## 7. Update CORS Settings (if needed)

If you get CORS errors, make sure:
- `ALLOWED_ORIGINS` in Railway includes your Vercel frontend URL
- `NEXT_PUBLIC_API_URL` in Vercel matches your Railway API URL

## 8. Monitor Logs

In Railway dashboard:
- Go to `@omegle-game/api` → **"Logs"** tab
- Watch for any errors or connection issues
- Check startup logs to ensure everything initializes correctly

## Troubleshooting

**CORS Errors:**
- Verify `ALLOWED_ORIGINS` includes your frontend URL
- Check that Railway service is running
- Ensure `NEXT_PUBLIC_API_URL` is correct in Vercel

**WebSocket Connection Fails:**
- Make sure you're using `wss://` (not `ws://`)
- Check Railway logs for WebSocket errors
- Verify the service is running and accessible

**Database Connection Errors:**
- Verify `DATABASE_URL` is correct in Railway
- Check that Neon database allows connections from Railway IPs
- Run migrations if you haven't already

**401 Unauthorized:**
- Check that JWT secrets are set correctly
- Verify token refresh endpoint is working
- Try logging out and back in

## Success Checklist

- [ ] Railway API service is online
- [ ] Environment variables set in Railway
- [ ] Vercel environment variables updated
- [ ] Database migrations run
- [ ] Admin user created
- [ ] API health check returns success
- [ ] Frontend can connect to API
- [ ] WebSocket connection works
- [ ] Login/authentication works

## You're Done! 🎉

Your backend is now running on Railway with WebSocket support, and your frontend on Vercel can connect to it!


