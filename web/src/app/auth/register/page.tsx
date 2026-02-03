"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { authApi } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await authApi.register(email, password, displayName, username, dateOfBirth);
      router.push("/dashboard");
    } catch (err: any) {
      console.error("Registration error:", err);
      
      let errorMessage = "Registration failed. Please try again.";
      
      if (err.response?.data) {
        const data = err.response.data;
        if (Array.isArray(data.message)) {
          errorMessage = data.message.join(". ");
        } else if (typeof data.message === "string") {
          errorMessage = data.message;
        } else if (data.error && Array.isArray(data.message)) {
          errorMessage = `${data.error}: ${data.message.join(". ")}`;
        }
      } else if (err.message && err.message.includes("Network Error")) {
        errorMessage = "Cannot connect to server. Please check that the API server is running.";
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center py-8 animate-fade-in">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center">
          <Link href="/" className="inline-flex items-center gap-2 mb-6 group">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-accent to-cyan flex items-center justify-center shadow-glow-purple">
              <span className="text-xl font-bold text-base">S</span>
            </div>
            <span className="text-lg font-display text-txt-primary">Shitbox Shuffle</span>
          </Link>
          <Badge variant="accent" size="sm" className="mb-4">Join the Community</Badge>
          <h1 className="text-3xl font-display text-txt-primary tracking-tight">Create account</h1>
          <p className="text-txt-secondary mt-2">Sign up to start matching and playing</p>
        </div>

        {/* Register Card */}
        <Card variant="elevated" padding="lg" className="relative overflow-hidden">
          {/* Inner highlight */}
          <div className="absolute top-0 left-[10%] right-[10%] h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          
          <CardContent>
            {/* Notice */}
            <div className="mb-6 p-3 bg-warning-muted rounded-lg border border-warning/20">
              <p className="text-xs text-warning font-medium mb-1">US-Only • 18+ Required</p>
              <p className="text-xs text-txt-secondary">
                You must be 18 or older and physically in the United States to use this service.
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

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Display Name"
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="John"
                />
                <Input
                  label="Username"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="johndoe"
                />
              </div>

              <Input
                label="Password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                hint="Minimum 8 characters"
                icon={
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                }
              />

              <Input
                label="Date of Birth"
                type="date"
                required
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
              />

              {/* Age Confirmation */}
              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  required
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-1 w-4 h-4 rounded border-border-default bg-surface-primary accent-accent cursor-pointer"
                />
                <span className="text-sm text-txt-secondary group-hover:text-txt-primary transition-colors">
                  I confirm I am <span className="text-warning font-medium">18 years or older</span> and currently located in the <span className="text-info font-medium">United States</span>.
                </span>
              </label>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                loading={loading}
                disabled={!agreed}
              >
                {loading ? "Creating account..." : "Create Account"}
              </Button>
            </form>

            {/* Terms */}
            <p className="mt-4 text-xs text-txt-muted text-center">
              By creating an account, you agree to our{" "}
              <a href="#" className="text-accent hover:underline">Terms of Service</a> and{" "}
              <a href="#" className="text-accent hover:underline">Privacy Policy</a>.
            </p>

            {/* Login link */}
            <p className="mt-6 text-center text-sm text-txt-secondary">
              Already have an account?{" "}
              <Link href="/auth/login" className="text-accent hover:text-accent-hover font-medium transition-colors">
                Sign in
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
