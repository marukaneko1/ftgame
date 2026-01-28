# Fix: WebSocket Authentication Failed

## Problem:
```
ERROR [WsExceptionsHandler] Invalid or expired access token
UnauthorizedException: Invalid or expired access token
```

## Root Cause:
The WebSocket connection is reaching Railway successfully, but the JWT token authentication is failing. This means:
1. ✅ WebSocket connection works
2. ✅ CORS is allowing the connection
3. ❌ Token is expired or invalid

## Why Token is Expired:

When connecting from `localhost:3000` to Railway:
- Refresh token cookie was set by Railway (production domain)
- Cookie isn't accessible from localhost (cross-origin)
- Token refresh fails
- Old/expired token is used for WebSocket connection

## Solution:

### Step 1: Log In Fresh from Localhost

**The token needs to be refreshed from localhost:**

1. **Go to:** `http://localhost:3000/auth/login`
2. **Log in** with your credentials
3. **This sets a fresh refresh token cookie for localhost**
4. **Token refresh will now work from localhost**

### Step 2: Test WebSocket Connection

After logging in from localhost:
1. Go to `http://localhost:3000/play`
2. Click "Play 1:1 now"
3. WebSocket should connect successfully!

### Step 3: Check Railway Logs

After fixing, Railway logs should show:
```
[WEBSOCKET AUTH] Successfully authenticated user {userId}
```

Instead of:
```
[WEBSOCKET AUTH] Token verification failed: TokenExpiredError
```

## What I Fixed:

1. ✅ **Better error logging** - Railway logs now show detailed auth errors
2. ✅ **Query parameter fallback** - Token can be sent in query string too
3. ✅ **Better frontend error handling** - Detects auth errors and redirects to login
4. ✅ **Debug logging** - Shows token info (first 20 chars) for debugging

## Quick Fix:

**Just log in again from localhost:**

1. Go to `http://localhost:3000/auth/login`
2. Log in
3. Go to `http://localhost:3000/play`
4. Click "Play 1:1 now"
5. Should work now! ✅

## Why This Happens:

- **Cookies are domain-specific**: Cookies set by Railway aren't accessible from localhost
- **Token expires**: Access tokens expire after a certain time
- **Refresh fails**: Without the refresh token cookie, token refresh fails
- **Old token used**: WebSocket tries to use expired token → authentication fails

## After Logging In:

- ✅ Fresh refresh token cookie for localhost
- ✅ Token refresh works
- ✅ Fresh access token in localStorage
- ✅ WebSocket authentication succeeds
- ✅ Matchmaking works!

**The main fix is logging in fresh from localhost!**


