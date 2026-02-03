"use client";

import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

interface RoomPageProps {
  params: { id: string };
}

export default function RoomPage({ params }: RoomPageProps) {
  const handleJoinRoom = () => {
    alert("Room joining functionality coming soon. This will connect you to the video room via WebSocket.");
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <Card variant="elevated" padding="lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <Badge variant="default" size="sm" className="mb-2">Room Preview</Badge>
            <h1 className="text-3xl font-display text-txt-primary tracking-tight">
              Room {params.id}
            </h1>
            <p className="text-txt-secondary mt-2">
              US-only, 18+ verified, subscription required. Moderation and reporting are enforced.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/rooms">
              <Button variant="ghost" size="sm">← Back</Button>
            </Link>
            <Button variant="primary" onClick={handleJoinRoom}>
              Join Room
            </Button>
          </div>
        </div>
      </Card>

      {/* Content Grid */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Main Area */}
        <Card variant="default" padding="lg" className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-xl">📹</span> Video & Chat
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="aspect-video bg-surface-secondary rounded-lg flex items-center justify-center border border-border-subtle">
              <div className="text-center p-6">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-surface-tertiary flex items-center justify-center">
                  <svg className="w-8 h-8 text-txt-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-txt-secondary font-medium">Video & Chat Area</p>
                <p className="text-txt-muted text-sm mt-1">Join the room to start video chatting</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Participants */}
          <Card variant="default" padding="md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <span>👥</span> Participants
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-32 flex items-center justify-center">
                <p className="text-txt-muted text-sm text-center">
                  Join room to see participants
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Controls */}
          <Card variant="glass" padding="md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <span>⚙️</span> Controls
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-24 flex items-center justify-center">
                <p className="text-txt-muted text-sm text-center">
                  Gifts & moderation controls
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}


