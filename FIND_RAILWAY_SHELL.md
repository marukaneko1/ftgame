# How to Find Railway Shell

## Where to Find Railway Shell

### Method 1: From Deployments Tab (Most Common)

1. Go to Railway Dashboard → `@omegle-game/api` service
2. Click on **"Deployments"** tab (at the top)
3. Click on the **latest deployment** (the one that says "Active" or has a green checkmark)
4. Look for one of these:
   - **"Shell"** button/tab
   - **"Console"** button/tab
   - **"Terminal"** button/tab
   - A terminal icon (looks like `>_` or `{}`)
5. Click it to open the shell

### Method 2: From Service Settings

1. Go to Railway Dashboard → `@omegle-game/api` service
2. Click on **"Settings"** tab
3. Scroll down and look for:
   - **"Shell"** section
   - **"Console"** section
   - **"Terminal"** section
4. Click to open

### Method 3: From Service Overview

1. On the main service page (`@omegle-game/api`)
2. Look at the top right or bottom of the page
3. Look for a terminal/console icon
4. It might be in a toolbar or action buttons

### Method 4: From Architecture View

1. Go to **"Architecture"** tab
2. Click on the `@omegle-game/api` service card
3. In the details panel that opens, look for Shell/Console option

## What the Shell Looks Like

When you open the Shell, you'll see:
- A terminal window (usually at the bottom of the page)
- A command prompt (like `$` or `#`)
- You can type commands there

## Alternative: Use Railway CLI (If Shell Not Available)

If you can't find the Shell in the dashboard, use Railway CLI:

### Install Railway CLI:
```bash
npm i -g @railway/cli
```

### Use it:
```bash
# Login to Railway
railway login

# Link to your project
railway link

# Select the @omegle-game/api service when prompted

# Run migrations
railway run npx prisma migrate deploy

# Create admin user
railway run node create-admin.js admin@example.com admin123
```

## Alternative: Add to Build Command (Temporary)

If you can't access Shell, you can temporarily add migrations to the build:

1. Go to Railway Dashboard → `@omegle-game/api` → **Settings** → **Deploy**
2. Find **"Pre-deploy Command"** or **"Build Command"**
3. Update it to:
   ```bash
   npm install && npm run prisma:generate && npx prisma migrate deploy && npm run build
   ```
4. Save and redeploy

**Note:** Remove this after first deployment to avoid running migrations on every deploy.

## Visual Guide:

The Shell button usually looks like:
- A terminal icon: `>_` or `{}`
- Text: "Shell", "Console", or "Terminal"
- Located in: Deployments tab, Settings tab, or service toolbar

## Still Can't Find It?

1. **Check if you're on the correct service** (`@omegle-game/api`)
2. **Try refreshing the page**
3. **Check if your Railway plan includes Shell access** (most plans do)
4. **Use Railway CLI instead** (Method 4 above)


