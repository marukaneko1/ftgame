# Final Fix: WebSocket Connection on Railway

## ✅ What's Working:
1. ✅ WebSocket module is loaded (logs confirm)
2. ✅ Socket.IO server is running (`/socket.io/` works)
3. ✅ `/ws` namespace is accessible (handshake works with `&ns=/ws`)
4. ✅ Application started successfully

## ❌ What's Not Working:
- WebSocket connection from localhost frontend fails

## Root Cause:
**CORS is blocking localhost connections on Railway!**

On Railway, `NODE_ENV=production`, so:
- ❌ Localhost is NOT automatically allowed in WebSocket CORS
- ✅ Must be explicitly in `ALLOWED_ORIGINS` environment variable

## Fix:

### Step 1: Update Railway `ALLOWED_ORIGINS`

**Railway Dashboard → `@omegle-game/api` → Variables:**

1. **Find `ALLOWED_ORIGINS` variable**
2. **Make sure it includes `http://localhost:3000`**

Example value:
```
http://localhost:3000,https://your-vercel-app.vercel.app
```

**If it doesn't include localhost, add it:**
- Click "Edit" on `ALLOWED_ORIGINS`
- Add `http://localhost:3000` (comma-separated with other origins)
- Save - Railway will auto-redeploy

### Step 2: Updated Frontend Code

I've updated the frontend WebSocket connection to:
- ✅ Explicitly set Socket.IO path
- ✅ Allow polling fallback for initial handshake
- ✅ Better error handling

The connection code is now:
```typescript
const ws = io(`${wsUrl}/ws`, {
  path: '/socket.io',
  transports: ["websocket", "polling"],
  auth: { token: authToken },
  withCredentials: true,
  extraHeaders: {
    Authorization: `Bearer ${authToken}`
  },
  forceNew: true
});
```

### Step 3: Test Connection

After Railway redeploys:

1. **Log in from localhost:**
   - Go to `http://localhost:3000/auth/login`
   - Log in (this sets refresh token cookie for localhost)

2. **Test WebSocket:**
   - Go to `http://localhost:3000/play`
   - Click "Play 1:1 now"
   - Check browser console for connection logs
   - Check Railway logs for connection attempts

### Step 4: Check Railway Logs

When you try to connect, you should see in Railway logs:
- Connection attempts
- Authentication success/failure
- Any CORS errors

**If you see CORS errors:**
- Double-check `ALLOWED_ORIGINS` includes `http://localhost:3000`
- Make sure there are no typos (no trailing slashes, correct protocol)

**If you see auth errors:**
- Token might be expired - try logging in again
- Check that token is being sent correctly

## Why This Happens:

The WebSocket gateway CORS configuration:
```typescript
// In development, allow localhost variations
const isDev = process.env.NODE_ENV === "development";
if (isDev && (origin.includes("localhost") || origin.includes("127.0.0.1"))) {
  return callback(null, true);
}

if (allowedOrigins.includes(origin)) {
  return callback(null, true);
}
```

**On Railway (`NODE_ENV=production`):**
- `isDev` is `false`
- So localhost check is skipped
- Must be in `ALLOWED_ORIGINS` explicitly

## Quick Checklist:

- [ ] Railway `ALLOWED_ORIGINS` includes `http://localhost:3000`
- [ ] Railway redeployed after updating `ALLOWED_ORIGINS`
- [ ] Logged in from localhost (`http://localhost:3000/auth/login`)
- [ ] Frontend code updated (I've done this)
- [ ] Test WebSocket connection from `http://localhost:3000/play`
- [ ] Check Railway logs for connection attempts
- [ ] Check browser console for errors

## Expected Result:

After fixing `ALLOWED_ORIGINS`:
1. ✅ WebSocket connects successfully
2. ✅ Railway logs show connection attempts
3. ✅ Authentication works
4. ✅ Matchmaking starts working

**The main fix is ensuring `ALLOWED_ORIGINS` includes `http://localhost:3000` on Railway!**


