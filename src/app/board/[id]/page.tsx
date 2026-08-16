import React from "react";
import { redirect } from "next/navigation";
import { getBoardById } from "@/lib/board/actions";
import { getCurrentUser } from "@/lib/auth/actions";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { BoardHeader } from "./board-header";
import { Layers, Sparkles, Users, ShieldCheck } from "lucide-react";

export const dynamic = "force-dynamic";

export interface BoardPageProps {
  params: Promise<{ id: string }>;
}

export default async function BoardPage({ params }: BoardPageProps) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const { id } = await params;
  const board = await getBoardById(id);

  // If board does not exist or user is unauthorized -> redirect to dashboard
  if (!board) {
    redirect("/dashboard");
  }

  return (
    <AppShell withBackground={false} className="bg-bg-primary">
      <div className="flex h-screen flex-col overflow-hidden">
        {/* Workspace Top Header Bar */}
        <BoardHeader board={board} />

        {/* Board Workspace Canvas Surface Shell */}
        <main className="relative flex flex-1 flex-col items-center justify-center bg-bg-primary p-6">
          {/* Subtle grid pattern background */}
          <div className="absolute inset-0 bg-[radial-gradient(hsla(0,0%,100%,0.04)_1px,transparent_1px)] [background-size:32px_32px]" />

          {/* Canvas Placeholder Card */}
          <div className="glass-strong relative z-10 max-w-xl w-full p-8 text-center space-y-6 animate-scale-in">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/10 border border-accent/30 text-accent shadow-accent">
              <Layers className="h-8 w-8" />
            </div>

            <div className="space-y-2">
              <Badge variant="accent" className="px-3 py-1 text-xs">
                Phase 2 Workspace Shell
              </Badge>

              <h2 className="text-2xl font-bold tracking-tight text-text-primary">
                {board.title}
              </h2>

              <p className="text-xs font-mono text-text-muted">
                Room Code: <span className="text-accent">{board.roomCode}</span>
              </p>
            </div>

            {/* Clear Placeholder Notice Requirement */}
            <div className="rounded-xl border border-accent/40 bg-accent-muted p-4 text-center space-y-2">
              <div className="flex items-center justify-center gap-2 text-accent font-semibold text-sm">
                <Sparkles className="h-4 w-4" />
                <span>Canvas Engine Coming in Phase 3</span>
              </div>
              <p className="text-xs text-text-secondary leading-relaxed">
                The board shell, secure server database structure, and membership authorization are active. Drawing tools (rough.js geometry &amp; perfect-freehand pencil) will be integrated in Phase 3.
              </p>
            </div>

            {/* Workspace Specs Details */}
            <div className="grid grid-cols-2 gap-3 text-left pt-2">
              <div className="rounded-lg border border-border/60 bg-bg-secondary/40 p-3 space-y-1">
                <div className="flex items-center gap-1.5 text-text-muted text-[11px] font-semibold">
                  <ShieldCheck className="h-3.5 w-3.5 text-success" />
                  <span>Authorization</span>
                </div>
                <p className="text-xs font-medium text-text-primary">
                  {board.isOwner ? "Owner (Full Access)" : "Participant (Member)"}
                </p>
              </div>

              <div className="rounded-lg border border-border/60 bg-bg-secondary/40 p-3 space-y-1">
                <div className="flex items-center gap-1.5 text-text-muted text-[11px] font-semibold">
                  <Users className="h-3.5 w-3.5 text-accent" />
                  <span>Collaboration</span>
                </div>
                <p className="text-xs font-medium text-text-primary">
                  {board.participantCount} Registered {board.participantCount === 1 ? "User" : "Users"}
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </AppShell>
  );
}
