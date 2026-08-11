# ThinkSpace — Architecture

## Overview

ThinkSpace is a collaborative whiteboard application built with a clear separation of concerns across multiple layers. This document describes the high-level architecture and design decisions.

## System Architecture

```
                    USERS
                 /    |    \
                /     |     \
               ↓      ↓      ↓

          Next.js Application (Vercel)
                  │
        ┌─────────┴─────────┐
        │                   │
        ↓                   ↓
    React UI            Canvas Engine
    (Components,        (HTML5 Canvas 2D,
     Dashboard,          rough.js,
     Auth UI)            perfect-freehand)
        │                   │
        └─────────┬─────────┘
                  ↓
             Zustand Store
         (Canvas, Elements, Selection,
          Camera, History, UI,
          Collaboration, Presence)
                  │
        ┌─────────┴──────────┐
        │                    │
        ↓                    ↓
   API Layer             Socket.IO
   (Next.js Route        (Railway)
    Handlers)                │
        │              Realtime Rooms
        │              (Element sync,
        │               Cursor updates,
        │               Presence)
        └─────────┬──────────┘
                  ↓
               Prisma ORM
                  ↓
        ┌─────────┴──────────┐
        │         │          │
        ↓         ↓          ↓
    Supabase   Supabase   Upstash
    PostgreSQL Storage     Redis
    (Boards,   (Images,   (Room state,
     Elements,  Avatars,   Presence,
     Users)     Exports)   Cache)
```

## Layer Responsibilities

### UI Layer (`src/components/`, `src/features/`)
- React components for all non-canvas UI
- Dashboard, authentication, modals, toolbars, panels
- Renders independently from the canvas
- Communicates with state through Zustand stores

### Canvas Engine (`src/canvas/`)
- HTML5 Canvas 2D API for rendering
- rough.js for hand-drawn geometric shapes
- perfect-freehand for freehand pencil strokes
- Manages its own render loop via requestAnimationFrame
- Handles pointer events, hit testing, selection
- Does NOT cause React re-renders for drawing operations

### State Layer (`src/store/`)
- Zustand stores organized by domain
- Canvas state (tool, color, stroke width)
- Element state (all drawable elements)
- Selection state (selected elements, handles)
- Camera state (x, y, zoom)
- History state (undo/redo via zundo)
- UI state (panels, modals, menus)
- Collaboration state (room, connection)
- Presence state (cursors, online users)

### API Layer (`src/app/api/`)
- Next.js Route Handlers
- CRUD operations for boards
- Authentication validation
- File upload handling
- Server-side authorization

### Realtime Layer (`server/`)
- Socket.IO server (deployed separately on Railway)
- Room management
- Element synchronization (create, update, delete)
- Cursor broadcasting (ephemeral, not persisted)
- Presence tracking

### Persistence Layer (`src/lib/db/`, `prisma/`)
- Prisma ORM for type-safe database access
- PostgreSQL on Supabase
- Debounced/batched writes (not every pointer event)
- Board and element storage

### Storage Layer (`src/lib/storage/`)
- Supabase Storage for binary files
- User avatars, uploaded images, board thumbnails

### Cache Layer (`src/lib/`)
- Upstash Redis for ephemeral data
- Room state, presence info
- Rate limiting, caching

## Key Design Decisions

### Canvas Independence
The canvas render loop runs independently from React's render cycle. React manages the UI chrome (toolbar, panels, menus), while the canvas engine manages drawing operations directly on the HTML5 Canvas 2D context. This prevents React re-renders from blocking drawing performance.

### Event-Based Synchronization
Real-time collaboration uses granular element operations (CREATE, UPDATE, DELETE) rather than sending full board state. This minimizes bandwidth and allows future migration to CRDT/OT if needed.

### Debounced Persistence
Database writes are debounced and batched. The flow is:
1. User interaction → Local Zustand state (instant)
2. Zustand state → Socket.IO broadcast (near-instant)
3. Socket.IO → Debounced database write (batched)

### State Slice Architecture
Instead of one monolithic store, state is organized into logical slices (canvas, elements, selection, camera, etc.). Each slice can be subscribed to independently, minimizing unnecessary re-renders.

## Directory Structure

```
src/
├── app/                 # Next.js App Router
│   ├── (auth)/          # Auth pages (login, signup)
│   ├── dashboard/       # Dashboard page
│   ├── board/[boardId]/ # Board/canvas page
│   ├── join/            # Room joining page
│   └── api/             # API Route Handlers
│
├── components/          # Reusable components
│   ├── ui/              # Base UI primitives
│   ├── layout/          # Layout shells
│   └── shared/          # Composite components
│
├── features/            # Feature modules
│   ├── auth/            # Auth feature logic
│   ├── dashboard/       # Dashboard feature logic
│   ├── board/           # Board management
│   ├── canvas/          # Canvas feature integration
│   └── collaboration/   # Collaboration feature
│
├── canvas/              # Canvas engine
│   ├── engine/          # Core engine, render loop
│   ├── rendering/       # Element renderers
│   ├── geometry/        # Math, hit testing
│   ├── tools/           # Tool implementations
│   └── interaction/     # Input handling
│
├── store/               # Zustand stores
│   ├── canvas/          # Tool, settings
│   ├── history/         # Undo/redo
│   ├── collaboration/   # Room, connection
│   └── ui/              # UI panels, menus
│
├── lib/                 # External integrations
│   ├── auth/            # Supabase Auth
│   ├── db/              # Prisma client
│   ├── socket/          # Socket.IO client
│   ├── storage/         # Supabase Storage
│   └── validation/      # Input validation
│
├── types/               # Shared TypeScript types
└── utils/               # Utility functions

prisma/                  # Prisma schema & migrations
server/                  # Socket.IO server (separate deployment)
docs/                    # Documentation
```
