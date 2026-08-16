"use client";

import React, { useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { IconButton } from "@/components/ui/icon-button";
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Square,
  Circle,
  Pencil,
  Type,
  MousePointer,
  ArrowUpRight,
  Share2,
  Users,
  Sparkles,
  Zap,
  Lock,
  Layers,
  MoreVertical,
  LogOut,
  Settings,
  Plus,
} from "lucide-react";

export default function Home() {
  const [activeTool, setActiveTool] = useState<string>("select");
  const [joinCode, setJoinCode] = useState("");

  const navigation = (
    <nav className="mx-auto flex max-w-7xl items-center justify-between p-6 lg:px-8">
      <Link href="/" className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 border border-accent/30 text-accent">
          <Sparkles className="h-5 w-5" />
        </div>
        <span className="text-xl font-bold tracking-tight text-text-primary">
          ThinkSpace
        </span>
        <Badge variant="accent">v1.0</Badge>
      </Link>

      <div className="hidden items-center gap-6 sm:flex">
        <a
          href="#features"
          className="text-sm font-medium text-text-secondary transition-colors hover:text-text-primary"
        >
          Features
        </a>
        <a
          href="#showcase"
          className="text-sm font-medium text-text-secondary transition-colors hover:text-text-primary"
        >
          UI Components
        </a>
        <a
          href="#architecture"
          className="text-sm font-medium text-text-secondary transition-colors hover:text-text-primary"
        >
          Architecture
        </a>
      </div>

      <div className="flex items-center gap-3">
        <Link href="/login">
          <Button variant="ghost" size="sm">
            Sign In
          </Button>
        </Link>
        <Link href="/signup">
          <Button variant="primary" size="sm">
            Get Started
          </Button>
        </Link>
      </div>
    </nav>
  );

  return (
    <AppShell nav={navigation}>
      {/* Hero Section */}
      <section className="relative px-6 pt-12 lg:px-8 lg:pt-20">
        <div className="mx-auto max-w-4xl text-center">
          <Badge variant="accent" className="mb-4">
            Next-Gen Whiteboard Engine
          </Badge>
          <h1 className="text-4xl font-bold tracking-tight text-text-primary sm:text-6xl">
            Collaborative whiteboarding, reimagined for modern teams
          </h1>
          <p className="mt-6 text-lg leading-8 text-text-secondary">
            Infinite canvas, ultra-low latency real-time multiplayer, and hand-drawn geometric precision. Designed for deep work and lightning-fast collaboration.
          </p>
          <div className="mt-8 flex items-center justify-center gap-4">
            <Link href="/signup">
              <Button
                variant="primary"
                size="lg"
                rightIcon={<ArrowUpRight className="h-5 w-5" />}
              >
                Create Personal Board
              </Button>
            </Link>
            <Link href="/login">
              <Button
                variant="secondary"
                size="lg"
                leftIcon={<Users className="h-5 w-5" />}
              >
                Join Room
              </Button>
            </Link>
          </div>
        </div>

        {/* Toolbar & Interactive Canvas Preview */}
        <div className="mx-auto mt-12 max-w-5xl">
          <div className="glass overflow-hidden p-1 shadow-glass-lg">
            {/* Mock Floating Canvas Toolbar */}
            <div className="flex items-center justify-between border-b border-border bg-bg-secondary/60 px-4 py-2.5 backdrop-blur-md">
              <div className="flex items-center gap-1.5">
                <IconButton
                  variant={activeTool === "select" ? "glass" : "ghost"}
                  isActive={activeTool === "select"}
                  onClick={() => setActiveTool("select")}
                  tooltip="Selection (V)"
                >
                  <MousePointer className="h-4 w-4" />
                </IconButton>
                <IconButton
                  variant={activeTool === "rectangle" ? "glass" : "ghost"}
                  isActive={activeTool === "rectangle"}
                  onClick={() => setActiveTool("rectangle")}
                  tooltip="Rectangle (R)"
                >
                  <Square className="h-4 w-4" />
                </IconButton>
                <IconButton
                  variant={activeTool === "ellipse" ? "glass" : "ghost"}
                  isActive={activeTool === "ellipse"}
                  onClick={() => setActiveTool("ellipse")}
                  tooltip="Ellipse (O)"
                >
                  <Circle className="h-4 w-4" />
                </IconButton>
                <IconButton
                  variant={activeTool === "pencil" ? "glass" : "ghost"}
                  isActive={activeTool === "pencil"}
                  onClick={() => setActiveTool("pencil")}
                  tooltip="Pencil (P)"
                >
                  <Pencil className="h-4 w-4" />
                </IconButton>
                <IconButton
                  variant={activeTool === "text" ? "glass" : "ghost"}
                  isActive={activeTool === "text"}
                  onClick={() => setActiveTool("text")}
                  tooltip="Text (T)"
                >
                  <Type className="h-4 w-4" />
                </IconButton>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  <Avatar name="Kundan Singh" size="sm" />
                  <Avatar name="Rahul Sharma" size="sm" />
                  <Avatar name="Aman Verma" size="sm" />
                </div>
                <Badge variant="success">3 Online</Badge>
                <IconButton
                  variant="ghost"
                  size="sm"
                  tooltip="Share Room"
                >
                  <Share2 className="h-4 w-4" />
                </IconButton>
              </div>
            </div>

            {/* Mock Canvas Workspace Surface */}
            <div className="relative flex h-80 w-full flex-col items-center justify-center bg-bg-primary/80 p-8 text-center">
              <div className="absolute inset-0 bg-[radial-gradient(hsla(0,0%,100%,0.03)_1px,transparent_1px)] [background-size:24px_24px]" />
              <div className="relative z-10 max-w-md">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-accent-muted text-accent">
                  <Layers className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold text-text-primary">
                  Infinite Canvas Ready
                </h3>
                <p className="mt-1 text-sm text-text-secondary">
                  Active Tool: <span className="font-mono text-accent">{activeTool}</span>
                </p>
                <p className="mt-2 text-xs text-text-muted">
                  Full 2D Canvas engine with rough.js rendering will be enabled in Phase 3 & Phase 4.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="mx-auto max-w-7xl px-6 py-20 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-text-primary">
            Built for velocity & clarity
          </h2>
          <p className="mt-4 text-text-secondary">
            High performance architecture separation ensures smooth 60 FPS rendering regardless of UI state.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <Card interactive>
            <CardHeader>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-muted text-accent">
                <Zap className="h-5 w-5" />
              </div>
              <h3 className="font-semibold text-text-primary">60 FPS Canvas Engine</h3>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-text-secondary">
                HTML5 Canvas 2D API abstraction decoupled from React render loops for latency-free pointer tracking.
              </p>
            </CardContent>
          </Card>

          <Card interactive>
            <CardHeader>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-success-muted text-success">
                <Users className="h-5 w-5" />
              </div>
              <h3 className="font-semibold text-text-primary">Realtime Multiplayer</h3>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-text-secondary">
                Socket.IO event synchronization for smooth live cursor tracking and multi-user drawing updates.
              </p>
            </CardContent>
          </Card>

          <Card interactive>
            <CardHeader>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-warning-muted text-warning">
                <Lock className="h-5 w-5" />
              </div>
              <h3 className="font-semibold text-text-primary">Secure Workspace</h3>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-text-secondary">
                Supabase authentication, row-level authorization, and encrypted passcode-protected board rooms.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* UI Component Showcase */}
      <section id="showcase" className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
        <Card className="p-6">
          <CardHeader>
            <div>
              <h3 className="text-xl font-semibold text-text-primary">
                Design System & Base UI Components
              </h3>
              <p className="text-sm text-text-secondary">
                Futuristic Dark Glassmorphism system.
              </p>
            </div>
          </CardHeader>
          <CardContent className="space-y-8">
            {/* Buttons Showcase */}
            <div>
              <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-muted">
                Buttons & Variants
              </h4>
              <div className="flex flex-wrap gap-3">
                <Button variant="primary">Primary Accent</Button>
                <Button variant="secondary">Secondary Glass</Button>
                <Button variant="ghost">Ghost Button</Button>
                <Button variant="danger">Danger Action</Button>
                <Button variant="primary" isLoading>
                  Loading
                </Button>
              </div>
            </div>

            {/* Inputs & Controls */}
            <div>
              <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-muted">
                Inputs & Dropdown Menu
              </h4>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input
                  label="Room Passcode"
                  placeholder="e.g. H7K9P2"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  helperText="Enter 6-character room passcode to join"
                />
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-text-secondary">
                    Actions Dropdown
                  </label>
                  <div>
                    <DropdownMenu
                      trigger={
                        <Button
                          variant="secondary"
                          rightIcon={<MoreVertical className="h-4 w-4" />}
                        >
                          Board Options
                        </Button>
                      }
                    >
                      <DropdownMenuItem icon={<Plus className="h-4 w-4" />}>
                        Duplicate Board
                      </DropdownMenuItem>
                      <DropdownMenuItem icon={<Settings className="h-4 w-4" />}>
                        Room Settings
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        destructive
                        icon={<LogOut className="h-4 w-4" />}
                      >
                        Leave Room
                      </DropdownMenuItem>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            </div>

            {/* Badges & Avatars */}
            <div>
              <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-muted">
                Badges & User Avatars
              </h4>
              <div className="flex flex-wrap items-center gap-4">
                <Badge variant="default">Default</Badge>
                <Badge variant="accent">Active Room</Badge>
                <Badge variant="success">Connected</Badge>
                <Badge variant="warning">Reconnecting</Badge>
                <Badge variant="danger">Offline</Badge>
                <div className="h-4 w-px bg-border" />
                <Avatar name="Kundan Singh" size="sm" />
                <Avatar name="Rahul Sharma" size="md" />
                <Avatar name="Aman Verma" size="lg" />
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-border py-8 text-center text-xs text-text-muted">
        <p>ThinkSpace © 2026 — Built with Next.js, TypeScript, and Tailwind CSS v4.</p>
      </footer>
    </AppShell>
  );
}
