import Link from "next/link";
import BackButton from "@/components/BackButton";

const rooms = [
  { id: "global", title: "Global Lobby", viewers: 0, host: "TBD" },
  { id: "games", title: "Game Night", viewers: 0, host: "TBD" }
];

export default function RoomsPage() {
  return (
    <main className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <p className="text-sm uppercase tracking-[0.25em] text-gray-400">Public rooms</p>
          <h1 className="text-3xl font-semibold text-white">Join a live room</h1>
          <p className="text-sm text-gray-400">
            US-only. Active subscription, 18+ verification, and a clean account are required to join.
          </p>
        </div>
        <BackButton href="/dashboard" />
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {rooms.map((room) => (
          <Link
            key={room.id}
            href={`/rooms/${room.id}`}
            className="bg-gray-900 p-4 border border-white/20 hover:bg-gray-800"
          >
            <p className="text-lg font-semibold text-white">{room.title}</p>
            <p className="text-sm text-gray-400">
              Host: {room.host} · Viewers: {room.viewers}
            </p>
          </Link>
        ))}
      </div>
    </main>
  );
}


