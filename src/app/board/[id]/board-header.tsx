"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { IconButton } from "@/components/ui/icon-button";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  updateBoard,
  deleteBoard,
  type BoardDetails,
} from "@/lib/board/actions";
import {
  ArrowLeft,
  Copy,
  Check,
  MoreVertical,
  Edit2,
  Trash2,
  Users,
  Sparkles,
  AlertCircle,
} from "lucide-react";

export interface BoardHeaderProps {
  board: BoardDetails;
}

export function BoardHeader({ board }: BoardHeaderProps) {
  const router = useRouter();

  const [copied, setCopied] = useState(false);

  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [renameTitle, setRenameTitle] = useState(board.title);
  const [renameError, setRenameError] = useState<string | null>(null);
  const [isRenaming, setIsRenaming] = useState(false);

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  function handleCopyRoomCode() {
    navigator.clipboard.writeText(board.roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleRename(e: React.FormEvent) {
    e.preventDefault();
    setRenameError(null);
    setIsRenaming(true);

    try {
      const result = await updateBoard(board.id, renameTitle);
      if (!result.success) {
        setRenameError(result.error || "Failed to rename board.");
        setIsRenaming(false);
        return;
      }

      setIsRenaming(false);
      setIsRenameOpen(false);
      router.refresh();
    } catch {
      setRenameError("An unexpected error occurred.");
      setIsRenaming(false);
    }
  }

  async function handleDelete() {
    setDeleteError(null);
    setIsDeleting(true);

    try {
      const result = await deleteBoard(board.id);
      if (!result.success) {
        setDeleteError(result.error || "Failed to delete board.");
        setIsDeleting(false);
        return;
      }

      setIsDeleting(false);
      router.push("/dashboard");
    } catch {
      setDeleteError("An unexpected error occurred.");
      setIsDeleting(false);
    }
  }

  return (
    <>
      <header className="border-b border-border bg-bg-secondary/70 backdrop-blur-md px-6 py-3">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          {/* Left: Back & Board Title */}
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button
                variant="ghost"
                size="sm"
                leftIcon={<ArrowLeft className="h-4 w-4" />}
              >
                Dashboard
              </Button>
            </Link>

            <div className="h-4 w-px bg-border hidden sm:block" />

            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10 border border-accent/30 text-accent">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-text-primary">
                  {board.title}
                </h1>
                <p className="text-[10px] text-text-muted">
                  Owner: {board.ownerName}
                </p>
              </div>
            </div>
          </div>

          {/* Right: Room Code & Actions */}
          <div className="flex items-center gap-3">
            <Badge variant={board.isOwner ? "accent" : "default"}>
              {board.isOwner ? "Owner" : "Member"}
            </Badge>

            <div className="hidden sm:flex items-center gap-1.5 rounded-lg border border-border bg-bg-primary/60 px-2.5 py-1 text-xs">
              <Users className="h-3.5 w-3.5 text-text-muted" />
              <span className="font-mono text-text-secondary font-medium">
                {board.participantCount}
              </span>
            </div>

            {/* Room Code Copy Pill */}
            <button
              onClick={handleCopyRoomCode}
              className="flex items-center gap-1.5 rounded-lg border border-border bg-surface-glass px-3 py-1 text-xs font-mono text-text-secondary hover:border-border-hover hover:text-text-primary transition-all"
              title="Click to copy Room Code"
            >
              <span>Code: {board.roomCode}</span>
              {copied ? (
                <Check className="h-3.5 w-3.5 text-success" />
              ) : (
                <Copy className="h-3.5 w-3.5 text-text-muted" />
              )}
            </button>

            {/* Options dropdown for owner */}
            {board.isOwner && (
              <DropdownMenu
                trigger={
                  <IconButton variant="ghost" size="sm" tooltip="Board Settings">
                    <MoreVertical className="h-4 w-4" />
                  </IconButton>
                }
              >
                <DropdownMenuItem
                  icon={<Edit2 className="h-4 w-4" />}
                  onClick={() => {
                    setRenameTitle(board.title);
                    setIsRenameOpen(true);
                  }}
                >
                  Rename Board
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  destructive
                  icon={<Trash2 className="h-4 w-4" />}
                  onClick={() => setIsDeleteOpen(true)}
                >
                  Delete Board
                </DropdownMenuItem>
              </DropdownMenu>
            )}
          </div>
        </div>
      </header>

      {/* Rename Modal */}
      <Modal
        isOpen={isRenameOpen}
        onClose={() => {
          setIsRenameOpen(false);
          setRenameError(null);
        }}
        title="Rename Board"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => {
                setIsRenameOpen(false);
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
            label="Board Name"
            value={renameTitle}
            onChange={(e) => setRenameTitle(e.target.value)}
            required
            autoFocus
          />
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteOpen}
        onClose={() => {
          setIsDeleteOpen(false);
          setDeleteError(null);
        }}
        title="Delete Whiteboard"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => {
                setIsDeleteOpen(false);
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
              &quot;{board.title}&quot;
            </span>
            ?
          </p>
          <p className="text-xs text-danger">
            This will permanently remove this whiteboard and return you to the dashboard.
          </p>
        </div>
      </Modal>
    </>
  );
}
