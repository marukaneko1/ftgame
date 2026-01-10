# Start Local Development - Complete Guide

## The Problem
You're seeing "Cannot connect to server" because:
1. **Docker is not running** → Database (PostgreSQL) is not available
2. **API server crashes** → Can't connect to database, so API server fails to start
3. **Frontend can't reach API** → No API running on port 3001

## Solution - Start Everything in Order

### Step 1: Start Docker Desktop
**IMPORTANT:** Make sure Docker Desktop is running first!

1. Open **Docker Desktop** application on your Mac
2. Wait for it to fully start (check the whale icon in menu bar)
3. Docker must be running before proceeding

### Step 2: Start the Database
From the project root (`/Users/marukaneko/omegle-game`):
```bash
docker compose up -d
```

Or using npm script:
```bash
npm run docker:up
```

**Verify it's running:**
```bash
docker ps
```

You should see `postgres` and `redis` containers.

### Step 3: Start the API Server
Wait 5-10 seconds for the database to fully initialize, then:

```bash
cd api
npm run start:dev
```

**Look for this message:**
```
API listening on http://localhost:3001
```

If you see database connection errors, wait a bit longer and try again.

### Step 4: Start the Web Server (if not already running)
In a **separate terminal**:
```bash
cd web
npm run dev
```

Or from root:
```bash
npm run dev:web
```

### Step 5: Verify Everything is Running

**Check API:**
```bash
curl http://localhost:3001/api
```
Should return: `{"status":"ok","message":"API is running",...}`

**Check Web:**
Open browser: http://localhost:3000

**Check ports:**
```bash
lsof -i :3001  # API
lsof -i :3000  # Web
lsof -i :5433  # PostgreSQL
```

## Quick Start (Once Docker is Running)

**Option 1: Start both servers together**
```bash
# Terminal 1: Database
npm run docker:up

# Terminal 2: Both API and Web
npm run dev
```

**Option 2: Start separately**
```bash
# Terminal 1: Database
docker compose up -d

# Terminal 2: API
cd api && npm run start:dev

# Terminal 3: Web
cd web && npm run dev
```

## Common Issues

### "Cannot connect to Docker daemon"
- Docker Desktop is not running
- Start Docker Desktop application
- Wait for it to fully initialize

### "Can't reach database server at localhost:5433"
- Database container is not running
- Run: `docker compose up -d`
- Wait 10 seconds for initialization

### "API listening" message never appears
- Check API terminal for error messages
- Most likely: Database not ready yet, wait longer
- Or: Check `.env` file has correct `DATABASE_URL`

### Port already in use
```bash
# Find what's using the port
lsof -i :3001

# Kill it if needed
kill -9 <PID>
```

## Environment Variables

Make sure your `.env` file in the root has:
```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/omegle_game
REDIS_URL=redis://default:AYyUAAIncDE2YTU1ZWUyZjVlNzU0NTA0ODYyMmZlOGQ5NTg0MmFlZXAxMzU5ODg@ethical-donkey-35988.upstash.io:6379
JWT_ACCESS_SECRET=<your-secret>
JWT_REFRESH_SECRET=<your-secret>
```

## Summary
1. ✅ Docker Desktop running
2. ✅ Database started (`docker compose up -d`)
3. ✅ API server running (`cd api && npm run start:dev`)
4. ✅ Web server running (`cd web && npm run dev`)
5. ✅ Try registration at http://localhost:3000/auth/register








