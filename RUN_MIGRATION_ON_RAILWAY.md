# How to Run Migration on Railway

## The Problem
Games are failing with error: `invalid input value for enum "GameType": "POKER"`
This is because the database enum is missing `TRUTHS_AND_LIE`, `BILLIARDS`, and `POKER`.

## Solution: Run Migration

### Option 1: Via Railway Shell (Recommended)

1. Go to Railway dashboard → Your API service → **"Shell"** tab
2. Run:
   ```bash
   cd api
   npx prisma migrate deploy
   ```

This will run all pending migrations, including the new one that adds the missing enum values.

### Option 2: Manual SQL (If migrate deploy doesn't work)

1. Go to Railway dashboard → Your API service → **"Shell"** tab
2. Run:
   ```bash
   cd api
   npx prisma db execute --file prisma/migrations/20250110000000_add_missing_gametypes/migration.sql --schema prisma/schema.prisma
   ```

### Option 3: Direct Database Connection

If you have direct access to your Neon database:

1. Connect to your database using the connection string from Railway environment variables
2. Run the SQL from `api/prisma/migrations/20250110000000_add_missing_gametypes/migration.sql`:
   ```sql
   DO $$ BEGIN
       ALTER TYPE "GameType" ADD VALUE 'TRUTHS_AND_LIE';
   EXCEPTION
       WHEN duplicate_object THEN null;
   END $$;

   DO $$ BEGIN
       ALTER TYPE "GameType" ADD VALUE 'BILLIARDS';
   EXCEPTION
       WHEN duplicate_object THEN null;
   END $$;

   DO $$ BEGIN
       ALTER TYPE "GameType" ADD VALUE 'POKER';
   EXCEPTION
       WHEN duplicate_object THEN null;
   END $$;
   ```

## After Running Migration

1. Restart your Railway service (or it will restart automatically)
2. Try creating a game again - it should work now!

## Verify It Worked

Check Railway logs for any errors. Games should now create successfully.


