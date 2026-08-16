"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { loginAction } from "@/lib/auth/actions";
import { Sparkles, ArrowRight, AlertCircle, CheckCircle2 } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [infoMessage, setInfoMessage] = useState<string | null>(
    searchParams.get("signup") === "success"
      ? "Account created successfully! Please sign in below."
      : null
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);
    setFieldErrors({});
    setIsLoading(true);

    try {
      const result = await loginAction({ email, password });

      if (!result.success) {
        setError(result.error || "Failed to sign in. Please check your credentials.");
        if (result.fieldErrors) {
          setFieldErrors(result.fieldErrors);
        }
        setIsLoading(false);
        return;
      }

      // Successful login -> Redirect to destination
      router.push(redirectTo);
      router.refresh();
    } catch {
      setError("An unexpected error occurred. Please try again.");
      setIsLoading(false);
    }
  }

  return (
    <Card className="glass-strong">
      <CardHeader className="border-b border-border/50 pb-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
            Authentication
          </span>
          <Badge variant="accent">Supabase Auth</Badge>
        </div>
      </CardHeader>

      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {infoMessage && (
            <div className="flex items-start gap-2.5 rounded-lg border border-success/30 bg-success-muted p-3 text-xs text-success">
              <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{infoMessage}</span>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2.5 rounded-lg border border-danger/30 bg-danger-muted p-3 text-xs text-danger">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <Input
            label="Email address"
            type="email"
            placeholder="name@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={fieldErrors.email}
            required
            autoComplete="email"
          />

          <Input
            label="Password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={fieldErrors.password}
            required
            autoComplete="current-password"
          />

          <Button
            type="submit"
            variant="primary"
            className="w-full"
            isLoading={isLoading}
            rightIcon={<ArrowRight className="h-4 w-4" />}
          >
            Sign In
          </Button>
        </form>
      </CardContent>

      <CardFooter className="flex justify-center border-t border-border/50 bg-bg-secondary/30 text-xs text-text-secondary">
        Don&apos;t have an account?{" "}
        <Link
          href="/signup"
          className="ml-1.5 font-medium text-accent hover:underline"
        >
          Create one now
        </Link>
      </CardFooter>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <AppShell>
      <div className="flex flex-1 items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-6">
          {/* Header Branding */}
          <div className="text-center">
            <Link
              href="/"
              className="inline-flex items-center gap-3 transition-opacity hover:opacity-80"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 border border-accent/30 text-accent shadow-accent">
                <Sparkles className="h-6 w-6" />
              </div>
              <span className="text-2xl font-bold tracking-tight text-text-primary">
                ThinkSpace
              </span>
            </Link>
            <h1 className="mt-4 text-2xl font-semibold tracking-tight text-text-primary">
              Welcome back
            </h1>
            <p className="mt-1 text-sm text-text-secondary">
              Sign in to access your collaborative whiteboards
            </p>
          </div>

          <Suspense
            fallback={
              <Card className="glass-strong p-8 flex items-center justify-center">
                <Spinner size="md" />
              </Card>
            }
          >
            <LoginForm />
          </Suspense>

          {/* Quick Home Link */}
          <div className="text-center">
            <Link
              href="/"
              className="text-xs text-text-muted hover:text-text-secondary transition-colors"
            >
              ← Back to public homepage
            </Link>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
