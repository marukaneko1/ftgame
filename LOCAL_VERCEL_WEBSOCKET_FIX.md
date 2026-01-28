# Fix WebSocket in Local Vercel Simulation

## Problem:
`vercel dev` doesn't support WebSockets because it simulates serverless functions. When you try to connect to WebSocket in local Vercel simulation, it fails.

## Solution: Use Railway for WebSockets in Local Dev

Since your Railway backend supports WebSockets, point your local frontend to Railway for WebSocket connections.

## Option 1: Use Railway for WebSockets Only (Recommended)

Keep using `localhost:3001` for REST API, but use Railway for WebSockets:

### Update your dev script:

I've updated `package.json` to add a new script. Run:

```bash
npm run dev:vercel:web
```

This now sets `NEXT_PUBLIC_WS_URL=wss://omegle-gameapi-production.up.railway.app` so WebSockets connect to Railway while REST API uses localhost.

## Option 2: Use Railway for Everything (Full Production Simulation)

Use Railway for both REST API and WebSockets:

```bash
npm run dev:vercel:web:railway
```

This connects everything to Railway, giving you a full production-like experience locally.

## Option 3: Create `.env.local` File

Create `web/.env.local`:

```bash
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=wss://omegle-gameapi-production.up.railway.app
```

Then run:
```bash
npm run dev:vercel:web
```

## Option 4: Run API Normally (Not with vercel dev)

If you want to test WebSockets locally without Railway:

1. **Stop the vercel dev API:**
   ```bash
   # Stop the vercel dev:api process
   ```

2. **Run API normally:**
   ```bash
   cd api
   npm run start:dev
   ```

3. **Run frontend with vercel dev:**
   ```bash
   cd web
   NEXT_PUBLIC_API_URL=http://localhost:3001 NEXT_PUBLIC_WS_URL=ws://localhost:3001 vercel dev --listen 3000
   ```

This runs the API as a normal Node.js process (not serverless), so WebSockets work.

## Recommended Setup:

For local development, I recommend **Option 1** or **Option 3**:
- REST API calls go to `localhost:3001` (fast, local)
- WebSocket connections go to Railway (supports WebSockets)

This gives you:
- ✅ Fast local REST API development
- ✅ Working WebSocket connections (via Railway)
- ✅ Production-like WebSocket testing

## Quick Fix:

Just restart your dev server with the updated script:

```bash
# Stop current dev servers (Ctrl+C)

# Start with WebSocket pointing to Railway
npm run dev:vercel:web
```

Or create `web/.env.local`:
```bash
NEXT_PUBLIC_WS_URL=wss://omegle-gameapi-production.up.railway.app
```

Then restart your dev server.

## Why This Works:

- `vercel dev` simulates serverless functions (no WebSocket support)
- Railway runs a real Node.js server (WebSocket support)
- Your local frontend can connect to Railway's WebSocket while using local API for REST

## Test:

After restarting:
1. Go to `http://localhost:3000/dashboard`
2. Click "Play 1:1 now"
3. WebSocket should connect to Railway
4. No more WebSocket errors!


