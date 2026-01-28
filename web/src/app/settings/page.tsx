"use client";

import { useEffect, useState } from "react";
import { usersApi, subscriptionsApi } from "@/lib/api";
import BackButton from "@/components/BackButton";
import { formatNumber } from "@/lib/utils";

export default function SettingsPage() {
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [language, setLanguage] = useState("en");
  const [region, setRegion] = useState("US");
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [subscription, setSubscription] = useState<any>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  useEffect(() => {
    loadUser();
    loadSubscription();
  }, []);

  const loadUser = async () => {
    try {
      const userData = await usersApi.getMe();
      setUser(userData);
      setDisplayName(userData.displayName || "");
      setUsername(userData.username || "");
    } catch (err) {
      console.error("Failed to load user:", err);
    } finally {
      setLoadingUser(false);
    }
  };

  const loadSubscription = async () => {
    try {
      const subData = await subscriptionsApi.getMySubscription();
      setSubscription(subData);
    } catch (err) {
      console.error("Failed to load subscription:", err);
    }
  };

  const handleUnlockAccess = async () => {
    try {
      const { checkoutUrl } = await subscriptionsApi.createBasicCheckout();
      window.location.href = checkoutUrl;
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to create checkout session");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSaved(false);

    try {
      // Note: Update endpoint not implemented yet in backend
      // For now, just show a message
      await new Promise(resolve => setTimeout(resolve, 500));
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to save settings");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <p className="text-sm uppercase tracking-[0.25em] text-gray-400">Profile</p>
          <h1 className="text-3xl font-semibold text-white">Settings</h1>
          <p className="text-sm text-gray-400">Manage your display info and verification status.</p>
        </div>
        <BackButton href="/dashboard" />
      </div>

      {loadingUser ? (
        <div className="bg-gray-900 p-6 border border-white/20 text-center text-gray-400">
          Loading profile...
        </div>
      ) : (
        <>
          {/* Subscription Section */}
          <div className="bg-gray-900 p-6 border border-white/20">
            <h2 className="text-xl font-semibold text-white mb-4">Subscription</h2>
            {subscription?.status === "ACTIVE" ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Status</p>
                    <p className="text-lg font-semibold text-green-400 mt-1">Active</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-400">Plan</p>
                    <p className="text-lg font-semibold text-white mt-1">Basic — $1.99/month</p>
                  </div>
                </div>
                <p className="text-sm text-gray-500">
                  Your subscription is active. You have full access to matchmaking and rooms.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-400">Status</p>
                  <p className="text-lg font-semibold text-gray-400 mt-1">Inactive</p>
                </div>
                <p className="text-sm text-gray-500">
                  A subscription is required to play and join rooms.
                </p>
                <button
                  onClick={handleUnlockAccess}
                  className="bg-white px-4 py-2 font-semibold text-black hover:bg-gray-200 border-2 border-white"
                >
                  Subscribe — $1.99/month
                </button>
              </div>
            )}
          </div>

          {/* Profile Info Section */}
          <div className="bg-gray-900 p-6 border border-white/20">
            <h2 className="text-xl font-semibold text-white mb-4">Profile Information</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm text-gray-400">Email</p>
                <p className="text-white mt-1">{user?.email || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Display Name</p>
                <p className="text-white mt-1">{user?.displayName || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Username</p>
                <p className="text-white mt-1">{user?.username || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Level</p>
                <p className="text-white mt-1">{user?.level || 1}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">XP</p>
                <p className="text-white mt-1">{formatNumber(user?.xp || 0)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Token Balance</p>
                <p className="text-white mt-1">{formatNumber(user?.wallet?.balanceTokens || 0)} tokens</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">18+ Verified</p>
                <p className={`mt-1 ${user?.is18PlusVerified ? "text-green-400" : "text-red-400"}`}>
                  {user?.is18PlusVerified ? "✓ Verified" : "✗ Not Verified"}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-400">KYC Status</p>
                <p className="mt-1 text-white">{user?.kycStatus || "PENDING"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Account Status</p>
                <p className={`mt-1 ${user?.isBanned ? "text-red-400" : "text-green-400"}`}>
                  {user?.isBanned ? "Banned" : "Active"}
                </p>
              </div>
            </div>
          </div>

          {/* Edit Settings Form */}
          <form onSubmit={handleSubmit} className="space-y-4 bg-gray-900 p-6 border border-white/20">
            <h2 className="text-xl font-semibold text-white mb-4">Edit Profile</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm text-gray-300" htmlFor="displayName">
              Display name
            </label>
            <input
              id="displayName"
              type="text"
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
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-black px-3 py-2 text-white border border-white/30 focus:outline-none focus:border-2 focus:border-white"
            />
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm text-slate-200" htmlFor="language">
              Language
            </label>
            <select
              id="language"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full bg-black px-3 py-2 text-white border border-white/30 focus:outline-none focus:border-2 focus:border-white"
            >
              <option value="en">English (US)</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm text-slate-200" htmlFor="region">
              Region
            </label>
            <select
              id="region"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="w-full bg-black px-3 py-2 text-white border border-white/30 focus:outline-none focus:border-2 focus:border-white"
            >
              <option value="US">United States</option>
            </select>
          </div>
        </div>
        <div className="bg-gray-800 p-4 border border-white/20">
          <p className="text-sm text-gray-300">Age verification</p>
          <p className="text-sm text-gray-500">
            Required for access to matchmaking and rooms. We will integrate Persona for US users.
          </p>
        </div>
        {saved && (
          <div className="bg-gray-800 border border-gray-600 p-3 text-sm text-gray-200">
            Settings saved! (Note: Update endpoint not implemented in backend yet)
          </div>
        )}
        <button
          type="submit"
          disabled={loading}
          className="bg-white px-4 py-2 font-semibold text-black hover:bg-gray-200 border-2 border-white disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Saving..." : "Save changes"}
        </button>
      </form>
        </>
      )}
    </main>
  );
}


