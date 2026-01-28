"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { io, Socket } from "socket.io-client";
import dynamic from "next/dynamic";
import { roomsApi, walletApi } from "@/lib/api";
import BackButton from "@/components/BackButton";
import TicTacToeGame from "@/components/games/TicTacToeGame";
import ChessGame from "@/components/games/ChessGame";

// Dynamic import for RoomVideo to avoid SSR issues with Agora SDK
const RoomVideo = dynamic(() => import("@/components/RoomVideo"), { 
  ssr: false,
  loading: () => <div className="p-4 text-center text-gray-500 text-sm">Loading video...</div>
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
      <main className="space-y-4">
        <div className="bg-gray-900 p-6 border border-white/20 text-center">
          <p className="text-gray-400">Loading room...</p>
        </div>
      </main>
    );
  }

  if (!room) {
    return (
      <main className="space-y-4">
        <div className="bg-gray-900 p-6 border border-white/20 text-center">
          <p className="text-red-400">Room not found or access denied</p>
          <button
            onClick={() => router.push("/lobby")}
            className="mt-4 bg-white px-4 py-2 text-black font-semibold"
          >
            Back to Lobby
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="space-y-4">
      {/* Header */}
      <div className="bg-gray-900 p-6 border border-white/20">
        <div className="flex justify-between items-start mb-4">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-gray-400">Game Night</p>
            <h1 className="text-2xl font-semibold text-white">{room.title}</h1>
            {room.description && (
              <p className="text-sm text-gray-400 mt-1">{room.description}</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            {/* Wallet */}
            <div className="bg-gradient-to-r from-yellow-900 to-yellow-700 px-4 py-2 border-2 border-yellow-500">
              <p className="text-xs text-yellow-300">Balance</p>
              <p className="font-bold text-white">{walletBalance.toLocaleString()}</p>
            </div>
            <BackButton href="/lobby" />
          </div>
        </div>

        {/* Status bar */}
        <div className="flex flex-wrap gap-4 items-center text-sm">
          <span className={`px-2 py-1 ${connected ? "bg-green-900 text-green-400" : "bg-red-900 text-red-400"}`}>
            {connected ? "● Connected" : "○ Disconnected"}
          </span>
          <span className="text-gray-400">
            Status: <span className={
              room.status === "LIVE" ? "text-green-400" :
              room.status === "VOTING" ? "text-blue-400" :
              room.status === "IN_GAME" ? "text-purple-400" : "text-gray-400"
            }>{room.status}</span>
          </span>
          <span className="text-gray-400">
            Players: <span className="text-white">{room.participantCount}/{room.maxMembers}</span>
          </span>
          {currentRound && (
            <span className="text-gray-400">
              Pool: <span className="text-yellow-400">{currentRound.poolTokens} tokens</span>
            </span>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-900/50 border border-red-500 p-3 text-red-300 text-sm">
          {error}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Main Game Area */}
        <div className="lg:col-span-2 space-y-4">
          {/* Round Status / Game */}
          {currentRound ? (
            <div className="bg-gray-900 p-6 border border-white/20">
              <h3 className="text-lg font-semibold text-white mb-4">
                Round {currentRound.roundNumber} 
                <span className={`ml-2 text-sm px-2 py-1 ${
                  currentRound.status === "WAITING" ? "bg-yellow-900 text-yellow-400" :
                  currentRound.status === "VOTING" ? "bg-blue-900 text-blue-400" :
                  currentRound.status === "IN_GAME" ? "bg-purple-900 text-purple-400" :
                  "bg-gray-800 text-gray-400"
                }`}>
                  {currentRound.status}
                </span>
              </h3>

              {/* Waiting for players */}
              {currentRound.status === "WAITING" && (
                <div>
                  <p className="text-gray-400 mb-4">
                    Entry fee: <span className="text-yellow-400">{currentRound.entryFeeTokens} tokens</span>
                    {" · "}Participants: <span className="text-white">{currentRound.participants.length}</span>
                  </p>
                  
                  {!isInRound && (
                    <button
                      onClick={handleJoinRound}
                      disabled={walletBalance < currentRound.entryFeeTokens}
                      className="bg-white px-6 py-2 text-black font-semibold hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Join Round ({currentRound.entryFeeTokens} tokens)
                    </button>
                  )}

                  {isHost && currentRound.participants.length >= 2 && (
                    <button
                      onClick={handleStartVoting}
                      className="ml-2 bg-green-600 px-6 py-2 text-white font-semibold hover:bg-green-500"
                    >
                      Start Voting (20s)
                    </button>
                  )}

                  {isInRound && (
                    <p className="text-green-400 mt-2">✓ You're in this round!</p>
                  )}
                </div>
              )}

              {/* Voting */}
              {currentRound.status === "VOTING" && (
                <div>
                  <p className="text-gray-400 mb-4">
                    Vote for a game! Time left: <span className="text-yellow-400 font-bold">{votingTimeLeft}s</span>
                  </p>
                  
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
                          className={`p-4 border-2 transition-all relative ${
                            isMyVoteThis
                              ? "bg-green-900 border-green-500 text-green-400"
                              : isDisabled
                              ? "bg-gray-800 border-gray-600 text-gray-500 cursor-not-allowed opacity-60"
                              : "bg-gray-800 border-white/30 text-white hover:border-white"
                          }`}
                          title={isDisabled ? availability.reason : config.description}
                        >
                          <span className="text-2xl">{config.icon}</span>
                          <p className="text-sm mt-1 font-medium">{config.label}</p>
                          {isDisabled ? (
                            <p className="text-xs mt-1 text-red-400">{availability.reason}</p>
                          ) : (
                            <p className="text-xs mt-1 text-yellow-400">{voteCount} votes</p>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-xs text-gray-500">
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
                    <p className="text-gray-400">Loading game...</p>
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
                    <p className="text-gray-400">Loading game...</p>
                  )}
                </div>
              )}

              {/* Game Ended */}
              {currentRound.status === "COMPLETED" && gameResult && (
                <div className="text-center py-8">
                  <p className="text-4xl mb-4">
                    {gameResult.isDraw ? "🤝" : gameResult.winnerId === userId ? "🎉" : "😢"}
                  </p>
                  <p className={`text-2xl font-bold ${
                    gameResult.isDraw ? "text-yellow-400" :
                    gameResult.winnerId === userId ? "text-green-400" : "text-red-400"
                  }`}>
                    {gameResult.isDraw ? "It's a Draw!" :
                     gameResult.winnerId === userId ? `You Won ${gameResult.payout} tokens!` : "You Lost!"}
                  </p>
                  
                  {isHost && (
                    <button
                      onClick={() => setShowStartRoundModal(true)}
                      className="mt-6 bg-white px-6 py-3 text-black font-semibold hover:bg-gray-200"
                    >
                      Start Next Round
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* No active round */
            <div className="bg-gray-900 p-6 border border-white/20 text-center">
              <p className="text-gray-400 mb-4">No active round</p>
              {isHost && (
                <button
                  onClick={() => setShowStartRoundModal(true)}
                  className="bg-white px-6 py-3 text-black font-semibold hover:bg-gray-200"
                >
                  Start a Round
                </button>
              )}
              {!isHost && (
                <p className="text-sm text-gray-500">Waiting for host to start a round...</p>
              )}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Video Panel */}
          <div className="bg-gray-900 border border-white/20">
            <div className="flex items-center justify-between p-3 border-b border-white/10">
              <h3 className="text-sm font-semibold text-white">📹 Video Chat</h3>
              <button
                onClick={() => setVideoEnabled(!videoEnabled)}
                className={`text-xs px-2 py-1 rounded ${
                  videoEnabled 
                    ? "bg-green-900 text-green-400" 
                    : "bg-gray-700 text-gray-400"
                }`}
              >
                {videoEnabled ? "On" : "Off"}
              </button>
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
              <div className="p-4 text-center text-gray-500 text-sm">
                Video is disabled. Click "On" to enable.
              </div>
            )}
          </div>

          {/* Participants */}
          <div className="bg-gray-900 p-4 border border-white/20">
            <h3 className="text-lg font-semibold text-white mb-3">Participants</h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {room.participants.map((p) => (
                <div
                  key={p.odUserId}
                  className={`p-3 bg-gray-800 border ${
                    p.odUserId === userId ? "border-green-500" : "border-white/10"
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-white font-semibold">
                        {p.displayName}
                        {p.role === "HOST" && <span className="ml-2 text-yellow-400 text-xs">👑 HOST</span>}
                        {p.odUserId === userId && <span className="ml-2 text-green-400 text-xs">(You)</span>}
                      </p>
                      <p className="text-xs text-gray-500">@{p.username}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-yellow-400 font-semibold">{p.walletBalance}</p>
                      <p className="text-xs text-gray-500">tokens</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Invite Friends */}
          <div className="bg-gray-900 p-4 border border-white/20">
            <h3 className="text-sm font-semibold text-gray-400 mb-3">📨 Invite Friends</h3>
            <p className="text-xs text-gray-500 mb-3">Share this link to invite friends to join your room:</p>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={getInviteLink()}
                className="flex-1 bg-black px-3 py-2 text-xs text-gray-300 border border-white/20 truncate"
              />
              <button
                onClick={copyInviteLink}
                className={`px-3 py-2 text-sm font-semibold transition-colors ${
                  inviteLinkCopied 
                    ? "bg-green-600 text-white" 
                    : "bg-white text-black hover:bg-gray-200"
                }`}
              >
                {inviteLinkCopied ? "✓ Copied!" : "Copy"}
              </button>
            </div>
            {room?.participants && room.participantCount < room.maxMembers && (
              <p className="text-xs text-gray-500 mt-2">
                {room.maxMembers - room.participantCount} spot{room.maxMembers - room.participantCount !== 1 ? "s" : ""} remaining
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="bg-gray-900 p-4 border border-white/20">
            <h3 className="text-sm font-semibold text-gray-400 mb-3">Actions</h3>
            <div className="space-y-2">
              <button
                onClick={handleLeaveRoom}
                className="w-full py-2 bg-gray-800 text-white border border-white/30 hover:bg-gray-700"
              >
                Leave Room
              </button>
              {isHost && (
                <button
                  onClick={handleEndRoom}
                  className="w-full py-2 bg-red-900 text-red-400 border border-red-500 hover:bg-red-800"
                >
                  End Room
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Start Round Modal */}
      {showStartRoundModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 p-6 border border-white/20 max-w-sm w-full">
            <h2 className="text-xl font-semibold text-white mb-4">Start New Round</h2>
            
            <div className="mb-4">
              <label className="block text-sm text-gray-400 mb-1">Entry Fee (tokens)</label>
              <input
                type="number"
                min="0"
                value={roundEntryFee}
                onChange={(e) => setRoundEntryFee(parseInt(e.target.value) || 0)}
                className="w-full bg-black px-3 py-2 text-white border border-white/30"
              />
              <p className="text-xs text-gray-500 mt-1">
                Set to 0 for free round. Winner takes all!
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowStartRoundModal(false)}
                className="flex-1 py-2 bg-gray-800 text-white border border-white/30 hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleStartRound}
                disabled={startingRound}
                className="flex-1 py-2 bg-white text-black font-semibold hover:bg-gray-200 disabled:opacity-50"
              >
                {startingRound ? "Starting..." : "Start Round"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
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
        <p className="text-sm text-gray-400 mb-1">
          You are: <span className={mySymbol === "X" ? "text-blue-400 font-bold" : "text-red-400 font-bold"}>{mySymbol}</span>
        </p>
        {!gameEnded && (
          <p className={`text-lg font-semibold ${isMyTurn ? "text-green-400" : "text-yellow-400"}`}>
            {isMyTurn ? "Your Turn!" : `${getPlayerName(isMyTurn ? "" : (gameState.currentTurn === "X" ? gameState.playerX : gameState.playerO))}'s Turn`}
          </p>
        )}
      </div>

      {/* Board */}
      <div className="flex justify-center mb-4">
        <div className={`grid grid-cols-3 gap-2 p-3 rounded ${
          gameEnded ? "bg-gray-700" : isMyTurn ? "bg-green-900/30 ring-2 ring-green-500" : "bg-gray-700"
        }`}>
          {gameState.board.map((cell: string | null, index: number) => (
            <button
              key={index}
              onClick={() => !gameEnded && isMyTurn && !cell && onMove(index)}
              disabled={gameEnded || !isMyTurn || !!cell}
              className={`
                w-16 h-16 text-3xl font-bold flex items-center justify-center
                transition-all duration-200 border border-gray-500
                ${!cell && !gameEnded && isMyTurn ? "bg-gray-600 hover:bg-gray-500" : "bg-gray-700"}
                ${isWinningCell(index) ? "bg-green-600 ring-2 ring-green-400 animate-pulse" : ""}
                ${cell === "X" ? "text-blue-400" : "text-red-400"}
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

