# Fix Railway Security Vulnerability Scan Issue

## Problem:
Railway is detecting `next@14.2.10` vulnerability even though we've updated to `14.2.35`. This is because Railway scans the **entire repository** for security vulnerabilities, not just the `api` folder.

## Solution Options:

### Option 1: Commit and Push Changes (Recommended)
Railway might be scanning an old commit. Make sure all changes are committed and pushed:

```bash
# Check what needs to be committed
git status

# Add the updated files
git add web/package.json package-lock.json .railwayignore

# Commit
git commit -m "Fix security vulnerability: update Next.js to 14.2.35"

# Push to trigger Railway to rescan
git push
```

After pushing, Railway should rescan with the updated version.

### Option 2: Update Root Directory in Railway
Make absolutely sure the **Root Directory** is set to `api` in Railway:

1. Go to Railway dashboard → `@omegle-game/api` service
2. Settings → Deploy
3. Verify **Root Directory** is exactly: `api` (not empty, not `/api`, just `api`)
4. Save and redeploy

### Option 3: Contact Railway Support
If the above doesn't work, Railway's security scanner might need to be manually refreshed:

1. Go to Railway dashboard
2. Click on your project
3. Look for a "Rescan" or "Refresh Security Scan" option
4. Or contact Railway support at: https://station.railway.com/new?type=technical

### Option 4: Use Railway's Ignore Patterns (If Available)
Some Railway configurations allow you to specify ignore patterns for security scans. Check if there's a setting for this in:
- Settings → Build
- Settings → Deploy
- Or in a `railway.json` or `.railwayignore` file

## Why This Happens:

Railway's security scanner:
- Scans the **entire repository** for vulnerabilities
- Not just the Root Directory folder
- This is by design to catch vulnerabilities in all dependencies

The `.railwayignore` file helps with builds, but security scans might still check everything.

## Verification:

After pushing, check Railway:
1. Go to Deployments tab
2. Look for the security scan results
3. It should now show `next@14.2.35` (or no Next.js vulnerabilities if scanning only `api`)

## Alternative: Separate Repository (Not Recommended)

If Railway continues to scan the `web` folder, you could:
- Move `api` to a separate repository
- Deploy only the API repo to Railway
- Keep `web` on Vercel

But this is overkill - the commit/push should fix it.

## Current Status:

✅ `web/package.json` has `next@^14.2.35`
✅ Root `package-lock.json` updated
✅ `.railwayignore` file created
⚠️ Need to commit and push to trigger Railway rescan

