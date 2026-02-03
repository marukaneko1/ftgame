"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { walletApi } from "@/lib/api";
import { formatNumber } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Progress";

// 100 tokens = $1
const TOKEN_PACKS = [
  { id: "small", tokens: 100, price: "$1", popular: false },
  { id: "medium", tokens: 500, price: "$5", popular: true },
  { id: "large", tokens: 1000, price: "$10", popular: false },
  { id: "mega", tokens: 2000, price: "$20", popular: false },
];

export default function WalletPage() {
  const [wallet, setWallet] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);

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

  const handleBuyTokenPack = async (packId: string) => {
    try {
      setPurchasing(packId);
      const { checkoutUrl } = await walletApi.createTokenPackCheckout(packId);
      window.location.href = checkoutUrl;
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to create checkout session");
    } finally {
      setPurchasing(null);
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type.toLowerCase()) {
      case "purchase":
        return "text-success";
      case "gift_sent":
        return "text-error";
      case "gift_received":
        return "text-success";
      case "wager_win":
        return "text-gold";
      case "wager_loss":
        return "text-error";
      default:
        return "text-txt-secondary";
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <Badge variant="gold" size="sm" className="mb-2">Token Shop</Badge>
          <h1 className="text-3xl font-display text-txt-primary tracking-tight">Wallet</h1>
          <p className="text-txt-secondary mt-1">
            Tokens are for gifts and wagers only. No cash-out.
          </p>
        </div>
        <Link href="/dashboard">
          <Button variant="ghost" size="sm">← Back</Button>
        </Link>
      </header>

      {/* Balance Card */}
      <Card variant="neon" padding="lg" className="relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-32 h-32 text-8xl opacity-10">💰</div>
        
        <div className="relative">
          <p className="text-sm text-txt-secondary">Current Balance</p>
          {loading ? (
            <Skeleton width="200px" height="48px" className="mt-2" />
          ) : (
            <p className="text-5xl font-display font-bold text-gold mt-2">
              {formatNumber(wallet?.balanceTokens || 0)}
            </p>
          )}
          <p className="text-sm text-txt-muted mt-1">tokens</p>
        </div>
      </Card>

      {/* Token Packs */}
      <section>
        <h2 className="text-xl font-display text-txt-primary mb-4">Buy Tokens</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {TOKEN_PACKS.map((pack) => (
            <Card
              key={pack.id}
              variant={pack.popular ? "neon" : "elevated"}
              padding="lg"
              className={`relative text-center transition-all duration-fast ${pack.popular ? "scale-105" : "hover:scale-102"}`}
            >
              {pack.popular && (
                <Badge variant="gold" size="sm" className="absolute -top-2 left-1/2 -translate-x-1/2">
                  Most Popular
                </Badge>
              )}
              <div className="text-4xl mb-3">💎</div>
              <p className="text-3xl font-display font-bold text-txt-primary">
                {pack.tokens.toLocaleString()}
              </p>
              <p className="text-sm text-txt-muted mb-4">tokens</p>
              <Button
                variant={pack.popular ? "primary" : "secondary"}
                fullWidth
                onClick={() => handleBuyTokenPack(pack.id)}
                loading={purchasing === pack.id}
              >
                {pack.price}
              </Button>
            </Card>
          ))}
        </div>
        <p className="text-xs text-txt-muted mt-4 text-center">
          Tokens are for entertainment purposes only and have no cash value. By purchasing, you agree to our Terms of Service.
        </p>
      </section>

      {/* Transaction History */}
      <section>
        <Card variant="default" padding="lg">
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton variant="text" lines={5} />
            ) : wallet?.transactions && wallet.transactions.length > 0 ? (
              <div className="space-y-3">
                {wallet.transactions.slice(0, 10).map((tx: any) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between py-2 border-b border-border-subtle last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-surface-secondary flex items-center justify-center text-lg">
                        {tx.type === "PURCHASE" ? "💳" : 
                         tx.type === "GIFT_SENT" ? "🎁" :
                         tx.type === "GIFT_RECEIVED" ? "🎁" :
                         tx.type === "WAGER_WIN" ? "🏆" :
                         tx.type === "WAGER_LOSS" ? "😢" : "💰"}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-txt-primary">{tx.type.replace(/_/g, " ")}</p>
                        <p className="text-xs text-txt-muted">
                          {new Date(tx.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <p className={`text-lg font-mono font-semibold ${getTransactionColor(tx.type)}`}>
                      {tx.amountTokens > 0 ? "+" : ""}{formatNumber(tx.amountTokens)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-surface-secondary flex items-center justify-center text-3xl">
                  📜
                </div>
                <p className="text-txt-secondary">No transactions yet</p>
                <p className="text-sm text-txt-muted mt-1">
                  Your transaction history will appear here
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
