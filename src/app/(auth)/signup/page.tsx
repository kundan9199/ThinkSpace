"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { signUpAction } from "@/lib/auth/actions";
import { Sparkles, ArrowRight, AlertCircle } from "lucide-react";

export default function SignupPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    setIsLoading(true);

    try {
      const result = await signUpAction({
        name,
        email,
        password,
        confirmPassword,
      });

      if (!result.success) {
        setError(result.error || "Failed to create account.");
        if (result.fieldErrors) {
          setFieldErrors(result.fieldErrors);
        }
        setIsLoading(false);
        return;
      }

      // Successful signup -> Redirect to login with confirmation parameter
      router.push("/login?signup=success");
    } catch {
      setError("An unexpected error occurred. Please try again.");
      setIsLoading(false);
    }
  }

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
              Create your account
            </h1>
            <p className="mt-1 text-sm text-text-secondary">
              Join ThinkSpace to start creating collaborative whiteboards
            </p>
          </div>

          {/* Signup Card */}
          <Card className="glass-strong">
            <CardHeader className="border-b border-border/50 pb-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                  New Account
                </span>
                <Badge variant="accent">Supabase Auth</Badge>
              </div>
            </CardHeader>

            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                {error && (
                  <div className="flex items-start gap-2.5 rounded-lg border border-danger/30 bg-danger-muted p-3 text-xs text-danger">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                <Input
                  label="Full Name"
                  type="text"
                  placeholder="Kundan Singh"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  error={fieldErrors.name}
                  required
                  autoComplete="name"
                />

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
                  placeholder="Minimum 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  error={fieldErrors.password}
                  required
                  autoComplete="new-password"
                />

                <Input
                  label="Confirm Password"
                  type="password"
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  error={fieldErrors.confirmPassword}
                  required
                  autoComplete="new-password"
                />

                <Button
                  type="submit"
                  variant="primary"
                  className="w-full"
                  isLoading={isLoading}
                  rightIcon={<ArrowRight className="h-4 w-4" />}
                >
                  Create Account
                </Button>
              </form>
            </CardContent>

            <CardFooter className="flex justify-center border-t border-border/50 bg-bg-secondary/30 text-xs text-text-secondary">
              Already have an account?{" "}
              <Link
                href="/login"
                className="ml-1.5 font-medium text-accent hover:underline"
              >
                Sign in
              </Link>
            </CardFooter>
          </Card>

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
