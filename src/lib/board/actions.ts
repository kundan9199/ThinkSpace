"use server";

import crypto from "crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/actions";

export interface BoardActionResult {
  success: boolean;
  error?: string;
  boardId?: string;
  roomCode?: string;
}

/**
 * Generate a unique 6-character uppercase alphanumeric room code (e.g. H7K9P2)
 */
function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Omit ambiguous chars (0, O, 1, I)
  const bytes = crypto.randomBytes(6);
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return code;
}

/**
 * Server Action: Creates a new whiteboard for the authenticated user.
 */
export async function createBoard(title: string): Promise<BoardActionResult> {
  const trimmedTitle = title.trim();
  if (!trimmedTitle) {
    return { success: false, error: "Board title is required." };
  }
  if (trimmedTitle.length > 100) {
    return { success: false, error: "Title must be 100 characters or less." };
  }

  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Authentication required." };
  }

  try {
    // Generate unique room code with collision prevention loop
    let roomCode = generateRoomCode();
    let isUnique = false;
    let attempts = 0;

    while (!isUnique && attempts < 10) {
      const existing = await prisma.board.findUnique({
        where: { roomCode },
      });
      if (!existing) {
        isUnique = true;
      } else {
        roomCode = generateRoomCode();
        attempts++;
      }
    }

    if (!isUnique) {
      return {
        success: false,
        error: "Could not generate a unique room code. Please try again.",
      };
    }

    // Create board and associate owner as participant
    const board = await prisma.board.create({
      data: {
        title: trimmedTitle,
        roomCode,
        ownerId: user.id,
        participants: {
          create: {
            userId: user.id,
            role: "OWNER",
          },
        },
      },
    });

    revalidatePath("/dashboard");
    return { success: true, boardId: board.id, roomCode: board.roomCode };
  } catch (error) {
    console.error("Failed to create board:", error);
    return { success: false, error: "Database error while creating board." };
  }
}

export interface UserBoardItem {
  id: string;
  title: string;
  roomCode: string;
  ownerId: string;
  ownerName: string;
  role: "OWNER" | "MEMBER";
  participantCount: number;
  updatedAt: string;
  createdAt: string;
}

/**
 * Fetches all boards owned by or shared with the authenticated user.
 */
export async function getUserBoards(): Promise<UserBoardItem[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  try {
    const boards = await prisma.board.findMany({
      where: {
        OR: [
          { ownerId: user.id },
          { participants: { some: { userId: user.id } } },
        ],
      },
      include: {
        owner: {
          select: { name: true },
        },
        participants: {
          select: { userId: true, role: true },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    return boards.map((b) => {
      const isOwner = b.ownerId === user.id;
      const userParticipant = b.participants.find((p) => p.userId === user.id);
      const role = isOwner
        ? "OWNER"
        : (userParticipant?.role as "OWNER" | "MEMBER") || "MEMBER";

      return {
        id: b.id,
        title: b.title,
        roomCode: b.roomCode,
        ownerId: b.ownerId,
        ownerName: b.owner?.name || "Unknown User",
        role,
        participantCount: b.participants.length,
        updatedAt: b.updatedAt.toISOString(),
        createdAt: b.createdAt.toISOString(),
      };
    });
  } catch (error) {
    console.error("Failed to fetch user boards:", error);
    return [];
  }
}

export interface BoardDetails {
  id: string;
  title: string;
  roomCode: string;
  ownerId: string;
  ownerName: string;
  isOwner: boolean;
  role: "OWNER" | "MEMBER";
  participantCount: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Fetches single board by ID with strict authorization validation.
 */
export async function getBoardById(
  boardId: string
): Promise<BoardDetails | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  try {
    const board = await prisma.board.findUnique({
      where: { id: boardId },
      include: {
        owner: {
          select: { name: true },
        },
        participants: {
          select: { userId: true, role: true },
        },
      },
    });

    if (!board) return null;

    const isOwner = board.ownerId === user.id;
    const isParticipant = board.participants.some((p) => p.userId === user.id);

    // Authorization check
    if (!isOwner && !isParticipant) {
      return null;
    }

    const userParticipant = board.participants.find((p) => p.userId === user.id);
    const role = isOwner
      ? "OWNER"
      : (userParticipant?.role as "OWNER" | "MEMBER") || "MEMBER";

    return {
      id: board.id,
      title: board.title,
      roomCode: board.roomCode,
      ownerId: board.ownerId,
      ownerName: board.owner?.name || "Unknown User",
      isOwner,
      role,
      participantCount: board.participants.length,
      createdAt: board.createdAt.toISOString(),
      updatedAt: board.updatedAt.toISOString(),
    };
  } catch (error) {
    console.error("Failed to fetch board details:", error);
    return null;
  }
}

/**
 * Server Action: Renames a board (owner-only).
 */
export async function updateBoard(
  boardId: string,
  newTitle: string
): Promise<BoardActionResult> {
  const trimmedTitle = newTitle.trim();
  if (!trimmedTitle) {
    return { success: false, error: "Title cannot be empty." };
  }
  if (trimmedTitle.length > 100) {
    return { success: false, error: "Title must be 100 characters or less." };
  }

  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Authentication required." };
  }

  try {
    const board = await prisma.board.findUnique({
      where: { id: boardId },
      select: { ownerId: true },
    });

    if (!board) {
      return { success: false, error: "Board not found." };
    }

    // Owner authorization check
    if (board.ownerId !== user.id) {
      return { success: false, error: "Only the board owner can rename it." };
    }

    await prisma.board.update({
      where: { id: boardId },
      data: { title: trimmedTitle },
    });

    revalidatePath("/dashboard");
    revalidatePath(`/board/${boardId}`);
    return { success: true };
  } catch (error) {
    console.error("Failed to rename board:", error);
    return { success: false, error: "Database error while updating board." };
  }
}

/**
 * Server Action: Deletes a board (owner-only).
 */
export async function deleteBoard(boardId: string): Promise<BoardActionResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Authentication required." };
  }

  try {
    const board = await prisma.board.findUnique({
      where: { id: boardId },
      select: { ownerId: true },
    });

    if (!board) {
      return { success: false, error: "Board not found." };
    }

    // Owner authorization check
    if (board.ownerId !== user.id) {
      return { success: false, error: "Only the board owner can delete it." };
    }

    await prisma.board.delete({
      where: { id: boardId },
    });

    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete board:", error);
    return { success: false, error: "Database error while deleting board." };
  }
}

/**
 * Server Action: Joins a board using room code.
 */
export async function joinBoardByRoomCode(
  roomCodeInput: string
): Promise<BoardActionResult> {
  const code = roomCodeInput.trim().toUpperCase();
  if (!code) {
    return { success: false, error: "Room code is required." };
  }

  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Authentication required." };
  }

  try {
    const board = await prisma.board.findUnique({
      where: { roomCode: code },
      select: { id: true, ownerId: true },
    });

    if (!board) {
      return { success: false, error: "Invalid room code. Board not found." };
    }

    // If not already owner, create participant entry if not exists
    if (board.ownerId !== user.id) {
      await prisma.boardParticipant.upsert({
        where: {
          boardId_userId: {
            boardId: board.id,
            userId: user.id,
          },
        },
        update: {}, // No update needed if already joined
        create: {
          boardId: board.id,
          userId: user.id,
          role: "MEMBER",
        },
      });
    }

    revalidatePath("/dashboard");
    return { success: true, boardId: board.id };
  } catch (error) {
    console.error("Failed to join board:", error);
    return { success: false, error: "Database error while joining board." };
  }
}
