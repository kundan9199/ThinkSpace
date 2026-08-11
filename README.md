# ThinkSpace

A modern, production-quality collaborative whiteboard application. Draw, brainstorm, and create together in real time.

## Features

- ✏️ **Drawing Tools** — Rectangle, ellipse, diamond, line, arrow, pencil, text
- 🎨 **Hand-drawn Style** — Beautiful sketch-like rendering with rough.js
- ♾️ **Infinite Canvas** — Pan and zoom with no boundaries
- 🔄 **Real-time Collaboration** — Draw together with Socket.IO
- 👥 **Live Cursors** — See where your teammates are working
- 💾 **Auto-save** — Your work is saved automatically
- 📤 **Export/Import** — JSON and PNG export support
- 🔐 **Authentication** — Secure access with Supabase Auth

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js, React, TypeScript, Tailwind CSS v4 |
| Canvas | HTML5 Canvas 2D API |
| Drawing | rough.js, perfect-freehand |
| State | Zustand, zundo (undo/redo) |
| Backend | Next.js Route Handlers |
| Database | Supabase PostgreSQL, Prisma ORM |
| Auth | Supabase Auth |
| Realtime | Socket.IO |
| Cache | Upstash Redis |
| Storage | Supabase Storage |
| Icons | lucide-react |

## Architecture

```
                    USERS
                 /    |    \
                /     |     \
               ↓      ↓      ↓

          Next.js Application
                  │
        ┌─────────┴─────────┐
        │                   │
        ↓                   ↓
    React UI            Canvas Engine
        │                   │
        └─────────┬─────────┘
                  ↓
             Zustand Store
                  │
        ┌─────────┴──────────┐
        │                    │
        ↓                    ↓
     API Layer          Socket.IO
        │                    │
        │              Realtime Rooms
        │                    │
        └─────────┬──────────┘
                  ↓
               Prisma
                  ↓
        Supabase PostgreSQL
        Supabase Storage
        Upstash Redis
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for detailed architecture documentation.

## Getting Started

### Prerequisites

- Node.js 18.17+ (LTS recommended)
- npm 9+
- A Supabase project (for auth & database)
- An Upstash Redis instance (for caching)

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd ThinkSpace

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local
# Fill in your values in .env.local

# Generate Prisma client (Phase 1+)
# npx prisma generate

# Run the development server
npm run dev
```

### Environment Variables

Copy `.env.example` to `.env.local` and configure:

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-only) |
| `DATABASE_URL` | PostgreSQL connection string |
| `NEXT_PUBLIC_SOCKET_URL` | Socket.IO server URL |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis REST URL |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis token |

### Development Commands

```bash
npm run dev           # Start dev server with Turbopack
npm run build         # Production build
npm run start         # Start production server
npm run lint          # Run ESLint
npm run lint:fix      # Fix ESLint issues
npm run format        # Format code with Prettier
npm run format:check  # Check formatting
npm run typecheck     # TypeScript type checking
```

## Project Structure

```
src/
├── app/               # Next.js App Router pages
├── components/        # Reusable UI components
│   ├── ui/            # Base components (Button, Input, Modal…)
│   ├── layout/        # Layout shells
│   └── shared/        # Shared composite components
├── features/          # Feature-specific code
├── canvas/            # Canvas engine (rendering, tools, geometry)
├── store/             # Zustand state stores
├── lib/               # Library integrations (auth, db, socket)
├── types/             # Shared TypeScript types
└── utils/             # Utility functions
```

## Deployment

| Service | Platform |
|---------|----------|
| Frontend | Vercel |
| Socket.IO Server | Railway |
| Database | Supabase |
| Redis | Upstash |

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for deployment instructions.

## License

Private — All rights reserved.
