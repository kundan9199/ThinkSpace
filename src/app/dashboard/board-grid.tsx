"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { IconButton } from "@/components/ui/icon-button";
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  createBoard,
  updateBoard,
  deleteBoard,
  joinBoardByRoomCode,
  type UserBoardItem,
} from "@/lib/board/actions";
import {
  Plus,
  Users,
  Search,
  MoreVertical,
  ExternalLink,
  Edit2,
  Trash2,
  Copy,
  Check,
  LayoutGrid,
  AlertCircle,
} from "lucide-react";

export interface BoardGridProps {
  initialBoards: UserBoardItem[];
}

export function BoardGrid({ initialBoards }: BoardGridProps) {
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState("");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const [isJoinOpen, setIsJoinOpen] = useState(false);
  const [roomCode, setRoomCode] = useState("");
  const [joinError, setJoinError] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);

  const [renameTarget, setRenameTarget] = useState<UserBoardItem | null>(null);
  const [renameTitle, setRenameTitle] = useState("");
  const [renameError, setRenameError] = useState<string | null>(null);
  const [isRenaming, setIsRenaming] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<UserBoardItem | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Filter boards by search query
  const filteredBoards = initialBoards.filter(
    (b) =>
      b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.roomCode.toLowerCase().includes(searchQuery.toLowerCase())
  );

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreateError(null);
    setIsCreating(true);

    try {
      const result = await createBoard(newTitle);
      if (!result.success) {
        setCreateError(result.error || "Failed to create board.");
        setIsCreating(false);
        return;
      }

      setIsCreating(false);
      setIsCreateOpen(false);
      setNewTitle("");

      // Open new board
      if (result.boardId) {
        router.push(`/board/${result.boardId}`);
      } else {
        router.refresh();
      }
    } catch {
      setCreateError("An unexpected error occurred.");
      setIsCreating(false);
    }
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    setJoinError(null);
    setIsJoining(true);

    try {
      const result = await joinBoardByRoomCode(roomCode);
      if (!result.success) {
        setJoinError(result.error || "Failed to join board.");
        setIsJoining(false);
        return;
      }

      setIsJoining(false);
      setIsJoinOpen(false);
      setRoomCode("");

      if (result.boardId) {
        router.push(`/board/${result.boardId}`);
      } else {
        router.refresh();
      }
    } catch {
      setJoinError("An unexpected error occurred.");
      setIsJoining(false);
    }
  }

  async function handleRename(e: React.FormEvent) {
    e.preventDefault();
    if (!renameTarget) return;

    setRenameError(null);
    setIsRenaming(true);

    try {
      const result = await updateBoard(renameTarget.id, renameTitle);
      if (!result.success) {
        setRenameError(result.error || "Failed to rename board.");
        setIsRenaming(false);
        return;
      }

      setIsRenaming(false);
      setRenameTarget(null);
      router.refresh();
    } catch {
      setRenameError("An unexpected error occurred.");
      setIsRenaming(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;

    setDeleteError(null);
    setIsDeleting(true);

    try {
      const result = await deleteBoard(deleteTarget.id);
      if (!result.success) {
        setDeleteError(result.error || "Failed to delete board.");
        setIsDeleting(false);
        return;
      }

      setIsDeleting(false);
      setDeleteTarget(null);
      router.refresh();
    } catch {
      setDeleteError("An unexpected error occurred.");
      setIsDeleting(false);
    }
  }

  function handleCopyRoomCode(code: string) {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  }

  function formatDate(isoString: string): string {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  }

  return (
    <div className="space-y-6">
      {/* Action Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="primary"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => setIsCreateOpen(true)}
          >
            Create Board
          </Button>

          <Button
            variant="secondary"
            leftIcon={<Users className="h-4 w-4" />}
            onClick={() => setIsJoinOpen(true)}
          >
            Join Room
          </Button>
        </div>

        {/* Search input */}
        <div className="relative w-full sm:w-72">
          <Input
            placeholder="Search by title or room code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-text-muted pointer-events-none" />
        </div>
      </div>

      {/* Board Grid */}
      {filteredBoards.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBoards.map((board) => (
            <Card
              key={board.id}
              interactive
              onClick={() => router.push(`/board/${board.id}`)}
              className="flex flex-col justify-between group"
            >
              <CardHeader>
                <div className="flex items-start justify-between gap-2 w-full">
                  <div className="flex flex-col gap-1 overflow-hidden">
                    <h3 className="font-semibold text-text-primary text-base truncate group-hover:text-accent transition-colors">
                      {board.title}
                    </h3>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={board.role === "OWNER" ? "accent" : "default"}
                      >
                        {board.role === "OWNER" ? "Owner" : "Member"}
                      </Badge>
                      <span className="text-[11px] text-text-muted">
                        by {board.ownerName}
                      </span>
                    </div>
                  </div>

                  {/* Dropdown Menu */}
                  <div onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu
                      trigger={
                        <IconButton
                          variant="ghost"
                          size="sm"
                          tooltip="Board Options"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </IconButton>
                      }
                    >
                      <DropdownMenuItem
                        icon={<ExternalLink className="h-4 w-4" />}
                        onClick={() => router.push(`/board/${board.id}`)}
                      >
                        Open Board
                      </DropdownMenuItem>

                      <DropdownMenuItem
                        icon={
                          copiedCode === board.roomCode ? (
                            <Check className="h-4 w-4 text-success" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )
                        }
                        onClick={() => handleCopyRoomCode(board.roomCode)}
                      >
                        {copiedCode === board.roomCode
                          ? "Copied!"
                          : "Copy Room Code"}
                      </DropdownMenuItem>

                      {board.role === "OWNER" && (
                        <>
                          <DropdownMenuItem
                            icon={<Edit2 className="h-4 w-4" />}
                            onClick={() => {
                              setRenameTarget(board);
                              setRenameTitle(board.title);
                            }}
                          >
                            Rename Board
                          </DropdownMenuItem>

                          <DropdownMenuSeparator />

                          <DropdownMenuItem
                            destructive
                            icon={<Trash2 className="h-4 w-4" />}
                            onClick={() => setDeleteTarget(board)}
                          >
                            Delete Board
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenu>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-4 border-t border-border/40 bg-bg-secondary/20">
                <div className="flex items-center justify-between text-xs text-text-muted">
                  <div className="flex items-center gap-1.5 font-mono">
                    <span className="text-text-secondary font-semibold">
                      {board.roomCode}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopyRoomCode(board.roomCode);
                      }}
                      className="hover:text-accent transition-colors"
                      title="Copy Code"
                    >
                      {copiedCode === board.roomCode ? (
                        <Check className="h-3.5 w-3.5 text-success" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>

                  <span>Updated {formatDate(board.updatedAt)}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        /* Empty State */
        <Card className="p-12 text-center border-dashed border-border bg-bg-secondary/20">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent-muted text-accent mb-4">
            <LayoutGrid className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-semibold text-text-primary">
            {searchQuery ? "No boards match your search" : "No Whiteboards Yet"}
          </h3>
          <p className="mt-1 text-sm text-text-secondary max-w-sm mx-auto">
            {searchQuery
              ? `No whiteboards found for "${searchQuery}". Try a different keyword or clear the search.`
              : "Create your first personal whiteboard or join an existing session with a room code."}
          </p>
          {!searchQuery && (
            <div className="mt-6 flex justify-center gap-3">
              <Button
                variant="primary"
                leftIcon={<Plus className="h-4 w-4" />}
                onClick={() => setIsCreateOpen(true)}
              >
                Create First Board
              </Button>
            </div>
          )}
        </Card>
      )}

      {/* Create Board Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => {
          setIsCreateOpen(false);
          setCreateError(null);
        }}
        title="Create New Whiteboard"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => {
                setIsCreateOpen(false);
                setCreateError(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              isLoading={isCreating}
              onClick={handleCreate}
            >
              Create Board
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreate} className="space-y-4">
          {createError && (
            <div className="flex items-start gap-2 rounded-lg border border-danger/30 bg-danger-muted p-3 text-xs text-danger">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{createError}</span>
            </div>
          )}

          <Input
            label="Board Name"
            placeholder="e.g. System Design Architecture"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            required
            autoFocus
          />

          <p className="text-xs text-text-muted">
            A unique 6-character room code will be generated automatically for room joining and collaboration.
          </p>
        </form>
      </Modal>

      {/* Join Board Modal */}
      <Modal
        isOpen={isJoinOpen}
        onClose={() => {
          setIsJoinOpen(false);
          setJoinError(null);
        }}
        title="Join Board by Room Code"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => {
                setIsJoinOpen(false);
                setJoinError(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              isLoading={isJoining}
              onClick={handleJoin}
            >
              Join Room
            </Button>
          </>
        }
      >
        <form onSubmit={handleJoin} className="space-y-4">
          {joinError && (
            <div className="flex items-start gap-2 rounded-lg border border-danger/30 bg-danger-muted p-3 text-xs text-danger">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{joinError}</span>
            </div>
          )}

          <Input
            label="Room Code"
            placeholder="e.g. H7K9P2"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            required
            autoFocus
            maxLength={10}
            className="uppercase font-mono tracking-widest text-center text-lg"
          />

          <p className="text-xs text-text-muted">
            Enter the 6-character passcode shared by the board owner.
          </p>
        </form>
      </Modal>

      {/* Rename Board Modal */}
      <Modal
        isOpen={!!renameTarget}
        onClose={() => {
          setRenameTarget(null);
          setRenameError(null);
        }}
        title="Rename Board"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => {
                setRenameTarget(null);
                setRenameError(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              isLoading={isRenaming}
              onClick={handleRename}
            >
              Save Title
            </Button>
          </>
        }
      >
        <form onSubmit={handleRename} className="space-y-4">
          {renameError && (
            <div className="flex items-start gap-2 rounded-lg border border-danger/30 bg-danger-muted p-3 text-xs text-danger">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{renameError}</span>
            </div>
          )}

          <Input
            label="New Board Name"
            value={renameTitle}
            onChange={(e) => setRenameTitle(e.target.value)}
            required
            autoFocus
          />
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => {
          setDeleteTarget(null);
          setDeleteError(null);
        }}
        title="Delete Whiteboard"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => {
                setDeleteTarget(null);
                setDeleteError(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              isLoading={isDeleting}
              onClick={handleDelete}
            >
              Delete Board
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          {deleteError && (
            <div className="flex items-start gap-2 rounded-lg border border-danger/30 bg-danger-muted p-3 text-xs text-danger">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{deleteError}</span>
            </div>
          )}

          <p className="text-sm text-text-secondary">
            Are you sure you want to delete{" "}
            <span className="font-semibold text-text-primary">
              &quot;{deleteTarget?.title}&quot;
            </span>
            ?
          </p>
          <p className="text-xs text-danger">
            This action cannot be undone. All board elements, drawings, and participant access records will be deleted.
          </p>
        </div>
      </Modal>
    </div>
  );
}
