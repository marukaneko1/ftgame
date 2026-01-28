# Quick Guide: Run Migrations Without Shell

Since you can't find the Railway Shell, here are alternatives:

## Option 1: Railway CLI (Recommended)

Install and use Railway CLI from your local terminal:

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Link to your project (select @omegle-game/api when prompted)
railway link

# Run migrations
railway run npx prisma migrate deploy

# Create admin user
railway run node create-admin.js admin@example.com admin123
```

## Option 2: Add to Pre-deploy Command (Temporary)

1. Go to Railway Dashboard → `@omegle-game/api` → **Settings** → **Deploy**
2. Find **"Pre-deploy Command"** field
3. Add:
   ```bash
   cd api && npx prisma migrate deploy
   ```
4. Save
5. Railway will run migrations before each deploy
6. **Remove this after first deployment** to avoid running migrations every time

## Option 3: Check Deployments Tab

1. Railway Dashboard → `@omegle-game/api` → **"Deployments"** tab
2. Click on the **latest deployment** (the active one)
3. Look for **"Shell"**, **"Console"**, or **"Terminal"** button
4. It might be in a dropdown menu or as a tab

## Option 4: Check if Migrations Already Ran

Your migrations might have already run! Check:

1. Go to Railway → `@omegle-game/api` → **Logs** tab
2. Look for messages like:
   - "Applied migration"
   - "No pending migrations"
   - Database connection success

If you see these, migrations might already be done!

## Recommended: Use Railway CLI

The easiest way is to use Railway CLI from your local terminal. It's a one-time install and then you can run commands easily.

Want me to help you install and use Railway CLI?


