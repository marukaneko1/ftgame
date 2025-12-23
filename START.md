# Quick Start Guide

## 🚀 Start Everything in One Command

```bash
npm run dev
```

This starts:
- ✅ Backend API on http://localhost:3001
- ✅ Frontend on http://localhost:3000

---

## 📋 First Time Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Start Docker (PostgreSQL & Redis)
```bash
npm run docker:up
```

### 3. Set up environment
Create `api/.env` with required variables (see README.md)

For the frontend, you can optionally create `web/.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=http://localhost:3001
```

### 4. Generate Prisma client
```bash
npm run prisma:generate
```

### 5. Run migrations
```bash
cd api && npx prisma migrate dev && cd ..
```

---

## 🎯 Access Points

After running `npm run dev`:

| Service | URL | Description |
|---------|-----|-------------|
| **Frontend** | http://localhost:3000 | Main app |
| **Landing** | http://localhost:3000 | Homepage |
| **Login** | http://localhost:3000/auth/login | User login |
| **Dashboard** | http://localhost:3000/dashboard | User dashboard |
| **Play** | http://localhost:3000/play | Start matchmaking |
| **Admin** | http://localhost:3000/admin | Admin dashboard |
| **API** | http://localhost:3001/api | Backend API |

---

## 👤 Making an Admin User

1. Register an account at http://localhost:3000/auth/register
2. Set as admin:
   ```bash
   cd api
   npm run set-admin YOUR_EMAIL@example.com
   ```
   Or manually:
   ```bash
   cd api
   node -e "const { PrismaClient } = require('@prisma/client'); const prisma = new PrismaClient(); prisma.user.update({ where: { email: 'YOUR_EMAIL@example.com' }, data: { isAdmin: true } }).then(() => console.log('Admin set!')).catch(e => console.error(e)).finally(() => prisma.\$disconnect());"
   ```
3. Log in at http://localhost:3000/admin

---

## 🛠️ Common Commands

```bash
# Start everything
npm run dev

# Start only backend
npm run dev:api

# Start only frontend
npm run dev:web

# Stop Docker services
npm run docker:down

# View Docker logs
npm run docker:logs

# Reset database (WARNING: deletes data)
npm run reset:db
```

---

## ❌ Troubleshooting

**Port in use?**
```bash
# Kill process on port 3001 (backend)
lsof -ti:3001 | xargs kill -9

# Kill process on port 3000 (frontend)
lsof -ti:3000 | xargs kill -9
```

**Docker not running?**
```bash
npm run docker:up
```

**Need to rebuild?**
```bash
npm install
npm run prisma:generate
```

