import React from "react";
import { redirect } from "next/navigation";
import { getBoardById } from "@/lib/board/actions";
import { getCurrentUser } from "@/lib/auth/actions";
import { AppShell } from "@/components/layout/app-shell";
import { BoardHeader } from "./board-header";
import { CanvasWorkspace } from "@/canvas/components/canvas-workspace";

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

        {/* Board Workspace Canvas Surface */}
        <main className="relative flex flex-1 overflow-hidden bg-bg-primary">
          <CanvasWorkspace board={board} />
        </main>
      </div>
    </AppShell>
  );
}
