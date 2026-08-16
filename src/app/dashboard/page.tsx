import React from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/actions";
import { getUserBoards } from "@/lib/board/actions";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { LogoutButton } from "./logout-button";
import { BoardGrid } from "./board-grid";
import { Sparkles, LayoutGrid } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  // Server-side authentication check
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch real boards owned by or shared with user
  const boards = await getUserBoards();

  const navigation = (
    <nav className="mx-auto flex max-w-7xl items-center justify-between p-6 lg:px-8">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 border border-accent/30 text-accent">
          <Sparkles className="h-5 w-5" />
        </div>
        <span className="text-xl font-bold tracking-tight text-text-primary">
          ThinkSpace
        </span>
        <Badge variant="accent">Workspace</Badge>
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden sm:flex items-center gap-2 rounded-full border border-border bg-surface-glass px-3 py-1 text-xs">
          <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
          <span className="text-text-secondary font-medium">
            Authenticated Session
          </span>
        </div>

        <div className="flex items-center gap-3 border-l border-border pl-4">
          <Avatar name={user.name} size="md" />
          <div className="hidden md:block text-left">
            <p className="text-xs font-semibold text-text-primary">{user.name}</p>
            <p className="text-[10px] text-text-muted">{user.email}</p>
          </div>
          <LogoutButton />
        </div>
      </div>
    </nav>
  );

  return (
    <AppShell nav={navigation}>
      <div className="mx-auto max-w-7xl px-6 py-8 lg:px-8 space-y-8">
        {/* Workspace Banner */}
        <div className="glass relative overflow-hidden p-6 sm:p-8">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="accent">Phase 2 Active</Badge>
                <span className="text-xs text-text-muted">
                  Workspace & Board Management
                </span>
              </div>
              <h1 className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-text-primary">
                Welcome back, {user.name}
              </h1>
              <p className="mt-1 text-sm text-text-secondary">
                Manage your collaborative whiteboards, create new rooms, or join with a room code.
              </p>
            </div>

            <div className="flex items-center gap-4 text-xs text-text-muted">
              <div className="flex items-center gap-1.5 rounded-lg border border-border bg-bg-secondary/40 px-3 py-2">
                <LayoutGrid className="h-4 w-4 text-accent" />
                <span>
                  <strong className="text-text-primary">{boards.length}</strong>{" "}
                  {boards.length === 1 ? "Board" : "Boards"} Total
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Board Management Workspace */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-border/40 pb-4">
            <h2 className="text-xl font-bold tracking-tight text-text-primary">
              Your Whiteboards
            </h2>
            <span className="text-xs text-text-muted">
              Click a board to enter workspace shell
            </span>
          </div>

          <BoardGrid initialBoards={boards} />
        </div>
      </div>
    </AppShell>
  );
}
