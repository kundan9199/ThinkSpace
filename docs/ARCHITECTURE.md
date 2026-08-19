# ThinkSpace — Architecture & Specification

## Overview

ThinkSpace uses a modular architecture separating **Authentication & Board Persistence** from **Realtime Collaboration & Canvas Rendering**.

This document outlines the Phase 1 & 2 Authentication, Database, and Workspace Architecture.

## System Architecture Diagram

```
                             CLIENT (Browser)
                                    │
                         ┌──────────┴──────────┐
                         │                     │
                         ↓                     ↓
                     Middleware            React UI
                   (src/proxy.ts)      (Dashboard, Auth,
                         │              Board Shell)
                         │                     │
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
- `/board/[id]` — Protected board workspace shell (canvas engine ready for Phase 3)

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

