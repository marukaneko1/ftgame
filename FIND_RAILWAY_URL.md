# How to Find Your Railway Public URL

## Internal vs Public URLs

- **Internal URL** (`*.railway.internal`): Only works within Railway's network
- **Public URL** (`*.up.railway.app`): Accessible from the internet (this is what you need!)

## How to Find Your Public API URL

### Option 1: Railway Dashboard (Easiest)

1. Go to Railway dashboard → `@omegle-game/api` service
2. Click on **"Settings"** tab
3. Scroll down to **"Networking"** section
4. Look for **"Public Domain"** or **"Generate Domain"**
5. Click **"Generate Domain"** if you don't have one yet
6. You'll get a URL like: `https://your-api-name.up.railway.app`
7. **Copy this URL** - this is your public API URL

### Option 2: Railway Dashboard - Deployments

1. Go to Railway dashboard → `@omegle-game/api` service
2. Click on **"Deployments"** tab
3. Click on the latest successful deployment
4. Look at the deployment details - it should show the public URL

### Option 3: Railway Dashboard - Service Card

1. On the main project page (Architecture view)
2. Click on the `@omegle-game/api` service card
3. The public URL might be visible in the service details panel

### Option 4: Railway CLI (If Installed)

```bash
railway link
railway domain
```

## What Your URL Should Look Like

Your public Railway API URL should look like:
```
https://your-service-name.up.railway.app
```

**Examples:**
- `https://omegle-game-api.up.railway.app`
- `https://lovely-luck-production.up.railway.app`
- `https://api-production.up.railway.app`

## Set Up Custom Domain (Optional)

If you want a custom domain:
1. Railway dashboard → `@omegle-game/api` → Settings → Networking
2. Click **"Add Custom Domain"**
3. Enter your domain (e.g., `api.yourdomain.com`)
4. Follow Railway's DNS setup instructions

## Use the Public URL

Once you have the public URL, use it in:

### Vercel Environment Variables:
```bash
NEXT_PUBLIC_API_URL=https://your-api-name.up.railway.app
NEXT_PUBLIC_WS_URL=wss://your-api-name.up.railway.app
```

**Important:** Use `wss://` (not `ws://`) for secure WebSocket connections in production!

## Test Your Public URL

Once you have the public URL, test it:

```bash
curl https://your-api-name.up.railway.app/api/auth/health
```

Should return: `{"ok": true}`

If you get an error, check:
- Service is online in Railway
- Environment variables are set correctly
- Public domain is generated


