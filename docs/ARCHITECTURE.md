# ThinkSpace — Architecture & Specification

## Overview

ThinkSpace uses a modular architecture separating **Authentication & Board Persistence** from **Realtime Collaboration & Canvas Rendering**.

This document outlines the Authentication, Database, Board Workspace, and Canvas Engine Architecture.

## System Architecture Diagram

```
                             CLIENT (Browser)
                                    │
                         ┌──────────┴──────────┐
                         │                     │
                         ↓                     ↓
                     Middleware            React UI
                   (src/proxy.ts)      (Dashboard, Auth,
                         │              Board Workspace)
                         │                     │
                         │                     ↓
                         │               Canvas Engine
                         │             (Zustand Store + 2D
                         │              Render Pipeline)
                         └──────────┬──────────┘
                                    │
                           Server Actions / SSR
                 (src/lib/auth/actions.ts, src/lib/board/actions.ts)
                                    │
                     ┌──────────────┴──────────────┐
                     │                             │
                     ↓                             ↓
               Supabase Auth                 Prisma ORM
            (auth.users table)         (User, Board, Participant,
                                        Element tables)
                     │                             │
                     └──────────────┬──────────────┘
                                    │
                                    ↓
                           Supabase PostgreSQL
```

## Canvas Engine Architecture

### 1. Scene Model (`src/types/canvas.ts`)
The scene model uses TypeScript discriminated unions for type safety without using `any`:
- **`BaseElement`**: `id`, `type`, `x`, `y`, `width`, `height`, `rotation`, `strokeColor`, `backgroundColor`, `strokeWidth`, `opacity`, `zIndex`, `createdAt`, `updatedAt`
- **Discriminated Types**:
  - `RectangleElement` (`type: "rectangle"`, `cornerRadius`)
  - `EllipseElement` (`type: "ellipse"`)
  - `LineElement` (`type: "line"`, `x2`, `y2`)
  - `ArrowElement` (`type: "arrow"`, `x2`, `y2`, `headSize`)
  - `FreehandElement` (`type: "freehand"`, `points: Point[]`)
  - `TextElement` (`type: "text"`, `text`, `fontSize`, `fontFamily`)

### 2. State Separation (Zustand) (`src/store/canvas/canvas-store.ts`)
Canvas state is isolated from application/auth state using a dedicated Zustand store `useCanvasStore`:
- **`elements: CanvasElement[]`**: Scene model objects in world coordinates
- **`selectedElementIds: string[]`**: Active element selection
- **`activeTool: ToolType`**: Selected tool (`select`, `hand`, `rectangle`, `ellipse`, `line`, `arrow`, `freehand`, `text`, `eraser`)
- **`viewport: ViewportState`**: Camera state (`zoom`, `panX`, `panY`, `dpr`)

### 3. Camera System & Coordinate Mapping (Phase 3.2) (`src/canvas/core/camera.ts`)
- **World to Screen**: `screenX = worldX * zoom + panX`, `screenY = worldY * zoom + panY`
- **Screen to World**: `worldX = (screenX - panX) / zoom`, `worldY = (screenY - panY) / zoom`
- **Pan Interaction**: Panning modifies `panX` and `panY` directly via middle mouse drag (`e.button === 1`), Space key + drag, or Hand tool mode.
- **Cursor-Centered Zoom (`zoomAtPoint`)**:
  When zooming via mouse wheel, the world point under the cursor is preserved at the same screen location:
  `newPanX = screenX - worldPoint.x * newZoom`
  `newPanY = screenY - worldPoint.y * newZoom`
- **Reset View**: Restores camera to `zoom = 1, panX = 0, panY = 0`.

### 4. Interactive Shape Tools & Temporary Preview (Phase 3.2) (`src/canvas/components/canvas-workspace.tsx`)
- **Pointer Lifecycle**:
  - `onPointerDown`: Converts screen click `(clientX - rect.left, clientY - rect.top)` to world coordinates via `screenToWorld`. Starts drawing interaction.
  - `onPointerMove`: Calculates world dimensions and normalized top-left coordinates supporting negative drag directions. Updates `previewElementRef` (local ref).
  - `onPointerUp`: If shape size > 2px, assigns a unique ID and commits the element to the Zustand store via `addElement`.
- **Performance**: Temporary shape drag previews render through `requestAnimationFrame` using `previewElementRef` without dispatching React state updates or polluting Zustand store during drag motion.

### 5. Rendering Pipeline (`src/canvas/rendering/`)
- **`CanvasRenderer`**: High-performance class controlling the 2D rendering loop via `requestAnimationFrame`.
- **`devicePixelRatio` Handling**: Scaling the canvas backing store resolution (`canvas.width = cssWidth * dpr`) while setting CSS size (`canvas.style.width = cssWidth + "px"`) ensures crisp, high-DPI rendering on Retina screens without distortion.
- **Camera Matrix**: `applyCameraTransform` transforms world coordinates to screen pixels using `ctx.scale(dpr)` → `ctx.translate(panX, panY)` → `ctx.scale(zoom)`.

---

## Board Management Architecture (Phase 2)

### 1. Board Creation (`createBoard`)
1. Authenticated user enters board title in `Modal`.
2. Server Action validates title and retrieves user identity from server session cookies.
3. Cryptographically secure 6-character room code (e.g., `H7K9P2`) is generated with DB uniqueness collision checks.
4. `Board` record is created with `ownerId = user.id`.
5. `BoardParticipant` record is created associating user as `OWNER`.
6. User is redirected to `/board/[id]`.

### 2. Room Code & Joining (`joinBoardByRoomCode`)
1. User enters 6-character room code.
2. Server Action searches PostgreSQL for matching `roomCode`.
3. If valid board is found, creates a `BoardParticipant` record (`role = "MEMBER"`) if user is not already a member (prevents duplicates).
4. User is redirected to `/board/[id]`.

### 3. Authorization Rules
- **Owner**:
  - View board details
  - Access `/board/[id]`
  - Rename board (`updateBoard`)
  - Delete board (`deleteBoard` — cascades deletion of elements and participant records)
  - Copy & share room code
- **Participant / Member**:
  - Access `/board/[id]`
  - View board information and room code
  - Cannot rename or delete another user's board (enforced server-side)
- **Unauthenticated / Non-member**:
  - Cannot view private board details or access `/board/[id]` (redirected to `/dashboard` or `/login`).

## Database Schema (Prisma)

```prisma
model User {
  id           String             @id // Supabase auth.users.id
  email        String             @unique
  name         String
  avatarUrl    String?            @map("avatar_url")
  createdAt    DateTime           @default(now()) @map("created_at")
  updatedAt    DateTime           @updatedAt @map("updated_at")

  ownedBoards  Board[]            @relation("BoardOwner")
  participants BoardParticipant[]

  @@map("users")
}

model Board {
  id           String             @id @default(uuid())
  title        String
  roomCode     String             @unique @map("room_code")
  ownerId      String             @map("owner_id")
  createdAt    DateTime           @default(now()) @map("created_at")
  updatedAt    DateTime           @updatedAt @map("updated_at")

  owner        User               @relation("BoardOwner", fields: [ownerId], references: [id], onDelete: Cascade)
  elements     BoardElement[]
  participants BoardParticipant[]

  @@map("boards")
}

model BoardParticipant {
  id       String   @id @default(uuid())
  boardId  String   @map("board_id")
  userId   String   @map("user_id")
  role     String   @default("MEMBER")
  joinedAt DateTime @default(now()) @map("joined_at")

  board Board @relation(fields: [boardId], references: [id], onDelete: Cascade)
  user  User  @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([boardId, userId])
  @@map("board_participants")
}
```

## Routes Overview

- `/login` — Public login page
- `/signup` — Public registration page
- `/dashboard` — Protected workspace & board management hub
- `/board/[id]` — Protected board workspace with Canvas 2D engine

## Security & Row Level Security (RLS) Architecture

### 1. Database Access & RLS Defense-in-Depth
- **Prisma Connection**: The application accesses PostgreSQL directly via Prisma server-side (`src/lib/db/prisma.ts`). Prisma connects using a direct server PostgreSQL connection string (`DATABASE_URL`), which operates under a privileged database owner role (`postgres`) that bypasses PostgreSQL RLS.
- **Server-Side Authorization**: Application authorization is strictly enforced server-side within Next.js Server Actions (`src/lib/auth/actions.ts` & `src/lib/board/actions.ts`). User identity is always derived securely from Supabase server session cookies (`supabase.auth.getUser()`) and never trusted from client inputs.
- **Supabase Data API Protection (Defense-in-Depth)**: Row Level Security (RLS) is enabled on all four public tables (`users`, `boards`, `board_elements`, `board_participants`). This guarantees that if the Supabase Data API (PostgREST) is accessed directly by external clients, strict least-privilege security policies prevent unauthorized data access or mutation.

### 2. RLS Policy Summary (`prisma/rls_policies.sql`)
- **`users`**: Users can only access/update their own profile (`auth.uid() = id`).
- **`boards`**: Board owners have full access; participants have read access (`SELECT`). Non-owners cannot rename or delete boards.
- **`board_participants`**: Users can view participants for boards they belong to/own; users can join boards (insert self); owners can manage roles/members.
- **`board_elements`**: Elements accessible (SELECT/INSERT/UPDATE/DELETE) only to authorized board owners and joined participants.
