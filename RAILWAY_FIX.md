# Fix Railway API Service Build Failure

## Current Issues:

1. ❌ **Custom Start Command** is wrong: `npm run start --workspace=@omegle-game/api`
2. ⚠️ **Build failed** - need to check logs and fix configuration
3. ❓ **Root Directory** - need to verify it's set to `api`

## ✅ Correct Configuration for `@omegle-game/api`:

### Settings → Deploy:

**Root Directory:**
```
api
```
⚠️ **CRITICAL:** Must be set to `api` (this ensures Railway runs commands from the `api` folder)

**Custom Start Command:**
```
npm start
```
✅ **CORRECT:** Since Root Directory is `api`, Railway already runs from that folder, so just use `npm start` (no workspace syntax needed)

**OR leave empty** - Railway will auto-detect and run `npm start` from `package.json`

**Pre-deploy Command (Optional):**
```
npm install && npm run prisma:generate
```
This ensures Prisma client is generated before building.

**OR leave empty** - the build script in `api/package.json` already includes `prisma generate && nest build`

### Settings → Build:

If there's a "Build Command" field, it should be:
```
npm install && npm run build
```

Or leave empty if Railway auto-detects.

### Settings → Variables:

Make sure you have all required environment variables:

```bash
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
JWT_ACCESS_SECRET=...
JWT_REFRESH_SECRET=...
ALLOWED_ORIGINS=https://ftgame-theta.vercel.app
WEB_BASE_URL=https://ftgame-theta.vercel.app
NODE_ENV=production
PORT=3001
```

## Quick Fix Steps:

1. **In Railway dashboard, go to Settings → Deploy:**

   - Set **Root Directory:** `api` (if not already set)
   - Change **Custom Start Command** to: `npm start` (or leave empty)
   - Remove the workspace syntax (`--workspace=@omegle-game/api`)

2. **Check Settings → Build:**

   - If there's a Build Command field, set it to: `npm install && npm run build`
   - Or leave empty for auto-detection

3. **Check the Build Logs:**

   - Go to "Deployments" tab
   - Click on the failed deployment
   - Check the build logs to see what error occurred
   - Common issues:
     - Missing environment variables
     - Prisma client not generated
     - TypeScript compilation errors

4. **Redeploy:**

   - After fixing the configuration, click "Deploy" or push to your repo

## Why This Fixes It:

- **Root Directory `api`:** Railway sets the working directory to `api/`, so all commands run from there
- **No workspace syntax:** Since we're already in the `api` folder, we don't need `--workspace` flag
- **`npm start`:** This runs `node dist/main.js` from `api/package.json`, which is correct

## Check Build Logs:

If it still fails, check the build logs in Railway:
1. Go to "Deployments" tab
2. Click on the failed deployment
3. Scroll through the build logs
4. Look for errors like:
   - `Error: Cannot find module`
   - `Prisma Client not generated`
   - `Environment variable missing`
   - `TypeScript compilation errors`

## Common Build Errors & Fixes:

**Error: "Prisma Client not generated"**
- Add pre-deploy command: `npm install && npm run prisma:generate`

**Error: "Cannot find module"**
- Check that all dependencies are in `api/package.json`
- Make sure `npm install` runs in the build command

**Error: "Environment variable missing"**
- Add all required variables in Settings → Variables

**Error: "TypeScript compilation errors"**
- Check `api/tsconfig.json`
- Make sure all source files are in `api/src/`

