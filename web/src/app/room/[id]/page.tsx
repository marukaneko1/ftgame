"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { io, Socket } from "socket.io-client";
import dynamic from "next/dynamic";
import { roomsApi, walletApi } from "@/lib/api";
import TicTacToeGame from "@/components/games/TicTacToeGame";
import ChessGame from "@/components/games/ChessGame";
import { Button, IconButton } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Modal, ModalHeader, ModalTitle, ModalBody, ModalFooter } from "@/components/ui/Modal";
import { Spinner } from "@/components/ui/Progress";

// Dynamic import for RoomVideo to avoid SSR issues with Agora SDK
const RoomVideo = dynamic(() => import("@/components/RoomVideo"), { 
  ssr: false,
  loading: () => <div className="p-4 text-center text-txt-muted text-sm flex items-center justify-center gap-2"><Spinner size="sm" /> Loading video...</div>
});

import { getWebSocketUrl } from "@/lib/ws-config";

const WS_URL = getWebSocketUrl();

// Game configurations with player limits
const GAME_CONFIGS: Record<string, { label: string; icon: string; minPlayers: number; maxPlayers: number; description: string }> = {
  TICTACTOE: { label: "Tic Tac Toe", icon: "🎯", minPlayers: 2, maxPlayers: 2, description: "Classic 2-player game" },
  CHESS: { label: "Chess", icon: "♟️", minPlayers: 2, maxPlayers: 2, description: "Strategic 2-player game" },
  TRIVIA: { label: "Trivia", icon: "🧠", minPlayers: 2, maxPlayers: 16, description: "Test your knowledge!" },
  BILLIARDS: { label: "Billiards", icon: "🎱", minPlayers: 2, maxPlayers: 2, description: "Pool for 2 players" },
  POKER: { label: "Poker", icon: "🃏", minPlayers: 2, maxPlayers: 10, description: "Texas Hold'em" },
  TRUTHS_AND_LIE: { label: "2 Truths & a Lie", icon: "🤥", minPlayers: 2, maxPlayers: 2, description: "Guess the lie!" },
  TWENTY_ONE_QUESTIONS: { label: "21 Questions", icon: "❓", minPlayers: 2, maxPlayers: 2, description: "Get to know each other" },
};

// Helper to check if a game is available for the current player count
const isGameAvailable = (gameType: string, playerCount: number): { available: boolean; reason?: string } => {
  const config = GAME_CONFIGS[gameType];
  if (!config) return { available: false, reason: "Game not found" };
  if (playerCount < config.minPlayers) return { available: false, reason: `Needs ${config.minPlayers} players` };
  if (playerCount > config.maxPlayers) return { available: false, reason: `Max ${config.maxPlayers} players` };
  return { available: true };
};

interface Participant {
  odUserId: string;
  displayName: string;
  username: string;
  role: string;
  tokensInPool: number;
  walletBalance: number;
}

interface Round {
  id: string;
  roundNumber: number;
  entryFeeTokens: number;
  poolTokens: number;
  status: string;
  gameType: string | null;
  gameId: string | null;
  votingEndsAt: string | null;
  participants: { odUserId: string; displayName: string; tokensStaked: number }[];
  votes: { odUserId: string; gameType: string }[];
}

interface Room {
  id: string;
  title: string;
  description: string | null;
  hostUserId: string;
  maxMembers: number;
  region: string;
  entryFeeTokens: number;
  status: string;
  isPublic: boolean;
  currentRoundId: string | null;
  participantCount: number;
  participants: Participant[];
  currentRound: Round | null;
}

export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = params.id as string;

  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [userId, setUserId] = useState("");
  const [walletBalance, setWalletBalance] = useState(0);

  // Round state
  const [showStartRoundModal, setShowStartRoundModal] = useState(false);
  const [roundEntryFee, setRoundEntryFee] = useState(10);
  const [startingRound, setStartingRound] = useState(false);

  // Voting state
  const [votingTimeLeft, setVotingTimeLeft] = useState(0);
  const [myVote, setMyVote] = useState<string | null>(null);
  const [voteResults, setVoteResults] = useState<{ gameType: string; voteCount: number }[]>([]);
  const votingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Game state
  const [gameState, setGameState] = useState<any>(null);
  const [gameEnded, setGameEnded] = useState(false);
  const [gameResult, setGameResult] = useState<any>(null);

  // Video state
  const [videoEnabled, setVideoEnabled] = useState(true);

  // Invite link
  const [inviteLinkCopied, setInviteLinkCopied] = useState(false);

  const isHost = room?.hostUserId === userId;
  
  // Generate invite link
  const getInviteLink = () => {
    if (typeof window !== "undefined") {
      return `${window.location.origin}/room/${roomId}`;
    }
    return "";
  };

  const copyInviteLink = async () => {
    const link = getInviteLink();
    try {
      await navigator.clipboard.writeText(link);
      setInviteLinkCopied(true);
      setTimeout(() => setInviteLinkCopied(false), 2000);
    } catch (err) {
      // Fallback for browsers that don't support clipboard API
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
  const currentRound = room?.currentRound;
  const isInRound = currentRound?.participants.some(p => p.odUserId === userId);

  // Load user data
  useEffect(() => {
    const loadUser = async () => {
      try {
        const token = localStorage.getItem("accessToken");
        if (token) {
          const payload = JSON.parse(atob(token.split(".")[1]));
          setUserId(payload.sub);
        }
        const wallet = await walletApi.getMyWallet();
        setWalletBalance(wallet?.balanceTokens || 0);
      } catch (err) {
        console.error("Failed to load user:", err);
      }
    };
    loadUser();
  }, []);

  // Initialize WebSocket
  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      router.push("/login");
      return;
    }

    const ws = io(`${WS_URL}/ws`, {
      auth: { token },
      transports: ["websocket"],
    });

    // Track if room loaded to use in timeout
    let roomLoaded = false;

    ws.on("connect", () => {
      console.log("Room WebSocket connected");
      setConnected(true);
      ws.emit("room.join", { roomId });
      
      // Timeout fallback - if no response in 10 seconds, show error
      setTimeout(() => {
        if (!roomLoaded) {
          setError("Connection timeout - room may not exist or you may not have access");
          setLoading(false);
        }
      }, 10000);
    });

    ws.on("connect_error", (err) => {
      console.error("Room connection error:", err);
      setError("Connection failed");
    });

    ws.on("disconnect", () => {
      setConnected(false);
    });

    // Room events
    ws.on("room.joined", (data: { room: Room }) => {
      console.log("Room joined successfully:", data.room?.id);
      roomLoaded = true;
      setRoom(data.room);
      setLoading(false);
    });

    ws.on("room.state", (data: { room: Room }) => {
      console.log("Room state received:", data.room?.id);
      roomLoaded = true;
      setRoom(data.room);
      setLoading(false);
    });

    ws.on("room.userJoined", (data: { odUserId: string; room: Room }) => {
      setRoom(data.room);
    });

    ws.on("room.userLeft", (data: { odUserId: string }) => {
      // Refresh room state
      ws.emit("room.getState", { roomId });
    });

    ws.on("room.ended", () => {
      alert("Room has been closed by the host");
      router.push("/lobby");
    });

    ws.on("room.roundStarted", (data: { round: Round; entryFeeTokens: number }) => {
      setRoom((prev) => prev ? { ...prev, currentRound: data.round } : prev);
      setGameEnded(false);
      setGameResult(null);
      setGameState(null);
    });

    ws.on("room.roundUpdated", (data: { round: Round }) => {
      setRoom((prev) => prev ? { ...prev, currentRound: data.round } : prev);
    });

    ws.on("room.votingStarted", (data: { roundId: string; votingEndsAt: string }) => {
      const endsAt = new Date(data.votingEndsAt).getTime();
      setVotingTimeLeft(Math.max(0, Math.floor((endsAt - Date.now()) / 1000)));
      setMyVote(null);
      setVoteResults([]);
      
      // Start countdown
      if (votingTimerRef.current) clearInterval(votingTimerRef.current);
      votingTimerRef.current = setInterval(() => {
        const timeLeft = Math.max(0, Math.floor((endsAt - Date.now()) / 1000));
        setVotingTimeLeft(timeLeft);
        if (timeLeft <= 0 && votingTimerRef.current) {
          clearInterval(votingTimerRef.current);
        }
      }, 1000);

      setRoom((prev) => {
        if (!prev?.currentRound) return prev;
        return {
          ...prev,
          currentRound: { ...prev.currentRound, status: "VOTING", votingEndsAt: data.votingEndsAt }
        };
      });
    });

    ws.on("room.voteUpdate", (data: { roundId: string; results: { gameType: string; voteCount: number }[] }) => {
      setVoteResults(data.results);
    });

    ws.on("room.gameStarting", (data: { roundId: string; gameType: string }) => {
      if (votingTimerRef.current) clearInterval(votingTimerRef.current);
      setRoom((prev) => {
        if (!prev?.currentRound) return prev;
        return {
          ...prev,
          status: "IN_GAME",
          currentRound: { ...prev.currentRound, status: "IN_GAME", gameType: data.gameType }
        };
      });
    });

    ws.on("room.gameStateUpdate", (data: { roundId: string; state: any; lastMove?: any }) => {
      setGameState(data.state);
    });

    ws.on("room.roundEnded", (data: {
      roundId: string;
      winnerId: string | null;
      isDraw: boolean;
      winningLine?: number[];
      payout: number;
    }) => {
      setGameEnded(true);
      setGameResult(data);
      setRoom((prev) => {
        if (!prev?.currentRound) return prev;
        return {
          ...prev,
          status: "LIVE",
          currentRound: { ...prev.currentRound, status: "COMPLETED" }
        };
      });
    });

    ws.on("wallet.updated", (data: { balance: number }) => {
      setWalletBalance(data.balance);
    });

    ws.on("room.error", (data: { message: string }) => {
      console.error("Room error:", data.message);
      setError(data.message);
      setLoading(false); // Stop loading on error so user can see the message
      setTimeout(() => setError(""), 5000);
    });

    setSocket(ws);

    return () => {
      if (votingTimerRef.current) clearInterval(votingTimerRef.current);
      ws.emit("room.leave", { roomId });
      ws.disconnect();
    };
  }, [roomId, router]);

  const handleStartRound = async () => {
    if (!socket || !isHost) return;

    setStartingRound(true);
    socket.emit("room.startRound", { roomId, entryFeeTokens: roundEntryFee });
    setShowStartRoundModal(false);
    setStartingRound(false);
  };

  const handleJoinRound = () => {
    if (!socket || !currentRound) return;
    socket.emit("room.joinRound", { roomId, roundId: currentRound.id });
  };

  const handleStartVoting = () => {
    if (!socket || !isHost || !currentRound) return;
    socket.emit("room.startVoting", { roomId, roundId: currentRound.id });
  };

  const handleVote = (gameType: string) => {
    if (!socket || !currentRound) return;
    socket.emit("room.vote", { roomId, roundId: currentRound.id, gameType });
    setMyVote(gameType);
  };

  const handleGameMove = (cellIndex: number) => {
    if (!socket || !currentRound) return;
    socket.emit("room.gameMove", { roomId, roundId: currentRound.id, cellIndex });
  };

  const handleLeaveRoom = async () => {
    if (confirm("Are you sure you want to leave this room?")) {
      socket?.emit("room.leave", { roomId });
      router.push("/lobby");
    }
  };

  const handleEndRoom = async () => {
    if (confirm("Are you sure you want to end this room? All participants will be removed.")) {
      try {
        await roomsApi.endRoom(roomId);
        router.push("/lobby");
      } catch (err: any) {
        alert(err.response?.data?.message || "Failed to end room");
      }
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <Card variant="elevated" padding="lg" className="text-center">
          <div className="flex items-center justify-center gap-3">
            <Spinner size="md" />
            <p className="text-txt-secondary">Loading room...</p>
          </div>
        </Card>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="space-y-6 animate-fade-in">
        <Card variant="elevated" padding="lg" className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-error-muted flex items-center justify-center">
            <span className="text-2xl">🚫</span>
          </div>
          <p className="text-error font-medium text-lg mb-2">Room not found or access denied</p>
          <p className="text-txt-muted text-sm mb-6">{error || "The room may have been closed or you don't have permission to join."}</p>
          <Button variant="primary" onClick={() => router.push("/lobby")}>
            Back to Lobby
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <Card variant="elevated" padding="lg">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 mb-4">
          <div>
            <Badge variant="accent" size="sm" className="mb-2">Game Night</Badge>
            <h1 className="text-2xl font-display text-txt-primary tracking-tight">{room.title}</h1>
            {room.description && (
              <p className="text-txt-secondary mt-1">{room.description}</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            {/* Wallet */}
            <div className="px-4 py-2 bg-gold/10 border border-gold/30 rounded-lg">
              <p className="text-xs text-gold/80 uppercase tracking-wide">Balance</p>
              <p className="font-mono font-bold text-gold">{walletBalance.toLocaleString()}</p>
            </div>
            <Link href="/lobby">
              <Button variant="ghost" size="sm">← Lobby</Button>
            </Link>
          </div>
        </div>

        {/* Status bar */}
        <div className="flex flex-wrap gap-3 items-center">
          <Badge variant={connected ? "success" : "danger"} dot={connected} pulse={connected} size="sm">
            {connected ? "Connected" : "Disconnected"}
          </Badge>
          <Badge 
            variant={
              room.status === "LIVE" ? "success" :
              room.status === "VOTING" ? "info" :
              room.status === "IN_GAME" ? "accent" : "default"
            } 
            size="sm"
          >
            {room.status}
          </Badge>
          <span className="text-txt-muted text-sm">
            Players: <span className="text-txt-primary font-medium">{room.participantCount}/{room.maxMembers}</span>
          </span>
          {currentRound && (
            <span className="text-txt-muted text-sm">
              Pool: <span className="text-gold font-medium">{currentRound.poolTokens} tokens</span>
            </span>
          )}
        </div>
      </Card>

      {/* Error */}
      {error && (
        <Card variant="default" padding="md" className="border-error/30 bg-error-muted">
          <p className="text-error text-sm">{error}</p>
        </Card>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Game Area */}
        <div className="lg:col-span-2 space-y-6">
          {/* Round Status / Game */}
          {currentRound ? (
            <Card variant="default" padding="lg">
              <div className="flex items-center gap-3 mb-6">
                <h3 className="text-xl font-display text-txt-primary">
                  Round {currentRound.roundNumber}
                </h3>
                <Badge 
                  variant={
                    currentRound.status === "WAITING" ? "warning" :
                    currentRound.status === "VOTING" ? "info" :
                    currentRound.status === "IN_GAME" ? "accent" : "default"
                  }
                  size="sm"
                >
                  {currentRound.status}
                </Badge>
              </div>

              {/* Waiting for players */}
              {currentRound.status === "WAITING" && (
                <div>
                  <p className="text-txt-secondary mb-4">
                    Entry fee: <span className="text-gold font-medium">{currentRound.entryFeeTokens} tokens</span>
                    {" · "}Participants: <span className="text-txt-primary font-medium">{currentRound.participants.length}</span>
                  </p>
                  
                  <div className="flex flex-wrap gap-3">
                    {!isInRound && (
                      <Button
                        variant="primary"
                        onClick={handleJoinRound}
                        disabled={walletBalance < currentRound.entryFeeTokens}
                      >
                        Join Round ({currentRound.entryFeeTokens} tokens)
                      </Button>
                    )}

                    {isHost && currentRound.participants.length >= 2 && (
                      <Button variant="success" onClick={handleStartVoting}>
                        Start Voting (20s)
                      </Button>
                    )}
                  </div>

                  {isInRound && (
                    <p className="text-success mt-4 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-success"></span>
                      You're in this round!
                    </p>
                  )}
                </div>
              )}

              {/* Voting */}
              {currentRound.status === "VOTING" && (
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <p className="text-txt-secondary">Vote for a game!</p>
                    <Badge variant="warning" size="md" className="font-mono">
                      {votingTimeLeft}s
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-4">
                    {Object.entries(GAME_CONFIGS).map(([gameType, config]) => {
                      const playerCount = currentRound.participants.length;
                      const availability = isGameAvailable(gameType, playerCount);
                      const voteCount = voteResults.find(v => v.gameType === gameType)?.voteCount || 0;
                      const isMyVoteThis = myVote === gameType;
                      const isDisabled = !availability.available;
                      
                      return (
                        <button
                          key={gameType}
                          onClick={() => !isDisabled && handleVote(gameType)}
                          disabled={isDisabled}
                          className={`p-4 rounded-lg border-2 transition-all relative ${
                            isMyVoteThis
                              ? "bg-success-muted border-success text-success"
                              : isDisabled
                              ? "bg-surface-secondary border-border-subtle text-txt-muted cursor-not-allowed opacity-60"
                              : "bg-surface-secondary border-border-default text-txt-primary hover:border-accent hover:bg-surface-tertiary"
                          }`}
                          title={isDisabled ? availability.reason : config.description}
                        >
                          <span className="text-2xl">{config.icon}</span>
                          <p className="text-sm mt-1 font-medium">{config.label}</p>
                          {isDisabled ? (
                            <p className="text-xs mt-1 text-error">{availability.reason}</p>
                          ) : (
                            <p className="text-xs mt-1 text-gold">{voteCount} votes</p>
                          )}
                          {isMyVoteThis && (
                            <span className="absolute top-2 right-2 text-success">✓</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-xs text-txt-muted">
                    Some games are unavailable based on current player count ({currentRound.participants.length} players)
                  </p>
                </div>
              )}

              {/* In Game - TicTacToe */}
              {currentRound.status === "IN_GAME" && currentRound.gameType === "TICTACTOE" && (
                <div>
                  {gameState ? (
                    <RoomTicTacToe
                      gameState={gameState}
                      odUserId={userId}
                      onMove={handleGameMove}
                      gameEnded={gameEnded}
                      gameResult={gameResult}
                      participants={currentRound.participants}
                    />
                  ) : (
                    <div className="flex items-center justify-center gap-2 py-8">
                      <Spinner size="sm" />
                      <p className="text-txt-muted">Loading game...</p>
                    </div>
                  )}
                </div>
              )}

              {/* In Game - Chess */}
              {currentRound.status === "IN_GAME" && currentRound.gameType === "CHESS" && (
                <div>
                  {gameState ? (
                    <ChessGame
                      gameState={gameState}
                      odUserId={userId}
                      onMove={(from, to, promotionPiece) => {
                        if (socket && currentRound) {
                          socket.emit("room.gameMove", {
                            roomId: room.id,
                            roundId: currentRound.id,
                            from,
                            to,
                            promotionPiece
                          });
                        }
                      }}
                      onForfeit={() => {
                        if (socket && currentRound) {
                          socket.emit("room.gameForfeit", {
                            roomId: room.id,
                            roundId: currentRound.id
                          });
                        }
                      }}
                    />
                  ) : (
                    <div className="flex items-center justify-center gap-2 py-8">
                      <Spinner size="sm" />
                      <p className="text-txt-muted">Loading game...</p>
                    </div>
                  )}
                </div>
              )}

              {/* Game Ended */}
              {currentRound.status === "COMPLETED" && gameResult && (
                <div className="text-center py-8">
                  <div className={`w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center ${
                    gameResult.isDraw ? "bg-warning-muted" :
                    gameResult.winnerId === userId ? "bg-success-muted" : "bg-error-muted"
                  }`}>
                    <span className="text-4xl">
                      {gameResult.isDraw ? "🤝" : gameResult.winnerId === userId ? "🎉" : "😢"}
                    </span>
                  </div>
                  <p className={`text-2xl font-display ${
                    gameResult.isDraw ? "text-warning" :
                    gameResult.winnerId === userId ? "text-success" : "text-error"
                  }`}>
                    {gameResult.isDraw ? "It's a Draw!" :
                     gameResult.winnerId === userId ? `You Won ${gameResult.payout} tokens!` : "You Lost!"}
                  </p>
                  
                  {isHost && (
                    <Button
                      variant="primary"
                      size="lg"
                      className="mt-6"
                      onClick={() => setShowStartRoundModal(true)}
                    >
                      Start Next Round
                    </Button>
                  )}
                </div>
              )}
            </Card>
          ) : (
            /* No active round */
            <Card variant="glass" padding="lg" className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-surface-secondary flex items-center justify-center">
                <span className="text-2xl">🎮</span>
              </div>
              <p className="text-txt-secondary mb-4">No active round</p>
              {isHost ? (
                <Button variant="primary" onClick={() => setShowStartRoundModal(true)}>
                  Start a Round
                </Button>
              ) : (
                <p className="text-sm text-txt-muted">Waiting for host to start a round...</p>
              )}
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Video Panel */}
          <Card variant="default" padding="none" className="overflow-hidden">
            <div className="flex items-center justify-between p-3 border-b border-border-subtle">
              <h3 className="text-sm font-display text-txt-primary flex items-center gap-2">
                <span>📹</span> Video Chat
              </h3>
              <Button
                variant={videoEnabled ? "success" : "ghost"}
                size="sm"
                onClick={() => setVideoEnabled(!videoEnabled)}
              >
                {videoEnabled ? "On" : "Off"}
              </Button>
            </div>
            {videoEnabled && room && userId && (
              <RoomVideo
                roomId={roomId}
                userId={userId}
                participants={room.participants}
                enabled={videoEnabled}
              />
            )}
            {!videoEnabled && (
              <div className="p-6 text-center">
                <p className="text-txt-muted text-sm">Video is disabled. Click "On" to enable.</p>
              </div>
            )}
          </Card>

          {/* Participants */}
          <Card variant="default" padding="md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <span>👥</span> Participants
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {room.participants.map((p) => (
                  <div
                    key={p.odUserId}
                    className={`p-3 rounded-lg bg-surface-secondary border ${
                      p.odUserId === userId ? "border-accent" : "border-border-subtle"
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-txt-primary font-medium">
                          {p.displayName}
                          {p.role === "HOST" && <Badge variant="warning" size="sm" className="ml-2">👑 HOST</Badge>}
                          {p.odUserId === userId && <Badge variant="accent" size="sm" className="ml-2">You</Badge>}
                        </p>
                        <p className="text-xs text-txt-muted">@{p.username}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-gold font-mono font-medium">{p.walletBalance}</p>
                        <p className="text-xs text-txt-muted">tokens</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Invite Friends */}
          <Card variant="glass" padding="md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <span>📨</span> Invite Friends
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-txt-muted mb-3">Share this link to invite friends:</p>
              <div className="flex gap-2">
                <Input
                  value={getInviteLink()}
                  readOnly
                  className="text-xs"
                />
                <Button
                  variant={inviteLinkCopied ? "success" : "secondary"}
                  size="sm"
                  onClick={copyInviteLink}
                >
                  {inviteLinkCopied ? "✓ Copied!" : "Copy"}
                </Button>
              </div>
              {room?.participants && room.participantCount < room.maxMembers && (
                <p className="text-xs text-txt-muted mt-2">
                  {room.maxMembers - room.participantCount} spot{room.maxMembers - room.participantCount !== 1 ? "s" : ""} remaining
                </p>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <Card variant="default" padding="md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <span>⚙️</span> Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="ghost" fullWidth onClick={handleLeaveRoom}>
                Leave Room
              </Button>
              {isHost && (
                <Button variant="danger" fullWidth onClick={handleEndRoom}>
                  End Room
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Start Round Modal */}
      <Modal open={showStartRoundModal} onClose={() => setShowStartRoundModal(false)} size="sm">
        <ModalHeader>
          <ModalTitle>Start New Round</ModalTitle>
        </ModalHeader>
        <ModalBody>
          <Input
            label="Entry Fee (tokens)"
            type="number"
            min={0}
            value={String(roundEntryFee)}
            onChange={(e) => setRoundEntryFee(parseInt(e.target.value) || 0)}
            hint="Set to 0 for free round. Winner takes all!"
          />
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" onClick={() => setShowStartRoundModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleStartRound} loading={startingRound}>
            Start Round
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}

// Inline TicTacToe component for room games
function RoomTicTacToe({
  gameState,
  odUserId,
  onMove,
  gameEnded,
  gameResult,
  participants,
}: {
  gameState: any;
  odUserId: string;
  onMove: (cellIndex: number) => void;
  gameEnded: boolean;
  gameResult: any;
  participants: { odUserId: string; displayName: string }[];
}) {
  const mySymbol = gameState.playerX === odUserId ? "X" : gameState.playerO === odUserId ? "O" : null;
  const isMyTurn = gameState.currentTurn === mySymbol;
  
  const getPlayerName = (odUserId: string) => {
    return participants.find(p => p.odUserId === odUserId)?.displayName || "Player";
  };

  const isWinningCell = (index: number) => {
    return gameResult?.winningLine?.includes(index);
  };

  return (
    <div>
      {/* Status */}
      <div className="mb-4 text-center">
        <p className="text-sm text-txt-muted mb-1">
          You are: <span className={mySymbol === "X" ? "text-info font-bold" : "text-error font-bold"}>{mySymbol}</span>
        </p>
        {!gameEnded && (
          <p className={`text-lg font-display ${isMyTurn ? "text-success" : "text-warning"}`}>
            {isMyTurn ? "Your Turn!" : `${getPlayerName(isMyTurn ? "" : (gameState.currentTurn === "X" ? gameState.playerX : gameState.playerO))}'s Turn`}
          </p>
        )}
      </div>

      {/* Board */}
      <div className="flex justify-center mb-4">
        <div className={`grid grid-cols-3 gap-2 p-4 rounded-xl ${
          gameEnded ? "bg-surface-secondary" : isMyTurn ? "bg-success-muted ring-2 ring-success" : "bg-surface-secondary"
        }`}>
          {gameState.board.map((cell: string | null, index: number) => (
            <button
              key={index}
              onClick={() => !gameEnded && isMyTurn && !cell && onMove(index)}
              disabled={gameEnded || !isMyTurn || !!cell}
              className={`
                w-16 h-16 text-3xl font-bold flex items-center justify-center
                transition-all duration-fast rounded-lg border border-border-default
                ${!cell && !gameEnded && isMyTurn ? "bg-surface-tertiary hover:bg-accent-muted hover:border-accent cursor-pointer" : "bg-surface-primary"}
                ${isWinningCell(index) ? "bg-success-muted ring-2 ring-success animate-pulse" : ""}
                ${cell === "X" ? "text-info" : "text-error"}
              `}
            >
              {cell}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

