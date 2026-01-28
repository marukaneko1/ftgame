"use client";

import { useEffect, useState } from "react";
import { walletApi } from "@/lib/api";
import { formatNumber } from "@/lib/utils";
import BackButton from "@/components/BackButton";

export default function WalletPage() {
  const [wallet, setWallet] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWallet();
  }, []);

  const loadWallet = async () => {
    try {
      const data = await walletApi.getMyWallet();
      setWallet(data);
    } catch (err) {
      console.error("Failed to load wallet:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleBuyTokenPack = async () => {
    try {
      const { checkoutUrl } = await walletApi.createTokenPackCheckout("medium");
      window.location.href = checkoutUrl;
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to create checkout session");
    }
  };

  return (
    <main className="space-y-4">
      <BackButton href="/dashboard" />
      <div className="flex flex-col gap-2">
        <p className="text-sm uppercase tracking-[0.25em] text-gray-400">Wallet</p>
        <h1 className="text-3xl font-semibold text-white">Tokens</h1>
        <p className="text-sm text-gray-400">
          Tokens are for gifts and friendly wagers only. They cannot be withdrawn or converted to cash.
        </p>
      </div>
      <div className="bg-gray-900 p-4 border border-white/20">
        <p className="text-sm text-gray-400">Current balance</p>
        <p className="text-4xl font-bold text-white">{formatNumber(wallet?.balanceTokens)}</p>
        <button
          onClick={handleBuyTokenPack}
          className="mt-4 bg-white px-4 py-2 font-semibold text-black hover:bg-gray-200 border-2 border-white"
        >
          Buy token pack
        </button>
      </div>
      <div className="bg-gray-900 p-4 border border-white/20">
        <p className="text-sm text-gray-400">Recent transactions</p>
        {wallet?.transactions && wallet.transactions.length > 0 ? (
          <div className="mt-4 space-y-2">
            {wallet.transactions.map((tx: any) => (
              <div key={tx.id} className="flex justify-between text-sm text-gray-300 border-b border-white/10 pb-2">
                <span>{tx.type}</span>
                <span>{tx.amountTokens > 0 ? "+" : ""}{formatNumber(tx.amountTokens)} tokens</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm text-gray-500">No transactions yet.</p>
        )}
      </div>
    </main>
  );
}


