# Alternative Ways to Run Migration (No Shell Tab)

If Railway doesn't show a "Shell" tab, here are alternative methods:

## Option 1: Use Railway CLI (Recommended)

### Install Railway CLI:
```bash
npm install -g @railway/cli
```

### Login and Link:
```bash
railway login
cd /Users/marukaneko/omegle-game/api
railway link  # Select your project
```

### Run Migration:
```bash
railway run npx prisma migrate deploy
```

## Option 2: Direct Database Connection (Using Neon Console)

Since you're using Neon database, you can run the SQL directly:

1. Go to [Neon Console](https://console.neon.tech)
2. Select your database
3. Click on **"SQL Editor"** or **"Query"**
4. Run this SQL:

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

5. Click **"Run"** or **"Execute"**

This will add the missing enum values directly to the database.

## Option 3: Add Migration to Build Process

We can modify the Railway build command to automatically run migrations. Let me know if you want this option.

## Verify Migration Worked

After running the migration, try creating a game (Chess, Poker, etc.) - it should work without the enum error!

