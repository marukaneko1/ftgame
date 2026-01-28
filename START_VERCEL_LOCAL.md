# Start Vercel Local Simulation - Quick Guide

## ✅ Setup Complete!

Your projects are now linked:
- **Backend (api/)**: Linked to `ftgame-api`
- **Frontend (web/)**: Linked to `ftgame`
- **Environment variables**: Pulled from Vercel

## 🚀 Run It!

**From the project ROOT directory (NOT from api/ or web/):**

```bash
cd /Users/marukaneko/omegle-game
npm run dev:vercel
```

This will start:
- **Backend**: `http://localhost:3001` (Vercel serverless simulation)
- **Frontend**: `http://localhost:3000` (Vercel Next.js simulation)

## 🌐 Access Your App

- Frontend: http://localhost:3000
- API: http://localhost:3001/api/...

## ⚙️ What's Different from Production?

1. **Cookies**: Uses `sameSite: "lax"` and `secure: false` for localhost (auto-adjusted by Vercel dev)
2. **WebSockets**: Still won't work (Vercel serverless limitation)
3. **No CDN**: No edge caching, runs exactly as serverless functions
4. **Hot Reload**: Changes to code will trigger rebuilds

## 🐛 Troubleshooting

**If you get "Port already in use":**
```bash
# Kill processes on ports 3000 and 3001
lsof -ti:3000 | xargs kill -9
lsof -ti:3001 | xargs kill -9
```

**If you get "Project not found":**
- Backend: `cd api && vercel link --project=ftgame-api`
- Frontend: `cd web && vercel link --project=ftgame`

**To update environment variables:**
```bash
cd api
vercel env pull .env.local
# Then manually update ALLOWED_ORIGINS and WEB_BASE_URL for localhost
```

## 🎯 Test Cookie Behavior

Since cookies are adjusted for localhost, you can test:
1. Login flow
2. Token refresh
3. Cookie persistence

But production cookie settings (`sameSite: "none"`, `secure: true`) only work with HTTPS.

## 💡 Tips

- **Standard Dev**: Use `npm run dev` for faster iteration (runs NestJS directly)
- **Vercel Simulation**: Use `npm run dev:vercel` to test Vercel-specific behavior
- **Production**: Deploy to Vercel for final testing



