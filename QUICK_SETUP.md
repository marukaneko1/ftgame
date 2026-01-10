# Quick Database Setup for Vercel

## Option 1: Neon (Recommended - Free Tier)

1. **Sign up for Neon**:
   - Go to https://neon.tech
   - Click "Sign Up" (free tier available)
   - Sign in with GitHub (easiest)

2. **Create a Project**:
   - Click "Create Project"
   - Name it: `ftgame` (or any name)
   - Select a region (closest to your users)
   - Click "Create Project"

3. **Get Connection String**:
   - After project creation, you'll see a connection string like:
     ```
     postgresql://user:password@ep-xxx-xxx.us-east-2.aws.neon.tech/dbname?sslmode=require
     ```
   - **Copy this entire string** - you'll need it for Vercel

4. **Run Migrations** (on your local machine):
   ```bash
   # Set the Neon connection string
   export DATABASE_URL="postgresql://user:password@ep-xxx-xxx.us-east-2.aws.neon.tech/dbname?sslmode=require"
   
   # Navigate to API directory
   cd api
   
   # Run migrations to create tables
   npx prisma migrate deploy
   ```
   
   This will create all your database tables in Neon.

5. **Add to Vercel**:
   - Go to your Vercel project: https://vercel.com/dashboard
   - Click on your API project (`ftgame-api` or similar)
   - Go to **Settings** → **Environment Variables**
   - Add new variable:
     - **Key**: `DATABASE_URL`
     - **Value**: The Neon connection string you copied
     - **Environment**: Check `Production`, `Preview`, and `Development`
   - Click **Save**
   - **Redeploy** your function (or it will auto-deploy on next push)

## Option 2: Supabase (Alternative - Free Tier)

1. **Sign up**: https://supabase.com
2. **Create Project**: Click "New Project"
3. **Get Connection String**: 
   - Go to **Settings** → **Database**
   - Copy the "Connection string" under "Connection pooling" (use the `postgresql://` one)
   - It looks like: `postgresql://postgres:[YOUR-PASSWORD]@db.xxx.supabase.co:5432/postgres?sslmode=require`
4. **Run Migrations**: Same as above, just use Supabase connection string
5. **Add to Vercel**: Same as above

## Option 3: Vercel Postgres (Integrated)

1. In your Vercel project dashboard
2. Go to **Storage** tab
3. Click **Create Database** → **Postgres**
4. Select a plan (Free tier available)
5. Vercel will automatically set `POSTGRES_URL` environment variable
6. Update your code to use `POSTGRES_URL` instead of `DATABASE_URL`, OR
7. Copy the `POSTGRES_URL` and set it as `DATABASE_URL` in environment variables

## Setting REDIS_URL (Also Required)

Your app also needs Redis. Here's the quickest option:

### Upstash (Recommended - Free Tier)

1. **Sign up**: https://upstash.com
2. **Create Database**: Click "Create Database"
   - Name: `ftgame-redis`
   - Type: Regional (free tier)
   - Region: Choose closest to your users
3. **Get Connection String**:
   - After creation, you'll see connection details
   - Copy the "REST URL" or "Redis URL"
   - Format: `redis://default:password@xxx.upstash.io:6379`
   - OR use REST API format: `rediss://default:password@xxx.upstash.io:6379`
4. **Add to Vercel**:
   - Add environment variable:
     - **Key**: `REDIS_URL`
     - **Value**: The Upstash connection string
     - **Environment**: All environments
   - Click **Save**

## Setting JWT Secrets (Required)

Generate secure secrets:

```bash
# Generate JWT_ACCESS_SECRET
openssl rand -base64 32

# Generate JWT_REFRESH_SECRET (run again, get different value)
openssl rand -base64 32
```

Add both to Vercel as environment variables:
- `JWT_ACCESS_SECRET` = first generated value
- `JWT_REFRESH_SECRET` = second generated value

## Required Environment Variables Summary

Add these to Vercel (Settings → Environment Variables):

| Variable | Example | Source |
|----------|---------|--------|
| `DATABASE_URL` | `postgresql://user:pass@ep-xxx.neon.tech/db?sslmode=require` | Neon/Supabase |
| `REDIS_URL` | `redis://default:pass@xxx.upstash.io:6379` | Upstash |
| `JWT_ACCESS_SECRET` | `abc123...` (64 chars) | Generated |
| `JWT_REFRESH_SECRET` | `xyz789...` (64 chars) | Generated |

## After Setting Variables

1. **Redeploy** your function in Vercel (or wait for auto-deploy)
2. **Check logs**: Go to your deployment → **Function Logs** to verify connection
3. **Test**: Try accessing your API - it should connect to the remote database!

## Migrating Data from Local Database (If Needed)

If you have existing data in your local database that you want to migrate:

```bash
# 1. Export data from local database
export DATABASE_URL="postgresql://postgres:postgres@localhost:5433/omegle_game"
cd api
npx prisma db pull  # Backup current schema
pg_dump -h localhost -p 5433 -U postgres -d omegle_game > local_backup.sql

# 2. Import to Neon/Supabase
export DATABASE_URL="postgresql://user:pass@ep-xxx.neon.tech/dbname?sslmode=require"
psql $DATABASE_URL < local_backup.sql

# OR use Neon's SQL editor to run the SQL from local_backup.sql
```

Note: If you're just starting out and don't have important data, you can skip migration and start fresh.


