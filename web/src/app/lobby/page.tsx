"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { roomsApi, RoomListItem, CreateRoomData, walletApi } from "@/lib/api";
import BackButton from "@/components/BackButton";

const REGIONS = [
  { value: "global", label: "🌍 Global" },
  { value: "na", label: "🇺🇸 North America" },
  { value: "eu", label: "🇪🇺 Europe" },
  { value: "asia", label: "🌏 Asia" },
];

export default function LobbyPage() {
  const router = useRouter();
  const [rooms, setRooms] = useState<RoomListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedRegion, setSelectedRegion] = useState("global");
  const [walletBalance, setWalletBalance] = useState(0);
  
  // Create room modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState<CreateRoomData>({
    title: "",
    description: "",
    password: "",
    maxMembers: 8,
    region: "global",
    entryFeeTokens: 0,
    isPublic: true,
  });
  const [creating, setCreating] = useState(false);

  // Join room modal
  const [joinRoomId, setJoinRoomId] = useState<string | null>(null);
  const [joinPassword, setJoinPassword] = useState("");
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    loadRooms();
    loadWallet();
  }, [selectedRegion]);

  const loadRooms = async () => {
    try {
      setLoading(true);
      const data = await roomsApi.getPublicRooms(selectedRegion === "global" ? undefined : selectedRegion);
      setRooms(data);
      setError("");
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load rooms");
    } finally {
      setLoading(false);
    }
  };

  const loadWallet = async () => {
    try {
      const wallet = await walletApi.getMyWallet();
      setWalletBalance(wallet?.balanceTokens || 0);
    } catch (err) {
      console.error("Failed to load wallet:", err);
    }
  };

  // Created room state for showing invite link
  const [createdRoom, setCreatedRoom] = useState<{ id: string; title: string } | null>(null);
  const [inviteLinkCopied, setInviteLinkCopied] = useState(false);

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.title.trim()) {
      alert("Room name is required");
      return;
    }

    try {
      setCreating(true);
      const room = await roomsApi.createRoom(createForm);
      setShowCreateModal(false);
      setCreatedRoom({ id: room.id, title: room.title });
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to create room");
    } finally {
      setCreating(false);
    }
  };

  const getInviteLink = (roomId: string) => {
    if (typeof window !== "undefined") {
      return `${window.location.origin}/room/${roomId}`;
    }
    return "";
  };

  const copyInviteLink = async (roomId: string) => {
    const link = getInviteLink(roomId);
    try {
      await navigator.clipboard.writeText(link);
      setInviteLinkCopied(true);
      setTimeout(() => setInviteLinkCopied(false), 2000);
    } catch (err) {
      const textArea = document.createElement("textarea");
      textArea.value = link;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setInviteLinkCopied(true);
      setTimeout(() => setInviteLinkCopied(false), 2000);
    }
  };

  const goToCreatedRoom = () => {
    if (createdRoom) {
      router.push(`/room/${createdRoom.id}`);
    }
  };

  const handleJoinRoom = async (roomId: string, hasPassword: boolean) => {
    if (hasPassword) {
      setJoinRoomId(roomId);
      return;
    }

    try {
      setJoining(true);
      await roomsApi.joinRoom(roomId);
      router.push(`/room/${roomId}`);
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to join room");
    } finally {
      setJoining(false);
    }
  };

  const handleJoinWithPassword = async () => {
    if (!joinRoomId) return;

    try {
      setJoining(true);
      await roomsApi.joinRoom(joinRoomId, joinPassword);
      router.push(`/room/${joinRoomId}`);
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to join room");
    } finally {
      setJoining(false);
      setJoinRoomId(null);
      setJoinPassword("");
    }
  };

  return (
    <main className="space-y-4">
      {/* Header */}
      <div className="bg-gray-900 p-6 border border-white/20">
        <div className="flex justify-between items-start mb-4">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-gray-400">Game Night</p>
            <h1 className="text-3xl font-semibold text-white">Global Lobby</h1>
          </div>
          <div className="flex items-center gap-3">
            {/* Wallet Balance */}
            <div className="bg-gradient-to-r from-yellow-900 to-yellow-700 px-4 py-2 border-2 border-yellow-500">
              <p className="text-xs text-yellow-300 uppercase">Balance</p>
              <p className="font-bold text-white">{walletBalance.toLocaleString()} tokens</p>
            </div>
            <BackButton href="/dashboard" />
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 items-center">
          <select
            value={selectedRegion}
            onChange={(e) => setSelectedRegion(e.target.value)}
            className="bg-black px-4 py-2 text-white border border-white/30"
          >
            {REGIONS.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
          
          <button
            onClick={loadRooms}
            disabled={loading}
            className="bg-gray-800 px-4 py-2 text-white border border-white/30 hover:bg-gray-700 disabled:opacity-50"
          >
            {loading ? "Loading..." : "Refresh"}
          </button>
          
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-white px-4 py-2 font-semibold text-black hover:bg-gray-200 border-2 border-white"
          >
            + Create Room
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-900/50 border border-red-500 p-4 text-red-300">
          {error}
        </div>
      )}

      {/* Room List */}
      <div className="bg-gray-900 p-6 border border-white/20">
        {loading ? (
          <p className="text-gray-400 text-center py-8">Loading rooms...</p>
        ) : rooms.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-400 mb-4">No rooms available in this region</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-white px-6 py-3 font-semibold text-black hover:bg-gray-200 border-2 border-white"
            >
              Create the first room!
            </button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {rooms.map((room) => (
              <div
                key={room.id}
                className="bg-gray-800 p-4 border border-white/20 hover:border-white/40 transition-colors"
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-semibold text-white truncate">{room.title}</h3>
                  {room.hasPassword && <span className="text-yellow-400">🔒</span>}
                </div>
                
                {room.description && (
                  <p className="text-sm text-gray-400 mb-3 line-clamp-2">{room.description}</p>
                )}
                
                <div className="space-y-1 text-sm mb-4">
                  <p className="text-gray-400">
                    Host: <span className="text-white">{room.hostName}</span>
                  </p>
                  <p className="text-gray-400">
                    Players: <span className="text-white">{room.participantCount}/{room.maxMembers}</span>
                  </p>
                  <p className="text-gray-400">
                    Entry: <span className={room.entryFeeTokens > 0 ? "text-yellow-400" : "text-green-400"}>
                      {room.entryFeeTokens > 0 ? `${room.entryFeeTokens} tokens` : "Free"}
                    </span>
                  </p>
                  <p className="text-gray-400">
                    Status: <span className={
                      room.status === "LIVE" ? "text-green-400" :
                      room.status === "VOTING" ? "text-blue-400" :
                      room.status === "IN_GAME" ? "text-purple-400" : "text-gray-400"
                    }>
                      {room.status}
                    </span>
                  </p>
                </div>

                <button
                  onClick={() => handleJoinRoom(room.id, room.hasPassword)}
                  disabled={joining || room.participantCount >= room.maxMembers}
                  className={`w-full py-2 font-semibold transition-colors ${
                    room.participantCount >= room.maxMembers
                      ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                      : "bg-white text-black hover:bg-gray-200"
                  }`}
                >
                  {room.participantCount >= room.maxMembers ? "Full" : "Join Room"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Room Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 p-6 border border-white/20 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-semibold text-white">Create Room</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreateRoom} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Room Name *</label>
                <input
                  type="text"
                  value={createForm.title}
                  onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                  className="w-full bg-black px-3 py-2 text-white border border-white/30 focus:border-white"
                  placeholder="My Awesome Game Night"
                  required
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Description</label>
                <textarea
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  className="w-full bg-black px-3 py-2 text-white border border-white/30 focus:border-white"
                  placeholder="Come play some games!"
                  rows={2}
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Password (optional)</label>
                <input
                  type="password"
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  className="w-full bg-black px-3 py-2 text-white border border-white/30 focus:border-white"
                  placeholder="Leave empty for public room"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Max Players</label>
                  <select
                    value={createForm.maxMembers}
                    onChange={(e) => setCreateForm({ ...createForm, maxMembers: parseInt(e.target.value) })}
                    className="w-full bg-black px-3 py-2 text-white border border-white/30"
                  >
                    {[2, 4, 6, 8, 10, 12, 16].map((n) => (
                      <option key={n} value={n}>{n} players</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">Region</label>
                  <select
                    value={createForm.region}
                    onChange={(e) => setCreateForm({ ...createForm, region: e.target.value })}
                    className="w-full bg-black px-3 py-2 text-white border border-white/30"
                  >
                    {REGIONS.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Entry Fee (tokens)</label>
                <input
                  type="number"
                  min="0"
                  value={createForm.entryFeeTokens}
                  onChange={(e) => setCreateForm({ ...createForm, entryFeeTokens: parseInt(e.target.value) || 0 })}
                  className="w-full bg-black px-3 py-2 text-white border border-white/30 focus:border-white"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Set to 0 for free entry. Entry fees go into the prize pool.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isPublic"
                  checked={createForm.isPublic}
                  onChange={(e) => setCreateForm({ ...createForm, isPublic: e.target.checked })}
                  className="w-4 h-4"
                />
                <label htmlFor="isPublic" className="text-sm text-gray-300">
                  Show in public lobby
                </label>
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-2 bg-gray-800 text-white border border-white/30 hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 py-2 bg-white text-black font-semibold hover:bg-gray-200 disabled:opacity-50"
                >
                  {creating ? "Creating..." : "Create Room"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Room Created - Share Invite Link Modal */}
      {createdRoom && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 p-6 border border-white/20 max-w-md w-full">
            <div className="text-center mb-6">
              <span className="text-4xl mb-4 block">🎉</span>
              <h2 className="text-2xl font-semibold text-white mb-2">Room Created!</h2>
              <p className="text-gray-400">"{createdRoom.title}"</p>
            </div>

            <div className="mb-6">
              <label className="block text-sm text-gray-400 mb-2">Invite friends with this link:</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={getInviteLink(createdRoom.id)}
                  className="flex-1 bg-black px-3 py-2 text-sm text-gray-300 border border-white/20 truncate"
                />
                <button
                  onClick={() => copyInviteLink(createdRoom.id)}
                  className={`px-4 py-2 font-semibold transition-colors ${
                    inviteLinkCopied 
                      ? "bg-green-600 text-white" 
                      : "bg-white text-black hover:bg-gray-200"
                  }`}
                >
                  {inviteLinkCopied ? "✓ Copied!" : "Copy"}
                </button>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setCreatedRoom(null)}
                className="flex-1 py-3 bg-gray-800 text-white border border-white/30 hover:bg-gray-700"
              >
                Stay in Lobby
              </button>
              <button
                onClick={goToCreatedRoom}
                className="flex-1 py-3 bg-white text-black font-semibold hover:bg-gray-200"
              >
                Enter Room →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Join with Password Modal */}
      {joinRoomId && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 p-6 border border-white/20 max-w-sm w-full">
            <h2 className="text-xl font-semibold text-white mb-4">Enter Room Password</h2>
            <input
              type="password"
              value={joinPassword}
              onChange={(e) => setJoinPassword(e.target.value)}
              className="w-full bg-black px-3 py-2 text-white border border-white/30 focus:border-white mb-4"
              placeholder="Password"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setJoinRoomId(null);
                  setJoinPassword("");
                }}
                className="flex-1 py-2 bg-gray-800 text-white border border-white/30 hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleJoinWithPassword}
                disabled={joining || !joinPassword}
                className="flex-1 py-2 bg-white text-black font-semibold hover:bg-gray-200 disabled:opacity-50"
              >
                {joining ? "Joining..." : "Join"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

