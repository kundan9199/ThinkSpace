# ThinkSpace

A modern, production-quality collaborative whiteboard application. Draw, brainstorm, and create together in real time.

## Status

- ✅ **Phase 0 — Foundation**: Design system, Next.js 16 setup, 10 UI components, layout shell, landing page.
- ✅ **Phase 1 — Authentication & Database**: Supabase Auth (Email/Password), Prisma ORM setup, User profile synchronization, protected `/dashboard` route, middleware session handling.
- ✅ **Phase 2 — Workspace & Board Management**: Server-side Board CRUD, unique 6-character room codes (`H7K9P2`), room joining flow, owner authorization, and protected `/board/[id]` workspace shell.
- ✅ **Phase 3 — Canvas Engine**:
  - 3.1 Canvas Foundation (Discriminated union scene model, Zustand store, pure Canvas 2D render loop, high-DPI scaling).
  - 3.2 Camera & Basic Tools (Cursor-centered zoom, Pan via middle mouse / Space+drag / Hand tool, Rect / Ellipse / Line / Arrow shapes with rAF preview).
  - 3.3 Drawing & Object Interaction (Smooth freehand pencil drawing with `perfect-freehand`, single/multi-selection, hit testing, moving, resizing with 8 handles, rotating with angle offset, eraser tool, and keyboard shortcuts).

## Features

- 📁 **Board Management (Phase 2)** — Create, list, rename, delete, and join whiteboards via human-friendly 6-character room codes.
- 🔐 **Server-Side Authorization (Phase 1 & 2)** — Supabase Auth email/password, session persistence, and server-side authorization ensuring only board owners can rename/delete boards.
- 🗄️ **Database Integration** — Prisma 7 ORM configured with Supabase PostgreSQL datasource for `User`, `Board`, `BoardElement`, and `BoardParticipant` models.
- 🎨 **Futuristic Design System** — Dark Glassmorphism theme with accessible controls, responsive forms, and glowing cyan accents.
- ✏️ **Canvas Engine (Phase 3)** — Geometric shapes, smooth pressure-sensitive freehand drawing, full object selection, resize handles, rotation, translation, and eraser.
- 🔄 **Real-time Collaboration (Coming in Phase 7 & 8)** — Socket.IO multiplayer drawing and live cursors.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS v4 |
| Authentication | Supabase Auth (`@supabase/ssr`) |
| Database | Supabase PostgreSQL, Prisma 7 ORM |
| UI Components | Custom Glassmorphism System (`lucide-react`) |
| Canvas (Phase 3+) | HTML5 Canvas 2D API, rough.js, perfect-freehand |
| State (Phase 3+) | Zustand, zundo (undo/redo) |
| Realtime (Phase 7+) | Socket.IO |
| Cache (Phase 7+) | Upstash Redis |

## Getting Started

### Prerequisites

- Node.js 18.17+ (LTS recommended)
- npm 9+
- A Supabase project (for Auth & PostgreSQL database connection)

### Local Setup

```bash
# 1. Clone the repository
git clone <repo-url>
cd ThinkSpace

# 2. Install dependencies
npm install

# 3. Copy environment variables
cp .env.example .env.local

# 4. Configure .env.local with your Supabase credentials:
# NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
# NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
# DATABASE_URL="postgresql://postgres.xxx:password@aws-0-region.pooler.supabase.com:6543/postgres?pgbouncer=true"

# 5. Generate Prisma client & push schema to database
npx prisma generate
npx prisma db push

# 6. Run development server
npm run dev
```

### Database Migration Workflow

To apply schema changes to PostgreSQL:
```bash
# Push schema directly to database (development)
npx prisma db push

# Create a migration (production)
npx prisma migrate dev --name init_schema
```

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
│   ├── (auth)/        # Login & Signup pages
│   ├── dashboard/     # Workspace Dashboard (Board CRUD & Join)
│   ├── board/[id]/    # Protected Board Workspace Shell
│   └── page.tsx       # Public Landing Page
├── components/        # Reusable UI primitives
│   ├── ui/            # Button, Input, Modal, Card, DropdownMenu, Avatar…
│   └── layout/        # AppShell wrapper
├── lib/
│   ├── auth/          # Supabase client, server helpers, & Auth Server Actions
│   ├── board/         # Server Actions for Board CRUD & Room Codes
│   ├── db/            # Prisma client singleton
│   └── validation/    # Form input validation rules
├── proxy.ts           # Next.js 16 session & route protection middleware
prisma/
└── schema.prisma      # PostgreSQL models (User, Board, BoardElement, Participant)
```

## Security & Architecture

- **Session Handling**: Server-side validation via `@supabase/ssr` cookies and Next.js middleware.
- **Data Authorization**: Server-side user identity verification for board creation, renaming, deletion, and room membership.
- **Service Secrets**: Never exposed to browser bundle. All auth and database operations execute server-side.

## License

Private — All rights reserved.
