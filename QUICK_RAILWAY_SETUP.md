# Quick Railway Setup Guide

**Railway is the easiest platform for WebSocket support!** 🚀

## 5-Minute Setup

### 1. Create Account
- Go to [railway.app](https://railway.app)
- Sign up with GitHub (easiest)

### 2. Create Project
- Click **"New Project"**
- Select **"Deploy from GitHub repo"**
- Choose your `omegle-game` repo
- Set **Root Directory:** `api`

### 3. Add Environment Variables
Go to **Variables** tab and add:

```bash
DATABASE_URL=postgresql://...  # Your Neon database URL
REDIS_URL=redis://...          # Your Upstash Redis URL
JWT_ACCESS_SECRET=your-secret-min-32-chars
JWT_REFRESH_SECRET=your-secret-min-32-chars
ALLOWED_ORIGINS=https://ftgame-theta.vercel.app
WEB_BASE_URL=https://ftgame-theta.vercel.app
NODE_ENV=production
```

### 4. Deploy Settings
In **Settings** → **Deploy**:

- **Build Command:** `npm install && npm run build`
- **Start Command:** `npm start`
- **Root Directory:** `api` ⚠️ **CRITICAL:** Must be set to `api` to avoid scanning frontend vulnerabilities

### 5. Deploy!
- Click **"Deploy"**
- Wait ~2-5 minutes
- Copy your Railway URL (e.g., `https://your-app.up.railway.app`)

### 6. Update Frontend
In Vercel dashboard, update:

```bash
NEXT_PUBLIC_API_URL=https://your-app.up.railway.app
NEXT_PUBLIC_WS_URL=wss://your-app.up.railway.app
```

**Important:** Use `wss://` (not `ws://`) for WebSocket URL!

### 7. Run Migrations
After deployment:

1. In Railway dashboard, click **"Shell"** tab
2. Run:
```bash
cd api
npx prisma migrate deploy
```

### 8. Create Admin User
In Railway Shell:
```bash
cd api
node create-admin.js admin@example.com admin123
```

## Done! ✅

Your WebSocket matchmaking should now work!

## Troubleshooting

**Security Vulnerability Error (next@14.2.10)?**
- ✅ **FIXED:** Next.js has been updated to 14.2.35 in `web/package.json`
- ⚠️ **CRITICAL:** Make sure **Root Directory** is set to `api` in Railway settings
- Railway scans the entire repo, but should only build the `api` folder
- The `.railwayignore` file helps, but Root Directory setting is most important

**WebSocket not connecting?**
- Make sure you're using `wss://` (not `ws://`)
- Check that Railway service is running
- Verify CORS includes your frontend URL

**Build fails?**
- Check Railway build logs
- Verify Node.js version is >=20
- Ensure all dependencies are in `package.json`

**Need help?**
- Check Railway logs in dashboard
- See full guide: `RAILWAY_DEPLOYMENT.md`

