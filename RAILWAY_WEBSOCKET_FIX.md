# Fix: WebSocket Namespace Not Working on Railway

## Problem Found:
- ✅ Socket.IO is running: `/socket.io/` works
- ❌ WebSocket namespace `/ws` returns 404: `/ws/socket.io/` doesn't work

**This means the WebSocket module with `/ws` namespace is NOT loaded on Railway!**

## Root Cause:
Railway might have `VERCEL=1` or `IS_SERVERLESS=true` environment variables set, which **disables the WebSocket module**.

The code in `api/src/app.module.ts` checks:
```typescript
const isServerless = process.env.IS_SERVERLESS === 'true' || process.env.VERCEL === '1';
```

If either is set, the WebSocket module is **NOT loaded**, so `/ws` namespace returns 404.

## Solution:

### Step 1: Check Railway Environment Variables

1. **Go to Railway Dashboard:**
   - Open https://railway.app
   - Select your project
   - Click on `@omegle-game/api` service
   - Click **"Variables"** tab

2. **Look for these variables:**
   - `VERCEL` - **DELETE if it exists!**
   - `IS_SERVERLESS` - **DELETE if it exists!**

3. **These should NOT be set on Railway:**
   - Railway is **NOT** serverless
   - Railway is a **persistent Node.js process**
   - WebSockets work perfectly on Railway

### Step 2: Verify Correct Variables

**Railway should have:**
```bash
NODE_ENV=production
# (NO VERCEL variable)
# (NO IS_SERVERLESS variable)
```

**Make sure these are set:**
- `DATABASE_URL` - Your Neon PostgreSQL URL
- `REDIS_URL` - Your Upstash Redis URL
- `JWT_ACCESS_SECRET` - JWT access token secret
- `JWT_REFRESH_SECRET` - JWT refresh token secret
- `ALLOWED_ORIGINS` - Comma-separated origins (e.g., `http://localhost:3000,https://your-vercel-app.vercel.app`)
- `WEB_BASE_URL` - Your frontend URL

### Step 3: Redeploy

After removing `VERCEL` or `IS_SERVERLESS`:

1. **Railway will automatically redeploy** (or manually trigger)
2. **Wait for deployment to complete**
3. **Check logs for WebSocket messages:**

**Look for these in Railway Logs:**
```
[Nest] LOG [AppGateway] WebSocket gateway initialized
[Nest] LOG [AppGateway] WebSocket server listening on namespace /ws
[Nest] LOG [NestApplication] Nest application successfully started
```

**If you see `[AppGateway]` messages, WebSocket is now running!**

### Step 4: Test WebSocket Namespace

After redeploy, test:

```bash
curl 'https://omegle-gameapi-production.up.railway.app/ws/socket.io/?EIO=4&transport=polling'
```

**Should return:** Socket.IO handshake response (not 404)

**Current result:** `{"message":"Cannot GET /ws/socket.io/...","error":"Not Found","statusCode":404}`

**After fix:** Should return Socket.IO handshake JSON

### Step 5: Find Railway Logs

**To see logs:**

1. **Railway Dashboard → `@omegle-game/api` → "Logs" tab**
   - Shows real-time logs from your service

2. **Railway Dashboard → `@omegle-game/api` → "Observability" → "Logs"**
   - Shows detailed logs with filters

3. **Railway Dashboard → `@omegle-game/api` → "Deployments" → Latest → "Deploy Logs"**
   - Shows logs from when the service started

**Look for:**
- `[AppGateway]` messages = WebSocket is running ✅
- No `[AppGateway]` messages = WebSocket is disabled ❌

### Step 6: Test from Frontend

After WebSocket is running:
1. Go to `http://localhost:3000/auth/login`
2. Log in from localhost (to get refresh token cookie)
3. Go to `http://localhost:3000/play`
4. Click "Play 1:1 now"
5. WebSocket should connect successfully!

## Verify Fix:

### Check 1: Railway Logs

**Good (WebSocket running):**
```
[Nest] LOG [AppGateway] WebSocket gateway initialized
[Nest] LOG [AppGateway] WebSocket server listening on namespace /ws
```

**Bad (WebSocket disabled):**
```
# Only [RoutesResolver] and [RouterExplorer] messages
# NO [AppGateway] messages
```

### Check 2: Test Endpoint

**Good (WebSocket running):**
```bash
curl 'https://omegle-gameapi-production.up.railway.app/ws/socket.io/?EIO=4&transport=polling'
# Returns: Socket.IO handshake JSON (not 404)
```

**Bad (WebSocket disabled):**
```bash
curl 'https://omegle-gameapi-production.up.railway.app/ws/socket.io/?EIO=4&transport=polling'
# Returns: {"message":"Cannot GET /ws/socket.io/...","error":"Not Found","statusCode":404}
```

## Quick Fix:

1. **Railway Dashboard → `@omegle-game/api` → Variables**
2. **DELETE these if they exist:**
   - `VERCEL` (delete it)
   - `IS_SERVERLESS` (delete it)
3. **Ensure you have:**
   - `NODE_ENV=production` ✅
   - All other required variables ✅
4. **Wait for automatic redeploy**
5. **Check logs for `[AppGateway]` messages**
6. **Test WebSocket endpoint**

## After Fixing:

1. ✅ WebSocket module will be loaded
2. ✅ `/ws` namespace will be accessible
3. ✅ Logs will show `[AppGateway]` messages
4. ✅ Frontend will connect successfully

Try this fix and check the logs again! The logs should now show WebSocket connection attempts.


