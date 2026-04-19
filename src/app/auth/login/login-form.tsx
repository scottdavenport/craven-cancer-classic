"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  signInWithPassword,
  signInWithMagicLink,
  signInWithGoogle,
} from "../actions";

type AuthMode = "password" | "magic-link";

interface LoginFormProps {
  initialError?: string;
}

// Google G SVG — official brand mark for OAuth buttons
function GoogleIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="shrink-0"
    >
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

export function LoginForm({ initialError }: LoginFormProps) {
  const [mode, setMode] = useState<AuthMode>("password");
  const [error, setError] = useState<string | null>(initialError ?? null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const action =
        mode === "password" ? signInWithPassword : signInWithMagicLink;
      const result = await action(formData);

      if (result && "error" in result && typeof result.error === "string") {
        setError(result.error);
      } else if (
        result &&
        "success" in result &&
        typeof result.success === "string"
      ) {
        setSuccess(result.success);
      }
    } catch {
      // Intentionally silent: Next.js redirect() throws to abort the action.
      // Logging this would be noise on every successful login.
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    setError(null);
    setLoading(true);
    try {
      const result = await signInWithGoogle();
      if (result && "error" in result && typeof result.error === "string") {
        setError(result.error);
      }
    } catch {
      // Intentionally silent: Next.js redirect() throws to abort the action.
      // Logging this would be noise on every successful login.
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-md shadow-[var(--shadow-md)]">
      <CardHeader className="text-center">
        <CardTitle className="font-display text-[1.75rem] font-semibold leading-snug">
          Sign In
        </CardTitle>
        <CardDescription>Tournament administration</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {error && (
          <div className="rounded-md bg-destructive/10 text-destructive border border-destructive/20 p-3 text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-md bg-success-muted text-success border border-success/20 p-3 text-sm">
            {success}
          </div>
        )}

        {/* Google OAuth */}
        <Button
          variant="outline"
          className="w-full gap-2"
          onClick={handleGoogleSignIn}
          disabled={loading}
        >
          <GoogleIcon />
          Sign in with Google
        </Button>

        <div className="flex items-center gap-4">
          <Separator className="flex-1" />
          <span className="text-sm text-muted-foreground">or</span>
          <Separator className="flex-1" />
        </div>

        {/* Segmented mode selector */}
        <div className="flex rounded-md border border-border/60 p-0.5 bg-neutral-100">
          <button
            type="button"
            onClick={() => setMode("password")}
            className={cn(
              "flex-1 rounded-sm px-3 py-1.5 text-sm font-medium transition-colors duration-150",
              mode === "password"
                ? "bg-white shadow-[var(--shadow-xs)] text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Password
          </button>
          <button
            type="button"
            onClick={() => setMode("magic-link")}
            className={cn(
              "flex-1 rounded-sm px-3 py-1.5 text-sm font-medium transition-colors duration-150",
              mode === "magic-link"
                ? "bg-white shadow-[var(--shadow-xs)] text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Magic Link
          </button>
        </div>

        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="you@example.com"
              required
            />
          </div>

          {mode === "password" && (
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="Your password"
                required
              />
            </div>
          )}

          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            {loading
              ? "Signing in..."
              : mode === "password"
                ? "Sign In"
                : "Send Magic Link"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
