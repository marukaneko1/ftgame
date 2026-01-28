# Vercel Environment Variables Setup

## ✅ Database Setup Complete!

Your Neon database is set up and migrations have been applied. Now add the connection string to Vercel.

## Step 1: Add DATABASE_URL to Vercel

1. Go to your Vercel project: https://vercel.com/dashboard
2. Click on your **API project** (`ftgame-api` or similar)
3. Go to **Settings** → **Environment Variables**
4. Click **Add New**
5. Add this variable:
   - **Key**: `DATABASE_URL`
   - **Value**: `postgresql://neondb_owner:npg_6iYxb1ThJgMU@ep-quiet-mode-ahcijim1-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require`
   - **Environment**: ✅ Check all three: `Production`, `Preview`, `Development`
6. Click **Save**

## Step 2: Add REDIS_URL (Required)

You still need Redis. Quick setup with Upstash (free tier):

1. Go to https://upstash.com
2. Sign up/login (free tier available)
3. Click **Create Database**
4. Name it: `ftgame-redis`
5. Select **Regional** (free tier)
6. Choose a region close to your users (e.g., `us-east-1`)
7. Click **Create**
8. After creation, you'll see connection details
9. Copy the **Redis URL** (format: `redis://default:password@xxx.upstash.io:6379`)
10. Add to Vercel:
    - **Key**: `REDIS_URL`
    - **Value**: The Upstash connection string you copied
    - **Environment**: ✅ All three
    - Click **Save**

## Step 3: Add JWT Secrets (Required)

Add these two environment variables (I've already generated secure secrets for you):

1. **JWT_ACCESS_SECRET**:
   - **Key**: `JWT_ACCESS_SECRET`
   - **Value**: `CH6omNhm8bTdfHMK+B5sLIXP7Qf/pzM6WqX4DnzN3ng=`
   - **Environment**: ✅ All three

2. **JWT_REFRESH_SECRET**:
   - **Key**: `JWT_REFRESH_SECRET`
   - **Value**: `gF/V/bYbuZAi2Kk4xRWqGWgcAKho/sFV509rfNYHDaw=`
   - **Environment**: ✅ All three

## Step 4: Add Optional But Recommended Variables

1. **ALLOWED_ORIGINS** (Recommended for CORS):
   - **Key**: `ALLOWED_ORIGINS`
   - **Value**: `https://ftgame-theta.vercel.app,https://ftgame-git-main-marukaneko1s-projects.vercel.app`
   - **Environment**: ✅ All three
   - (Add your frontend URLs, comma-separated)

2. **WEB_BASE_URL** (Recommended):
   - **Key**: `WEB_BASE_URL`
   - **Value**: `https://ftgame-theta.vercel.app`
   - **Environment**: ✅ All three

## Step 5: Redeploy

After adding all variables:

1. Go to **Deployments** tab in Vercel
2. Click the **three dots** (⋯) on the latest deployment
3. Click **Redeploy**
4. OR: Just push any change to trigger a new deployment

## Step 6: Verify It Works

1. After redeployment, go to **Deployments** → Click latest deployment → **Function Logs**
2. Check for errors:
   - ✅ "Database connected successfully" = Good!
   - ✅ No connection errors = Good!
   - ❌ "Can't reach database" = Check DATABASE_URL
   - ❌ "CORS error" = Check ALLOWED_ORIGINS/WEB_BASE_URL

3. Test your API:
   - Try: `https://ftgame-api.vercel.app/api/auth/login` (should not give CORS error)
   - Should return proper error (missing body) instead of connection error

## Summary of Required Variables

Make sure you have these 4 variables set in Vercel:

| Variable | Status | Value |
|----------|--------|-------|
| `DATABASE_URL` | ✅ Ready | Neon connection string (see above) |
| `REDIS_URL` | ⚠️ Need to add | Get from Upstash |
| `JWT_ACCESS_SECRET` | ✅ Ready | `CH6omNhm8bTdfHMK+B5sLIXP7Qf/pzM6WqX4DnzN3ng=` |
| `JWT_REFRESH_SECRET` | ✅ Ready | `gF/V/bYbuZAi2Kk4xRWqGWgcAKho/sFV509rfNYHDaw=` |

Optional but recommended:
- `ALLOWED_ORIGINS` (for CORS)
- `WEB_BASE_URL` (for CORS and redirects)

## Troubleshooting

### "Can't reach database server"
- Check DATABASE_URL is set correctly
- Make sure it includes `?sslmode=require` at the end
- Verify the connection string works with `psql`

### "CORS policy: No 'Access-Control-Allow-Origin' header"
- Add your frontend URL to `ALLOWED_ORIGINS`
- Or set `WEB_BASE_URL` to your frontend URL
- Redeploy after adding variables

### "Missing environment variable: REDIS_URL"
- Set up Upstash (see Step 2 above)
- Add `REDIS_URL` to Vercel environment variables
- Redeploy



