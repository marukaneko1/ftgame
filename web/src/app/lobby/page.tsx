"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { roomsApi, RoomListItem, CreateRoomData, walletApi } from "@/lib/api";
import { Button, IconButton } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge, StatusBadge, Chip } from "@/components/ui/Badge";
import { Input, Select, Textarea, SearchInput } from "@/components/ui/Input";
import { Modal, ModalHeader, ModalTitle, ModalDescription, ModalBody, ModalFooter } from "@/components/ui/Modal";
import { Spinner, Skeleton } from "@/components/ui/Progress";

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
  const [searchQuery, setSearchQuery] = useState("");
  
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

  const [joinRoomId, setJoinRoomId] = useState<string | null>(null);
  const [joinPassword, setJoinPassword] = useState("");
  const [joining, setJoining] = useState(false);

  const [createdRoom, setCreatedRoom] = useState<{ id: string; title: string } | null>(null);
  const [inviteLinkCopied, setInviteLinkCopied] = useState(false);

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

  const filteredRooms = rooms.filter(room => 
    room.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    room.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "LIVE":
        return <Badge variant="success" dot pulse size="sm">Live</Badge>;
      case "VOTING":
        return <Badge variant="info" size="sm">Voting</Badge>;
      case "IN_GAME":
        return <Badge variant="accent" size="sm">In Game</Badge>;
      default:
        return <Badge variant="default" size="sm">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <Card variant="elevated" padding="lg">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <Badge variant="info" size="sm" className="mb-2">Public Lobby</Badge>
            <h1 className="text-3xl font-display text-txt-primary tracking-tight">
              Game Night Lobby
            </h1>
            <p className="text-txt-secondary mt-1">
              Join or create public rooms to play with others
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Wallet Balance */}
            <div className="px-4 py-2 bg-gold/10 border border-gold/30 rounded-lg">
              <p className="text-xs text-gold/80 uppercase tracking-wide">Balance</p>
              <p className="font-mono font-bold text-gold">{walletBalance.toLocaleString()}</p>
            </div>
            <Link href="/dashboard">
              <Button variant="ghost" size="sm">← Back</Button>
            </Link>
          </div>
        </div>

        {/* Filters */}
        <div className="mt-6 flex flex-wrap gap-3 items-center">
          <SearchInput
            placeholder="Search rooms..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onClear={() => setSearchQuery("")}
            className="w-full sm:w-64"
          />
          <div className="flex gap-2">
            {REGIONS.map((r) => (
              <Chip
                key={r.value}
                selected={selectedRegion === r.value}
                onClick={() => setSelectedRegion(r.value)}
              >
                {r.label}
              </Chip>
            ))}
          </div>
          <div className="flex gap-2 ml-auto">
            <Button variant="ghost" size="sm" onClick={loadRooms} disabled={loading}>
              {loading ? <Spinner size="sm" /> : "Refresh"}
            </Button>
            <Button variant="primary" size="md" onClick={() => setShowCreateModal(true)}>
              + Create Room
            </Button>
          </div>
        </div>
      </Card>

      {/* Error */}
      {error && (
        <Card variant="default" padding="md" className="border-error/30 bg-error-muted">
          <p className="text-error">{error}</p>
        </Card>
      )}

      {/* Room List */}
      <div>
        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} variant="default" padding="lg">
                <Skeleton variant="text" lines={4} />
              </Card>
            ))}
          </div>
        ) : filteredRooms.length === 0 ? (
          <Card variant="glass" padding="lg" className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-surface-secondary flex items-center justify-center text-3xl">
              🏠
            </div>
            <h3 className="text-lg font-display text-txt-primary">No Rooms Found</h3>
            <p className="text-txt-secondary mt-2 mb-6">
              {searchQuery ? "No rooms match your search." : "No rooms available in this region."}
            </p>
            <Button variant="primary" onClick={() => setShowCreateModal(true)}>
              Create the First Room!
            </Button>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredRooms.map((room) => (
              <Card
                key={room.id}
                variant="default"
                padding="lg"
                hover
                className="transition-all duration-fast"
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-lg font-display text-txt-primary truncate pr-2">
                    {room.title}
                  </h3>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {room.hasPassword && <span className="text-warning">🔒</span>}
                    {getStatusBadge(room.status)}
                  </div>
                </div>
                
                {room.description && (
                  <p className="text-sm text-txt-secondary mb-4 line-clamp-2">{room.description}</p>
                )}
                
                <div className="space-y-2 text-sm mb-4">
                  <div className="flex items-center justify-between">
                    <span className="text-txt-muted">Host</span>
                    <span className="text-txt-primary">{room.hostName}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-txt-muted">Players</span>
                    <span className="text-txt-primary">{room.participantCount}/{room.maxMembers}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-txt-muted">Entry</span>
                    <span className={room.entryFeeTokens > 0 ? "text-gold font-medium" : "text-success"}>
                      {room.entryFeeTokens > 0 ? `${room.entryFeeTokens} tokens` : "Free"}
                    </span>
                  </div>
                </div>

                <Button
                  variant={room.participantCount >= room.maxMembers ? "ghost" : "secondary"}
                  size="md"
                  fullWidth
                  onClick={() => handleJoinRoom(room.id, room.hasPassword)}
                  disabled={joining || room.participantCount >= room.maxMembers}
                >
                  {room.participantCount >= room.maxMembers ? "Full" : "Join Room"}
                </Button>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create Room Modal */}
      <Modal open={showCreateModal} onClose={() => setShowCreateModal(false)} size="lg">
        <ModalHeader>
          <ModalTitle>Create Room</ModalTitle>
          <ModalDescription>Set up a new game room for others to join</ModalDescription>
        </ModalHeader>
        <form onSubmit={handleCreateRoom}>
          <ModalBody className="space-y-4">
            <Input
              label="Room Name"
              placeholder="My Awesome Game Night"
              value={createForm.title}
              onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
              required
            />
            <Textarea
              label="Description"
              placeholder="Come play some games!"
              value={createForm.description}
              onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
            />
            <Input
              label="Password (optional)"
              type="password"
              placeholder="Leave empty for public room"
              value={createForm.password}
              onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
            />
            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Max Players"
                value={String(createForm.maxMembers)}
                onChange={(e: any) => setCreateForm({ ...createForm, maxMembers: parseInt(e.target.value) })}
                options={[2, 4, 6, 8, 10, 12, 16].map(n => ({ value: String(n), label: `${n} players` }))}
              />
              <Select
                label="Region"
                value={createForm.region}
                onChange={(e: any) => setCreateForm({ ...createForm, region: e.target.value })}
                options={REGIONS}
              />
            </div>
            <Input
              label="Entry Fee (tokens)"
              type="number"
              value={String(createForm.entryFeeTokens)}
              onChange={(e) => setCreateForm({ ...createForm, entryFeeTokens: parseInt(e.target.value) || 0 })}
              hint="Set to 0 for free entry. Entry fees go into the prize pool."
            />
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={createForm.isPublic}
                onChange={(e) => setCreateForm({ ...createForm, isPublic: e.target.checked })}
                className="w-4 h-4 rounded border-border-default bg-surface-primary accent-accent"
              />
              <span className="text-sm text-txt-secondary">Show in public lobby</span>
            </label>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" type="button" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" loading={creating}>
              Create Room
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* Room Created Modal */}
      <Modal open={!!createdRoom} onClose={() => setCreatedRoom(null)} size="md">
        <ModalBody className="text-center py-6">
          <span className="text-5xl block mb-4">🎉</span>
          <h2 className="text-2xl font-display text-txt-primary mb-2">Room Created!</h2>
          <p className="text-txt-secondary">"{createdRoom?.title}"</p>
          
          <div className="mt-6">
            <label className="block text-sm text-txt-muted mb-2 text-left">Invite friends with this link:</label>
            <div className="flex gap-2">
              <Input
                value={createdRoom ? getInviteLink(createdRoom.id) : ""}
                readOnly
                className="text-sm"
              />
              <Button
                variant={inviteLinkCopied ? "success" : "secondary"}
                onClick={() => createdRoom && copyInviteLink(createdRoom.id)}
              >
                {inviteLinkCopied ? "✓ Copied!" : "Copy"}
              </Button>
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" onClick={() => setCreatedRoom(null)}>
            Stay in Lobby
          </Button>
          <Button variant="primary" onClick={() => createdRoom && router.push(`/room/${createdRoom.id}`)}>
            Enter Room →
          </Button>
        </ModalFooter>
      </Modal>

      {/* Password Modal */}
      <Modal open={!!joinRoomId} onClose={() => { setJoinRoomId(null); setJoinPassword(""); }} size="sm">
        <ModalHeader>
          <ModalTitle>Enter Room Password</ModalTitle>
        </ModalHeader>
        <ModalBody>
          <Input
            type="password"
            placeholder="Password"
            value={joinPassword}
            onChange={(e) => setJoinPassword(e.target.value)}
            autoFocus
          />
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" onClick={() => { setJoinRoomId(null); setJoinPassword(""); }}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleJoinWithPassword} loading={joining} disabled={!joinPassword}>
            Join
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
