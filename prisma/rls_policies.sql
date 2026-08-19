-- ThinkSpace Row Level Security (RLS) Policies
-- Database: Supabase PostgreSQL (public schema)
-- Tables: users, boards, board_elements, board_participants

-- 1. Enable RLS on all public tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.board_elements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.board_participants ENABLE ROW LEVEL SECURITY;

-- ═══════════════════════════════════════════════════════════════
-- USERS TABLE POLICIES
-- ═══════════════════════════════════════════════════════════════
-- Users can only access and modify their own profile record.

DROP POLICY IF EXISTS "Users can access their own profile" ON public.users;
CREATE POLICY "Users can access their own profile"
ON public.users
FOR ALL
USING (auth.uid()::text = id)
WITH CHECK (auth.uid()::text = id);

-- ═══════════════════════════════════════════════════════════════
-- BOARDS TABLE POLICIES
-- ═══════════════════════════════════════════════════════════════
-- Board owners have full access (SELECT, INSERT, UPDATE, DELETE).
-- Board participants can access (SELECT) boards they belong to.
-- Members cannot rename (UPDATE) or delete (DELETE) boards they do not own.

DROP POLICY IF EXISTS "Board owners can manage their own boards" ON public.boards;
CREATE POLICY "Board owners can manage their own boards"
ON public.boards
FOR ALL
USING (auth.uid()::text = owner_id)
WITH CHECK (auth.uid()::text = owner_id);

DROP POLICY IF EXISTS "Board participants can access boards they belong to" ON public.boards;
CREATE POLICY "Board participants can access boards they belong to"
ON public.boards
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.board_participants
    WHERE board_participants.board_id = boards.id
    AND board_participants.user_id = auth.uid()::text
  )
);

-- ═══════════════════════════════════════════════════════════════
-- BOARD_PARTICIPANTS TABLE POLICIES
-- ═══════════════════════════════════════════════════════════════
-- Users can view participants for boards they own or belong to.
-- Users can join boards (insert self) or owners can add participants.
-- Owners can update roles.
-- Users can leave boards or owners can remove participants.

DROP POLICY IF EXISTS "Users can view participants of their boards" ON public.board_participants;
CREATE POLICY "Users can view participants of their boards"
ON public.board_participants
FOR SELECT
USING (
  auth.uid()::text = user_id OR
  EXISTS (
    SELECT 1 FROM public.boards
    WHERE boards.id = board_participants.board_id
    AND boards.owner_id = auth.uid()::text
  )
);

DROP POLICY IF EXISTS "Users can join boards or owners add participants" ON public.board_participants;
CREATE POLICY "Users can join boards or owners add participants"
ON public.board_participants
FOR INSERT
WITH CHECK (
  auth.uid()::text = user_id OR
  EXISTS (
    SELECT 1 FROM public.boards
    WHERE boards.id = board_participants.board_id
    AND boards.owner_id = auth.uid()::text
  )
);

DROP POLICY IF EXISTS "Board owners can update participant roles" ON public.board_participants;
CREATE POLICY "Board owners can update participant roles"
ON public.board_participants
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.boards
    WHERE boards.id = board_participants.board_id
    AND boards.owner_id = auth.uid()::text
  )
);

DROP POLICY IF EXISTS "Users can leave or owners remove participants" ON public.board_participants;
CREATE POLICY "Users can leave or owners remove participants"
ON public.board_participants
FOR DELETE
USING (
  auth.uid()::text = user_id OR
  EXISTS (
    SELECT 1 FROM public.boards
    WHERE boards.id = board_participants.board_id
    AND boards.owner_id = auth.uid()::text
  )
);

-- ═══════════════════════════════════════════════════════════════
-- BOARD_ELEMENTS TABLE POLICIES
-- ═══════════════════════════════════════════════════════════════
-- Board elements are accessible only to authorized board members (owner or participant).

DROP POLICY IF EXISTS "Board elements accessible to board members" ON public.board_elements;
CREATE POLICY "Board elements accessible to board members"
ON public.board_elements
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.boards
    WHERE boards.id = board_elements.board_id
    AND (
      boards.owner_id = auth.uid()::text
      OR EXISTS (
        SELECT 1 FROM public.board_participants
        WHERE board_participants.board_id = board_elements.board_id
        AND board_participants.user_id = auth.uid()::text
      )
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.boards
    WHERE boards.id = board_elements.board_id
    AND (
      boards.owner_id = auth.uid()::text
      OR EXISTS (
        SELECT 1 FROM public.board_participants
        WHERE board_participants.board_id = board_elements.board_id
        AND board_participants.user_id = auth.uid()::text
      )
    )
  )
);
