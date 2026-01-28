# Fix: Registration Failed - Database Not Running

## The Problem
Registration fails because the **API server can't connect to the database**. The database (PostgreSQL) needs to be running before the API server can start.

## Solution

### Step 1: Start Docker Desktop
Make sure Docker Desktop is running on your Mac. If it's not:
1. Open Docker Desktop application
2. Wait for it to fully start (whale icon in menu bar should be steady)

### Step 2: Start the Database
From the project root directory, run:
```bash
npm run docker:up
```

Or manually:
```bash
docker compose up -d
```

This starts:
- PostgreSQL on port 5433
- Redis on port 6379

### Step 3: Verify Database is Running
```bash
docker ps
```

You should see `postgres` and `redis` containers running.

### Step 4: Start the API Server
The API server needs to connect to the database. From the root directory:
```bash
cd api
npm run start:dev
```

Wait for the message: `API listening on http://localhost:3001`

### Step 5: Try Registration Again
Now go to http://localhost:3000/auth/register and try registering again.

## Quick Start (All Services)
If you want to start everything at once:
```bash
# Terminal 1: Start database
npm run docker:up

# Terminal 2: Start both API and web
npm run dev
```

## Troubleshooting

### "Cannot connect to Docker daemon"
- Make sure Docker Desktop is running
- Try restarting Docker Desktop

### "Port 5433 already in use"
- Another PostgreSQL instance might be running
- Check: `lsof -i :5433`
- Stop the conflicting service

### "API still not connecting"
- Wait a few seconds after starting Docker (database needs time to initialize)
- Check API logs for connection errors
- Verify DATABASE_URL in `.env` matches: `postgresql://postgres:postgres@localhost:5433/omegle_game`









