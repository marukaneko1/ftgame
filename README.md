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

---

## Design System

Shitbox Shuffle uses a cohesive design system built for a "casino game platform lobby" aesthetic — premium dark UI with neon accents, glossy panels, and tactile interactions.

### Design Tokens

All design tokens are defined as CSS variables in `web/src/app/globals.css` and extended in `web/tailwind.config.js`.

#### Colors

| Token | Purpose | CSS Variable |
|-------|---------|--------------|
| `base` | App background | `--color-bg-base` |
| `surface-primary` | Card/panel background | `--color-surface-primary` |
| `surface-secondary` | Elevated surfaces | `--color-surface-secondary` |
| `accent` | Primary neon (purple) | `--color-accent-primary` |
| `cyan` | Secondary neon | `--color-accent-secondary` |
| `gold` | Coins/VIP/premium | `--color-gold` |
| `txt-primary` | Main text | `--color-text-primary` |
| `txt-secondary` | Secondary text | `--color-text-secondary` |
| `txt-muted` | Muted/disabled text | `--color-text-muted` |

#### Spacing Scale

Use the tokenized spacing scale: `space-1` (4px), `space-2` (8px), `space-3` (12px), `space-4` (16px), `space-6` (24px), `space-8` (32px), `space-12` (48px), `space-16` (64px), `space-24` (96px).

#### Border Radius

| Token | Value | Use Case |
|-------|-------|----------|
| `rounded-sm` | 6px | Small elements |
| `rounded-md` | 10px | Buttons, inputs |
| `rounded-lg` | 14px | Cards, panels |
| `rounded-xl` | 18px | Modals, large cards |
| `rounded-pill` | 9999px | Badges, chips |

#### Shadows

- `shadow-sm` — Subtle elevation
- `shadow-md` — Default cards
- `shadow-lg` — Modals, elevated panels
- `shadow-glow-purple` — Neon glow for accent elements
- `shadow-glow-cyan` — Cyan glow variant
- `shadow-glow-gold` — Gold/VIP glow

### Typography

- **Display Font**: Inter (tight tracking for headings)
- **Body Font**: Inter (normal tracking)
- **Mono Font**: JetBrains Mono (numbers, stats, code)

Use `.font-display` for headings, `.font-mono` for numbers/stats.

### UI Components

All reusable components are in `web/src/components/ui/`:

| Component | Purpose | Variants |
|-----------|---------|----------|
| `Button` | Actions | `primary`, `secondary`, `ghost`, `danger`, `success` |
| `Card` | Content containers | `default`, `elevated`, `glass`, `neon` |
| `Badge` | Status indicators | `default`, `success`, `warning`, `error`, `info`, `accent`, `gold` |
| `Input` | Form inputs | Text, password, search, select, textarea |
| `Modal` | Overlays | Sizes: `sm`, `md`, `lg`, `xl` |
| `Avatar` | User images | Sizes: `xs`, `sm`, `md`, `lg`, `xl` |
| `Tabs` | Navigation | `default`, `pills`, `underline` |
| `Progress` | Loading states | `ProgressBar`, `Spinner`, `Skeleton` |

### Layout Components

| Component | Purpose |
|-----------|---------|
| `AppShell` | Main layout wrapper with ambient background |
| `TopNav` | Header navigation with logo, links, wallet |
| `StatusBar` | Online count, ping, mic/cam status |

### Animation Tokens

| Duration | Use |
|----------|-----|
| `duration-fast` (150ms) | Hover states, small transitions |
| `duration-normal` (200ms) | Default transitions |
| `duration-slow` (300ms) | Page transitions, modals |

Animation classes: `.animate-fade-in`, `.animate-slide-up`, `.animate-scale-in`, `.animate-shimmer`, `.animate-pulse-glow`

---

## Future UI Rules

When adding new screens or features, follow these rules to maintain design consistency:

### 1. Layout

- Use `AppShell` for all authenticated pages
- Max content width: `max-w-7xl` (1280px)
- Standard padding: `px-4 lg:px-6 py-6 lg:py-8`
- Use CSS Grid or Flexbox, never tables for layout

### 2. Colors

- **NEVER** use raw color values (e.g., `bg-gray-900`)
- **ALWAYS** use design tokens: `bg-surface-primary`, `text-txt-secondary`, etc.
- Use `accent` for primary actions, `cyan` for secondary accents
- Use `gold` only for tokens/currency/VIP elements

### 3. Spacing

- **ALWAYS** use the spacing scale tokens
- Standard card padding: `p-4` (16px) or `p-6` (24px)
- Standard gaps: `gap-4` (16px) or `gap-6` (24px)

### 4. Cards & Panels

- Use `Card` component with appropriate variant
- Default variant for most content
- `neon` variant for primary CTAs or featured content
- `glass` variant for overlay or floating content
- Always include proper padding via the `padding` prop

### 5. Buttons

- Primary actions: `variant="primary"`
- Secondary actions: `variant="secondary"`
- Destructive actions: `variant="danger"`
- Text-only/subtle: `variant="ghost"`
- Always include loading states with `loading` prop

### 6. Forms

- Use `Input`, `Select`, `Textarea` from UI library
- Include `label` for accessibility
- Include `error` for validation feedback
- Include `hint` for helper text

### 7. Typography

- Page titles: `text-3xl md:text-4xl font-display`
- Section titles: `text-xl font-display`
- Body text: default (inherits from body)
- Muted text: `text-txt-secondary` or `text-txt-muted`
- Numbers/stats: `font-mono`

### 8. Animations

- Use CSS transitions, not JavaScript
- Keep animations subtle (150-300ms)
- Use `animate-fade-in` for page loads
- Use `animate-scale-in` for modals
- No bouncy or playful animations

### 9. Responsive Design

- Mobile-first approach
- Breakpoints: `sm` (640px), `md` (768px), `lg` (1024px), `xl` (1280px)
- Stack to single column on mobile
- Hide non-essential UI elements on mobile

### 10. Accessibility

- All interactive elements must be keyboard accessible
- Use semantic HTML (`button`, `input`, `label`)
- Include `aria-label` for icon-only buttons
- Maintain WCAG AA contrast ratios (built into tokens)
- Never remove focus outlines (styled via `focus-visible`)

---

## Component Import Pattern

```tsx
// Import UI components
import { Button, Card, Badge, Input, Modal } from "@/components/ui";

// Import layout components
import { AppShell, TopNav, StatusBar } from "@/components/layout";
```

---

## Example: Creating a New Page

```tsx
"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export default function NewPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <Badge variant="accent" size="sm" className="mb-2">Section Label</Badge>
          <h1 className="text-3xl font-display text-txt-primary tracking-tight">
            Page Title
          </h1>
          <p className="text-txt-secondary mt-1">Page description here</p>
        </div>
        <Link href="/dashboard">
          <Button variant="ghost" size="sm">← Back</Button>
        </Link>
      </header>

      {/* Main Content */}
      <Card variant="elevated" padding="lg">
        <CardHeader>
          <CardTitle>Section Title</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-txt-secondary">Content goes here...</p>
        </CardContent>
      </Card>
    </div>
  );
}
```

