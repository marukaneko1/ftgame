# Omegle Game - US-Only 18+ Video Matchmaking Platform

A production-ready beta platform for random 1:1 video calls with in-call games, tokens, and subscriptions.

## Quick Start

### Prerequisites
- Node.js 20+
- Docker & Docker Compose (for PostgreSQL and Redis)
- npm or yarn

### Initial Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start Docker services (PostgreSQL & Redis):**
   ```bash
   npm run docker:up
   ```

3. **Set up environment variables:**
   - Copy `api/.env.example` to `api/.env` (if it exists)
   - Fill in required values in `api/.env`:
     - `DATABASE_URL` (default: `postgresql://postgres:postgres@localhost:5433/omegle_game`)
     - `REDIS_URL` (default: `redis://localhost:6379`)
     - `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET`
     - `GOOGLE_CLIENT_ID` (for Google OAuth)
     - `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`
     - `AGORA_APP_ID` and `AGORA_APP_CERTIFICATE`
     - `PERSONA_API_KEY` (optional, for KYC)

4. **Generate Prisma client:**
   ```bash
   npm run prisma:generate
   ```

5. **Run database migrations:**
   ```bash
   cd api
   npx prisma migrate dev
   ```

### Running the Application

#### Option 1: Start Everything at Once (Recommended)
```bash
npm run dev
```
This starts both the backend API (port 3001) and frontend (port 3000) simultaneously.

#### Option 2: Start Services Separately

**Backend only:**
```bash
npm run dev:api
```
Backend runs on `http://localhost:3001`

**Frontend only:**
```bash
npm run dev:web
```
Frontend runs on `http://localhost:3000`

### Access Points

- **Landing Page:** http://localhost:3000
- **Login/Register:** http://localhost:3000/auth/login
- **Dashboard:** http://localhost:3000/dashboard
- **Play (Matchmaking):** http://localhost:3000/play
- **Admin Dashboard:** http://localhost:3000/admin
- **API:** http://localhost:3001/api

### Admin Access

1. Create a user account via registration
2. Set the user as admin in the database:
   ```bash
   cd api
   node -e "const { PrismaClient } = require('@prisma/client'); const prisma = new PrismaClient(); prisma.user.update({ where: { email: 'YOUR_EMAIL@example.com' }, data: { isAdmin: true } }).then(() => console.log('Admin set')).finally(() => prisma.\$disconnect());"
   ```
   Or use the provided script:
   ```bash
   cd api
   npm run set-admin YOUR_EMAIL@example.com
   ```

3. Log in at http://localhost:3000/admin with your admin account

### Docker Commands

```bash
# Start PostgreSQL and Redis
npm run docker:up

# Stop services
npm run docker:down

# View logs
npm run docker:logs
```

### Database Commands

```bash
# Reset database (WARNING: deletes all data)
npm run reset:db

# Generate Prisma client after schema changes
npm run prisma:generate

# Create new migration
cd api
npx prisma migrate dev --name migration_name
```

### Project Structure

```
omegle-game/
├── api/              # NestJS backend
│   ├── src/
│   │   ├── modules/  # Feature modules (auth, users, subscriptions, etc.)
│   │   └── main.ts   # Entry point
│   └── prisma/       # Database schema and migrations
├── web/              # Next.js frontend
│   └── src/
│       └── app/      # Next.js app router pages
└── shared/           # Shared TypeScript types
```

### Key Features

- ✅ User authentication (email + Google OAuth)
- ✅ 18+ age verification (Persona integration)
- ✅ Subscription management (Stripe)
- ✅ Token wallet system
- ✅ Distance-based matchmaking with Redis
- ✅ 1:1 video calls (Agora)
- ✅ In-call games (Chess, Trivia, Tic-Tac-Toe)
- ✅ Admin dashboard for user management
- ✅ WebSocket real-time communication

### Development

```bash
# Lint code
npm run lint

# Build for production
npm run build

# Run tests
cd api
npm test
```

### Troubleshooting

**Port already in use:**
- Backend (3001): `lsof -ti:3001 | xargs kill -9`
- Frontend (3000): `lsof -ti:3000 | xargs kill -9`

**Database connection issues:**
- Ensure Docker services are running: `npm run docker:up`
- Check `DATABASE_URL` in `api/.env` matches Docker Compose port (5433)

**401 Unauthorized errors:**
- Check JWT secrets are set in `api/.env`
- Verify token hasn't expired (15min access tokens)

**Matchmaking not working:**
- Ensure Redis is running: `npm run docker:up`
- Check user has active subscription and 18+ verification
- Verify user is not banned

