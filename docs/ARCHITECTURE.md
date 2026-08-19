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

### 5. Drawing & Object Interaction (Phase 3.3) (`src/canvas/geometry/geometry.ts`, `src/canvas/rendering/freehand-renderer.ts`)
- **Freehand Drawing with `perfect-freehand`**:
  - Raw pointer samples collected in world space during pointer drag.
  - Rendered with real-time pressure, thinning, streamline, and smoothing into smooth polygonal 2D paths.
  - Drag preview points rendered without committing to state until `pointerup`.
- **Hit Testing Pipeline**:
  - `hitTestAll`: Selects topmost element by descending `zIndex`.
  - Geometric hit tests per element type:
    - **Rectangle / Text**: Axis-aligned bounding box (with inverse local rotation transform if rotated).
    - **Ellipse**: Normalized ellipse equation `(dx/rx)^2 + (dy/ry)^2 <= 1`.
    - **Line / Arrow**: Point-to-segment distance algorithm with stroke tolerance.
    - **Freehand**: Segment distance check across sampled points.
- **Selection & Transform System**:
  - **Single & Multi-Select**: Click to select, Shift+click to toggle selection in/out, click empty canvas to deselect.
  - **Bounding Box & Handles**: Canvas-rendered dashed overlay with 8 resize handles (`tl`, `tm`, `tr`, `ml`, `mr`, `bl`, `bm`, `br`) and 1 rotation handle (`rotate` with connector line).
  - **Move**: World-space delta displacement applied to all selected elements simultaneously.
  - **Resize**: Proportional and directional resizing recalculating element bounds and points/endpoints.
  - **Rotate**: Origin-centered rotation using `Math.atan2` preserving initial engage angle offset.
- **Delete & Eraser**:
  - Keyboard: `Delete` / `Backspace` removes all selected elements and clears selection.
  - Eraser Tool: Click on any element directly deletes it.
- **Keyboard Shortcuts**:
  - `V` = Select, `H` = Hand/Pan, `R` = Rectangle, `O` = Ellipse, `L` = Line, `A` = Arrow, `P` = Pencil (Freehand), `Delete`/`Backspace` = Delete, `Space` (hold) = Quick Pan.

### 6. Text & History Architecture (Phase 3.4) (`src/canvas/geometry/text-measurement.ts`, `src/store/canvas/canvas-store.ts`)
- **Text Element Model & Measurement**:
  - `TextElement`: `text`, `fontSize`, `fontFamily`, `fontWeight`, `textAlign`, `lineHeight`.
  - `measureText`: Uses an offscreen Canvas 2D context to accurately measure line widths, total height, and line count for multiline text.
  - Multi-line text rendered in 2D canvas with consistent line height spacing (`lineHeight = fontSize * 1.25`).
- **Text Editing UX**:
  - Temporary floating `<textarea>` positioned over the canvas via `worldToScreen(x, y, viewport)`.
  - Font size scales dynamically with `fontSize * viewport.zoom` to match canvas text seamlessly during editing.
  - Keyboard: `Ctrl+Enter` / `Cmd+Enter` or click outside / blur commits text; `Escape` cancels; `Shift+Enter` / `Enter` adds newline.
  - Empty text is automatically discarded without committing empty elements.
  - Double-clicking text or clicking in text tool mode activates editing for existing text elements.
- **History Architecture (Undo / Redo)**:
  - Managed via dedicated `past` and `future` stacks in Zustand with a bounded capacity of `MAX_HISTORY = 100`.
  - **Discrete History Boundaries**:
    - Creation (Shapes, Freehand, Text): Single entry added to `past` on commit; `future` cleared.
    - Transformations (Move, Resize, Rotate): Initial snapshot saved at `pointerdown`, live mutations applied during drag at 60fps, and exactly **one** snapshot committed to `past` on `pointerup`.
    - Deletions: Bulk removal (`removeElements`) snapshots `past` once.
    - Text Editing: Snapshot committed on text blur/commit.
  - **Transient vs Persistent State**:
    - Transient states (pointer position, hover, active tool, selection changes, camera pan/zoom, live textarea state) are strictly excluded from history.
  - **Shortcuts & HUD**:
    - Shortcuts: `Ctrl+Z` / `Cmd+Z` (Undo), `Ctrl+Shift+Z` / `Cmd+Shift+Z` / `Ctrl+Y` (Redo), `T` (Text tool).
    - Toolbar HUD features disabled/enabled states for Undo and Redo based on history stack depth.

### 7. Element Styling & Canvas Appearance (Phase 3.5) (`src/canvas/components/properties-panel.tsx`, `src/canvas/components/canvas-background-control.tsx`)
- **Properties Panel**: Context-aware floating glassmorphism panel for selected elements with controls for stroke color, background fill, stroke width, stroke style (solid/dashed/dotted), sloppiness (precise/normal/sketchy), corner roundness (sharp/rounded), opacity slider, text typography (font size, font family, bold, italic, underline, alignment), and z-index layer ordering.
- **Canvas Background**: Customizable canvas background color presets with real-time viewport updates and discrete history undo/redo support.

### 8. Canvas UX, Clipboard & Export (Phase 3.6) (`src/canvas/core/clipboard.ts`, `src/canvas/core/export.ts`, `src/canvas/components/export-menu.tsx`)
- **Clipboard & Duplication**:
  - `Ctrl/Cmd+C`: Deep-copies selected elements to in-memory store and system clipboard JSON.
  - `Ctrl/Cmd+X`: Copies and removes selected elements as a single undoable action.
  - `Ctrl/Cmd+V`: Pastes copied elements with new IDs, +20px world offset, and preserved relative z-index as a single atomic history step.
  - `Ctrl/Cmd+D`: Duplicates selected elements with fresh IDs and offset as a single undoable step.
  - External clipboard validation: Malformed/non-ThinkSpace clipboard payloads fail safely without corrupting canvas state.
- **Select All & Editor Protection**:
  - `Ctrl/Cmd+A`: Selects all canvas elements when canvas is focused; preserved native text selection inside text areas, inputs, and form controls.
- **Keyboard Navigation**:
  - Arrow keys: 1px movement (10px with Shift) in camera-independent world coordinates; coalesced into a single undo step across rapid key presses.
- **Enhanced Zoom HUD & Fit to Content**:
  - Zoom HUD with Zoom In, Zoom Out, Reset to 100%, and Fit to Content.
  - `calculateFitToContent`: Accurately frames all scene elements within viewport with 64px padding; resets to default viewport if scene is empty.
- **High-Resolution PNG Export**:
  - Offscreen 2D canvas export pipeline reusing core `renderElement` functions at 2x scale with 4096px bounds protection.
### 9. Canvas Polish & Stabilization (Phase 3.7) (`src/canvas/geometry/geometry.ts`, `src/store/canvas/canvas-store.ts`)
- **Multi-Selection Geometry Stability**: Proportional relative scaling across multi-selected elements during resize drags; normalized hit testing preventing issues with inverted or zero dimensions.
- **Ghost Selection Prevention**: Automatic pruning in `setSelectedElementIds` and `setElements` ensuring selection IDs always reference valid, existing elements.
- **Single-Dot Freehand Hit Testing**: Hit testing fallback for 1-point freehand strokes ensuring single-click strokes are selectable and erasable.
- **Shortcut & Tooling Alignment**: Added explicit `E` keyboard shortcut for eraser tool alongside `O` for ellipse tool.

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
