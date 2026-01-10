# Deploy Backend to Railway (WebSocket Support)

Railway is the easiest platform to deploy your NestJS backend with WebSocket support.

## Why Railway?
- ✅ **WebSocket support** out of the box
- ✅ **Simple setup** - connect GitHub and deploy
- ✅ **Auto-deploy** from git pushes
- ✅ **Free tier** available ($5 credit/month)
- ✅ **No Dockerfile needed** - detects Node.js automatically
- ✅ **Environment variables** easy to manage
- ✅ **Custom domains** included

## Quick Deployment Steps

### 1. Create Railway Account
1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub (easiest option)

### 2. Create New Project
1. Click **"New Project"**
2. Select **"Deploy from GitHub repo"**
3. Select your `omegle-game` repository
4. Choose the **`api`** directory as the root

### 3. Configure Environment Variables
In Railway dashboard, go to **Variables** tab and add:

```bash
# Database (Neon PostgreSQL)
DATABASE_URL=postgresql://user:password@host/database?sslmode=require

# Redis (Upstash)
REDIS_URL=redis://default:password@host:port

# JWT Secrets (generate new secure secrets)
JWT_ACCESS_SECRET=your-super-secret-access-key-min-32-chars
JWT_REFRESH_SECRET=your-super-secret-refresh-key-min-32-chars
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# CORS Origins (your Vercel frontend URLs)
ALLOWED_ORIGINS=https://ftgame-theta.vercel.app,https://your-app.vercel.app
WEB_BASE_URL=https://your-app.vercel.app

# Port (Railway sets this automatically, but good to have)
PORT=3001

# Node Environment
NODE_ENV=production

# Optional: Other service URLs
AGORA_APP_ID=your-agora-app-id
AGORA_APP_CERTIFICATE=your-agora-certificate
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### 4. Configure Build & Start Commands
In Railway dashboard, go to **Settings** → **Deploy**:

**Build Command:**
```bash
npm install && npm run build
```

**Start Command:**
```bash
npm start
```

**Root Directory:** `api`

**Important:** Make sure **Root Directory** is set to `api` to ensure Railway only scans the backend folder, not the frontend (`web`) folder.

If you get security vulnerability errors about `next@14.2.10`:
1. This means Railway is scanning the `web` folder
2. Ensure **Root Directory** is set to `api` in Railway settings
3. The `.railwayignore` file should help, but the Root Directory setting is most important

### 5. Deploy
1. Railway will automatically detect it's a Node.js project
2. Click **"Deploy"** button
3. Wait for deployment to complete (~2-5 minutes)

### 6. Get Your Backend URL
1. Railway will assign a URL like: `https://your-app-name.up.railway.app`
2. Copy this URL

### 7. Update Frontend Environment Variables
In your Vercel dashboard, update:

```bash
NEXT_PUBLIC_API_URL=https://your-app-name.up.railway.app
NEXT_PUBLIC_WS_URL=wss://your-app-name.up.railway.app
```

Note: Use `wss://` (secure WebSocket) for production, not `ws://`

### 8. Configure Custom Domain (Optional)
1. In Railway dashboard, go to **Settings** → **Networking**
2. Click **"Generate Domain"** or add a custom domain
3. Update your Vercel environment variables with the new domain

## Database Migrations

Run Prisma migrations on Railway:

### Option 1: Railway CLI (Recommended)
```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Link to your project
railway link

# Run migrations
cd api
railway run npx prisma migrate deploy
```

### Option 2: SSH Shell in Railway
1. In Railway dashboard, click **"Deploy"** tab
2. Click the **"Shell"** button
3. Run:
```bash
cd api
npx prisma migrate deploy
```

### Option 3: One-time Script
Create a script in `api/package.json`:
```json
{
  "scripts": {
    "deploy:migrate": "prisma migrate deploy"
  }
}
```

Then in Railway, add a deploy command:
```bash
npm install && npm run build && npm run deploy:migrate
```

## Running Database Migrations on First Deploy

1. After first deployment, go to Railway dashboard
2. Click on your service → **"Shell"** tab
3. Run:
```bash
cd api
npx prisma migrate deploy
```

## Create Admin User

After deployment, create an admin user:

```bash
# Using Railway CLI
cd api
railway run node create-admin.js admin@example.com admin123

# Or using Railway Shell
cd api
node create-admin.js admin@example.com admin123
```

## Monitoring & Logs

- **Logs:** Click **"Deploy"** tab → **"View Logs"**
- **Metrics:** Click **"Metrics"** tab for CPU, Memory, Network stats
- **Settings:** Configure auto-scaling, health checks, etc.

## Auto-Deploy Setup

Railway automatically deploys when you push to your main branch.

To deploy from a specific branch:
1. Go to **Settings** → **Deploy**
2. Set **"Branch"** to your desired branch (e.g., `main`, `production`)

## Pricing

- **Free tier:** $5 credit/month (good for testing)
- **Hobby plan:** $5/month (beyond free credits)
- **Pro plan:** $20/month (better performance, more resources)

For production, Hobby or Pro plan is recommended.

## Troubleshooting

### WebSocket Connection Fails
- Make sure you're using `wss://` (not `ws://`) for production
- Check that Railway service is running
- Verify CORS settings include your frontend URL

### Database Connection Errors
- Verify `DATABASE_URL` is correct
- Check that Neon database allows connections from Railway IPs
- Ensure SSL mode is set (`?sslmode=require`)

### Build Fails
- Check Node.js version (should be >=20)
- Verify all dependencies are in `package.json`
- Check Railway build logs for specific errors

### Port Issues
- Railway automatically sets `PORT` environment variable
- Your `main.ts` should use `process.env.PORT || 3001`

## Alternative: Render (Also Easy)

If you prefer Render:

1. Go to [render.com](https://render.com)
2. Create new **Web Service**
3. Connect GitHub repo
4. Set:
   - **Root Directory:** `api`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
   - **Environment:** `Node`
5. Add environment variables (same as above)
6. Deploy!

Render also supports WebSockets and has a free tier (slower, but free).

## Next Steps

1. ✅ Deploy backend to Railway
2. ✅ Update Vercel environment variables with Railway URL
3. ✅ Test WebSocket connection from frontend
4. ✅ Run database migrations
5. ✅ Create admin user
6. ✅ Test matchmaking functionality

Your WebSocket matchmaking should now work! 🎉

