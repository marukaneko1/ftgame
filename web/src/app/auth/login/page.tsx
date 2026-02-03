"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { authApi } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await authApi.login(email, password);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.response?.data?.message || "Login failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center animate-fade-in">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center">
          <Link href="/" className="inline-flex items-center gap-2 mb-6 group">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-accent to-cyan flex items-center justify-center shadow-glow-purple">
              <span className="text-xl font-bold text-base">S</span>
            </div>
            <span className="text-lg font-display text-txt-primary">Shitbox Shuffle</span>
          </Link>
          <Badge variant="accent" size="sm" className="mb-4">Authentication</Badge>
          <h1 className="text-3xl font-display text-txt-primary tracking-tight">Welcome back</h1>
          <p className="text-txt-secondary mt-2">Sign in to your account to continue</p>
        </div>

        {/* Login Card */}
        <Card variant="elevated" padding="lg" className="relative overflow-hidden">
          {/* Inner highlight */}
          <div className="absolute top-0 left-[10%] right-[10%] h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          
          <CardContent>
            {/* Notice */}
            <div className="mb-6 p-3 bg-info-muted rounded-lg border border-info/20">
              <p className="text-xs text-info font-medium mb-1">US-Only Service</p>
              <p className="text-xs text-txt-secondary">
                Access is limited to verified 18+ users in the United States.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 bg-error-muted rounded-lg border border-error/30">
                  <p className="text-sm text-error">{error}</p>
                </div>
              )}

              <Input
                label="Email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                icon={
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                  </svg>
                }
              />

              <Input
                label="Password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                icon={
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                }
              />

              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                loading={loading}
              >
                {loading ? "Signing in..." : "Sign In"}
              </Button>
            </form>

            {/* Sign up link */}
            <p className="mt-6 text-center text-sm text-txt-secondary">
              Don't have an account?{" "}
              <Link href="/auth/register" className="text-accent hover:text-accent-hover font-medium transition-colors">
                Sign up
              </Link>
            </p>
          </CardContent>
        </Card>

        {/* Back to home */}
        <div className="text-center">
          <Link href="/" className="text-sm text-txt-muted hover:text-txt-secondary transition-colors">
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
