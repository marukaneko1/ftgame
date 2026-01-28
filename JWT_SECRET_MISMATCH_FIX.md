# Fix: JWT Secret Mismatch Issue

## Problem Found:
When you log in, you're using:
- **Login API:** `localhost:3001` (local vercel dev) → Token signed with **localhost JWT secret**
- **WebSocket:** Railway → Token verified with **Railway JWT secret**

**If these secrets don't match, authentication fails!**

## Root Cause:
The `dev:vercel:web` script sets:
- `NEXT_PUBLIC_API_URL=http://localhost:3001` (login goes to localhost)
- `NEXT_PUBLIC_WS_URL=wss://omegle-gameapi-production.up.railway.app` (WebSocket goes to Railway)

**Tokens signed by localhost can't be verified by Railway if JWT secrets differ!**

## Solutions:

### Option 1: Use Railway for Everything (Recommended) ⚡

**Use the new script I just created:**

```bash
npm run dev:railway
```

This will:
- Use Railway API for login (`https://omegle-gameapi-production.up.railway.app`)
- Use Railway WebSocket (`wss://omegle-gameapi-production.up.railway.app`)
- Both use the **same JWT secret** → Authentication works!

**Steps:**
1. **Stop current dev servers** (Ctrl+C)
2. **Run:** `npm run dev:railway`
3. **Go to:** `http://localhost:3000/auth/login`
4. **Log in** - this now uses Railway API
5. **Try matching** - WebSocket will work because same JWT secret!

### Option 2: Use Existing Script

**Or use the existing script:**

```bash
npm run dev:vercel:web:railway
```

This does the same thing - uses Railway for both API and WebSocket.

### Option 3: Ensure Same JWT Secret

If you want to use localhost API + Railway WebSocket, make sure:
- Railway `JWT_ACCESS_SECRET` matches your local `.env.local` `JWT_ACCESS_SECRET`

**But Option 1 is easier!**

## Why This Happens:

1. **Login to localhost:** Token signed with localhost JWT secret
2. **WebSocket to Railway:** Railway tries to verify with Railway JWT secret
3. **Secrets don't match:** Verification fails → "Invalid or expired access token"

## Quick Fix:

**Just use Railway for everything:**

```bash
# Stop current servers
# Then run:
npm run dev:railway
```

Then:
1. Log in at `http://localhost:3000/auth/login`
2. Try matching at `http://localhost:3000/play`
3. Should work! ✅

**This ensures both login and WebSocket use the same JWT secret!**


