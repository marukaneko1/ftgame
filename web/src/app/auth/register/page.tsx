"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { authApi } from "@/lib/api";
import BackButton from "@/components/BackButton";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
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
      
      // Handle different error formats
      let errorMessage = "Registration failed. Please try again.";
      
      if (err.response?.data) {
        const data = err.response.data;
        
        // Handle validation errors (array format)
        if (Array.isArray(data.message)) {
          errorMessage = data.message.join(". ");
        }
        // Handle single message string
        else if (typeof data.message === "string") {
          errorMessage = data.message;
        }
        // Handle error object format
        else if (data.error && Array.isArray(data.message)) {
          errorMessage = `${data.error}: ${data.message.join(". ")}`;
        }
      }
      // Handle network errors
      else if (err.message && err.message.includes("Network Error")) {
        errorMessage = "Cannot connect to server. Please check that the API server is running.";
      }
      // Handle other errors
      else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex flex-col gap-2">
          <p className="text-sm uppercase tracking-[0.25em] text-gray-400">Authentication</p>
          <h1 className="text-3xl font-semibold text-white">Sign up</h1>
          <p className="text-sm text-gray-400">Create a new account to get started.</p>
        </div>
        <BackButton href="/" />
      </div>
      <div className="max-w-md space-y-6 bg-gray-900 p-8 shadow border border-white/20">
        <div className="space-y-2">
          <p className="text-sm uppercase tracking-[0.25em] text-gray-400">US-only</p>
          <p className="text-sm text-gray-400">
            You must be 18 or older and physically in the United States to use this service.
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
          <label className="text-sm text-gray-300" htmlFor="displayName">
            Display name
          </label>
          <input
            id="displayName"
            type="text"
            required
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full bg-black px-3 py-2 text-white border border-white/30 focus:outline-none focus:border-2 focus:border-white"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm text-gray-300" htmlFor="username">
            Username
          </label>
          <input
            id="username"
            type="text"
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full bg-black px-3 py-2 text-white border border-white/30 focus:outline-none focus:border-2 focus:border-white"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm text-gray-300" htmlFor="password">
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
        <div className="space-y-2">
          <label className="text-sm text-gray-300" htmlFor="dob">
            Date of birth
          </label>
          <input
            id="dob"
            type="date"
            required
            value={dateOfBirth}
            onChange={(e) => setDateOfBirth(e.target.value)}
            className="w-full bg-black px-3 py-2 text-white border border-white/30 focus:outline-none focus:border-2 focus:border-white"
          />
        </div>
        <label className="flex items-start gap-3 text-sm text-slate-200">
          <input type="checkbox" required className="mt-1" /> I confirm I am 18 or older and located in
          the United States.
        </label>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-white px-4 py-2 font-semibold text-black hover:bg-gray-200 border-2 border-white disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Creating account..." : "Continue"}
        </button>
      </form>
      <p className="text-sm text-gray-400">
        Already have an account?{" "}
        <Link className="text-white hover:text-gray-300 underline" href="/auth/login">
          Log in
        </Link>
      </p>
      </div>
    </main>
  );
}


