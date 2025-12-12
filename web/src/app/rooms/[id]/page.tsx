"use client";

import BackButton from "@/components/BackButton";

interface RoomPageProps {
  params: { id: string };
}

export default function RoomPage({ params }: RoomPageProps) {
  const handleJoinRoom = () => {
    alert("Room joining functionality coming soon. This will connect you to the video room via WebSocket.");
  };

  return (
    <main className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.25em] text-gray-400">Room</p>
          <h1 className="text-3xl font-semibold text-white">Room {params.id}</h1>
          <p className="text-sm text-gray-400">
            US-only, 18+ verified, subscription required. Moderation and reporting are enforced.
          </p>
        </div>
        <div className="flex gap-2">
          <BackButton href="/rooms" />
          <button
            onClick={handleJoinRoom}
            className="bg-white px-4 py-2 font-semibold text-black hover:bg-gray-200 border-2 border-white"
          >
            Join room
          </button>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="bg-gray-900 p-4 border border-white/20 md:col-span-2">
          <p className="text-sm text-gray-400">Video and chat area placeholder.</p>
        </div>
        <div className="space-y-3">
          <div className="bg-gray-900 p-4 border border-white/20">
            <p className="text-sm text-gray-400">Participants list placeholder.</p>
          </div>
          <div className="bg-gray-900 p-4 border border-white/20">
            <p className="text-sm text-gray-400">Gifts and moderation controls placeholder.</p>
          </div>
        </div>
      </div>
    </main>
  );
}


