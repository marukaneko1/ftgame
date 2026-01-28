# Immediate Fix: WebSocket Authentication Errors

## Current Issue:
All WebSocket connections are failing with "Invalid or expired access token" because:
1. Tokens expire after 15 minutes
2. Token refresh fails (cross-origin cookie issue)
3. Old code is still deployed (improved logging not showing)

## Immediate Solutions (Pick One):

### Option 1: Increase Token Expiration for Testing ⚡ **QUICKEST**

**Railway Dashboard → `@omegle-game/api` → Variables:**
- Add: `JWT_ACCESS_EXPIRES_IN=24h` (24 hours)

This gives you 24 hours before tokens expire, so you won't need to log in as frequently.

**Then:**
1. Log in fresh: `http://localhost:3000/auth/login`
2. Try matching - should work!

### Option 2: Log In Fresh Before Each Test ⚡ **SIMPLE**

**Before testing matchmaking:**
1. Always log in fresh: `http://localhost:3000/auth/login`
2. Immediately try matching: `http://localhost:3000/play`
3. Tokens are valid for 15 minutes after login

**Note:** If you wait more than 15 minutes, log in again.

### Option 3: Deploy Updated Code + Log In Fresh 🔧 **BEST**

1. **Deploy the updated code** (commit and push):
   ```bash
   git add .
   git commit -m "Fix WebSocket auth: better error handling and logging"
   git push
   ```

2. **Wait for Railway to deploy** (usually 1-2 minutes)

3. **Log in fresh:**
   - Go to `http://localhost:3000/auth/login`
   - Log in

4. **Try matching:**
   - Go to `http://localhost:3000/play`
   - Click "Play 1:1 now"

5. **Check Railway logs** for `[WEBSOCKET AUTH]` messages - will show detailed errors

## Why This Happens:

**The token lifecycle:**
1. Login → Fresh token (valid 15 minutes)
2. After 15 minutes → Token expires
3. Token refresh → Fails (cross-origin cookie issue)
4. WebSocket → Uses expired token → Authentication fails

**Cross-origin cookie issue:**
- Refresh token cookie set by Railway domain
- Not accessible from localhost (different domain)
- Token refresh fails silently
- Expired token used → Authentication fails

## Recommended: Option 1 (Increase Expiration)

For testing, increase token expiration to 24 hours:
- **Railway → Variables → Add `JWT_ACCESS_EXPIRES_IN=24h`**
- Log in once
- Test for 24 hours without re-logging

This is the easiest solution for development/testing!

## After Fixing:

1. ✅ Tokens won't expire as quickly (or log in fresh)
2. ✅ WebSocket authentication will succeed
3. ✅ Matchmaking will work
4. ✅ Better error logs (after deploying updated code)

**Try Option 1 (increase expiration) - it's the quickest fix!**


