# How to Run Database Migrations on Railway

## Option 1: Railway Dashboard Shell (Easiest)

### Step-by-Step:

1. **Go to Railway Dashboard**
   - Open https://railway.app
   - Select your project: `lovely-luck`
   - Click on `@omegle-game/api` service

2. **Find the Shell/Console**
   
   **Method A: From Deployments**
   - Click on **"Deployments"** tab
   - Click on the latest deployment (the one that says "Active")
   - Look for a **"Shell"** or **"Console"** button/tab
   - Click it to open the shell

   **Method B: From Settings**
   - Click on **"Settings"** tab
   - Look for **"Shell"**, **"Console"**, or **"Terminal"** section
   - Click to open

   **Method C: From Service View**
   - On the main service page, look for a terminal/console icon
   - It might be in the top right or bottom of the page

3. **Run Commands in Shell**
   
   Once the shell opens, you'll see a terminal prompt. Type:
   
   ```bash
   cd api
   npx prisma migrate deploy
   ```

   This will:
   - Change to the `api` directory (where Prisma is configured)
   - Run migrations to update your production database

4. **Check Results**
   
   You should see output like:
   ```
   ✔ Applied migration: 20251211084125_init_schema
   ✔ Applied migration: 20251212152841_add_user_location
   ✔ Applied migration: 20251212153631_add_admin_field
   ```

## Option 2: Railway CLI (Alternative)

If you can't find the shell in the dashboard, install Railway CLI:

### Install Railway CLI:

```bash
# macOS/Linux
curl -fsSL https://railway.app/install.sh | sh

# Or using npm
npm i -g @railway/cli
```

### Use Railway CLI:

```bash
# Login to Railway
railway login

# Link to your project
railway link

# Select the API service when prompted
# Then run migrations
railway run npx prisma migrate deploy
```

Or if you need to specify the directory:

```bash
railway run --service "@omegle-game/api" --directory api npx prisma migrate deploy
```

## Option 3: One-Time Deploy Script

You can also add migrations to the build process temporarily:

1. Go to Railway Dashboard → `@omegle-game/api` → Settings → Deploy
2. Update **Pre-deploy Command** to:
   ```bash
   npm install && npm run prisma:generate && npx prisma migrate deploy
   ```
3. Save and redeploy

**Note:** This runs migrations on every deploy. You might want to remove this after the first deployment.

## Verify Migrations Ran Successfully

After running migrations, check:

1. **Check Shell Output**
   - Should see "Applied migration" messages
   - No errors should appear

2. **Test API**
   ```bash
   curl https://omegle-gameapi-production.up.railway.app/api/auth/health
   ```
   Should return: `{"ok": true}`

3. **Check Railway Logs**
   - Go to Railway → `@omegle-game/api` → Logs
   - Look for database connection success messages

## Troubleshooting

**Can't find Shell?**
- Try refreshing the Railway dashboard
- Check if you're on the correct service (`@omegle-game/api`)
- Use Railway CLI as alternative (Option 2)

**Permission denied errors?**
- Make sure you're in the `api` directory first (`cd api`)
- Check that Prisma is installed in the service

**Migration already applied?**
- That's fine! Prisma will skip already-applied migrations
- You'll see: "No pending migrations to apply"

**Database connection errors?**
- Verify `DATABASE_URL` is set in Railway Variables
- Check that your Neon database allows connections
- Ensure the database URL format is correct

## After Migrations

Once migrations are complete, you can:

1. **Create Admin User:**
   ```bash
   cd api
   node create-admin.js admin@example.com admin123
   ```

2. **Verify Everything Works:**
   - Test API endpoints
   - Check frontend connection
   - Test WebSocket connection


