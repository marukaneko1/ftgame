"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { io, Socket } from "socket.io-client";
import type { ICameraVideoTrack, IMicrophoneAudioTrack, IAgoraRTCClient, IAgoraRTCRemoteUser, NetworkQuality } from "agora-rtc-sdk-ng";
import { api, videoApi, usersApi, walletApi } from "@/lib/api";
import dynamic from "next/dynamic";
import TicTacToeGame from "@/components/games/TicTacToeGame";
import ChessGame from "@/components/games/ChessGame";
import TriviaGame from "@/components/games/TriviaGame";
import TruthsAndLieGame from "@/components/games/TruthsAndLieGame";
import PokerGame from "@/components/games/PokerGame";
import TwentyOneQuestionsGame from "@/components/games/TwentyOneQuestionsGame";
import BackButton from "@/components/BackButton";
import { Button, IconButton } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { Modal, ModalHeader, ModalTitle, ModalBody, ModalFooter } from "@/components/ui/Modal";
import { Input, Textarea } from "@/components/ui/Input";

// Dynamic import for BilliardsGameV2 to avoid SSR issues with Three.js
const BilliardsGameV2 = dynamic(() => import("@/components/games/BilliardsGameV2"), {
  ssr: false,
  loading: () => (
    <div className="bg-surface-primary rounded-lg border border-border-default p-6 text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent mx-auto mb-4"></div>
      <p className="text-txt-secondary">Loading 8-Ball Pool...</p>
    </div>
  ),
});

// Configurable WebSocket URL
import { getWebSocketUrl } from "@/lib/ws-config";

const WS_URL = getWebSocketUrl();

interface SessionData {
  sessionId: string;
  peer: { id: string };
  video: { channelName: string; token: string; expiresAt?: string } | null;
}

interface RemoteUserInfo {
  uid: string | number;
  hasVideo: boolean;
  hasAudio: boolean;
}

interface NetworkQualityState {
  uplink: number; // 0-6: unknown, excellent, good, poor, bad, very bad, down
  downlink: number;
}

export default function SessionPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [gameType, setGameType] = useState<string | null>(null);
  const [gameId, setGameId] = useState<string | null>(null);
  const [gameState, setGameState] = useState<any>(null);
  const [gamePlayers, setGamePlayers] = useState<any[]>([]);
  const [videoReady, setVideoReady] = useState(false);
  const [error, setError] = useState<string>("");
  const [localVideoActive, setLocalVideoActive] = useState(false);
  const [remoteVideoActive, setRemoteVideoActive] = useState(false);
  const [videosSwapped, setVideosSwapped] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Floating PiP state for when playing games
  const [pipPosition, setPipPosition] = useState({ x: 20, y: 20 });
  const [pipSize, setPipSize] = useState({ width: 280, height: 210 }); // Resizable size
  const [isDraggingPip, setIsDraggingPip] = useState(false);
  const [isResizingPip, setIsResizingPip] = useState(false);
  const [pipMinimized, setPipMinimized] = useState(false);
  const pipDragOffset = useRef({ x: 0, y: 0 });
  const pipResizeStart = useRef({ width: 0, height: 0, mouseX: 0, mouseY: 0 });
  const floatingPipRef = useRef<HTMLDivElement>(null);
  const pipVideoRef = useRef<HTMLDivElement>(null);
  const [pipVideoAttached, setPipVideoAttached] = useState(false);
  const [pipModeActive, setPipModeActive] = useState(false); // When true, remote video plays in PiP
  const pipModeActiveRef = useRef(false); // Ref for closure access
  
  // Gift modal state
  const [giftModalOpen, setGiftModalOpen] = useState(false);
  const [giftAmount, setGiftAmount] = useState("");
  const [giftError, setGiftError] = useState("");
  const [giftSending, setGiftSending] = useState(false);
  
  // Report modal state
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportSending, setReportSending] = useState(false);
  
  // New state for audio/video controls
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  
  // New state for remote user info (fixes ref not triggering re-render)
  const [remoteUserInfo, setRemoteUserInfo] = useState<RemoteUserInfo | null>(null);
  
  // New state for network quality
  const [networkQuality, setNetworkQuality] = useState<NetworkQualityState>({ uplink: 0, downlink: 0 });
  
  // New state for session duration
  const [sessionDuration, setSessionDuration] = useState(0);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  
  // New state for connection status
  const [connectionState, setConnectionState] = useState<string>("DISCONNECTED");

  // Peer connection status
  const [peerConnected, setPeerConnected] = useState(false);

  // Wallet balance state
  const [walletBalance, setWalletBalance] = useState<number>(0);
  
  // Gift notification state
  const [giftNotification, setGiftNotification] = useState<{ from: string; amount: number; isReceived: boolean } | null>(null);
  const giftNotificationTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  const mainVideoRef = useRef<HTMLDivElement>(null);
  const overlayVideoRef = useRef<HTMLDivElement>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const localTrackRef = useRef<{ videoTrack: ICameraVideoTrack | null; audioTrack: IMicrophoneAudioTrack | null } | null>(null);
  const remoteTrackRef = useRef<IAgoraRTCRemoteUser | null>(null);
  const remoteUserRef = useRef<IAgoraRTCRemoteUser | null>(null);
  const videoCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const sessionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const tokenRenewalTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Use refs to track latest state values (fixes stale closure issue)
  const remoteVideoActiveRef = useRef(false);
  const localVideoActiveRef = useRef(false);
  
  // Ref to track current gameId for socket event handlers (avoids stale closure issues)
  const gameIdRef = useRef<string | null>(null);
  
  const [userId, setUserId] = useState<string>("");

  // Keep refs in sync with state (fixes stale closure issue in intervals)
  useEffect(() => {
    remoteVideoActiveRef.current = remoteVideoActive;
  }, [remoteVideoActive]);
  
  useEffect(() => {
    localVideoActiveRef.current = localVideoActive;
  }, [localVideoActive]);

  // Keep gameIdRef in sync with gameId state for socket handlers
  useEffect(() => {
    gameIdRef.current = gameId;
  }, [gameId]);

  // Audio mute/unmute toggle
  const toggleMute = useCallback(() => {
    if (localTrackRef.current?.audioTrack) {
      const newMuted = !isMuted;
      localTrackRef.current.audioTrack.setEnabled(!newMuted);
      setIsMuted(newMuted);
      console.log(newMuted ? "🔇 Audio muted" : "🔊 Audio unmuted");
    }
  }, [isMuted]);

  // Camera on/off toggle
  const toggleCamera = useCallback(() => {
    if (localTrackRef.current?.videoTrack) {
      const newCameraOff = !isCameraOff;
      localTrackRef.current.videoTrack.setEnabled(!newCameraOff);
      setIsCameraOff(newCameraOff);
      console.log(newCameraOff ? "📷 Camera off" : "📹 Camera on");
    }
  }, [isCameraOff]);

  // Session duration timer
  useEffect(() => {
    if (sessionStartTime) {
      sessionTimerRef.current = setInterval(() => {
        setSessionDuration(Math.floor((Date.now() - sessionStartTime) / 1000));
      }, 1000);
      
      return () => {
        if (sessionTimerRef.current) {
          clearInterval(sessionTimerRef.current);
        }
      };
    }
  }, [sessionStartTime]);

  // Format duration as mm:ss
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Network quality label
  const getNetworkQualityLabel = (quality: number): { label: string; color: string } => {
    switch (quality) {
      case 1: return { label: "Excellent", color: "text-success" };
      case 2: return { label: "Good", color: "text-success" };
      case 3: return { label: "Poor", color: "text-warning" };
      case 4: return { label: "Bad", color: "text-warning" };
      case 5: return { label: "Very Bad", color: "text-error" };
      case 6: return { label: "Down", color: "text-error" };
      default: return { label: "Unknown", color: "text-txt-muted" };
    }
  };

  // Get user ID and wallet balance on mount
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const [user, wallet] = await Promise.all([
          usersApi.getMe(),
          walletApi.getMyWallet()
        ]);
        setUserId(user.id);
        setWalletBalance(wallet?.balanceTokens || 0);
      } catch (err) {
        console.error("Failed to load user data:", err);
      }
    };
    loadUserData();
  }, []);
  
  // Show gift notification with auto-dismiss
  const showGiftNotification = useCallback((from: string, amount: number, isReceived: boolean) => {
    // Clear any existing timer
    if (giftNotificationTimerRef.current) {
      clearTimeout(giftNotificationTimerRef.current);
    }
    
    setGiftNotification({ from, amount, isReceived });
    
    // Auto-dismiss after 5 seconds
    giftNotificationTimerRef.current = setTimeout(() => {
      setGiftNotification(null);
    }, 5000);
  }, []);

  // Track the channel we're connected to to prevent reinitializing for the same session
  const connectedChannelRef = useRef<string | null>(null);

  // Initialize Agora video when session data is ready
  useEffect(() => {
    if (!sessionData?.video || !userId) {
      // Only log once when missing data, not on every render
      if (!sessionData?.video && !userId) {
        // Silently wait - will initialize once both are available
      }
      return;
    }

    // If video is null (Agora not configured), skip video initialization
    if (!sessionData.video) {
      console.log("Video not available (Agora not configured) - continuing without video");
      return;
    }

    // Prevent multiple initializations for the same channel
    // This handles WebSocket reconnections that resend session.ready
    if (clientRef.current && connectedChannelRef.current === sessionData.video.channelName) {
      console.log("Video already initialized for this channel, skipping");
      return;
    }
    
    // If we're connected to a different channel, clean up first
    if (clientRef.current && connectedChannelRef.current !== sessionData.video.channelName) {
      console.log("Channel changed, cleaning up old connection");
      // This will be handled by the cleanup function
    }

    let isMounted = true;
    let retryCount = 0;
    const MAX_RETRIES = 50; // Max 5 seconds of retries (50 * 100ms)
    let retryTimer: NodeJS.Timeout | null = null;

    // Wait for refs to be available (they might not be immediately after render)
    const checkAndInit = () => {
      if (!isMounted) {
        if (retryTimer) clearTimeout(retryTimer);
        return;
      }

      if (!mainVideoRef.current || !overlayVideoRef.current) {
        retryCount++;
        if (retryCount >= MAX_RETRIES) {
          console.error("Video refs never became available after", MAX_RETRIES, "retries");
          setError("Video containers failed to initialize. Please refresh the page.");
          retryTimer = null;
          return;
        }
        if (retryCount % 10 === 0) {
          console.log(`Waiting for video refs... (attempt ${retryCount}/${MAX_RETRIES})`);
        }
        retryTimer = setTimeout(checkAndInit, 100);
        return;
      }

      console.log("All conditions met, initializing video");
      retryTimer = null; // Clear timer since we're proceeding
      initVideo();
    };

    const initVideo = async () => {
      let appId: string = "";

      try {
        console.log("Starting video initialization...");
        setError("");
        
        // Get Agora App ID - gracefully handle missing credentials
        let appIdResponse: { appId: string | null };
        try {
          appIdResponse = await videoApi.getAppId();
        } catch (apiError: any) {
          // If API call fails (e.g., 500 error), assume Agora is not configured
          console.warn("⚠️ Agora App ID endpoint failed - video features will be disabled");
          console.warn("⚠️ Error:", apiError?.response?.data?.message || apiError?.message);
          appIdResponse = { appId: null };
        }
        
        appId = appIdResponse.appId || "";
        if (!appId) {
          console.warn("⚠️ Agora App ID not configured - video features will be disabled");
          console.warn("⚠️ Matchmaking and games will still work, but video calls won't be available");
          setError("Video features disabled: Agora credentials not configured. Matchmaking and games will still work.");
          // Skip video initialization but allow session to continue (games will work)
          if (isMounted) {
            setVideoReady(false); // Video not ready, but that's OK
          }
          return; // Skip video initialization but continue with session
        }

        console.log("Agora App ID:", appId);

        // Check if video data is available
        if (!sessionData.video) {
          console.warn("⚠️ Video session data not available - video features will be disabled");
          setError("Video session data not available. Matchmaking and games will still work.");
          if (isMounted) {
            setVideoReady(false);
          }
          return; // Skip video initialization but continue with session
        }

        // Dynamically import AgoraRTC to avoid SSR issues
        const AgoraRTC = (await import("agora-rtc-sdk-ng")).default;
        
        // Create Agora client
        const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
        clientRef.current = client;

        console.log("Joining channel:", sessionData.video.channelName);
        console.log("Using userId (account):", userId);
        console.log("App ID:", appId);
        // Token loaded successfully (not logging for security)
        
        // Join channel - when using buildTokenWithAccount, pass the account string as uid
        // The token contains the account info, so we pass the same userId
        await client.join(appId, sessionData.video.channelName, sessionData.video.token, userId);
        connectedChannelRef.current = sessionData.video.channelName;
        console.log("Successfully joined Agora channel");

        // Check for existing remote users immediately after joining
        const remoteUsers = client.remoteUsers;
        console.log("👥 Existing remote users in channel:", remoteUsers.length);
        if (remoteUsers.length > 0) {
          for (const remoteUser of remoteUsers) {
            console.log("👤 Found existing remote user:", remoteUser.uid);
            // Subscribe to existing remote user's tracks
            try {
              // Subscribe to both video and audio (handle errors gracefully if one isn't available)
              try {
              await client.subscribe(remoteUser, "video");
                console.log("✅ Subscribed to existing remote user video");
              } catch (videoError: any) {
                console.log("ℹ️ Video not available for existing user:", videoError?.message || "Unknown error");
              }
              
              try {
              await client.subscribe(remoteUser, "audio");
                console.log("✅ Subscribed to existing remote user audio");
              } catch (audioError: any) {
                console.log("ℹ️ Audio not available for existing user:", audioError?.message || "Unknown error");
              }
              
              console.log("✅ Finished subscribing to existing remote user tracks");
              remoteUserRef.current = remoteUser;
              // Update state for UI (refs don't trigger re-renders)
              setRemoteUserInfo({
                uid: remoteUser.uid,
                hasVideo: !!remoteUser.videoTrack,
                hasAudio: !!remoteUser.audioTrack
              });
              
              // Play audio immediately
              if (remoteUser.audioTrack) {
                remoteUser.audioTrack.play();
                console.log("🔊 Playing existing remote user's audio");
              }
              
              // Helper function to verify video is actually playing
              const verifyVideoPlaying = (videoElement: HTMLVideoElement | null): boolean => {
                if (!videoElement) return false;
                // Check if video element exists, is not paused, and has video data
                const isPlaying = !videoElement.paused && 
                                 videoElement.readyState >= 2 && // HAVE_CURRENT_DATA or higher
                                 videoElement.videoWidth > 0 && 
                                 videoElement.videoHeight > 0;
                return isPlaying;
              };
              
              // Multiple retries for video track to ensure it's ready
              const tryPlayRemoteVideo = (attempt = 0) => {
                if (!isMounted) {
                  console.log("⚠️ Component unmounted, stopping remote video retry");
                  return;
                }
                
                console.log(`🔄 Attempt ${attempt} to play existing remote video. Track:`, !!remoteUser.videoTrack, "Container:", !!mainVideoRef.current);
                
                if (remoteUser.videoTrack && mainVideoRef.current) {
                  try {
                    // Stop any existing playback
                    try {
                      remoteUser.videoTrack.stop();
                    } catch (e) {
                      // Ignore
                    }
                    
                    // @ts-ignore
                    remoteUser.videoTrack.play(mainVideoRef.current);
                    
                    // Verify video element was created and is actually playing
                    setTimeout(() => {
                      const videoElement = mainVideoRef.current?.querySelector('video') as HTMLVideoElement;
                      if (videoElement && verifyVideoPlaying(videoElement)) {
                        console.log("✅ Existing remote video element created and playing. Dimensions:", videoElement.videoWidth, "x", videoElement.videoHeight);
                        setRemoteVideoActive(true);
                      } else if (videoElement) {
                        // Element exists but not playing - try to fix it
                        console.warn("⚠️ Video element exists but not playing properly. Attempting fix...");
                        try {
                          videoElement.play().catch(() => {
                            // If play() fails, retry
                            if (attempt < 8) {
                              setTimeout(() => tryPlayRemoteVideo(attempt + 1), 300);
                            }
                          });
                          // Check again after a moment
                          setTimeout(() => {
                            if (verifyVideoPlaying(videoElement)) {
                              setRemoteVideoActive(true);
                            } else if (attempt < 8) {
                              setTimeout(() => tryPlayRemoteVideo(attempt + 1), 300);
                            }
                          }, 500);
                        } catch (e) {
                          if (attempt < 8) {
                            setTimeout(() => tryPlayRemoteVideo(attempt + 1), 300);
                          }
                        }
                      } else {
                        console.error("❌ Video element not found after play()");
                        if (attempt < 8) {
                          setTimeout(() => tryPlayRemoteVideo(attempt + 1), 500);
                        }
                      }
                    }, 300);
                    
                    console.log("✅ Playing existing remote user's video in main container (attempt", attempt + ")");
                  } catch (playError: any) {
                    console.error(`❌ Error playing existing remote video (attempt ${attempt}):`, playError?.message || playError);
                    if (attempt < 12) {
                      setTimeout(() => tryPlayRemoteVideo(attempt + 1), Math.min(300 * (attempt + 1), 2000));
                    }
                  }
                } else if (attempt < 20) {
                  console.log(`⏳ Video track or container not ready (track: ${!!remoteUser.videoTrack}, container: ${!!mainVideoRef.current})`);
                  setTimeout(() => tryPlayRemoteVideo(attempt + 1), Math.min(150 * (attempt + 1), 1000));
                } else {
                  console.error("❌ Remote video track never became available");
                }
              };
              
              // Start trying to play video immediately and with retries
              setTimeout(() => tryPlayRemoteVideo(), 100);
              
              // Also set up a one-time check after a longer delay to catch missed cases
              setTimeout(() => {
                if (isMounted && remoteUser.videoTrack && mainVideoRef.current && !remoteVideoActiveRef.current) {
                  console.log("🔄 Delayed check: Attempting to play existing remote video");
                  tryPlayRemoteVideo(0);
                }
              }, 2000);
              
            } catch (subError: any) {
              console.error("❌ Error subscribing to existing remote user:", subError?.message || subError);
            }
          }
        } else {
          console.log("⏳ No existing remote users, waiting for user-published event");
        }

        // Create and publish local video/audio tracks
        console.log("Requesting camera and microphone access...");
        
        try {
          const [micTrack, camTrack] = await AgoraRTC.createMicrophoneAndCameraTracks(
            {},
            {
              encoderConfig: {
                width: { min: 640, ideal: 1280, max: 1920 },
                height: { min: 480, ideal: 720, max: 1080 },
                frameRate: { min: 15, ideal: 30, max: 30 }
              }
            }
          );
          
          // Note: createMicrophoneAndCameraTracks returns [IMicrophoneAudioTrack, ICameraVideoTrack]
          const audioTrack = micTrack;
          const videoTrack = camTrack;
          
          localTrackRef.current = { videoTrack, audioTrack };
          console.log("Tracks created successfully");
          
          await client.publish([micTrack, camTrack]);
          console.log("Tracks published to channel");

          // Display local video in overlay container (small corner by default)
          // Retry multiple times to ensure the ref is ready
          const tryPlayLocalVideo = (attempt = 0) => {
            if (!isMounted || !videoTrack) return;
            
            if (overlayVideoRef.current) {
              try {
                // @ts-ignore - Agora SDK play() accepts HTMLElement but types may be outdated
                videoTrack.play(overlayVideoRef.current);
                console.log("Local video playing in overlay container");
                setLocalVideoActive(true);
              } catch (playError) {
                console.error(`Error playing local video (attempt ${attempt}):`, playError);
                if (attempt < 5) {
                  setTimeout(() => tryPlayLocalVideo(attempt + 1), 100 * (attempt + 1));
                }
              }
            } else if (attempt < 10) {
              // Ref not ready yet, retry
              setTimeout(() => tryPlayLocalVideo(attempt + 1), 50 * (attempt + 1));
            } else {
              console.error("Local video ref never became available");
            }
          };
          
          tryPlayLocalVideo();
        } catch (trackError: any) {
          console.error("Failed to create/publish local tracks:", trackError);
          if (trackError.message?.includes("permission") || trackError.name === "NotAllowedError") {
            setError("Camera or microphone permission denied. Please allow access in your browser settings and refresh the page.");
          } else if (trackError.name === "NotFoundError" || trackError.name === "NotReadableError") {
            setError("Camera or microphone not found or already in use. Please check your devices.");
          } else {
            setError(`Failed to access camera/microphone: ${trackError.message || trackError.name}`);
          }
          // Continue even if local video fails - user can still see remote video
          localTrackRef.current = { videoTrack: null, audioTrack: null };
        }

        // Handle remote user joining after we've joined
        client.on("user-published", async (user, mediaType) => {
          console.log("🔔 Remote user published:", mediaType, "User ID:", user.uid);
          try {
            // Subscribe to the specific media type that was published
            await client.subscribe(user, mediaType);
            console.log("✅ Subscribed to", mediaType, "for user", user.uid);
            
            // Also try to subscribe to the other media type if it might be available
            // This handles cases where video and audio are published separately
            const otherMediaType = mediaType === "video" ? "audio" : "video";
            try {
              await client.subscribe(user, otherMediaType);
              console.log("✅ Also subscribed to", otherMediaType, "for user", user.uid);
            } catch (e: any) {
              // It's okay if the other media type isn't available yet
              // It will be subscribed when it's published
              console.log("ℹ️", otherMediaType, "not available yet for user", user.uid, "- will subscribe when published");
            }
            
            remoteUserRef.current = user;
            // Update state for UI (refs don't trigger re-renders)
            setRemoteUserInfo(prev => ({
              uid: user.uid,
              hasVideo: mediaType === "video" ? true : (prev?.hasVideo || !!user.videoTrack),
              hasAudio: mediaType === "audio" ? true : (prev?.hasAudio || !!user.audioTrack)
            }));
            
            // Play audio immediately if available
            if (user.audioTrack) {
              user.audioTrack.play();
              console.log("🔊 Remote audio playing for user:", user.uid);
            }
            
            // For video, try multiple times with exponential backoff
            if (user.videoTrack) {
              console.log("📹 Video track available:", !!user.videoTrack, "Main container:", !!mainVideoRef.current);
              
              // Helper function to verify video is actually playing
              const verifyVideoPlaying = (videoElement: HTMLVideoElement | null): boolean => {
                if (!videoElement) return false;
                // Check if video element exists, is not paused, and has video data
                const isPlaying = !videoElement.paused && 
                                 videoElement.readyState >= 2 && // HAVE_CURRENT_DATA or higher
                                 videoElement.videoWidth > 0 && 
                                 videoElement.videoHeight > 0;
                return isPlaying;
              };
              
              const tryPlayVideo = (attempt = 0) => {
                if (!isMounted) {
                  console.log("⚠️ Component unmounted, stopping video retry");
                  return;
                }
                
                console.log(`🔄 Attempt ${attempt} to play remote video. Track:`, !!user.videoTrack, "Container:", !!mainVideoRef.current);
                
                if (user.videoTrack && mainVideoRef.current) {
                  try {
                    // Stop any existing video first
                    try {
                      user.videoTrack.stop();
                    } catch (e) {
                      // Ignore if not playing
                    }
                    
                    // @ts-ignore
                    user.videoTrack.play(mainVideoRef.current);
                    
                    // Verify video element was created and is actually playing
                    setTimeout(() => {
                      const videoElement = mainVideoRef.current?.querySelector('video') as HTMLVideoElement;
                      if (videoElement && verifyVideoPlaying(videoElement)) {
                        console.log("✅ Remote video element created and playing. Video dimensions:", videoElement.videoWidth, "x", videoElement.videoHeight);
                        setRemoteVideoActive(true);
                      } else if (videoElement) {
                        // Element exists but not playing - try to fix it
                        console.warn("⚠️ Video element exists but not playing properly. Attempting fix...");
                        try {
                          videoElement.play().catch(() => {
                            // If play() fails, retry
                            if (attempt < 8) {
                              setTimeout(() => tryPlayVideo(attempt + 1), 300);
                            }
                          });
                          // Check again after a moment
                          setTimeout(() => {
                            if (verifyVideoPlaying(videoElement)) {
                              setRemoteVideoActive(true);
                            } else if (attempt < 8) {
                              setTimeout(() => tryPlayVideo(attempt + 1), 300);
                            }
                          }, 500);
                        } catch (e) {
                          if (attempt < 8) {
                            setTimeout(() => tryPlayVideo(attempt + 1), 300);
                          }
                        }
                      } else {
                        console.error("❌ Video element not found in container after play()");
                        if (attempt < 8) {
                          setTimeout(() => tryPlayVideo(attempt + 1), 500);
                        }
                      }
                    }, 300);
                    
                    console.log("✅ Remote video play() called for user:", user.uid, "in main container (attempt", attempt + ")");
                  } catch (playError: any) {
                    console.error(`❌ Error playing remote video (attempt ${attempt}):`, playError?.message || playError);
                    if (attempt < 12) {
                      setTimeout(() => tryPlayVideo(attempt + 1), Math.min(300 * (attempt + 1), 2000));
                    } else {
                      console.error("❌ Failed to play remote video after", attempt, "attempts");
                    }
                  }
                } else {
                  console.log(`⏳ Video track or container not ready (track: ${!!user.videoTrack}, container: ${!!mainVideoRef.current})`);
                  if (attempt < 20) {
                    setTimeout(() => tryPlayVideo(attempt + 1), Math.min(150 * (attempt + 1), 1000));
                  } else {
                    console.error("❌ Remote video track or container never became available after", attempt, "attempts");
                  }
                }
              };
              
              // Start trying immediately and with retries
              setTimeout(() => tryPlayVideo(), 100);
              
              // Also set up a one-time check after a longer delay to catch missed cases
              setTimeout(() => {
                if (isMounted && user.videoTrack && mainVideoRef.current && !remoteVideoActiveRef.current) {
                  console.log("🔄 Delayed check: Attempting to play remote video");
                  tryPlayVideo(0);
                }
              }, 2000);
            }
          } catch (subError: any) {
            console.error("❌ Error subscribing to remote user:", subError?.message || subError);
            // Retry subscription after a short delay
            setTimeout(async () => {
              try {
                await client.subscribe(user, mediaType);
                console.log("✅ Retry: Subscribed to", mediaType, "for user", user.uid);
                // Try to play the track if it's now available
                if (mediaType === "video" && user.videoTrack && mainVideoRef.current) {
                  user.videoTrack.play(mainVideoRef.current);
                } else if (mediaType === "audio" && user.audioTrack) {
                  user.audioTrack.play();
                }
              } catch (retryError) {
                console.error("❌ Retry subscription also failed:", retryError);
              }
            }, 1000);
          }
        });

        client.on("user-unpublished", (user) => {
          console.log("Remote user unpublished:", user.uid);
          setRemoteVideoActive(false);
          if (user.videoTrack) {
            user.videoTrack.stop();
          }
          if (user.audioTrack) {
            user.audioTrack.stop();
          }
        });
        
        // Also listen for track-ended events
        client.on("user-left", (user) => {
          console.log("Remote user left:", user.uid);
          setRemoteVideoActive(false);
        });

        // Periodic check to ensure videos are playing (fallback for edge cases)
        videoCheckIntervalRef.current = setInterval(() => {
          if (!isMounted || !clientRef.current) {
            if (videoCheckIntervalRef.current) {
              clearInterval(videoCheckIntervalRef.current);
              videoCheckIntervalRef.current = null;
            }
            return;
          }
          
          // Check for remote users we might have missed subscribing to
          const remoteUsers = clientRef.current.remoteUsers;
          for (const remoteUser of remoteUsers) {
            // If we don't have a reference to this user, or if tracks are missing, try to subscribe
            if (!remoteUserRef.current || remoteUserRef.current.uid !== remoteUser.uid) {
              // New user detected, try to subscribe to both tracks
              if (!remoteUser.videoTrack) {
                clientRef.current.subscribe(remoteUser, "video").catch((e: any) => {
                  console.log("ℹ️ Periodic check: Video not available for user", remoteUser.uid);
                });
              }
              if (!remoteUser.audioTrack) {
                clientRef.current.subscribe(remoteUser, "audio").catch((e: any) => {
                  console.log("ℹ️ Periodic check: Audio not available for user", remoteUser.uid);
                });
              }
              remoteUserRef.current = remoteUser;
              setRemoteUserInfo({
                uid: remoteUser.uid,
                hasVideo: !!remoteUser.videoTrack,
                hasAudio: !!remoteUser.audioTrack
              });
            } else {
              // User is known, but check if we're missing tracks
              if (remoteUser.videoTrack && !remoteUserRef.current.videoTrack) {
                console.log("🔄 Periodic check: Found video track for known user, subscribing...");
                clientRef.current.subscribe(remoteUser, "video").catch((e: any) => {
                  console.log("ℹ️ Periodic check: Could not subscribe to video", e?.message);
                });
              }
              if (remoteUser.audioTrack && !remoteUserRef.current.audioTrack) {
                console.log("🔄 Periodic check: Found audio track for known user, subscribing...");
                clientRef.current.subscribe(remoteUser, "audio").catch((e: any) => {
                  console.log("ℹ️ Periodic check: Could not subscribe to audio", e?.message);
                });
              }
            }
          }
          
          // Check local video - try to attach if track exists and container is available
          if (localTrackRef.current?.videoTrack && overlayVideoRef.current) {
            // Check if video is actually playing by checking the element
            const hasVideoElement = overlayVideoRef.current.querySelector('video');
            if (!hasVideoElement || hasVideoElement.paused) {
              try {
                // @ts-ignore
                localTrackRef.current.videoTrack.play(overlayVideoRef.current);
                console.log("Re-attached local video (periodic check)");
                setLocalVideoActive(true);
              } catch (e) {
                // Video might already be attached
              }
            }
          }
          
          // Check remote video - try to attach if track exists
          // Skip periodic video attachment if PiP mode is active (PiP effect handles it)
          if (remoteUserRef.current?.videoTrack && !pipModeActiveRef.current) {
            if (mainVideoRef.current) {
              // Check if video is actually playing by checking the element
              const videoElement = mainVideoRef.current.querySelector('video') as HTMLVideoElement;
              const isVideoActuallyPlaying = videoElement && 
                                           !videoElement.paused && 
                                           videoElement.readyState >= 2 && // HAVE_CURRENT_DATA or higher
                                           videoElement.videoWidth > 0 && 
                                           videoElement.videoHeight > 0;
              
              if (!isVideoActuallyPlaying) {
                try {
                  // Stop first to ensure clean state
                  try {
                    remoteUserRef.current.videoTrack.stop();
                  } catch (e) {
                    // Ignore
                  }
                  
                  // @ts-ignore
                  remoteUserRef.current.videoTrack.play(mainVideoRef.current);
                  console.log("🔄 Re-attached remote video (periodic check)");
                  
                  // Verify it worked - check multiple times
                  let verifyAttempts = 0;
                  const verifyInterval = setInterval(() => {
                    verifyAttempts++;
                    const newVideoElement = mainVideoRef.current?.querySelector('video') as HTMLVideoElement;
                    const isNowPlaying = newVideoElement && 
                                        !newVideoElement.paused && 
                                        newVideoElement.readyState >= 2 &&
                                        newVideoElement.videoWidth > 0 && 
                                        newVideoElement.videoHeight > 0;
                    
                    if (isNowPlaying) {
                      setRemoteVideoActive(true);
                      console.log("✅ Remote video verified playing (periodic check)");
                      clearInterval(verifyInterval);
                    } else if (verifyAttempts >= 5) {
                      // Try to force play if it's not working
                      if (newVideoElement) {
                        newVideoElement.play().catch(() => {
                          console.warn("Could not play video element");
                        });
                      }
                      clearInterval(verifyInterval);
                    }
                  }, 200);
                } catch (e: any) {
                  console.error("❌ Error re-attaching remote video:", e?.message);
                }
              } else {
                // Video is playing, ensure state is correct (use ref to avoid stale closure)
                if (!remoteVideoActiveRef.current) {
                  setRemoteVideoActive(true);
                }
              }
            }
          } else if (remoteUserRef.current?.videoTrack && pipModeActiveRef.current) {
            // In PiP mode - just ensure remoteVideoActive state is set
            if (!remoteVideoActiveRef.current) {
              setRemoteVideoActive(true);
            }
          }
        }, 2000); // Check every 2 seconds
        
        // Network quality monitoring
        client.on("network-quality", (stats) => {
          setNetworkQuality({
            uplink: stats.uplinkNetworkQuality,
            downlink: stats.downlinkNetworkQuality
          });
        });
        
        // Connection state tracking
        client.on("connection-state-change", (curState, prevState) => {
          console.log(`📡 Connection state: ${prevState} -> ${curState}`);
          setConnectionState(curState);
          
          if (curState === "CONNECTED") {
            // Start session timer when connected
            if (!sessionStartTime) {
              setSessionStartTime(Date.now());
            }
          }
          
          if (curState === "DISCONNECTED" || curState === "DISCONNECTING" || (curState as string) === "FAILED") {
            if (videoCheckIntervalRef.current) {
              clearInterval(videoCheckIntervalRef.current);
              videoCheckIntervalRef.current = null;
            }
            
            // Attempt reconnection if disconnected unexpectedly
            if (curState === "DISCONNECTED" && prevState === "CONNECTED") {
              console.log("🔄 Connection lost, attempting to reconnect...");
              setError("Connection lost. Attempting to reconnect...");
              // Agora SDK will attempt to reconnect automatically
            }
          }
        });
        
        // Token renewal setup (5 minutes before expiry) - only if video is available
        if (sessionData.video?.expiresAt) {
          const expiresAt = new Date(sessionData.video.expiresAt).getTime();
          const now = Date.now();
          const renewIn = expiresAt - now - (5 * 60 * 1000); // 5 min before expiry
          
          if (renewIn > 0) {
            console.log(`⏰ Token renewal scheduled in ${Math.floor(renewIn / 1000 / 60)} minutes`);
            tokenRenewalTimerRef.current = setTimeout(async () => {
              try {
                console.log("🔄 Renewing Agora token...");
                const response = await videoApi.getToken(sessionId);
                if (response.token && clientRef.current) {
                  await clientRef.current.renewToken(response.token);
                  console.log("✅ Token renewed successfully");
                  setError("");
                }
              } catch (renewError: any) {
                console.error("❌ Failed to renew token:", renewError);
                setError("Video session may expire soon. Please refresh if issues occur.");
              }
            }, renewIn);
          }
        }

        if (isMounted) {
          setVideoReady(true);
          console.log("Video initialization complete!");
        }
      } catch (error: any) {
        console.error("❌ Failed to initialize video:", error);
        let errorMsg = error.message || error.toString() || "Failed to start video call";
        
        // Provide more helpful error messages
        if (errorMsg.includes("invalid vendor key") || errorMsg.includes("can not find appid")) {
          errorMsg = "Invalid Agora App ID or Certificate. Please verify your Agora credentials match in the Agora console. Check AGORA_APP_ID and AGORA_APP_CERTIFICATE in api/.env";
        } else if (errorMsg.includes("permission") || errorMsg.includes("Permission")) {
          errorMsg = "Camera or microphone permission denied. Please allow access in your browser settings.";
        } else if (errorMsg.includes("NotFoundError") || errorMsg.includes("NotReadableError")) {
          errorMsg = "Camera or microphone not found or already in use.";
        }
        
        // Don't show alert for missing Agora credentials - just log and continue
        if (errorMsg.includes("AGORA_APP_ID") || errorMsg.includes("Agora credentials missing")) {
          console.warn("⚠️ Agora not configured - continuing without video. Games and matchmaking still work!");
          setError("Video disabled: Agora credentials not configured. Games and matchmaking still work!");
        } else {
          setError(`Video error: ${errorMsg}`);
          // Only show alert for actual errors, not missing configuration
          if (errorMsg.includes("permission") || errorMsg.includes("camera") || errorMsg.includes("microphone")) {
            alert(`Video call setup failed: ${errorMsg}\n\nGames and matchmaking will still work.`);
          }
        }
        console.error("Full error details:", error);
        if (appId) {
          console.error("App ID used:", appId);
        }
        if (sessionData?.video?.channelName) {
          console.error("Channel:", sessionData.video.channelName);
        } else {
          console.warn("Video data not available (may be null due to missing Agora config)");
        }
      }
    };

    // Start the initialization check after a short delay to ensure refs are attached
    const timer = setTimeout(() => {
      checkAndInit();
    }, 300);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      if (retryTimer) {
        clearTimeout(retryTimer);
        retryTimer = null;
      }

      // Cleanup on unmount
      if (localTrackRef.current) {
        localTrackRef.current.videoTrack?.stop();
        localTrackRef.current.videoTrack?.close();
        localTrackRef.current.audioTrack?.stop();
        localTrackRef.current.audioTrack?.close();
        localTrackRef.current = null;
      }
      if (clientRef.current) {
        clientRef.current.leave();
        clientRef.current = null;
      }
      connectedChannelRef.current = null;
      if (videoCheckIntervalRef.current) {
        clearInterval(videoCheckIntervalRef.current);
        videoCheckIntervalRef.current = null;
      }
      if (tokenRenewalTimerRef.current) {
        clearTimeout(tokenRenewalTimerRef.current);
        tokenRenewalTimerRef.current = null;
      }
    };
  }, [sessionData, userId, sessionId]);

  useEffect(() => {
    // Get token from localStorage - this is the source of truth
    let token: string | null = localStorage.getItem("accessToken");
    if (!token) {
      console.warn("[SessionPage] No token found in localStorage, redirecting to login");
      router.push("/auth/login");
      return;
    }

    // Try to refresh token before connecting (in case it's expired)
    // But don't fail if refresh doesn't work - use existing token for WebSocket
    const refreshToken = async (): Promise<string | null> => {
      try {
        const refreshResponse = await api.post("/auth/refresh", {});
        if (refreshResponse.data?.accessToken) {
          const newToken = refreshResponse.data.accessToken as string;
          localStorage.setItem("accessToken", newToken);
          console.log("[SessionPage] Token refreshed before WebSocket connection");
          return newToken;
        }
        return token; // Return existing token if refresh response has no token
      } catch (refreshError: any) {
        // Don't redirect if refresh fails - cross-origin cookies might not work
        // The existing token might still be valid for WebSocket connections
        if (refreshError.response?.status === 401 || refreshError.response?.status === 403) {
          console.warn("[SessionPage] Token refresh failed (likely cross-origin cookie issue) - continuing with existing token");
          // Return existing token - don't fail
          return token;
        } else {
          console.warn("[SessionPage] Token refresh failed (non-critical), using existing token");
          return token;
        }
      }
    };

    // Refresh token and then connect
    refreshToken().then((finalToken) => {
      // Use the token returned from refreshToken (which falls back to original token)
      const tokenToUse = finalToken || token || localStorage.getItem("accessToken");
      
      if (!tokenToUse) {
        console.error("[SessionPage] No token available after refresh attempt, redirecting to login");
        router.push("/auth/login");
        return;
      }
      
      // Update token variable to use the final token
      token = tokenToUse;

      // Connect to WebSocket (using configurable URL)
      // Allow fallback to polling if websocket fails
      const ws = io(`${WS_URL}/ws`, {
        auth: { token },
        transports: ["websocket", "polling"], // Allow fallback to polling
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000
      });

      // Track if we've already joined the session
      let hasJoinedSession = false;
    
    ws.on("connect", () => {
      console.log("WebSocket connected");
      setConnected(true);
      setError("");
      // Only join session if we haven't already (prevents rejoining on reconnect)
      if (!hasJoinedSession) {
        console.log("Joining session:", sessionId);
        // Wait a bit for connection to stabilize
        setTimeout(() => {
          ws.emit("session.join", { sessionId });
          hasJoinedSession = true;
        }, 100);
      } else {
        console.log("Already joined session, skipping rejoin on reconnect");
      }
    });

    ws.on("connect_error", (err) => {
      console.error("Connection error:", err);
      setError(`Connection failed: ${err.message}`);
    });

    ws.on("disconnect", (reason) => {
      console.log("WebSocket disconnected:", reason);
      setConnected(false);
      // Only show error for unexpected disconnects
      if (reason !== "io client disconnect") {
        setError("Disconnected from server");
      }
    });

    ws.on("session.ready", (data: any) => {
      console.log("Session ready:", data);
      setSessionData(data);
      setPeerConnected(true); // Peer is ready (we received session.ready with peer info)
      setError(""); // Clear any errors when session is ready
    });

    ws.on("session.peerJoined", (data: any) => {
      console.log("Peer joined session:", data);
      // Update session data to reflect peer connection (use functional update to avoid stale closure)
      setSessionData(prev => {
        if (prev && data.sessionId === prev.sessionId) {
          setPeerConnected(true); // Mark peer as connected
          setError(""); // Clear errors - peer is connected
          console.log("✅ Peer is now connected!");
          return {
            ...prev,
            peer: { id: data.peer?.id || data.peerId || data.userId || prev.peer.id }
          };
        }
        return prev;
      });
    });

    ws.on("session.startGame", (data: { gameType: string; gameId?: string }) => {
      console.log("Game started (legacy):", data);
      setGameType(data.gameType);
      if (data.gameId) {
        setGameId(data.gameId);
        gameIdRef.current = data.gameId;
      }
    });

    ws.on("session.gameCreated", (data: { gameId: string; gameType: string }) => {
      console.log("Game created:", data);
      setGameType(data.gameType);
      setGameId(data.gameId);
      gameIdRef.current = data.gameId;
    });

    // Handle game.started event with full game data
    ws.on("game.started", (data: { gameId: string; gameType: string; state: any; players: any[] }) => {
      console.log("Game started with state:", data);
      console.log("Game type:", data.gameType, "Game ID:", data.gameId);
      setGameType(data.gameType);
      setGameId(data.gameId);
      // Also update ref immediately to avoid race conditions with other socket events
      gameIdRef.current = data.gameId;
      setGameState(data.state);
      setGamePlayers(data.players);
    });

          // Handle game state updates (for chess and other games)
          ws.on("game.stateUpdate", (data: { gameId: string; state: any; lastMove?: any }) => {
            console.log("Game state updated:", data);
            // Use ref to avoid stale closure - gameIdRef.current always has latest value
            if (data.gameId === gameIdRef.current) {
              console.log("[SessionPage] Setting game state from game.stateUpdate:", data.state);
              setGameState(data.state);
            }
          });

          // Poker-specific event handlers
          ws.on("poker.actionResult", (data: { gameId: string; state: any; handComplete?: boolean; winners?: any[]; nextAction?: any }) => {
            console.log("[SessionPage] ===== POKER ACTION RESULT =====");
            console.log("[SessionPage] Received poker.actionResult for game:", data.gameId);
            console.log("[SessionPage] Current gameIdRef:", gameIdRef.current);
            console.log("[SessionPage] My userId:", userId?.slice(-6));
            
            // Use ref to avoid stale closure - gameIdRef.current always has latest value
            if (data.gameId === gameIdRef.current) {
              console.log("[SessionPage] Current player index in new state:", data.state?.currentPlayerIndex);
              const nextPlayer = data.state?.players?.[data.state?.currentPlayerIndex];
              console.log("[SessionPage] Next player to act:", nextPlayer?.userId?.slice(-6), "(status:", nextPlayer?.status, ")");
              console.log("[SessionPage] Is it my turn?:", nextPlayer?.userId === userId);
              console.log("[SessionPage] Players:", data.state?.players?.map((p: any, i: number) => 
                `[${i}] ${p.userId.slice(-6)} (${p.status}, bet=${p.betThisRound})`
              ).join(' | '));
              console.log("[SessionPage] Hand complete?:", data.handComplete);
              console.log("[SessionPage] Next action from server:", data.nextAction);
              
              // Always update state - React will handle re-rendering efficiently
              setGameState(data.state);
              console.log("[SessionPage] State updated");
            } else {
              console.log("[SessionPage] Ignoring - different game ID (expected:", gameIdRef.current, ")");
            }
          });

          // Handle game errors (including poker action errors)
          ws.on("game.error", (data: { message: string }) => {
            console.error("[SessionPage] Game error:", data.message);
            // Don't show alert for "Not your turn" - it's likely a race condition
            if (data.message && !data.message.includes("Not your turn")) {
              alert(`Game Error: ${data.message}`);
            } else {
              console.warn("[SessionPage] Suppressing 'Not your turn' error - likely race condition");
            }
          });

    ws.on("poker.handEnd", (data: { gameId: string; winners: any[]; state: any }) => {
      console.log("Poker hand ended:", data);
      // Use ref to avoid stale closure
      if (data.gameId === gameIdRef.current) {
        setGameState(data.state);
      }
    });

    ws.on("poker.newHand", (data: { gameId: string; state: any }) => {
      console.log("Poker new hand started:", data);
      // Use ref to avoid stale closure
      if (data.gameId === gameIdRef.current) {
        setGameState(data.state);
      }
    });

    // Handle game end
    ws.on("game.end", (data: { gameId: string; winnerId: string | null; isDraw: boolean; reason: string }) => {
      console.log("Game ended:", data);
      // Update the game state to reflect the end
      if (data.winnerId || data.isDraw) {
        setGameState((prev: any) => ({
          ...prev,
          gameOver: true,
          winner: data.winnerId,
          isDraw: data.isDraw
        }));
      }
      // Allow starting a new game after a delay
      setTimeout(() => {
        setGameType(null);
        setGameId(null);
        setGameState(null);
        setGamePlayers([]);
      }, 5000);
    });

    // Handle game cancellation (when other user exits)
    ws.on("game.cancelled", (data: { gameId: string }) => {
      console.log("Game cancelled by other user:", data);
      setGameType(null);
      setGameId(null);
      setGameState(null);
      setGamePlayers([]);
    });

    ws.on("session.end", (data: any) => {
      router.push("/play");
    });

    ws.on("error", (err: any) => {
      console.error("Session error:", err);
      setError(err.message || "Connection error occurred");
      if (err.message) {
        alert(`Error: ${err.message}`);
      }
    });

    // Listen for wallet balance updates
    ws.on("wallet.updated", (data: { balance: number }) => {
      console.log("Wallet updated:", data);
      setWalletBalance(data.balance);
    });

    // Listen for gift notifications (both sent and received)
    ws.on("session.giftReceived", (data: { from: string; to: string; amount: number; success: boolean }) => {
      console.log("Gift received event:", data);
      if (data.success) {
        // Determine if we're the sender or receiver
        const token = localStorage.getItem("accessToken");
        if (token) {
          try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            const currentUserId = payload.sub;
            const isReceived = data.to === currentUserId;
            const otherUser = isReceived ? data.from : data.to;
            showGiftNotification(otherUser, data.amount, isReceived);
          } catch (e) {
            console.error("Failed to parse token for gift notification:", e);
          }
        }
      }
    });

      setSocket(ws);

      return () => {
        ws.disconnect();
      };
    }).catch((error) => {
      console.error("Failed to refresh token or connect:", error);
      setError("Failed to connect. Please try again.");
    });
  }, [sessionId, router]);

  const handleStartGame = (type: string) => {
    if (socket) {
      socket.emit("session.startGame", { sessionId, gameType: type });
    }
  };

  const handleCancelGame = () => {
    // Reset game state to allow starting a new game
    console.log("Cancelling game, resetting state");
    setGameType(null);
    setGameId(null);
    setGameState(null);
    setGamePlayers([]);
    
    // Optionally emit a cancel event to the server
    if (socket) {
      socket.emit("session.cancelGame", { sessionId });
    }
    
    console.log("Game cancelled");
  };

  const handleEndSession = async () => {
    // Prevent ending session during an active game
    if (gameType === "trivia" && gameState) {
      const triviaPhase = gameState.phase;
      if (triviaPhase && triviaPhase !== "gameEnd" && triviaPhase !== "themeSelection") {
        alert("Cannot end session while trivia game is in progress! Please finish the game first.");
        return;
      }
    }

    // Cleanup Agora
    if (localTrackRef.current) {
      localTrackRef.current.videoTrack?.stop();
      localTrackRef.current.videoTrack?.close();
      localTrackRef.current.audioTrack?.stop();
      localTrackRef.current.audioTrack?.close();
    }
    if (clientRef.current) {
      await clientRef.current.leave();
    }

    if (socket) {
      socket.emit("session.end", { sessionId });
    }
    router.push("/play");
  };

  const handleSwapVideos = () => {
    // Swap the video tracks between containers
    if (localTrackRef.current?.videoTrack && remoteUserRef.current?.videoTrack) {
      // Stop current playback
      localTrackRef.current.videoTrack.stop();
      remoteUserRef.current.videoTrack.stop();
      
      // Swap and re-play based on current state
      if (videosSwapped) {
        // Currently swapped: local in main, remote in overlay
        // After swap: remote in main, local in overlay (default)
        if (mainVideoRef.current) {
          // @ts-ignore
          remoteUserRef.current.videoTrack.play(mainVideoRef.current);
        }
        if (overlayVideoRef.current) {
          // @ts-ignore
          localTrackRef.current.videoTrack.play(overlayVideoRef.current);
        }
      } else {
        // Currently default: remote in main, local in overlay
        // After swap: local in main, remote in overlay (swapped)
        if (mainVideoRef.current) {
          // @ts-ignore
          localTrackRef.current.videoTrack.play(mainVideoRef.current);
        }
        if (overlayVideoRef.current) {
          // @ts-ignore
          remoteUserRef.current.videoTrack.play(overlayVideoRef.current);
        }
      }
    } else if (localTrackRef.current?.videoTrack) {
      // Only local video available - just move it
      localTrackRef.current.videoTrack.stop();
      const targetContainer = videosSwapped ? mainVideoRef.current : overlayVideoRef.current;
      if (targetContainer) {
        // @ts-ignore
        localTrackRef.current.videoTrack.play(targetContainer);
      }
    } else if (remoteUserRef.current?.videoTrack) {
      // Only remote video available - just move it
      remoteUserRef.current.videoTrack.stop();
      const targetContainer = videosSwapped ? overlayVideoRef.current : mainVideoRef.current;
      if (targetContainer) {
        // @ts-ignore
        remoteUserRef.current.videoTrack.play(targetContainer);
      }
    }
    setVideosSwapped(!videosSwapped);
  };

  const handleFullscreen = (element: HTMLElement) => {
    if (!document.fullscreenElement) {
      element.requestFullscreen().catch((err) => {
        alert(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
      });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const handleSendGift = () => {
    setGiftError("");
    setGiftAmount("");
    setGiftModalOpen(true);
  };

  const handleConfirmGift = () => {
    if (walletBalance <= 0) {
      setGiftError("You don't have any tokens to send.");
      return;
    }
    
    const amountNum = parseInt(giftAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setGiftError("Please enter a valid positive number");
      return;
    }
    if (amountNum > walletBalance) {
      setGiftError(`Insufficient tokens. You have ${walletBalance} tokens.`);
      return;
    }
    
    if (socket) {
      setGiftSending(true);
      socket.emit("session.sendGift", { sessionId, amountTokens: amountNum });
      // Close modal after a short delay
      setTimeout(() => {
        setGiftModalOpen(false);
        setGiftSending(false);
        setGiftAmount("");
        setGiftError("");
      }, 500);
    }
  };

  const handleReport = () => {
    setReportReason("");
    setReportModalOpen(true);
  };

  const handleConfirmReport = () => {
    if (!reportReason.trim()) {
      return;
    }
    
    if (socket) {
      setReportSending(true);
      socket.emit("session.report", { sessionId, reason: reportReason });
      setTimeout(() => {
        setReportModalOpen(false);
        setReportSending(false);
        setReportReason("");
      }, 500);
    }
  };

  // PiP dragging handlers
  const handlePipMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    if ((e.target as HTMLElement).closest('.resize-handle')) return;
    setIsDraggingPip(true);
    const rect = floatingPipRef.current?.getBoundingClientRect();
    if (rect) {
      pipDragOffset.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
    }
    e.preventDefault();
  }, []);

  const handlePipMouseMove = useCallback((e: MouseEvent) => {
    if (isDraggingPip) {
      const newX = e.clientX - pipDragOffset.current.x;
      const newY = e.clientY - pipDragOffset.current.y;
      
      const currentWidth = pipMinimized ? 60 : pipSize.width;
      const currentHeight = pipMinimized ? 60 : pipSize.height;
      const maxX = window.innerWidth - currentWidth;
      const maxY = window.innerHeight - currentHeight;
      
      setPipPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY))
      });
    }
    
    if (isResizingPip) {
      const deltaX = e.clientX - pipResizeStart.current.mouseX;
      const deltaY = e.clientY - pipResizeStart.current.mouseY;
      
      const newWidth = Math.max(200, Math.min(500, pipResizeStart.current.width + deltaX));
      const newHeight = Math.max(150, Math.min(375, pipResizeStart.current.height + deltaY));
      
      setPipSize({ width: newWidth, height: newHeight });
    }
  }, [isDraggingPip, isResizingPip, pipMinimized, pipSize]);

  const handlePipMouseUp = useCallback(() => {
    setIsDraggingPip(false);
    setIsResizingPip(false);
  }, []);

  // Resize handlers
  const handleResizeMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsResizingPip(true);
    pipResizeStart.current = {
      width: pipSize.width,
      height: pipSize.height,
      mouseX: e.clientX,
      mouseY: e.clientY
    };
  }, [pipSize]);

  // Add/remove mouse event listeners for PiP dragging and resizing
  useEffect(() => {
    if (isDraggingPip || isResizingPip) {
      window.addEventListener('mousemove', handlePipMouseMove);
      window.addEventListener('mouseup', handlePipMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handlePipMouseMove);
      window.removeEventListener('mouseup', handlePipMouseUp);
    };
  }, [isDraggingPip, isResizingPip, handlePipMouseMove, handlePipMouseUp]);

  // Touch support for mobile PiP dragging
  const handlePipTouchStart = useCallback((e: React.TouchEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    if ((e.target as HTMLElement).closest('.resize-handle')) return;
    setIsDraggingPip(true);
    const touch = e.touches[0];
    const rect = floatingPipRef.current?.getBoundingClientRect();
    if (rect) {
      pipDragOffset.current = {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top
      };
    }
  }, []);

  const handlePipTouchMove = useCallback((e: TouchEvent) => {
    if (!isDraggingPip && !isResizingPip) return;
    const touch = e.touches[0];
    
    if (isDraggingPip) {
      const newX = touch.clientX - pipDragOffset.current.x;
      const newY = touch.clientY - pipDragOffset.current.y;
      
      const currentWidth = pipMinimized ? 60 : pipSize.width;
      const currentHeight = pipMinimized ? 60 : pipSize.height;
      const maxX = window.innerWidth - currentWidth;
      const maxY = window.innerHeight - currentHeight;
      
      setPipPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY))
      });
    }
    
    if (isResizingPip) {
      const deltaX = touch.clientX - pipResizeStart.current.mouseX;
      const deltaY = touch.clientY - pipResizeStart.current.mouseY;
      
      const newWidth = Math.max(200, Math.min(500, pipResizeStart.current.width + deltaX));
      const newHeight = Math.max(150, Math.min(375, pipResizeStart.current.height + deltaY));
      
      setPipSize({ width: newWidth, height: newHeight });
    }
    e.preventDefault();
  }, [isDraggingPip, isResizingPip, pipMinimized, pipSize]);

  const handlePipTouchEnd = useCallback(() => {
    setIsDraggingPip(false);
    setIsResizingPip(false);
  }, []);

  // Touch resize handlers
  const handleResizeTouchStart = useCallback((e: React.TouchEvent) => {
    e.stopPropagation();
    setIsResizingPip(true);
    const touch = e.touches[0];
    pipResizeStart.current = {
      width: pipSize.width,
      height: pipSize.height,
      mouseX: touch.clientX,
      mouseY: touch.clientY
    };
  }, [pipSize]);

  // Add/remove touch event listeners for PiP dragging and resizing
  useEffect(() => {
    if (isDraggingPip || isResizingPip) {
      window.addEventListener('touchmove', handlePipTouchMove, { passive: false });
      window.addEventListener('touchend', handlePipTouchEnd);
    }
    return () => {
      window.removeEventListener('touchmove', handlePipTouchMove);
      window.removeEventListener('touchend', handlePipTouchEnd);
    };
  }, [isDraggingPip, isResizingPip, handlePipTouchMove, handlePipTouchEnd]);

  // Move remote video to PiP container when pip mode is active
  useEffect(() => {
    const videoTrack = remoteUserRef.current?.videoTrack;
    
    if (!videoTrack) {
      setPipVideoAttached(false);
      return;
    }
    
    let cancelled = false;
    
    // Function to attach video with retry logic
    const attachVideo = (attempt = 1) => {
      if (cancelled) return;
      const maxAttempts = 3;
      
      if (pipModeActive && !pipMinimized && pipVideoRef.current) {
        // Play in PiP container
        console.log(`🎥 Attempting to attach video to PiP (attempt ${attempt})`);
        try {
          // Stop current playback
          try { videoTrack.stop(); } catch (e) { /* ignore */ }
          
          // Clear the container first
          if (pipVideoRef.current) {
            pipVideoRef.current.innerHTML = '';
          }
          
          // Play in PiP
          // @ts-ignore
          videoTrack.play(pipVideoRef.current);
          
          // Set attached immediately - trust Agora SDK
          setTimeout(() => {
            if (cancelled) return;
            setPipVideoAttached(true);
            console.log("🎥 Video attached to PiP container");
          }, 100);
          
        } catch (e) {
          console.error("Error moving video to PiP:", e);
          if (attempt < maxAttempts && !cancelled) {
            setTimeout(() => attachVideo(attempt + 1), 300);
          } else {
            setPipVideoAttached(false);
          }
        }
      } else if ((!pipModeActive || pipMinimized) && mainVideoRef.current) {
        // Play in main container
        console.log(`🎥 Moving video back to main container`);
        try {
          try { videoTrack.stop(); } catch (e) { /* ignore */ }
          
          // @ts-ignore
          videoTrack.play(mainVideoRef.current);
          setPipVideoAttached(false);
          console.log("🎥 Video moved back to main container");
        } catch (e) {
          console.error("Error moving video to main:", e);
          if (attempt < maxAttempts && !cancelled) {
            setTimeout(() => attachVideo(attempt + 1), 300);
          }
        }
      }
    };
    
    // Delay to ensure DOM is ready
    const timer = setTimeout(() => {
      attachVideo();
    }, 200);
    
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [pipModeActive, pipMinimized, remoteVideoActive]);

  // Auto-enable PiP mode when game starts
  useEffect(() => {
    if (gameType && gameId && remoteVideoActive) {
      // Auto-enable PiP when game starts
      setPipModeActive(true);
    }
  }, [gameType, gameId, remoteVideoActive]);

  // Disable PiP when game ends
  useEffect(() => {
    if (!gameType || !gameId) {
      setPipModeActive(false);
      setPipVideoAttached(false);
    }
  }, [gameType, gameId]);

  // Sync pipModeActive ref with state for closure access
  useEffect(() => {
    pipModeActiveRef.current = pipModeActive;
  }, [pipModeActive]);

  return (
    <main className="space-y-6 relative p-4 lg:p-6 min-h-screen">
      {/* Gift Notification Popup */}
      {giftNotification && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg border animate-scale-in backdrop-blur-glass ${
          giftNotification.isReceived 
            ? "bg-success-muted border-success/50 shadow-[0_0_30px_var(--color-success-muted)]" 
            : "bg-accent-muted border-accent/50 shadow-glow-purple"
        }`}>
          <div className="flex items-center gap-3">
            <span className="text-3xl">{giftNotification.isReceived ? "🎁" : "💝"}</span>
            <div>
              <p className="font-display font-bold text-txt-primary">
                {giftNotification.isReceived ? "Gift Received!" : "Gift Sent!"}
              </p>
              <p className="text-sm text-txt-secondary">
                {giftNotification.isReceived 
                  ? `You received ${giftNotification.amount} tokens`
                  : `You sent ${giftNotification.amount} tokens`
                }
              </p>
            </div>
          </div>
          <button 
            onClick={() => setGiftNotification(null)}
            className="absolute top-2 right-3 text-txt-muted hover:text-txt-primary text-sm transition-colors"
          >
            ✕
          </button>
        </div>
      )}

      {/* Floating PiP Video Window - Shows when playing games */}
      {gameType && gameId && videoReady && (
        <div
          ref={floatingPipRef}
          onMouseDown={handlePipMouseDown}
          onTouchStart={handlePipTouchStart}
          className={`fixed z-[100] select-none ${isDraggingPip ? 'cursor-grabbing' : 'cursor-grab'} ${isResizingPip ? 'cursor-se-resize' : ''}`}
          style={{
            left: pipPosition.x,
            top: pipPosition.y,
            width: pipMinimized ? '60px' : `${pipSize.width}px`,
            height: pipMinimized ? '60px' : `${pipSize.height}px`,
            transition: isDraggingPip || isResizingPip ? 'none' : 'width 0.2s, height 0.2s',
          }}
        >
          <div className={`relative w-full h-full rounded-xl overflow-hidden border-2 border-accent shadow-glow-purple bg-base ${
            pipMinimized ? 'flex items-center justify-center' : ''
          }`}>
            {/* Actual video container for remote user */}
            {!pipMinimized && (
              <>
                {/* Video element container - Agora will inject video here */}
                <div 
                  ref={pipVideoRef}
                  className="absolute inset-0 bg-base [&>div]:!w-full [&>div]:!h-full [&>video]:!w-full [&>video]:!h-full [&>video]:!object-cover"
                />
                
                {/* Fallback overlay - only shown when video not attached */}
                {!pipVideoAttached && (
                  <div className="absolute inset-0 flex items-center justify-center bg-base z-[5]">
                    {remoteVideoActive ? (
                      <div className="text-center p-4">
                        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-success/20 flex items-center justify-center">
                          <svg className="w-6 h-6 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <p className="text-sm text-txt-secondary font-medium mb-1">Peer Video Active</p>
                        <p className="text-xs text-txt-muted mb-3">Loading video feed...</p>
                        <div className="w-6 h-6 mx-auto border-2 border-accent border-t-transparent rounded-full animate-spin" />
                      </div>
                    ) : (
                      <div className="text-center p-4">
                        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-surface-tertiary flex items-center justify-center animate-pulse">
                          <svg className="w-6 h-6 text-txt-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                        <p className="text-sm text-txt-muted">Waiting for peer...</p>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Header bar - drag handle */}
                <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-base/95 via-base/70 to-transparent flex items-center justify-between px-3 z-10">
                  <span className="text-xs text-txt-primary font-medium flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${remoteVideoActive ? 'bg-success' : 'bg-warning animate-pulse'}`}></span>
                    {pipVideoAttached ? 'Peer Video' : (remoteVideoActive ? 'Loading...' : 'Connecting...')}
                  </span>
                  <div className="flex items-center gap-1 opacity-60">
                    <svg className="w-4 h-4 text-txt-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                    </svg>
                  </div>
                </div>
                
                {/* Size indicator */}
                <div className="absolute top-1 right-1 px-1.5 py-0.5 bg-base/70 rounded text-[9px] text-txt-muted font-mono backdrop-blur-sm">
                  {pipSize.width}×{pipSize.height}
                </div>
              </>
            )}
            
            {/* Minimized state */}
            {pipMinimized && (
              <div className="flex flex-col items-center justify-center gap-1">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${remoteVideoActive ? 'bg-success/20' : 'bg-warning/20'}`}>
                  <svg className={`w-5 h-5 ${remoteVideoActive ? 'text-success' : 'text-warning'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
                <span className="text-[9px] text-txt-muted font-medium">PiP</span>
              </div>
            )}
            
            {/* Control buttons */}
            <div className={`absolute ${pipMinimized ? 'inset-0 flex items-center justify-center' : 'bottom-2 left-2'} flex gap-1.5 pointer-events-auto z-20`}>
              {/* Minimize/Maximize button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const newMinimized = !pipMinimized;
                  setPipMinimized(newMinimized);
                  // When expanding from minimized, trigger video reattachment
                  if (!newMinimized) {
                    setPipVideoAttached(false); // Reset to trigger effect
                  }
                }}
                className={`${pipMinimized ? 'absolute inset-0 w-full h-full opacity-0' : 'p-1.5 rounded-lg bg-surface-secondary/90 hover:bg-surface-tertiary border border-border-default'} text-txt-secondary hover:text-txt-primary transition-colors`}
                title={pipMinimized ? "Expand" : "Minimize"}
              >
                {!pipMinimized && (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                  </svg>
                )}
              </button>
              
              {/* Return video to main container button (only when expanded) */}
              {!pipMinimized && pipModeActive && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setPipModeActive(false);
                    videoContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }}
                  className="p-1.5 rounded-lg bg-surface-secondary/90 hover:bg-surface-tertiary text-txt-secondary hover:text-txt-primary transition-colors border border-border-default"
                  title="Return to main view"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                  </svg>
                </button>
              )}
              
              {/* Scroll to main video button */}
              {!pipMinimized && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    videoContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }}
                  className="p-1.5 rounded-lg bg-accent hover:bg-accent-hover text-base transition-colors shadow-sm"
                  title="Scroll to video section"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                  </svg>
                </button>
              )}
            </div>
            
            {/* Resize handle (bottom-right corner) */}
            {!pipMinimized && (
              <div
                className="resize-handle absolute bottom-0 right-0 w-6 h-6 cursor-se-resize z-30 group"
                onMouseDown={handleResizeMouseDown}
                onTouchStart={handleResizeTouchStart}
              >
                <div className="absolute bottom-1 right-1 w-3 h-3 border-r-2 border-b-2 border-accent/60 group-hover:border-accent transition-colors" />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Header Section */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <BackButton 
            href="/play" 
            label="← Back" 
            disabled={
              gameType === "trivia" && 
              gameState && 
              gameState.phase && 
              gameState.phase !== "gameEnd" && 
              gameState.phase !== "themeSelection"
            }
            disabledMessage="Cannot exit while trivia game is in progress!"
          />
          <div>
            <p className="text-xs uppercase tracking-widest text-txt-muted font-medium">Session</p>
            <h1 className="text-2xl lg:text-3xl font-display font-semibold text-txt-primary tracking-tight">
              Video <span className="text-accent">Call</span>
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Wallet Balance Display */}
          <div className="bg-gold/10 px-4 py-2.5 rounded-lg border border-gold/30 flex items-center gap-3 shadow-glow-gold">
            <span className="text-xl">💰</span>
            <div>
              <p className="text-[10px] text-gold uppercase tracking-wider font-medium">Balance</p>
              <p className="font-mono font-bold text-gold text-lg leading-none">{walletBalance.toLocaleString()}</p>
            </div>
          </div>
          <Button
            variant="danger"
            size="md"
            onClick={handleEndSession}
            disabled={
              gameType === "trivia" && 
              gameState && 
              gameState.phase && 
              gameState.phase !== "gameEnd" && 
              gameState.phase !== "themeSelection"
            }
          >
            End Session
          </Button>
        </div>
      </div>
      {/* Status Bar */}
      <Card variant="glass" padding="sm" className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4 flex-wrap">
          {/* Connection Status */}
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${connected ? 'bg-success animate-pulse' : 'bg-warning'}`} />
            <span className="text-sm text-txt-secondary font-medium">
              {connected ? "Connected" : "Connecting..."}
            </span>
          </div>
          
          {/* Session Timer */}
          {sessionStartTime && (
            <Badge variant="success" size="md">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {formatDuration(sessionDuration)}
            </Badge>
          )}
          
          {/* Peer Status */}
          {sessionData && (
            peerConnected ? (
              <StatusBadge status="live" />
            ) : (
              <StatusBadge status="searching" />
            )
          )}
          
          {/* Network Quality */}
          {networkQuality.downlink > 0 && (
            <span className={`text-sm font-medium ${getNetworkQualityLabel(networkQuality.downlink).color}`}>
              📶 {getNetworkQualityLabel(networkQuality.downlink).label}
            </span>
          )}
          
          {/* Connection state indicator */}
          {connectionState !== "CONNECTED" && connectionState !== "DISCONNECTED" && (
            <Badge variant="warning" size="sm">{connectionState}</Badge>
          )}
        </div>
        
        {/* Error Display */}
        {error && (
          <Badge variant="error" size="md">{error}</Badge>
        )}
        
        {/* Audio/Video Controls */}
        {videoReady && (
          <div className="flex gap-2">
            <Button
              variant={isMuted ? "danger" : "secondary"}
              size="sm"
              onClick={toggleMute}
              icon={<span>{isMuted ? "🔇" : "🔊"}</span>}
            >
              {isMuted ? "Muted" : "Audio"}
            </Button>
            <Button
              variant={isCameraOff ? "danger" : "secondary"}
              size="sm"
              onClick={toggleCamera}
              icon={<span>{isCameraOff ? "📷" : "📹"}</span>}
            >
              {isCameraOff ? "Off" : "Video"}
            </Button>
          </div>
        )}
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content Area */}
        <Card variant="elevated" padding="lg" className="lg:col-span-2 space-y-6">
          {/* Video Section */}
          <div 
            ref={videoContainerRef}
            className="aspect-video bg-base rounded-lg border border-border-strong relative overflow-hidden shadow-lg"
          >
            {/* Main video container (shows remote by default, local when swapped) */}
            <div
              ref={mainVideoRef}
              className="absolute inset-0 w-full h-full bg-base"
              style={{ minWidth: '100%', minHeight: '100%' }}
            />
            {/* Show when video is in PiP mode */}
            {pipModeActive && remoteVideoActive && !videosSwapped && (
              <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                <div className="text-center p-6 bg-surface-primary/80 backdrop-blur-sm rounded-xl border border-accent/30">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-accent/20 flex items-center justify-center">
                    <svg className="w-8 h-8 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <p className="text-txt-primary font-medium">Video in PiP Mode</p>
                  <p className="text-xs mt-1 text-txt-muted">Peer video is playing in the floating window</p>
                  <button
                    onClick={() => setPipModeActive(false)}
                    className="mt-4 px-4 py-2 bg-accent hover:bg-accent-hover text-base text-sm font-medium rounded-lg transition-colors pointer-events-auto"
                  >
                    Return Video Here
                  </button>
                </div>
              </div>
            )}
            {!remoteVideoActive && !videosSwapped && !pipModeActive && (
              <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                <div className="text-center p-6 bg-surface-primary/80 backdrop-blur-sm rounded-xl border border-border-default">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-surface-tertiary flex items-center justify-center">
                    <svg className="w-8 h-8 text-txt-muted animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <p className="text-txt-secondary font-medium">Waiting for remote video...</p>
                  <p className="text-xs mt-1 text-txt-muted">The other user's video will appear here</p>
                  {remoteUserInfo && (
                    <div className="mt-3 pt-3 border-t border-border-subtle">
                      <p className="text-xs text-txt-muted">
                        Remote user: <span className="text-accent font-mono">{String(remoteUserInfo.uid).slice(0, 8)}...</span>
                      </p>
                      <div className="flex items-center justify-center gap-3 mt-1">
                        <span className={`text-xs ${remoteUserInfo.hasVideo ? 'text-success' : 'text-error'}`}>
                          {remoteUserInfo.hasVideo ? '✓' : '✗'} Video
                        </span>
                        <span className={`text-xs ${remoteUserInfo.hasAudio ? 'text-success' : 'text-error'}`}>
                          {remoteUserInfo.hasAudio ? '✓' : '✗'} Audio
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
            {!localVideoActive && videosSwapped && (
              <div className="absolute inset-0 flex items-center justify-center z-5">
                <div className="text-center text-txt-muted">
                  <p className="text-sm">Waiting for local video...</p>
                </div>
              </div>
            )}
            
            {/* Small overlay video container (shows local by default, remote when swapped) */}
            <div
              ref={overlayVideoRef}
              onClick={(e) => {
                e.stopPropagation();
                const choice = confirm("Click OK to swap videos, or Cancel to fullscreen");
                if (choice) {
                  handleSwapVideos();
                } else {
                  handleFullscreen(videoContainerRef.current!);
                }
              }}
              onDoubleClick={() => handleFullscreen(videoContainerRef.current!)}
              className="absolute bottom-4 right-4 w-40 h-28 lg:w-48 lg:h-36 rounded-lg border-2 border-accent/50 bg-base z-10 cursor-pointer hover:border-accent hover:shadow-glow-purple transition-all overflow-hidden"
              style={{ minWidth: '160px', minHeight: '112px' }}
              title="Click to swap, double-click to fullscreen"
            >
              {!localVideoActive && !videosSwapped && (
                <div className="absolute inset-0 flex items-center justify-center bg-surface-primary/80 text-txt-muted text-xs">
                  <span className="flex flex-col items-center gap-1">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    You
                  </span>
                </div>
              )}
              {!remoteVideoActive && videosSwapped && (
                <div className="absolute inset-0 flex items-center justify-center bg-surface-primary/80 text-txt-muted text-xs">
                  Other user
                </div>
              )}
              {/* PiP Label */}
              <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-base/80 rounded text-[10px] text-txt-muted font-medium backdrop-blur-sm">
                {videosSwapped ? "Peer" : "You"}
              </div>
            </div>
            
            {/* Show loading/status overlay when video is not ready */}
            {!videoReady && (
              <div className="absolute inset-0 flex items-center justify-center z-20 bg-base/90 backdrop-blur-sm">
                <div className="text-center p-8">
                  {sessionData?.video ? (
                    <>
                      <div className="w-12 h-12 mx-auto mb-4 rounded-full border-2 border-accent border-t-transparent animate-spin" />
                      <p className="text-txt-primary font-medium mb-2">Initializing video call...</p>
                      <p className="text-xs text-txt-muted">Please allow camera and microphone access</p>
                      {error && (
                        <p className="text-xs text-error mt-3 max-w-md">{error}</p>
                      )}
                    </>
                  ) : (
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 mb-3 rounded-full border-2 border-txt-muted border-t-transparent animate-spin" />
                      <p className="text-txt-muted">
                        {connected ? "Loading session data..." : "Connecting to server..."}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Game Section - Always visible alongside video */}
          {gameType && gameId && (
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-xl">🎮</span>
                <h2 className="text-lg font-display font-semibold text-txt-primary">
                  Playing: <span className="text-accent">{gameType}</span>
                </h2>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancelGame}
              >
                Exit Game
              </Button>
            </div>
          )}
          {gameType && gameId && gameType === "TICTACTOE" ? (
            <TicTacToeGame
              gameId={gameId}
              socket={socket!}
              userId={userId}
              initialState={gameState}
              initialPlayers={gamePlayers}
              onGameEnd={(result) => {
                console.log("Game ended:", result);
                // Allow starting a new game after a short delay
                setTimeout(() => {
                  setGameType(null);
                  setGameId(null);
                  setGameState(null);
                  setGamePlayers([]);
                }, 5000); // 5 second delay before allowing new game
              }}
            />
          ) : gameType && gameId && gameType === "TRIVIA" ? (
            <TriviaGame
              gameId={gameId}
              socket={socket!}
              odUserId={userId}
              initialState={gameState || undefined}
              initialPlayers={gamePlayers}
              onGameEnd={(result) => {
                console.log("Trivia game ended:", result);
                setTimeout(() => {
                  setGameType(null);
                  setGameId(null);
                  setGameState(null);
                  setGamePlayers([]);
                }, 5000);
              }}
            />
          ) : gameType && gameId && gameType === "CHESS" && gameState ? (
            <ChessGame
              gameState={gameState}
              odUserId={userId}
              onMove={(from, to, promotionPiece) => {
                if (socket) {
                  socket.emit("game.move", { gameId, from, to, promotionPiece });
                }
              }}
              onForfeit={() => {
                if (socket) {
                  socket.emit("game.forfeit", { gameId });
                }
              }}
            />
          ) : gameType && gameId && (gameType === "TRUTHS_AND_LIE" || gameType?.toUpperCase() === "TRUTHS_AND_LIE" || gameType?.includes("TRUTH")) ? (
            <TruthsAndLieGame
              gameId={gameId}
              socket={socket!}
              odUserId={userId}
              initialState={gameState || undefined}
              initialPlayers={gamePlayers}
              onGameEnd={(result) => {
                console.log("Truths and Lie game ended:", result);
                setTimeout(() => {
                  setGameType(null);
                  setGameId(null);
                  setGameState(null);
                  setGamePlayers([]);
                }, 5000);
              }}
            />
          ) : gameType && gameId && (gameType === "BILLIARDS" || gameType?.toUpperCase() === "BILLIARDS") ? (
            <BilliardsGameV2
              gameId={gameId}
              socket={socket!}
              odUserId={userId}
              initialState={gameState || undefined}
              initialPlayers={gamePlayers}
              onGameEnd={(result) => {
                console.log("Billiards game ended:", result);
                setTimeout(() => {
                  setGameType(null);
                  setGameId(null);
                  setGameState(null);
                  setGamePlayers([]);
                }, 5000);
              }}
            />
          ) : gameType && gameId && (gameType === "POKER" || gameType?.toUpperCase() === "POKER") ? (
            <PokerGame
              gameState={gameState}
              odUserId={userId}
              onAction={(action, amount) => {
                if (socket && socket.connected) {
                  console.log("[SessionPage] Emitting poker.action:", { gameId, action, amount });
                  console.log("[SessionPage] Current gameState before emit:", {
                    currentPlayerIndex: gameState?.currentPlayerIndex,
                    players: gameState?.players?.map((p: any, i: number) => `[${i}] ${p.userId.slice(-6)} (${p.status})`).join(' | ')
                  });
                  socket.emit("poker.action", { gameId, action, amount });
                } else {
                  alert("Connection lost. Please refresh the page.");
                }
              }}
              onStartNewHand={() => {
                if (socket) {
                  socket.emit("poker.startNewHand", { gameId });
                }
              }}
            />
          ) : gameType && gameId && (gameType === "TWENTY_ONE_QUESTIONS" || gameType?.toUpperCase() === "TWENTY_ONE_QUESTIONS") ? (
            <TwentyOneQuestionsGame
              gameId={gameId}
              socket={socket!}
              odUserId={userId}
              initialState={gameState || undefined}
              initialPlayers={gamePlayers}
              onGameEnd={(result) => {
                console.log("21 Questions game ended:", result);
                setTimeout(() => {
                  setGameType(null);
                  setGameId(null);
                  setGameState(null);
                  setGamePlayers([]);
                }, 5000);
              }}
            />
          ) : gameType && !gameId ? (
            // Game is pending/starting - show cancel option
            <Card variant="glass" padding="md" className="animate-pulse-glow">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center animate-spin">
                    <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full" />
                  </div>
                  <p className="text-sm text-txt-secondary">Starting game: <span className="text-accent font-medium">{gameType}</span></p>
                </div>
                <Button variant="ghost" size="sm" onClick={handleCancelGame}>
                  Cancel
                </Button>
              </div>
              <div className="bg-base/50 rounded-lg p-8 text-center min-h-[200px] flex items-center justify-center border border-border-subtle">
                <div>
                  <p className="text-lg text-txt-primary font-display mb-2">Starting {gameType}...</p>
                  <p className="text-xs text-txt-muted">Please wait while the game initializes</p>
                </div>
              </div>
            </Card>
          ) : gameType && gameId && gameType !== "TICTACTOE" && gameType !== "TRIVIA" && gameType !== "CHESS" && gameType !== "TRUTHS_AND_LIE" && gameType?.toUpperCase() !== "TRUTHS_AND_LIE" && gameType !== "BILLIARDS" && gameType?.toUpperCase() !== "BILLIARDS" && gameType !== "POKER" && gameType?.toUpperCase() !== "POKER" && gameType !== "TWENTY_ONE_QUESTIONS" && gameType?.toUpperCase() !== "TWENTY_ONE_QUESTIONS" ? (
            <Card variant="default" padding="md">
              <p className="text-sm text-txt-secondary mb-2">Active game: {gameType} (ID: {gameId})</p>
              <div className="bg-base/50 rounded-lg p-8 text-center min-h-[200px] flex items-center justify-center border border-border-subtle">
                <div>
                  <p className="text-lg text-txt-primary font-display mb-2">Game UI for {gameType}</p>
                  <p className="text-xs text-txt-muted">Game implementation coming soon or state not loaded</p>
                  <p className="text-xs text-txt-muted mt-2">Game State: {gameState ? "Loaded" : "Not loaded"}</p>
                </div>
              </div>
            </Card>
          ) : (
            <Card variant="neon" padding="md">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xl">🎮</span>
                <p className="text-sm text-txt-secondary font-medium">Choose a game to play</p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                <Button
                  variant="secondary"
                  size="md"
                  onClick={() => handleStartGame("CHESS")}
                  className="flex-col py-4 h-auto"
                  icon={<span className="text-2xl mb-1">♟️</span>}
                >
                  Chess
                </Button>
                <Button
                  variant="secondary"
                  size="md"
                  onClick={() => handleStartGame("TRIVIA")}
                  className="flex-col py-4 h-auto"
                  icon={<span className="text-2xl mb-1">❓</span>}
                >
                  Trivia
                </Button>
                <Button
                  variant="secondary"
                  size="md"
                  onClick={() => handleStartGame("TICTACTOE")}
                  className="flex-col py-4 h-auto"
                  icon={<span className="text-2xl mb-1">⭕</span>}
                >
                  Tic-Tac-Toe
                </Button>
                <Button
                  variant="secondary"
                  size="md"
                  key="truths-and-lie-button"
                  onClick={() => {
                    console.log("Starting Truths & Lie game");
                    handleStartGame("TRUTHS_AND_LIE");
                  }}
                  className="flex-col py-4 h-auto"
                  icon={<span className="text-2xl mb-1">🤥</span>}
                >
                  Truths & Lie
                </Button>
                <Button
                  variant="secondary"
                  size="md"
                  onClick={() => handleStartGame("BILLIARDS")}
                  className="flex-col py-4 h-auto"
                  icon={<span className="text-2xl mb-1">🎱</span>}
                >
                  Billiards
                </Button>
                <Button
                  variant="secondary"
                  size="md"
                  onClick={() => handleStartGame("POKER")}
                  className="flex-col py-4 h-auto"
                  icon={<span className="text-2xl mb-1">🃏</span>}
                >
                  Poker
                </Button>
                <Button
                  variant="secondary"
                  size="md"
                  onClick={() => handleStartGame("TWENTY_ONE_QUESTIONS")}
                  className="flex-col py-4 h-auto"
                  icon={<span className="text-2xl mb-1">💬</span>}
                >
                  21 Questions
                </Button>
              </div>
            </Card>
          )}
        </Card>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Actions Panel */}
          <Card variant="default" padding="md">
            <CardHeader className="mb-4">
              <CardTitle as="h3" className="text-base flex items-center gap-2">
                <span className="text-lg">⚡</span>
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                variant="primary"
                size="md"
                fullWidth
                onClick={handleSendGift}
                icon={<span>🎁</span>}
              >
                Send Gift
              </Button>
              <Button
                variant="ghost"
                size="md"
                fullWidth
                onClick={handleReport}
                icon={<span>🚩</span>}
              >
                Report User
              </Button>
            </CardContent>
          </Card>

          {/* Session Info Panel */}
          <Card variant="glass" padding="md">
            <CardHeader className="mb-3">
              <CardTitle as="h3" className="text-base flex items-center gap-2">
                <span className="text-lg">ℹ️</span>
                Session Info
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Peer Info */}
              <div className="flex items-center justify-between py-2 border-b border-border-subtle">
                <span className="text-xs text-txt-muted uppercase tracking-wide">Peer</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-txt-primary font-mono">
                    {sessionData?.peer.id ? sessionData.peer.id.slice(0, 8) + "..." : "Loading..."}
                  </span>
                  {connected && sessionData?.peer?.id && (
                    <span className="w-2 h-2 rounded-full bg-success" title="Connected" />
                  )}
                </div>
              </div>
              
              {/* Channel */}
              <div className="flex items-center justify-between py-2 border-b border-border-subtle">
                <span className="text-xs text-txt-muted uppercase tracking-wide">Channel</span>
                <span className="text-sm text-txt-secondary font-mono truncate max-w-[120px]" title={sessionData?.video?.channelName}>
                  {sessionData?.video?.channelName?.slice(0, 12) || "—"}
                </span>
              </div>
              
              {/* Session ID */}
              <div className="flex items-center justify-between py-2 border-b border-border-subtle">
                <span className="text-xs text-txt-muted uppercase tracking-wide">Session</span>
                <span className="text-sm text-txt-secondary font-mono">
                  {sessionId.slice(0, 8)}...
                </span>
              </div>
              
              {/* Token Expiry */}
              {sessionData?.video?.expiresAt && (
                <div className="flex items-center justify-between py-2">
                  <span className="text-xs text-txt-muted uppercase tracking-wide">Token Expires</span>
                  <span className="text-sm text-txt-secondary">
                    {new Date(sessionData.video.expiresAt).toLocaleTimeString()}
                  </span>
                </div>
              )}
              
              {/* Video Disabled Notice */}
              {!sessionData?.video && (
                <div className="mt-2 p-2 bg-warning-muted rounded-md border border-warning/30">
                  <p className="text-xs text-warning flex items-center gap-1">
                    <span>ℹ️</span>
                    Video disabled - games still work!
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Send Gift Modal */}
      <Modal open={giftModalOpen} onClose={() => setGiftModalOpen(false)}>
        <ModalHeader>
          <ModalTitle className="flex items-center gap-3">
            <span className="text-3xl">🎁</span>
            Send Gift
          </ModalTitle>
        </ModalHeader>
        <ModalBody>
          <div className="space-y-4">
            {/* Balance Display */}
            <div className="flex items-center justify-between p-3 bg-gold/10 rounded-lg border border-gold/30">
              <span className="text-sm text-txt-secondary">Your Balance</span>
              <span className="font-mono font-bold text-gold text-lg">{walletBalance.toLocaleString()} tokens</span>
            </div>
            
            {/* Amount Input */}
            <div>
              <label className="block text-sm text-txt-secondary mb-2">Gift Amount</label>
              <Input
                type="number"
                placeholder="Enter token amount..."
                value={giftAmount}
                onChange={(e) => {
                  setGiftAmount(e.target.value);
                  setGiftError("");
                }}
                min={1}
                max={walletBalance}
                className="text-lg font-mono"
              />
            </div>
            
            {/* Quick Amount Buttons */}
            <div className="flex gap-2 flex-wrap">
              {[10, 25, 50, 100].filter(amt => amt <= walletBalance).map(amount => (
                <button
                  key={amount}
                  onClick={() => {
                    setGiftAmount(String(amount));
                    setGiftError("");
                  }}
                  className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                    giftAmount === String(amount)
                      ? "bg-accent text-base border-accent shadow-glow-purple"
                      : "bg-surface-secondary text-txt-secondary border-border-default hover:border-accent/50 hover:text-txt-primary"
                  }`}
                >
                  {amount} tokens
                </button>
              ))}
              {walletBalance > 0 && (
                <button
                  onClick={() => {
                    setGiftAmount(String(walletBalance));
                    setGiftError("");
                  }}
                  className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                    giftAmount === String(walletBalance)
                      ? "bg-gold/20 text-gold border-gold/50"
                      : "bg-surface-secondary text-txt-secondary border-border-default hover:border-gold/50 hover:text-gold"
                  }`}
                >
                  All ({walletBalance})
                </button>
              )}
            </div>
            
            {/* Error Message */}
            {giftError && (
              <div className="p-3 bg-error-muted rounded-lg border border-error/30">
                <p className="text-sm text-error flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {giftError}
                </p>
              </div>
            )}
            
            {/* No Balance Warning */}
            {walletBalance <= 0 && (
              <div className="p-4 bg-warning-muted rounded-lg border border-warning/30 text-center">
                <p className="text-warning font-medium mb-2">No tokens available</p>
                <p className="text-xs text-txt-muted">Visit the Token Shop to purchase more tokens.</p>
              </div>
            )}
          </div>
        </ModalBody>
        <ModalFooter>
          <Button
            variant="ghost"
            onClick={() => setGiftModalOpen(false)}
            disabled={giftSending}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleConfirmGift}
            disabled={!giftAmount || giftSending || walletBalance <= 0}
            loading={giftSending}
            icon={<span>💝</span>}
          >
            {giftSending ? "Sending..." : "Send Gift"}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Report User Modal */}
      <Modal open={reportModalOpen} onClose={() => setReportModalOpen(false)}>
        <ModalHeader>
          <ModalTitle className="flex items-center gap-3">
            <span className="text-3xl">🚩</span>
            Report User
          </ModalTitle>
        </ModalHeader>
        <ModalBody>
          <div className="space-y-4">
            <p className="text-txt-secondary text-sm">
              Please describe why you are reporting this user. Our moderation team will review your report.
            </p>
            
            {/* Reason Input */}
            <Textarea
              label="Report Reason"
              placeholder="Describe the issue..."
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              rows={4}
            />
            
            {/* Quick Report Options */}
            <div className="flex flex-wrap gap-2">
              {["Inappropriate behavior", "Harassment", "Spam", "Cheating", "Other"].map(reason => (
                <button
                  key={reason}
                  onClick={() => setReportReason(reason)}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                    reportReason === reason
                      ? "bg-error/20 text-error border-error/50"
                      : "bg-surface-secondary text-txt-secondary border-border-default hover:border-error/30 hover:text-error"
                  }`}
                >
                  {reason}
                </button>
              ))}
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button
            variant="ghost"
            onClick={() => setReportModalOpen(false)}
            disabled={reportSending}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleConfirmReport}
            disabled={!reportReason.trim() || reportSending}
            loading={reportSending}
          >
            {reportSending ? "Submitting..." : "Submit Report"}
          </Button>
        </ModalFooter>
      </Modal>
    </main>
  );
}

