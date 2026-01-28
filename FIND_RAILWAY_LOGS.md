# How to Find Railway Logs

## Where to Find Railway Logs:

### Method 1: Service Logs Tab (Easiest)

1. **Go to Railway Dashboard:**
   - Open https://railway.app
   - Select project: `lovely-luck`
   - Click on `@omegle-game/api` service

2. **Click "Logs" tab:**
   - Look for tabs: **"Architecture"**, **"Observability"**, **"Logs"**, **"Settings"**
   - Click on **"Logs"** tab
   - This shows real-time logs from your service

3. **What to Look For:**
   - Startup messages: `[Nest] LOG [AppGateway] ...`
   - Connection attempts: `WebSocket connected` or similar
   - Errors: Any error messages

### Method 2: Observability Tab

1. **Go to Railway Dashboard:**
   - Click on `@omegle-game/api` service
   - Click **"Observability"** tab
   - Click **"Logs"** sub-tab
   - This shows detailed logs with filters

### Method 3: Deployment Logs

1. **Go to Railway Dashboard:**
   - Click on `@omegle-game/api` service
   - Click **"Deployments"** tab
   - Click on the **latest deployment** (the one that says "Active")
   - Click **"Build Logs"** or **"Deploy Logs"** tab
   - This shows logs from when the service started

## What Logs Should Show:

### If WebSocket is Running:

You should see messages like:
```
[Nest] LOG [AppGateway] WebSocket gateway initialized
[Nest] LOG [AppGateway] WebSocket server listening on namespace /ws
[Nest] LOG [NestApplication] Nest application successfully started
```

### If WebSocket is NOT Running:

You'll see:
```
[Nest] LOG [RoutesResolver] ...
[Nest] LOG [RouterExplorer] ...
# But NO [AppGateway] messages
```

## Check if WebSocket Module is Loaded:

The WebSocket module is disabled if Railway has:
- `VERCEL=1` environment variable
- `IS_SERVERLESS=true` environment variable

**To check:**
1. Railway Dashboard → `@omegle-game/api` → **Variables** tab
2. Look for `VERCEL` or `IS_SERVERLESS` variables
3. **If they exist, DELETE them** - Railway is NOT serverless!

**Railway should have:**
- `NODE_ENV=production`
- **NO** `VERCEL` variable
- **NO** `IS_SERVERLESS` variable

## Why You Might Not See Logs:

1. **WebSocket connection isn't reaching Railway** (CORS/firewall blocking)
2. **WebSocket module is disabled** (check environment variables)
3. **Logs are filtered** (check log level/filters in Railway)
4. **Looking in wrong place** (check all log locations above)

## Quick Check:

1. **Go to Railway → `@omegle-game/api` → Logs tab**
2. **Look for `[AppGateway]` messages** - if you see them, WebSocket is running
3. **If you don't see `[AppGateway]`, check environment variables** - WebSocket might be disabled

## Test WebSocket Endpoint:

Try this in your browser console (on the frontend page):

```javascript
// Test if WebSocket is accessible
fetch('https://omegle-gameapi-production.up.railway.app/ws/socket.io/?EIO=4&transport=polling')
  .then(r => r.text())
  .then(console.log)
  .catch(console.error)
```

If you get a response, WebSocket is running. If you get 404, WebSocket is disabled.


