"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { io, Socket } from "socket.io-client";
import AgoraRTC, { ICameraVideoTrack, IMicrophoneAudioTrack, IAgoraRTCClient, IAgoraRTCRemoteUser, NetworkQuality } from "agora-rtc-sdk-ng";
import { api, videoApi, usersApi, walletApi } from "@/lib/api";
import TicTacToeGame from "@/components/games/TicTacToeGame";
import ChessGame from "@/components/games/ChessGame";
import TriviaGame from "@/components/games/TriviaGame";
import TruthsAndLieGame from "@/components/games/TruthsAndLieGame";
import BilliardsGame from "@/components/games/BilliardsGame";
import BilliardsGameV2 from "@/components/games/BilliardsGameV2";
import PokerGame from "@/components/games/PokerGame";
import BackButton from "@/components/BackButton";

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
      case 1: return { label: "Excellent", color: "text-green-400" };
      case 2: return { label: "Good", color: "text-green-300" };
      case 3: return { label: "Poor", color: "text-yellow-400" };
      case 4: return { label: "Bad", color: "text-orange-400" };
      case 5: return { label: "Very Bad", color: "text-red-400" };
      case 6: return { label: "Down", color: "text-red-600" };
      default: return { label: "Unknown", color: "text-gray-400" };
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
          
          // Check remote video - try to attach if track exists and container is available
          if (remoteUserRef.current?.videoTrack && mainVideoRef.current) {
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
          } else {
            // Log why we're not trying to attach (only once every few checks)
            // Silence periodic logs to reduce noise
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
    if (walletBalance <= 0) {
      alert("You don't have any tokens to send. Please purchase tokens first.");
      return;
    }
    
    const amount = prompt(`Enter token amount to send as gift (you have ${walletBalance} tokens):`);
    if (amount && socket) {
      const amountNum = parseInt(amount);
      if (isNaN(amountNum) || amountNum <= 0) {
        alert("Please enter a valid positive number");
        return;
      }
      if (amountNum > walletBalance) {
        alert(`Insufficient tokens. You have ${walletBalance} tokens.`);
        return;
      }
      socket.emit("session.sendGift", { sessionId, amountTokens: amountNum });
    }
  };

  return (
    <main className="space-y-4 relative">
      {/* Gift Notification Popup */}
      {giftNotification && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg border-2 animate-pulse ${
          giftNotification.isReceived 
            ? "bg-green-900 border-green-500" 
            : "bg-blue-900 border-blue-500"
        }`}>
          <div className="flex items-center gap-3">
            <span className="text-3xl">{giftNotification.isReceived ? "🎁" : "💝"}</span>
            <div>
              <p className="font-bold text-white">
                {giftNotification.isReceived ? "Gift Received!" : "Gift Sent!"}
              </p>
              <p className="text-sm text-gray-200">
                {giftNotification.isReceived 
                  ? `You received ${giftNotification.amount} tokens`
                  : `You sent ${giftNotification.amount} tokens`
                }
              </p>
            </div>
          </div>
          <button 
            onClick={() => setGiftNotification(null)}
            className="absolute top-1 right-2 text-gray-400 hover:text-white text-sm"
          >
            ✕
          </button>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
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
            <p className="text-sm uppercase tracking-[0.25em] text-gray-400">Session</p>
            <h1 className="text-3xl font-semibold text-white">Video Call</h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Wallet Balance Display */}
          <div className="bg-gradient-to-r from-yellow-900 to-yellow-700 px-4 py-2 border-2 border-yellow-500 flex items-center gap-2">
            <span className="text-xl">💰</span>
            <div>
              <p className="text-xs text-yellow-300 uppercase tracking-wide">Balance</p>
              <p className="font-bold text-white">{walletBalance.toLocaleString()} tokens</p>
            </div>
          </div>
          <button
            onClick={handleEndSession}
            disabled={
              gameType === "trivia" && 
              gameState && 
              gameState.phase && 
              gameState.phase !== "gameEnd" && 
              gameState.phase !== "themeSelection"
            }
            className={`bg-gray-800 px-4 py-2 font-semibold text-white border-2 border-white/30 ${
              gameType === "trivia" && 
              gameState && 
              gameState.phase && 
              gameState.phase !== "gameEnd" && 
              gameState.phase !== "themeSelection"
                ? "opacity-50 cursor-not-allowed"
                : "hover:bg-gray-700"
            }`}
            title={
              gameType === "trivia" && 
              gameState && 
              gameState.phase && 
              gameState.phase !== "gameEnd" && 
              gameState.phase !== "themeSelection"
                ? "Cannot end session while trivia game is in progress!"
                : ""
            }
          >
            End Session
          </button>
        </div>
      </div>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <p className="text-sm text-gray-400">
            {connected ? "Connected" : "Connecting..."} | Session ID: {sessionId.slice(0, 8)}...
            {sessionStartTime && (
              <span className="ml-2 text-green-400">⏱ {formatDuration(sessionDuration)}</span>
            )}
          </p>
          {sessionData && (
            <p className="text-xs text-gray-500 mt-1">
              {peerConnected ? (
                <span className="text-green-400">✓ Peer connected: {sessionData.peer.id.slice(0, 8)}...</span>
              ) : (
                <span className="text-yellow-400">⏳ Waiting for peer to join...</span>
              )}
            </p>
          )}
          {videoReady && (
            <p className="text-xs text-gray-500 mt-1">
              Video: {localVideoActive ? "✓ Local" : "✗ Local"} | {remoteVideoActive ? "✓ Remote" : "✗ Remote"}
              {remoteUserInfo && (
                <span className="ml-2">| Remote: {String(remoteUserInfo.uid).slice(0, 8)}...</span>
              )}
            </p>
          )}
          {networkQuality.downlink > 0 && (
            <p className="text-xs mt-1">
              Network: <span className={getNetworkQualityLabel(networkQuality.downlink).color}>
                {getNetworkQualityLabel(networkQuality.downlink).label}
              </span>
              {connectionState !== "CONNECTED" && connectionState !== "DISCONNECTED" && (
                <span className="ml-2 text-yellow-400">({connectionState})</span>
              )}
            </p>
          )}
          {error && (
            <p className="text-sm text-red-400 mt-1">Error: {error}</p>
          )}
        </div>
        {/* Audio/Video Controls */}
        {videoReady && (
          <div className="flex gap-2">
            <button
              onClick={toggleMute}
              className={`px-3 py-1 text-sm border-2 transition-colors ${
                isMuted 
                  ? "bg-red-600 border-red-500 text-white" 
                  : "bg-gray-800 border-white/30 text-white hover:bg-gray-700"
              }`}
              title={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? "🔇 Muted" : "🔊 Audio"}
            </button>
            <button
              onClick={toggleCamera}
              className={`px-3 py-1 text-sm border-2 transition-colors ${
                isCameraOff 
                  ? "bg-red-600 border-red-500 text-white" 
                  : "bg-gray-800 border-white/30 text-white hover:bg-gray-700"
              }`}
              title={isCameraOff ? "Turn Camera On" : "Turn Camera Off"}
            >
              {isCameraOff ? "📷 Off" : "📹 Video"}
            </button>
          </div>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="bg-gray-900 p-6 border border-white/20 md:col-span-2 space-y-4">
          {/* Video Section */}
          <div 
            ref={videoContainerRef}
            className="aspect-video bg-black border border-white/20 relative"
          >
            {/* Main video container (shows remote by default, local when swapped) */}
            <div
              ref={mainVideoRef}
              className="absolute inset-0 w-full h-full bg-black"
              style={{ minWidth: '100%', minHeight: '100%' }}
            />
            {!remoteVideoActive && !videosSwapped && (
              <div className="absolute inset-0 flex items-center justify-center text-gray-500 z-10 pointer-events-none">
                <div className="text-center">
                  <p className="text-sm">Waiting for remote video...</p>
                  <p className="text-xs mt-1 text-gray-600">The other user's video will appear here</p>
                  {remoteUserInfo && (
                    <p className="text-xs mt-2 text-gray-400">
                      Remote user connected: {String(remoteUserInfo.uid).slice(0, 8)}...
                      <br />
                      Video track: {remoteUserInfo.hasVideo ? "✓" : "✗"} | Audio: {remoteUserInfo.hasAudio ? "✓" : "✗"}
                    </p>
                  )}
                </div>
              </div>
            )}
            {!localVideoActive && videosSwapped && (
              <div className="absolute inset-0 flex items-center justify-center text-gray-500 z-5">
                <div className="text-center">
                  <p className="text-sm">Waiting for local video...</p>
                </div>
              </div>
            )}
            
            {/* Small overlay video container (shows local by default, remote when swapped) */}
            <div
              ref={overlayVideoRef}
              onClick={(e) => {
                e.stopPropagation();
                // Show context menu: swap or fullscreen
                const choice = confirm("Click OK to swap videos, or Cancel to fullscreen");
                if (choice) {
                  handleSwapVideos();
                } else {
                  handleFullscreen(videoContainerRef.current!);
                }
              }}
              onDoubleClick={() => handleFullscreen(videoContainerRef.current!)}
              className="absolute bottom-4 right-4 w-48 h-36 border-2 border-white bg-black z-10 cursor-pointer hover:border-gray-400 transition-all"
              style={{ minWidth: '192px', minHeight: '144px' }}
              title="Click to swap, double-click to fullscreen"
            >
              {!localVideoActive && !videosSwapped && (
                <div className="absolute inset-0 flex items-center justify-center text-gray-500 text-xs">
                  Your video
                </div>
              )}
              {!remoteVideoActive && videosSwapped && (
                <div className="absolute inset-0 flex items-center justify-center text-gray-500 text-xs">
                  Other user
                </div>
              )}
            </div>
            
            {/* Show loading/status overlay when video is not ready */}
            {!videoReady && (
              <div className="absolute inset-0 flex items-center justify-center text-gray-400 z-20 bg-black bg-opacity-75">
                <div className="text-center">
                  {sessionData?.video ? (
                    <>
                      <p className="mb-2">Initializing video call...</p>
                      <p className="text-xs">Please allow camera and microphone access</p>
                      {error && (
                        <p className="text-xs text-red-400 mt-2 max-w-md">{error}</p>
                      )}
                      <p className="text-xs mt-2 text-gray-500">Check browser console for details</p>
                    </>
                  ) : (
                    <p className="text-gray-500">
                      {connected ? "Loading session data..." : "Connecting to server..."}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Game Section - Always visible alongside video */}
          {gameType && gameId && (
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Playing: {gameType}</h2>
              <button
                onClick={handleCancelGame}
                className="text-sm bg-gray-700 hover:bg-gray-600 px-3 py-1 text-white border border-white/30"
              >
                Exit Game
              </button>
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
          ) : gameType && !gameId ? (
            // Game is pending/starting - show cancel option
            <div className="bg-gray-800 p-4 border border-white/20">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-300">Starting game: {gameType}</p>
                <button
                  onClick={handleCancelGame}
                  className="text-xs bg-gray-700 hover:bg-gray-600 px-3 py-1 text-white border border-white/30"
                >
                  Cancel
                </button>
              </div>
              <div className="bg-black p-8 text-center text-gray-400 min-h-[200px] flex items-center justify-center">
                <div>
                  <p className="text-lg mb-2">Starting {gameType}...</p>
                  <p className="text-xs">Please wait while the game initializes</p>
                </div>
              </div>
            </div>
          ) : gameType && gameId && gameType !== "TICTACTOE" && gameType !== "TRIVIA" && gameType !== "CHESS" && gameType !== "TRUTHS_AND_LIE" && gameType?.toUpperCase() !== "TRUTHS_AND_LIE" && gameType !== "BILLIARDS" && gameType?.toUpperCase() !== "BILLIARDS" && gameType !== "POKER" && gameType?.toUpperCase() !== "POKER" ? (
            <div className="bg-gray-800 p-4 border border-white/20">
              <p className="text-sm text-gray-300 mb-2">Active game: {gameType} (ID: {gameId})</p>
              <div className="bg-black p-8 text-center text-gray-400 min-h-[200px] flex items-center justify-center">
                <div>
                  <p className="text-lg mb-2">Game UI for {gameType}</p>
                  <p className="text-xs">Game implementation coming soon or state not loaded</p>
                  <p className="text-xs mt-2">Game State: {gameState ? "Loaded" : "Not loaded"}</p>
                  <p className="text-xs mt-1">Debug: gameType={gameType}, gameId={gameId}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-gray-800 p-4 border border-white/20">
              <p className="text-sm text-gray-400 mb-3">Start a game</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleStartGame("CHESS")}
                  className="bg-white px-3 py-2 text-black text-sm hover:bg-gray-200 border-2 border-white"
                >
                  Chess
                </button>
                <button
                  onClick={() => handleStartGame("TRIVIA")}
                  className="bg-white px-3 py-2 text-black text-sm hover:bg-gray-200 border-2 border-white"
                >
                  Trivia
                </button>
                <button
                  onClick={() => handleStartGame("TICTACTOE")}
                  className="bg-white px-3 py-2 text-black text-sm hover:bg-gray-200 border-2 border-white"
                >
                  Tic-Tac-Toe
                </button>
                <button
                  key="truths-and-lie-button"
                  onClick={() => {
                    console.log("Starting Truths & Lie game");
                    handleStartGame("TRUTHS_AND_LIE");
                  }}
                  className="bg-white px-3 py-2 text-black text-sm hover:bg-gray-200 border-2 border-white"
                >
                  Truths & Lie
                </button>
                <button
                  onClick={() => handleStartGame("BILLIARDS")}
                  className="bg-white px-3 py-2 text-black text-sm hover:bg-gray-200 border-2 border-white"
                >
                  Billiards
                </button>
                <button
                  onClick={() => handleStartGame("POKER")}
                  className="bg-white px-3 py-2 text-black text-sm hover:bg-gray-200 border-2 border-white"
                >
                  Poker
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div className="bg-gray-900 p-4 border border-white/20">
            <p className="text-sm text-gray-400 mb-3">Actions</p>
            <div className="space-y-2">
              <button
                onClick={handleSendGift}
                className="w-full bg-gray-800 px-4 py-2 text-white border-2 border-white/30 hover:bg-gray-700"
              >
                Send Gift
              </button>
              <button
                onClick={() => {
                  const reason = prompt("Report reason:");
                  if (reason && socket) {
                    socket.emit("session.report", { sessionId, reason });
                    alert("Report submitted");
                  }
                }}
                className="w-full bg-gray-800 px-4 py-2 text-white border-2 border-white/30 hover:bg-gray-700"
              >
                Report User
              </button>
            </div>
          </div>

          <div className="bg-gray-900 p-4 border border-white/20">
            <p className="text-sm text-gray-400 mb-2">Session Info</p>
            <div className="text-xs text-gray-500 space-y-1">
              <p>
                Peer: {sessionData?.peer.id ? sessionData.peer.id.slice(0, 8) + "..." : "Loading..."}
                {connected && sessionData?.peer?.id && (
                  <span className="ml-2 text-green-400">✓ Connected</span>
                )}
              </p>
              <p>Channel: {sessionData?.video?.channelName || "Video not available (Agora not configured)"}</p>
              {sessionData?.video?.expiresAt && (
                <p>Token expires: {new Date(sessionData.video.expiresAt).toLocaleTimeString()}</p>
              )}
              {!sessionData?.video && (
                <p className="text-yellow-400 text-xs mt-2">
                  ℹ️ Video disabled - games and chat still work!
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

