# Fix WebSocket Connection from Localhost to Railway

## Problem:
When running locally (`localhost:3000`) and connecting to Railway WebSocket:
1. **Token refresh fails** - Refresh token cookie isn't sent cross-origin (localhost → Railway)
2. **WebSocket connection fails** - Likely authentication or CORS issue
3. **User gets kicked out** - Because token refresh fails

## Root Cause:
- Refresh token is stored in HTTP-only cookie
- Cookies set by Railway (production) aren't accessible from localhost (cross-origin)
- So token refresh fails, causing "session expired"

## Solution:

### Option 1: Log In from Localhost (Recommended)

**The refresh token cookie needs to be set from localhost:**

1. **Make sure you're logged in from localhost:**
   - Go to `http://localhost:3000/auth/login`
   - Log in with your credentials
   - The refresh token cookie will be set for `localhost`

2. **Then try matchmaking:**
   - The WebSocket should connect with the fresh token

### Option 2: Use Local API for Everything

If you want to test WebSockets locally:

1. **Stop the vercel dev API:**
   ```bash
   # Stop vercel dev:api
   ```

2. **Run API normally (not with vercel dev):**
   ```bash
   cd api
   npm run start:dev
   ```

3. **Update WebSocket URL in `.env.local`:**
   ```bash
   NEXT_PUBLIC_WS_URL=ws://localhost:3001
   ```

4. **Run frontend:**
   ```bash
   cd web
   npm run dev
   ```

This runs the API as a normal Node.js process (not serverless), so WebSockets work locally.

### Option 3: Log In Through Railway Frontend

If you have a Railway-deployed frontend:

1. Log in through the Railway frontend URL
2. Copy the access token from localStorage
3. Use it in localhost (temporary workaround)

## What I Fixed:

1. ✅ **Token refresh doesn't redirect immediately** - Now tries with existing token if refresh fails
2. ✅ **Better error messages** - Shows Railway-specific errors
3. ✅ **WebSocket auth headers** - Added Authorization header as fallback

## Quick Fix (Do This Now):

**Log in again from localhost:**

1. Go to: `http://localhost:3000/auth/login`
2. Log in with your credentials (e.g., `admin@example.com` / `admin123`)
3. This will set a refresh token cookie for `localhost`
4. Then try matchmaking again

The WebSocket should now connect successfully!

## Why This Happens:

- **Cookies are domain-specific**: Cookies set by `omegle-gameapi-production.up.railway.app` aren't accessible from `localhost:3000`
- **Same-origin policy**: Browsers enforce this for security
- **Solution**: Log in from the same origin (localhost) where you're testing

## After Logging In:

Once you log in from localhost:
- ✅ Refresh token cookie will be set for localhost
- ✅ Token refresh will work
- ✅ WebSocket connection will work
- ✅ No more "session expired" errors

Try logging in again from localhost and then test matchmaking!


