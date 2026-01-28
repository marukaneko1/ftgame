"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { subscriptionsApi, walletApi, usersApi } from "@/lib/api";
import { formatNumber } from "@/lib/utils";

export default function DashboardPage() {
  const router = useRouter();
  const [subscription, setSubscription] = useState<any>(null);
  const [wallet, setWallet] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [sub, walletData, user] = await Promise.all([
        subscriptionsApi.getMySubscription(),
        walletApi.getMyWallet(),
        usersApi.getMe()
      ]);
      setSubscription(sub);
      setWallet(walletData);
      if (user.subscription) setSubscription(user.subscription);
      if (user.wallet) setWallet(user.wallet);
    } catch (err) {
      console.error("Failed to load data:", err);
    } finally {
      setLoading(false);
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

  const handleBuyTokens = () => {
    router.push("/wallet");
  };

  const handleStartVerification = () => {
    alert("Persona verification integration coming soon. For now, admins can manually verify accounts.");
  };

  return (
    <main className="space-y-6">
      <header className="flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <p className="text-sm uppercase tracking-[0.25em] text-gray-400">Member dashboard</p>
          <h1 className="text-3xl font-semibold text-white">Access & wallet</h1>
          <p className="text-sm text-gray-400">
            Active subscription and 18+ verification are required for matchmaking and rooms.
          </p>
        </div>
        <Link
          href="/settings"
          className="bg-gray-800 px-4 py-2 text-white border border-white/30 hover:bg-gray-700"
        >
          Settings
        </Link>
      </header>

      <section className={`grid gap-4 ${subscription?.status === "ACTIVE" ? "md:grid-cols-2" : "md:grid-cols-3"}`}>
        {subscription?.status !== "ACTIVE" && (
          <div className="bg-gray-900 p-4 border border-white/20">
            <p className="text-sm text-gray-400">Subscription</p>
            <p className="mt-2 text-lg font-semibold text-white">Basic access — $1.99</p>
            <p className="text-sm text-gray-500">Required to play and join rooms.</p>
            <button
              onClick={handleUnlockAccess}
              className="mt-4 w-full bg-white px-4 py-2 text-black hover:bg-gray-200 border-2 border-white"
            >
              Unlock access
            </button>
          </div>
        )}

        <div className="bg-gray-900 p-4 border border-white/20">
          <p className="text-sm text-gray-400">Wallet</p>
          <p className="mt-2 text-3xl font-bold text-white">{formatNumber(wallet?.balanceTokens)} tokens</p>
          <p className="text-sm text-gray-500">Tokens are for gifts and wagers; no cash-out.</p>
          <button
            onClick={handleBuyTokens}
            className="mt-4 w-full bg-gray-800 px-4 py-2 text-white border-2 border-white/30 hover:bg-gray-700"
          >
            Buy tokens
          </button>
        </div>

        <div className="bg-gray-900 p-4 border border-white/20">
          <p className="text-sm text-gray-400">Verification</p>
          <p className="mt-2 text-lg font-semibold text-white">18+ required</p>
          <p className="text-sm text-gray-500">Complete age verification to start matching.</p>
          <button
            onClick={handleStartVerification}
            className="mt-4 w-full bg-gray-800 px-4 py-2 text-white border-2 border-white/30 hover:bg-gray-700"
          >
            Start verification
          </button>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Link
          className="bg-white px-4 py-6 text-black border-2 border-white hover:bg-gray-200"
          href="/play"
        >
          Play 1:1 now
        </Link>
        <Link
          className="bg-gray-900 px-4 py-6 text-white border-2 border-white/30 hover:bg-gray-800"
          href="/lobby"
        >
          🎮 Game Night Lobby
        </Link>
      </section>
    </main>
  );
}


