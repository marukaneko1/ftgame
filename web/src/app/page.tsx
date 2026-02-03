import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export default function LandingPage() {
  return (
    <div className="space-y-12 py-8 animate-fade-in">
      {/* Hero Section */}
      <section className="relative">
        {/* Hero Content */}
        <div className="max-w-4xl">
          {/* Beta Badge */}
          <Badge variant="accent" size="md" className="mb-6">
            US-Only Beta
          </Badge>

          {/* Main Headline */}
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-display text-txt-primary tracking-tight leading-tight">
            Video chat with{" "}
            <span className="text-gradient">verified adults</span>
            <br />
            and play games together.
          </h1>

          {/* Subheadline */}
          <p className="mt-6 text-lg md:text-xl text-txt-secondary max-w-2xl leading-relaxed">
            Match with 18+ verified players across the United States. Play chess, trivia, poker, and more while video chatting. Win tokens for gifts and wagers.
          </p>

          {/* CTA Buttons */}
          <div className="mt-8 flex flex-wrap gap-4">
            <Link href="/auth/register">
              <Button variant="primary" size="lg">
                Get Started Free
              </Button>
            </Link>
            <Link href="/auth/login">
              <Button variant="secondary" size="lg">
                Log In
              </Button>
            </Link>
          </div>

          {/* Trust Indicators */}
          <div className="mt-8 flex flex-wrap items-center gap-6 text-sm text-txt-muted">
            <div className="flex items-center gap-2">
              <span className="text-success">✓</span>
              <span>18+ ID Verification</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-success">✓</span>
              <span>US Residents Only</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-success">✓</span>
              <span>Moderated & Safe</span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Feature Tiles */}
      <section className="grid gap-4 md:gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Shuffle Live - Primary Tile */}
        <Link href="/auth/register" className="md:col-span-2 lg:col-span-2 group">
          <Card
            variant="neon"
            padding="none"
            className="relative overflow-hidden h-full min-h-[280px] transition-all duration-normal hover:shadow-[0_0_40px_var(--color-accent-primary-glow)]"
          >
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute inset-0 bg-gradient-to-br from-accent via-transparent to-cyan" />
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage: `radial-gradient(circle at 2px 2px, var(--color-accent-primary) 1px, transparent 0)`,
                  backgroundSize: "32px 32px",
                }}
              />
            </div>

            {/* Content */}
            <div className="relative p-6 md:p-8 h-full flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center text-2xl">
                    🎲
                  </div>
                  <Badge variant="success" dot pulse>Live</Badge>
                </div>
                <h2 className="text-2xl md:text-3xl font-display text-txt-primary mb-2">
                  Shuffle Live
                </h2>
                <p className="text-txt-secondary max-w-md">
                  Random 1:1 video matching with verified players. Start a conversation, play games, send gifts.
                </p>
              </div>
              <div className="mt-6 flex items-center gap-2 text-accent group-hover:text-accent-hover transition-colors">
                <span className="font-medium">Start Matching</span>
                <svg className="w-5 h-5 transform group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </div>
            </div>
          </Card>
        </Link>

        {/* Arcade Tile */}
        <Link href="/auth/register" className="group">
          <Card
            variant="elevated"
            padding="none"
            className="relative overflow-hidden h-full min-h-[280px] transition-all duration-normal hover:border-cyan/50 hover:shadow-glow-cyan"
          >
            {/* Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-cyan/5 to-transparent" />

            {/* Content */}
            <div className="relative p-6 h-full flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-cyan/20 flex items-center justify-center text-2xl mb-4">
                  🎮
                </div>
                <h2 className="text-xl font-display text-txt-primary mb-2">
                  Game Arcade
                </h2>
                <p className="text-sm text-txt-secondary">
                  Chess, Trivia, Tic-Tac-Toe, Poker, Billiards, 21 Questions, and more games during video calls.
                </p>
              </div>
              <div className="mt-4 flex items-center gap-2 text-cyan group-hover:text-cyan-hover transition-colors">
                <span className="text-sm font-medium">View Games</span>
                <svg className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </Card>
        </Link>
      </section>

      {/* Secondary Feature Tiles */}
      <section className="grid gap-4 md:grid-cols-3">
        {/* Lobby Tile */}
        <Link href="/auth/register" className="group">
          <Card variant="default" padding="lg" hover className="h-full">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">🏠</span>
              <h3 className="text-lg font-display text-txt-primary">Public Lobby</h3>
            </div>
            <p className="text-sm text-txt-secondary">
              Join or create public rooms. Host game nights with friends or meet new players.
            </p>
          </Card>
        </Link>

        {/* Token Shop Tile */}
        <Link href="/auth/register" className="group">
          <Card variant="default" padding="lg" hover className="h-full">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">💰</span>
              <h3 className="text-lg font-display text-txt-primary">Token Shop</h3>
            </div>
            <p className="text-sm text-txt-secondary">
              Buy tokens for gifts and wagers. No cash-out — entertainment only.
            </p>
          </Card>
        </Link>

        {/* Safety Tile */}
        <Link href="/auth/register" className="group">
          <Card variant="default" padding="lg" hover className="h-full">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">🛡️</span>
              <h3 className="text-lg font-display text-txt-primary">Safe & Moderated</h3>
            </div>
            <p className="text-sm text-txt-secondary">
              Report users, instant block, and 24/7 moderation to keep the platform safe.
            </p>
          </Card>
        </Link>
      </section>

      {/* Social Proof / Stats */}
      <section className="py-8">
        <Card variant="glass" padding="lg">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div>
              <p className="text-3xl font-display font-bold text-txt-primary">1K+</p>
              <p className="text-sm text-txt-muted mt-1">Active Players</p>
            </div>
            <div>
              <p className="text-3xl font-display font-bold text-txt-primary">7</p>
              <p className="text-sm text-txt-muted mt-1">Built-in Games</p>
            </div>
            <div>
              <p className="text-3xl font-display font-bold text-gold">100K+</p>
              <p className="text-sm text-txt-muted mt-1">Tokens Gifted</p>
            </div>
            <div>
              <p className="text-3xl font-display font-bold text-success">99.9%</p>
              <p className="text-sm text-txt-muted mt-1">Uptime</p>
            </div>
          </div>
        </Card>
      </section>

      {/* Features List */}
      <section className="grid md:grid-cols-2 gap-8">
        <div>
          <h2 className="text-2xl font-display text-txt-primary mb-6">What makes us different</h2>
          <ul className="space-y-4">
            {[
              { icon: "🔐", title: "18+ ID Verification", desc: "Every user is verified using government ID. No minors, no fakes." },
              { icon: "🇺🇸", title: "US-Only Community", desc: "Connect with verified US residents in your timezone." },
              { icon: "🎯", title: "Built-in Games", desc: "Play Chess, Trivia, Poker, Billiards, and more during video calls." },
              { icon: "🎁", title: "Token Gifts", desc: "Send gifts to players you enjoy chatting with. No gambling, just fun." },
            ].map((item) => (
              <li key={item.title} className="flex gap-4">
                <span className="text-2xl flex-shrink-0">{item.icon}</span>
                <div>
                  <h4 className="font-medium text-txt-primary">{item.title}</h4>
                  <p className="text-sm text-txt-secondary mt-0.5">{item.desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="text-2xl font-display text-txt-primary mb-6">How it works</h2>
          <ol className="space-y-4">
            {[
              { step: "1", title: "Create Account", desc: "Sign up with email and complete 18+ ID verification." },
              { step: "2", title: "Get Verified", desc: "Quick ID check to confirm you're 18+ and a US resident." },
              { step: "3", title: "Start Matching", desc: "Hit shuffle to get matched with another verified player." },
              { step: "4", title: "Play & Chat", desc: "Video chat, play games, send gifts, and have fun!" },
            ].map((item) => (
              <li key={item.step} className="flex gap-4">
                <span className="w-8 h-8 rounded-full bg-accent/20 text-accent font-bold flex items-center justify-center flex-shrink-0">
                  {item.step}
                </span>
                <div>
                  <h4 className="font-medium text-txt-primary">{item.title}</h4>
                  <p className="text-sm text-txt-secondary mt-0.5">{item.desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Final CTA */}
      <section className="text-center py-12">
        <Card variant="neon" padding="lg" className="max-w-2xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-display text-txt-primary mb-4">
            Ready to play?
          </h2>
          <p className="text-txt-secondary mb-6">
            Join thousands of verified players. Create your free account in 2 minutes.
          </p>
          <Link href="/auth/register">
            <Button variant="primary" size="lg">
              Create Free Account
            </Button>
          </Link>
        </Card>
      </section>
    </div>
  );
}
