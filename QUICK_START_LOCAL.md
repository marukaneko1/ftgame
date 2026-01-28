# Quick Start - Local Development with Railway WebSocket

## ✅ Setup Complete!

I've updated your `package.json` script to automatically use Railway for WebSockets.

## How to Start:

### Just Run:

```bash
npm run dev:vercel
```

This will:
- Start API on `localhost:3001` (vercel dev)
- Start Web on `localhost:3000` (vercel dev)
- **WebSocket automatically points to Railway** (`wss://omegle-gameapi-production.up.railway.app`)

## What Changed:

The `dev:vercel:web` script now sets:
- `NEXT_PUBLIC_API_URL=http://localhost:3001` (REST API - local)
- `NEXT_PUBLIC_WS_URL=wss://omegle-gameapi-production.up.railway.app` (WebSocket - Railway)

## Test It:

1. **Start dev servers:**
   ```bash
   npm run dev:vercel
   ```

2. **Open browser:**
   ```
   http://localhost:3000/dashboard
   ```

3. **Click "Play 1:1 now"**
   - WebSocket should connect to Railway
   - No more WebSocket errors!

## Alternative: Manual `.env.local` File

If you prefer, create `web/.env.local` manually:
```bash
cd web
cat > .env.local << EOF
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=wss://omegle-gameapi-production.up.railway.app
EOF
```

But the script already sets these, so you don't need to!

## You're All Set! 🎉

Just run `npm run dev:vercel` and everything will work!


