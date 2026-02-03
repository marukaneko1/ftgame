import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

const rooms = [
  { id: "global", title: "Global Lobby", viewers: 0, host: "TBD", status: "live" },
  { id: "games", title: "Game Night", viewers: 0, host: "TBD", status: "live" }
];

export default function RoomsPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <Card variant="elevated" padding="lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <Badge variant="info" size="sm" className="mb-2">Public Rooms</Badge>
            <h1 className="text-3xl font-display text-txt-primary tracking-tight">
              Join a Live Room
            </h1>
            <p className="text-txt-secondary mt-2">
              US-only. Active subscription, 18+ verification, and a clean account are required to join.
            </p>
          </div>
          <Link href="/dashboard">
            <Button variant="ghost" size="sm">← Back to Dashboard</Button>
          </Link>
        </div>
      </Card>

      {/* Rooms Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {rooms.map((room) => (
          <Link key={room.id} href={`/rooms/${room.id}`}>
            <Card 
              variant="default" 
              padding="lg" 
              hover
              className="h-full transition-all duration-fast"
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-xl font-display text-txt-primary">{room.title}</h3>
                <Badge variant="success" dot pulse size="sm">Live</Badge>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-txt-muted">Host</span>
                  <span className="text-txt-primary">{room.host}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-txt-muted">Viewers</span>
                  <span className="text-txt-primary">{room.viewers}</span>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-border-subtle">
                <span className="text-accent text-sm font-medium">Join Room →</span>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      {/* Empty State Info */}
      <Card variant="glass" padding="md" className="text-center">
        <p className="text-txt-muted text-sm">
          Looking for more action? Check out the <Link href="/lobby" className="text-accent hover:underline">Public Lobby</Link> for active game rooms.
        </p>
      </Card>
    </div>
  );
}


