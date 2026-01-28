# Check if WebSocket is Running on Railway

## Problem:
WebSocket connection fails and you don't see logs on Railway. This could mean:
1. WebSocket module isn't loaded (might be disabled)
2. WebSocket isn't accessible at the expected path
3. Logs aren't showing connection attempts

## Check 1: Verify WebSocket Module is Loaded

The WebSocket module might be disabled if Railway sets `VERCEL=1` or `IS_SERVERLESS=true`.

**In Railway Dashboard:**
1. Go to `@omegle-game/api` → **Variables** tab
2. Check if `VERCEL` or `IS_SERVERLESS` environment variables are set
3. **If they are set, DELETE them** - Railway is NOT serverless!

**Important:** Railway should NOT have:
- ❌ `VERCEL=1`
- ❌ `IS_SERVERLESS=true`

Railway should have:
- ✅ `NODE_ENV=production`
- ✅ No `VERCEL` or `IS_SERVERLESS` variables

## Check 2: Verify WebSocket is Running

### Check Railway Logs:

1. **Go to Railway Dashboard:**
   - Click `@omegle-game/api` service
   - Click **"Logs"** tab (or **"Observability"** → **"Logs"**)

2. **Look for WebSocket startup messages:**
   ```
   [Nest] LOG [AppGateway] WebSocket gateway initialized
   [Nest] LOG [AppGateway] WebSocket server listening
   ```

3. **If you see errors like:**
   ```
   WebSocket module not loaded
   ```
   Then the WebSocket module is disabled!

### Check Startup Logs:

Look for messages like:
- `[RoutesResolver]` - Shows routes being registered
- `[AppGateway]` - Shows WebSocket gateway initialization
- `[NestApplication] Nest application successfully started`

**If you don't see `[AppGateway]` messages, the WebSocket module is NOT loaded!**

## Check 3: Test WebSocket Endpoint

Test if WebSocket is accessible:

```bash
# Test WebSocket namespace
curl -I https://omegle-gameapi-production.up.railway.app/ws/socket.io/

# Test Socket.IO handshake
curl https://omegle-gameapi-production.up.railway.app/ws/socket.io/?EIO=4&transport=polling
```

**If you get 404, WebSocket isn't running!**

## Fix: Ensure WebSocket Module is Loaded

If WebSocket module is disabled, fix it:

1. **Go to Railway Dashboard → `@omegle-game/api` → Variables**

2. **Remove these variables if they exist:**
   - `VERCEL` (delete it)
   - `IS_SERVERLESS` (delete it)

3. **Add/Verify these:**
   ```
   NODE_ENV=production
   # (do NOT set VERCEL or IS_SERVERLESS)
   ```

4. **Redeploy:**
   - Railway will automatically redeploy after you change variables
   - Or manually trigger a deploy

5. **Check logs again:**
   - Look for `[AppGateway]` messages
   - WebSocket should now be running

## Check 4: Railway Logs Location

Railway logs are in:
1. **Dashboard → Service → "Logs" tab**
2. **Dashboard → Service → "Observability" → "Logs"**
3. **Dashboard → Service → Latest Deployment → "Deploy Logs"**

**Look for:**
- Startup messages
- Connection attempts
- Error messages
- WebSocket initialization messages

## Quick Test:

After ensuring WebSocket is enabled, check logs for:

**Good (WebSocket running):**
```
[Nest] LOG [AppGateway] WebSocket gateway initialized
[Nest] LOG [NestApplication] Nest application successfully started
```

**Bad (WebSocket not loaded):**
```
# No [AppGateway] messages
# Only [RoutesResolver] and [RouterExplorer] messages
```

## After Fixing:

1. WebSocket should appear in logs
2. Connection attempts should show up
3. Errors will be visible in Railway logs

Try checking the logs again after ensuring WebSocket module is loaded!


