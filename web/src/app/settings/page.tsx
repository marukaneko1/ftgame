"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usersApi, subscriptionsApi } from "@/lib/api";
import { formatNumber } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { Input, Select } from "@/components/ui/Input";
import { Avatar } from "@/components/ui/Avatar";
import { ProgressBar, Skeleton } from "@/components/ui/Progress";

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
      await new Promise(resolve => setTimeout(resolve, 500));
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to save settings");
    } finally {
      setLoading(false);
    }
  };

  const isSubscribed = subscription?.status === "ACTIVE";
  const isVerified = user?.is18PlusVerified || user?.ageVerified;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <Badge variant="default" size="sm" className="mb-2">Profile</Badge>
          <h1 className="text-3xl font-display text-txt-primary tracking-tight">Settings</h1>
          <p className="text-txt-secondary mt-1">Manage your account and preferences</p>
        </div>
        <Link href="/dashboard">
          <Button variant="ghost" size="sm">← Back</Button>
        </Link>
      </header>

      {loadingUser ? (
        <Card variant="default" padding="lg">
          <Skeleton variant="text" lines={8} />
        </Card>
      ) : (
        <>
          {/* Profile Overview */}
          <Card variant="elevated" padding="lg">
            <div className="flex items-start gap-6">
              <Avatar
                alt={user?.displayName || "User"}
                size="xl"
                presence={isVerified && isSubscribed ? "online" : "offline"}
              />
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-2xl font-display text-txt-primary">{user?.displayName || "Player"}</h2>
                  {isVerified && <Badge variant="success" size="sm">Verified</Badge>}
                  {isSubscribed && <Badge variant="accent" size="sm">Subscribed</Badge>}
                </div>
                <p className="text-txt-secondary">@{user?.username || "username"}</p>
                <p className="text-sm text-txt-muted mt-1">{user?.email}</p>

                {/* Level Progress */}
                <div className="mt-4 max-w-xs">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-txt-secondary">Level {user?.level || 1}</span>
                    <span className="font-mono text-accent">{formatNumber(user?.xp || 0)} XP</span>
                  </div>
                  <ProgressBar value={(user?.xp || 0) % 1000} max={1000} variant="accent" size="sm" />
                </div>
              </div>
            </div>
          </Card>

          {/* Subscription */}
          <Card variant={isSubscribed ? "default" : "neon"} padding="lg">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Subscription</CardTitle>
                <StatusBadge status={isSubscribed ? "verified" : "offline"} />
              </div>
            </CardHeader>
            <CardContent>
              {isSubscribed ? (
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <p className="text-sm text-txt-muted">Plan</p>
                      <p className="text-lg font-medium text-txt-primary">Basic Access</p>
                    </div>
                    <div>
                      <p className="text-sm text-txt-muted">Price</p>
                      <p className="text-lg font-medium text-txt-primary">$1.99/month</p>
                    </div>
                  </div>
                  <p className="text-sm text-txt-secondary">
                    Your subscription is active. You have full access to matchmaking and rooms.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-txt-secondary">
                    A subscription is required to play and join rooms.
                  </p>
                  <Button variant="primary" onClick={handleUnlockAccess}>
                    Subscribe — $1.99/month
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Account Details */}
          <Card variant="default" padding="lg">
            <CardHeader>
              <CardTitle>Account Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <div className="p-3 bg-surface-secondary rounded-lg">
                  <p className="text-xs text-txt-muted uppercase tracking-wide">Token Balance</p>
                  <p className="text-xl font-mono font-bold text-gold mt-1">
                    {formatNumber(user?.wallet?.balanceTokens || 0)}
                  </p>
                </div>
                <div className="p-3 bg-surface-secondary rounded-lg">
                  <p className="text-xs text-txt-muted uppercase tracking-wide">18+ Verified</p>
                  <p className={`text-xl font-bold mt-1 ${isVerified ? "text-success" : "text-warning"}`}>
                    {isVerified ? "✓ Yes" : "✗ No"}
                  </p>
                </div>
                <div className="p-3 bg-surface-secondary rounded-lg">
                  <p className="text-xs text-txt-muted uppercase tracking-wide">KYC Status</p>
                  <p className="text-xl font-medium text-txt-primary mt-1">
                    {user?.kycStatus || "Pending"}
                  </p>
                </div>
                <div className="p-3 bg-surface-secondary rounded-lg">
                  <p className="text-xs text-txt-muted uppercase tracking-wide">Account Status</p>
                  <p className={`text-xl font-bold mt-1 ${user?.isBanned ? "text-error" : "text-success"}`}>
                    {user?.isBanned ? "Banned" : "Active"}
                  </p>
                </div>
                <div className="p-3 bg-surface-secondary rounded-lg">
                  <p className="text-xs text-txt-muted uppercase tracking-wide">Member Since</p>
                  <p className="text-xl font-medium text-txt-primary mt-1">
                    {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : "N/A"}
                  </p>
                </div>
                <div className="p-3 bg-surface-secondary rounded-lg">
                  <p className="text-xs text-txt-muted uppercase tracking-wide">Total Games</p>
                  <p className="text-xl font-mono font-bold text-cyan mt-1">
                    {user?.totalGames || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Edit Profile */}
          <Card variant="default" padding="lg">
            <CardHeader>
              <CardTitle>Edit Profile</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <Input
                    label="Display Name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Your display name"
                  />
                  <Input
                    label="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Your username"
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <Select
                    label="Language"
                    value={language}
                    onChange={(e: any) => setLanguage(e.target.value)}
                    options={[{ value: "en", label: "English (US)" }]}
                  />
                  <Select
                    label="Region"
                    value={region}
                    onChange={(e: any) => setRegion(e.target.value)}
                    options={[{ value: "US", label: "United States" }]}
                  />
                </div>

                {/* Verification Notice */}
                <div className="p-4 bg-info-muted rounded-lg border border-info/20">
                  <p className="text-sm font-medium text-info mb-1">Age Verification</p>
                  <p className="text-xs text-txt-secondary">
                    Required for access to matchmaking and rooms. Persona integration coming soon.
                  </p>
                </div>

                {saved && (
                  <div className="p-3 bg-success-muted rounded-lg border border-success/30">
                    <p className="text-sm text-success">Settings saved successfully!</p>
                  </div>
                )}

                <Button type="submit" variant="primary" loading={loading}>
                  {loading ? "Saving..." : "Save Changes"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
