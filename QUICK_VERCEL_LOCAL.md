# Quick Start - Run Locally with Vercel Simulation

## Step 1: Fix Backend Project Link

You're currently linked to "ftgame" but need "ftgame-api". Let's fix it:

```bash
cd api
rm -rf .vercel
vercel link
# When asked "Link to existing project?" select: yes
# When asked project name, enter: ftgame-api
```

## Step 2: Pull Environment Variables

```bash
cd api
vercel env pull .env.local
# This downloads environment variables from Vercel
```

## Step 3: Update .env.local for Local Development

Edit `api/.env.local` and make sure you have:
```env
ALLOWED_ORIGINS=http://localhost:3000
WEB_BASE_URL=http://localhost:3000
VERCEL=1
VERCEL_ENV=development
```

## Step 4: Link Frontend (Optional)

```bash
cd ../web
vercel link
# Link to: ftgame-theta (your frontend project)
```

## Step 5: Run from ROOT Directory

**IMPORTANT: Run this from the project root, not from inside api/ or web/**

```bash
cd /Users/marukaneko/omegle-game  # Go to root
npm run dev:vercel
```

This will:
- Start backend on `http://localhost:3001` (Vercel dev simulation)
- Start frontend on `http://localhost:3000` (Vercel dev simulation)
- Frontend will connect to backend automatically

## Alternative: Run Separately

**Terminal 1 (Backend):**
```bash
cd api
vercel dev --listen 3001
```

**Terminal 2 (Frontend):**
```bash
cd web
NEXT_PUBLIC_API_URL=http://localhost:3001 vercel dev --listen 3000
```

## Troubleshooting

**"Missing script: dev:vercel"** - You're in the wrong directory. Run from project root.

**"Project not found: ftgame-api"** - Make sure the project exists on Vercel. If not, create it first.

**Port already in use** - Kill the process using the port or use different ports:
```bash
vercel dev --listen 3002  # for API
vercel dev --listen 3003  # for Web
```

