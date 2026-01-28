# Fix: WebSocket CORS on Railway

## Problem Found:
✅ WebSocket module IS loaded (logs confirm)
❌ `/ws` namespace returns 404
❌ WebSocket connection fails from localhost

## Root Cause:
The WebSocket CORS configuration on Railway might not allow `localhost:3000`. Even though the WebSocket module is loaded, connections from localhost might be blocked by CORS.

## Solution:

### Step 1: Check Railway Environment Variables

1. **Go to Railway Dashboard → `@omegle-game/api` → Variables tab**

2. **Check `ALLOWED_ORIGINS` variable:**
   - It should include `http://localhost:3000`
   - Example: `http://localhost:3000,https://your-vercel-app.vercel.app`

3. **If `ALLOWED_ORIGINS` doesn't include `localhost:3000`:**
   - **Add it!** The WebSocket CORS checks this variable
   - Example value: `http://localhost:3000,https://your-vercel-app.vercel.app`

### Step 2: Check `WEB_BASE_URL`

**Make sure `WEB_BASE_URL` is set:**
- Should be your production frontend URL
- Or `http://localhost:3000` for local development

### Step 3: Railway CORS Configuration

The WebSocket gateway CORS is configured to:
1. Allow origins in `ALLOWED_ORIGINS` environment variable
2. Allow `localhost` in development mode (`NODE_ENV=development`)

**On Railway, `NODE_ENV=production`, so:**
- ❌ Localhost is NOT allowed automatically
- ✅ Must be in `ALLOWED_ORIGINS` explicitly

### Step 4: Update `ALLOWED_ORIGINS`

**Railway Dashboard → `@omegle-game/api` → Variables:**

1. **Edit `ALLOWED_ORIGINS` variable:**
   ```
   http://localhost:3000,https://your-vercel-app.vercel.app
   ```
   (Replace `your-vercel-app` with your actual Vercel URL)

2. **Or if you want to test locally only:**
   ```
   http://localhost:3000
   ```

3. **Save the variable** - Railway will auto-redeploy

### Step 5: Wait for Redeploy

After updating `ALLOWED_ORIGINS`:
1. Railway will automatically redeploy
2. Wait for deployment to complete
3. Check logs for `[AppGateway]` messages

### Step 6: Test WebSocket Connection

After redeploy, test:

```bash
# Test WebSocket namespace
curl 'https://omegle-gameapi-production.up.railway.app/ws/socket.io/?EIO=4&transport=polling' \
  -H "Origin: http://localhost:3000"
```

**Should return:** Socket.IO handshake JSON (not 404)

### Step 7: Test from Frontend

1. **Make sure you're logged in from localhost:**
   - Go to `http://localhost:3000/auth/login`
   - Log in with your credentials
   - This sets refresh token cookie for localhost

2. **Go to matchmaking:**
   - Go to `http://localhost:3000/play`
   - Click "Play 1:1 now"
   - WebSocket should connect!

## Current CORS Logic:

The WebSocket gateway CORS checks:
1. If no origin → allow only in development
2. If origin is localhost → allow only in development
3. If origin is in `ALLOWED_ORIGINS` → allow

**On Railway (`NODE_ENV=production`):**
- Localhost is NOT automatically allowed
- Must be in `ALLOWED_ORIGINS` explicitly

## Quick Fix:

**Railway Dashboard → `@omegle-game/api` → Variables:**

1. **Edit `ALLOWED_ORIGINS`:**
   - Add: `http://localhost:3000`
   - Example: `http://localhost:3000,https://your-vercel-app.vercel.app`

2. **Save and wait for redeploy**

3. **Test WebSocket connection**

## Verify Fix:

**Check Railway Logs:**
- Look for WebSocket connection attempts
- Should see `[AppGateway]` connection messages
- No CORS errors

**Test from Frontend:**
- WebSocket should connect successfully
- No CORS errors in browser console
- Matchmaking should work

Try updating `ALLOWED_ORIGINS` to include `http://localhost:3000`!


