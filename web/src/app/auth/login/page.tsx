"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { authApi } from "@/lib/api";
import BackButton from "@/components/BackButton";

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
    <main className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex flex-col gap-2">
          <p className="text-sm uppercase tracking-[0.25em] text-gray-400">Authentication</p>
          <h1 className="text-3xl font-semibold text-white">Log in</h1>
          <p className="text-sm text-gray-400">Sign in to your account to continue.</p>
        </div>
        <BackButton href="/" />
      </div>
      <div className="max-w-md space-y-6 bg-white/5 p-8 shadow border border-white/10">
        <div className="space-y-2">
          <p className="text-sm uppercase tracking-[0.25em] text-gray-400">US-only</p>
          <p className="text-sm text-gray-400">
            Access is limited to verified 18+ users in the United States.
          </p>
        </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-gray-800 border border-gray-600 p-3 text-sm text-gray-200">
            {error}
          </div>
        )}
        <div className="space-y-2">
          <label className="text-sm text-gray-300" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-black px-3 py-2 text-white border border-white/30 focus:outline-none focus:border-2 focus:border-white"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm text-slate-200" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-black px-3 py-2 text-white border border-white/30 focus:outline-none focus:border-2 focus:border-white"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-white px-4 py-2 font-semibold text-black hover:bg-gray-200 border-2 border-white disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Logging in..." : "Continue"}
        </button>
      </form>
      <p className="text-sm text-gray-400">
        Don&apos;t have an account?{" "}
        <Link className="text-white hover:text-gray-300 underline" href="/auth/register">
          Sign up
        </Link>
      </p>
      </div>
    </main>
  );
}


