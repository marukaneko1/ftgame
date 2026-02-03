"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { subscriptionsApi, walletApi, usersApi } from "@/lib/api";
import { formatNumber } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { ProgressBar, Skeleton } from "@/components/ui/Progress";

export default function DashboardPage() {
  const router = useRouter();
  const [subscription, setSubscription] = useState<any>(null);
  const [wallet, setWallet] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [sub, walletData, userData] = await Promise.all([
        subscriptionsApi.getMySubscription(),
        walletApi.getMyWallet(),
        usersApi.getMe()
      ]);
      setSubscription(sub);
      setWallet(walletData);
      setUser(userData);
      if (userData.subscription) setSubscription(userData.subscription);
      if (userData.wallet) setWallet(userData.wallet);
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

  const isSubscribed = subscription?.status === "ACTIVE";
  const isVerified = user?.ageVerified;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Badge variant="accent" size="sm" className="mb-2">Member Dashboard</Badge>
          <h1 className="text-3xl md:text-4xl font-display text-txt-primary tracking-tight">
            Welcome back{user?.displayName ? `, ${user.displayName}` : ""}
          </h1>
          <p className="text-txt-secondary mt-2">
            {isSubscribed && isVerified 
              ? "You're all set to shuffle and play!" 
              : "Complete your setup to start matching."}
          </p>
        </div>
        <Link href="/settings">
          <Button variant="secondary" size="md">
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Settings
          </Button>
        </Link>
      </header>

      {/* Quick Actions - Primary Game Tiles */}
      <section className="grid gap-4 md:grid-cols-2">
        {/* Shuffle Live Tile */}
        <Link href="/play" className="group">
          <Card
            variant="neon"
            padding="none"
            className="relative overflow-hidden h-full min-h-[200px] transition-all duration-normal hover:shadow-[0_0_40px_var(--color-accent-primary-glow)]"
          >
            {/* Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-accent/10 to-transparent" />
            <div
              className="absolute inset-0 opacity-5"
              style={{
                backgroundImage: `radial-gradient(circle at 2px 2px, var(--color-accent-primary) 1px, transparent 0)`,
                backgroundSize: "24px 24px",
              }}
            />

            <div className="relative p-6 h-full flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <div className="w-14 h-14 rounded-xl bg-accent/20 flex items-center justify-center text-3xl">
                  🎲
                </div>
                <StatusBadge status="live" />
              </div>
              <div className="mt-4">
                <h2 className="text-2xl font-display text-txt-primary">Shuffle Live</h2>
                <p className="text-txt-secondary mt-1">Random 1:1 video matching</p>
              </div>
              <div className="mt-4 flex items-center gap-2 text-accent group-hover:text-accent-hover transition-colors">
                <span className="font-medium">Start Matching</span>
                <svg className="w-5 h-5 transform group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </div>
            </div>
          </Card>
        </Link>

        {/* Game Lobby Tile */}
        <Link href="/lobby" className="group">
          <Card
            variant="elevated"
            padding="none"
            className="relative overflow-hidden h-full min-h-[200px] transition-all duration-normal hover:border-cyan/50 hover:shadow-glow-cyan"
          >
            {/* Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-cyan/5 to-transparent" />

            <div className="relative p-6 h-full flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <div className="w-14 h-14 rounded-xl bg-cyan/20 flex items-center justify-center text-3xl">
                  🎮
                </div>
                <Badge variant="info">Public</Badge>
              </div>
              <div className="mt-4">
                <h2 className="text-2xl font-display text-txt-primary">Game Lobby</h2>
                <p className="text-txt-secondary mt-1">Join rooms or host game nights</p>
              </div>
              <div className="mt-4 flex items-center gap-2 text-cyan group-hover:text-cyan-hover transition-colors">
                <span className="font-medium">Browse Rooms</span>
                <svg className="w-5 h-5 transform group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </Card>
        </Link>
      </section>

      {/* Status Cards */}
      <section className="grid gap-4 md:grid-cols-3">
        {/* Subscription Card */}
        {!isSubscribed && (
          <Card variant="default" padding="lg">
            <CardHeader className="mb-0">
              <div className="flex items-center justify-between">
                <CardTitle>Subscription</CardTitle>
                <Badge variant="warning">Required</Badge>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton variant="text" lines={3} />
              ) : (
                <>
                  <p className="text-3xl font-display font-bold text-txt-primary mt-4">$1.99</p>
                  <p className="text-sm text-txt-muted mt-1">Basic Access - Monthly</p>
                  <p className="text-sm text-txt-secondary mt-3">Required to play and join rooms.</p>
                  <Button
                    variant="primary"
                    size="md"
                    fullWidth
                    className="mt-4"
                    onClick={handleUnlockAccess}
                  >
                    Unlock Access
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Wallet Card */}
        <Card variant="default" padding="lg" className={isSubscribed ? "md:col-span-1" : ""}>
          <CardHeader className="mb-0">
            <div className="flex items-center justify-between">
              <CardTitle>Wallet</CardTitle>
              <span className="text-2xl">💰</span>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton variant="text" lines={3} />
            ) : (
              <>
                <p className="text-3xl font-display font-bold text-gold mt-4">
                  {formatNumber(wallet?.balanceTokens || 0)}
                </p>
                <p className="text-sm text-txt-muted mt-1">tokens</p>
                <p className="text-sm text-txt-secondary mt-3">For gifts and wagers. No cash-out.</p>
                <Button
                  variant="secondary"
                  size="md"
                  fullWidth
                  className="mt-4"
                  onClick={handleBuyTokens}
                >
                  Buy Tokens
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Verification Card */}
        <Card variant="default" padding="lg" className={isSubscribed ? "md:col-span-1" : ""}>
          <CardHeader className="mb-0">
            <div className="flex items-center justify-between">
              <CardTitle>Verification</CardTitle>
              {isVerified ? (
                <Badge variant="success">Verified</Badge>
              ) : (
                <Badge variant="warning">Required</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton variant="text" lines={3} />
            ) : (
              <>
                <p className="text-lg font-medium text-txt-primary mt-4">
                  {isVerified ? "18+ Verified ✓" : "18+ Required"}
                </p>
                <p className="text-sm text-txt-secondary mt-3">
                  {isVerified 
                    ? "Your age has been verified. You can now match and join rooms."
                    : "Complete age verification to start matching."}
                </p>
                {!isVerified && (
                  <Button
                    variant="secondary"
                    size="md"
                    fullWidth
                    className="mt-4"
                    onClick={handleStartVerification}
                  >
                    Start Verification
                  </Button>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Account Status - Only show if subscribed */}
        {isSubscribed && (
          <Card variant="default" padding="lg">
            <CardHeader className="mb-0">
              <div className="flex items-center justify-between">
                <CardTitle>Account</CardTitle>
                <StatusBadge status={isVerified ? "verified" : "offline"} />
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton variant="text" lines={3} />
              ) : (
                <>
                  <div className="mt-4 space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-txt-secondary">Subscription</span>
                      <span className="text-success font-medium">Active</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-txt-secondary">Verification</span>
                      <span className={`font-medium ${isVerified ? "text-success" : "text-warning"}`}>
                        {isVerified ? "Verified" : "Pending"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-txt-secondary">Status</span>
                      <span className="text-success font-medium">Ready to Play</span>
                    </div>
                  </div>
                  <ProgressBar
                    value={isVerified && isSubscribed ? 100 : isSubscribed ? 50 : 0}
                    variant="accent"
                    size="sm"
                    className="mt-4"
                  />
                  <p className="text-xs text-txt-muted mt-2">
                    {isVerified && isSubscribed 
                      ? "Setup complete!" 
                      : `${isSubscribed ? 1 : 0}/2 steps completed`}
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        )}
      </section>

      {/* Available Games */}
      <section>
        <h2 className="text-xl font-display text-txt-primary mb-4">Available Games</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {[
            { icon: "♟️", name: "Chess" },
            { icon: "❓", name: "Trivia" },
            { icon: "⭕", name: "Tic-Tac-Toe" },
            { icon: "🎱", name: "Billiards" },
            { icon: "🃏", name: "Poker" },
            { icon: "🤔", name: "21 Questions" },
            { icon: "🎭", name: "Truth & Lie" },
          ].map((game) => (
            <Card key={game.name} variant="default" padding="md" className="text-center hover:border-accent/30 transition-colors cursor-pointer">
              <span className="text-3xl block mb-2">{game.icon}</span>
              <span className="text-sm text-txt-secondary">{game.name}</span>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
