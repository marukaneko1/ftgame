# Run Migrations Now - Step by Step

## Install Railway CLI (One Time)

I'm installing Railway CLI for you. Once installed, you can run:

```bash
railway login
railway link
railway run npx prisma migrate deploy
```

## Step-by-Step Commands:

### 1. Login to Railway
```bash
railway login
```
This will open a browser window for you to login.

### 2. Link to Your Project
```bash
railway link
```
- Select your project: `lovely-luck`
- Select service: `@omegle-game/api`

### 3. Run Migrations
```bash
railway run npx prisma migrate deploy
```

### 4. Create Admin User
```bash
railway run node create-admin.js admin@example.com admin123
```

## Alternative: Check if Migrations Already Ran

Your migrations might have already run during deployment! Check Railway logs:

1. Go to Railway Dashboard → `@omegle-game/api` → **Logs** tab
2. Look for:
   - "Applied migration" messages
   - "No pending migrations"
   - Database connection success

If you see these, you're good to go!

## After Migrations:

Test your API:
```bash
curl https://omegle-gameapi-production.up.railway.app/api/auth/health
```

Should return: `{"ok": true}`


