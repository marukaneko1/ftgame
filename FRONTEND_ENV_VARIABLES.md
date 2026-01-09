# Frontend Environment Variables (Vercel)

## Required Variables for Frontend Project

Go to: **Vercel Dashboard** → Your Frontend Project (`ftgame-web` or `ftgame-theta`) → **Settings** → **Environment Variables**

### 1. NEXT_PUBLIC_API_URL (Required)
**Value** (no trailing slash):
```
https://ftgame-api.vercel.app
```

**Important**: 
- ❌ **Don't delete this** - it's required for production!
- ❌ **Don't use** `http://localhost:3001` in production (only for local dev)
- ✅ **Remove trailing slash** if you have one (`/` at the end)
- This is used for all REST API calls (login, register, etc.)

### 2. NEXT_PUBLIC_WS_URL (Optional but Recommended)
**Value**:
```
wss://ftgame-api.vercel.app/ws
```

**Note**: 
- If not set, it will be derived from `NEXT_PUBLIC_API_URL` automatically
- WebSocket uses `wss://` (secure) instead of `https://`
- The `/ws` path is the WebSocket namespace configured in your backend

**Important**: Vercel serverless functions don't support WebSockets, so this won't work on Vercel. You'll need to deploy your WebSocket server to Railway/Render/etc. For now, keep this set if you plan to deploy WebSocket separately.

---

## Summary

**Keep `NEXT_PUBLIC_API_URL`** with value:
```
https://ftgame-api.vercel.app
```

(Remove trailing slash if you have one)

---

## How It's Used

- **REST API calls**: Login, register, user data, rooms, wallet, etc.
- **WebSocket URL**: Auto-derived from API URL if `NEXT_PUBLIC_WS_URL` not set

Without `NEXT_PUBLIC_API_URL`, your frontend will try to connect to `http://localhost:3001`, which won't work in production!

