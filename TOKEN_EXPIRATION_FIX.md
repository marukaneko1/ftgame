# Fix: Token Expiration Issue

## Problem:
Access tokens expire after **15 minutes**. When users try to connect to WebSocket after the token expires, authentication fails.

## Root Cause:
1. Access tokens expire in 15 minutes (default: `expiresIn: "15m"`)
2. Token refresh fails because refresh token cookie isn't accessible cross-origin (localhost → Railway)
3. Expired token is used for WebSocket → authentication fails

## Solutions:

### Solution 1: Log In Fresh (Immediate Fix)

**Before trying to match:**
1. Go to `http://localhost:3000/auth/login`
2. Log in with your credentials
3. This gives you a fresh token (valid for 15 minutes)
4. Immediately go to `http://localhost:3000/play` and try matching

**Important:** Tokens expire in 15 minutes. If you wait too long, you'll need to log in again.

### Solution 2: Deploy Updated Code (Better Fix)

I've added better error handling and logging. Deploy the updated code to Railway:

1. **Commit and push changes:**
   ```bash
   git add .
   git commit -m "Fix WebSocket auth: better error handling and token refresh"
   git push
   ```

2. **Railway will auto-deploy**

3. **After deployment, logs will show:**
   - `[WEBSOCKET AUTH]` messages with detailed errors
   - Token expiration details
   - Why authentication is failing

### Solution 3: Increase Token Expiration (For Testing)

If you want longer-lived tokens for testing, you can set `JWT_ACCESS_EXPIRES_IN` in Railway:

**Railway Dashboard → `@omegle-game/api` → Variables:**
- Add: `JWT_ACCESS_EXPIRES_IN=1h` (1 hour) or `JWT_ACCESS_EXPIRES_IN=24h` (24 hours)

**Default is 15 minutes** which is good for security but requires frequent refreshes.

## Why This Happens:

1. **Token expires:** After 15 minutes, access token is invalid
2. **Refresh fails:** Cross-origin cookie issue prevents token refresh
3. **WebSocket fails:** Expired token can't authenticate

## Current Behavior:

- ✅ Login works
- ✅ Token issued (valid for 15 minutes)
- ❌ Token refresh fails (cross-origin cookie)
- ❌ WebSocket fails with expired token

## After Fixing:

1. **Deploy updated code** (better error handling)
2. **Log in fresh** before each test session
3. **Try matching within 15 minutes** of login
4. **Or increase token expiration** for testing

## Quick Test Steps:

1. **Log in fresh:**
   - Go to `http://localhost:3000/auth/login`
   - Log in

2. **Try matching immediately:**
   - Go to `http://localhost:3000/play`
   - Click "Play 1:1 now"
   - Should work if token is fresh!

3. **If it fails:**
   - Check browser console for token info
   - Check Railway logs for `[WEBSOCKET AUTH]` messages (after deploying updated code)

**The main issue is token expiration. Log in fresh before testing!**


