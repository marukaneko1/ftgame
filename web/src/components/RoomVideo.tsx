"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import AgoraRTC, { 
  ICameraVideoTrack, 
  IMicrophoneAudioTrack, 
  IAgoraRTCClient, 
  IAgoraRTCRemoteUser,
  VideoEncoderConfiguration
} from "agora-rtc-sdk-ng";
import { videoApi } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

interface RoomVideoProps {
  roomId: string;
  userId: string;
  participants: Array<{ odUserId: string; displayName: string }>;
  enabled?: boolean;
}

interface RemoteUserState {
  uid: string | number;
  hasVideo: boolean;
  hasAudio: boolean;
  user: IAgoraRTCRemoteUser;
}

// Adaptive video quality based on participant count
const getVideoConfig = (participantCount: number): VideoEncoderConfiguration => {
  if (participantCount <= 2) {
    return { width: 640, height: 480, frameRate: 30, bitrateMin: 400, bitrateMax: 1000 };
  } else if (participantCount <= 4) {
    return { width: 480, height: 360, frameRate: 24, bitrateMin: 200, bitrateMax: 600 };
  } else if (participantCount <= 8) {
    return { width: 320, height: 240, frameRate: 15, bitrateMin: 100, bitrateMax: 300 };
  } else {
    return { width: 240, height: 180, frameRate: 15, bitrateMin: 50, bitrateMax: 200 };
  }
};

export default function RoomVideo({ roomId, userId, participants, enabled = true }: RoomVideoProps) {
  const [appId, setAppId] = useState<string | null>(null);
  const [videoToken, setVideoToken] = useState<{ token: string; channelName: string } | null>(null);
  const [localVideoActive, setLocalVideoActive] = useState(false);
  const [remoteUsers, setRemoteUsers] = useState<RemoteUserState[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [error, setError] = useState<string>("");
  const [isInitialized, setIsInitialized] = useState(false);

  const localVideoRef = useRef<HTMLDivElement>(null);
  const remoteVideoRefs = useRef<Map<string | number, HTMLDivElement>>(new Map());
  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const localTracksRef = useRef<{ videoTrack: ICameraVideoTrack | null; audioTrack: IMicrophoneAudioTrack | null }>({ 
    videoTrack: null, 
    audioTrack: null 
  });

  // Get Agora App ID on mount
  useEffect(() => {
    const getAppIdAsync = async () => {
      try {
        const { appId: fetchedAppId } = await videoApi.getAppId();
        setAppId(fetchedAppId);
      } catch (err) {
        console.error("Failed to get Agora app ID:", err);
        setError("Video features unavailable");
      }
    };
    getAppIdAsync();
  }, []);

  // Get video token when enabled
  useEffect(() => {
    if (!enabled || !appId) return;

    const getToken = async () => {
      try {
        const tokenData = await videoApi.getRoomToken(roomId);
        setVideoToken(tokenData);
      } catch (err) {
        console.error("Failed to get video token:", err);
        setError("Failed to initialize video");
      }
    };
    getToken();
  }, [enabled, appId, roomId]);

  // Initialize Agora client
  const initializeVideo = useCallback(async () => {
    if (!appId || !videoToken || !localVideoRef.current || isInitialized) return;

    try {
      setError("");
      
      // Create client with VP8 codec for better compatibility
      const client = AgoraRTC.createClient({ 
        mode: "rtc", 
        codec: "vp8"
      });
      clientRef.current = client;

      // Set up event handlers BEFORE joining
      client.on("user-published", async (user, mediaType) => {
        await client.subscribe(user, mediaType);
        
        if (mediaType === "video") {
          setRemoteUsers(prev => {
            const existing = prev.find(u => u.uid === user.uid);
            if (existing) {
              return prev.map(u => u.uid === user.uid ? { ...u, hasVideo: true, user } : u);
            }
            return [...prev, { uid: user.uid, hasVideo: true, hasAudio: false, user }];
          });

          // Play video after a short delay to ensure DOM is ready
          setTimeout(() => {
            const container = remoteVideoRefs.current.get(user.uid);
            if (container && user.videoTrack) {
              user.videoTrack.play(container);
            }
          }, 100);
        }

        if (mediaType === "audio") {
          setRemoteUsers(prev => {
            const existing = prev.find(u => u.uid === user.uid);
            if (existing) {
              return prev.map(u => u.uid === user.uid ? { ...u, hasAudio: true, user } : u);
            }
            return [...prev, { uid: user.uid, hasVideo: false, hasAudio: true, user }];
          });
          user.audioTrack?.play();
        }
      });

      client.on("user-unpublished", (user, mediaType) => {
        if (mediaType === "video") {
          setRemoteUsers(prev => prev.map(u => u.uid === user.uid ? { ...u, hasVideo: false } : u));
        }
        if (mediaType === "audio") {
          setRemoteUsers(prev => prev.map(u => u.uid === user.uid ? { ...u, hasAudio: false } : u));
        }
      });

      client.on("user-left", (user) => {
        setRemoteUsers(prev => prev.filter(u => u.uid !== user.uid));
      });

      // Join channel
      await client.join(appId, videoToken.channelName, videoToken.token, userId);

      // Create and publish local tracks with adaptive quality
      const videoConfig = getVideoConfig(participants.length);
      const [audioTrack, videoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks(
        { AEC: true, ANS: true, AGC: true },
        { encoderConfig: videoConfig }
      );

      localTracksRef.current = { videoTrack, audioTrack };

      // Play local video
      if (localVideoRef.current) {
        videoTrack.play(localVideoRef.current);
        setLocalVideoActive(true);
      }

      // Publish tracks
      await client.publish([audioTrack, videoTrack]);
      
      setIsInitialized(true);
      console.log("Video initialized successfully");
    } catch (err: any) {
      console.error("Video initialization error:", err);
      setError(err.message || "Failed to initialize video");
    }
  }, [appId, videoToken, userId, participants.length, isInitialized]);

  // Initialize video when ready
  useEffect(() => {
    if (enabled && appId && videoToken && !isInitialized) {
      initializeVideo();
    }
  }, [enabled, appId, videoToken, isInitialized, initializeVideo]);

  // Update video quality when participants change
  useEffect(() => {
    if (localTracksRef.current.videoTrack && isInitialized) {
      const newConfig = getVideoConfig(participants.length);
      localTracksRef.current.videoTrack.setEncoderConfiguration(newConfig);
    }
  }, [participants.length, isInitialized]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      const cleanup = async () => {
        if (localTracksRef.current.videoTrack) {
          localTracksRef.current.videoTrack.stop();
          localTracksRef.current.videoTrack.close();
        }
        if (localTracksRef.current.audioTrack) {
          localTracksRef.current.audioTrack.stop();
          localTracksRef.current.audioTrack.close();
        }
        if (clientRef.current) {
          await clientRef.current.leave();
        }
      };
      cleanup().catch(console.error);
    };
  }, []);

  // Toggle mute
  const toggleMute = async () => {
    if (localTracksRef.current.audioTrack) {
      await localTracksRef.current.audioTrack.setMuted(!isMuted);
      setIsMuted(!isMuted);
    }
  };

  // Toggle camera
  const toggleCamera = async () => {
    if (localTracksRef.current.videoTrack) {
      await localTracksRef.current.videoTrack.setMuted(!isCameraOff);
      setIsCameraOff(!isCameraOff);
    }
  };

  // Get display name for a user
  const getDisplayName = (uid: string | number) => {
    const participant = participants.find(p => p.odUserId === uid.toString());
    return participant?.displayName || `User ${String(uid).slice(-4)}`;
  };

  // Calculate grid layout based on participant count
  const getGridClass = () => {
    const total = remoteUsers.length + 1; // +1 for local video
    if (total <= 1) return "grid-cols-1";
    if (total <= 2) return "grid-cols-2";
    if (total <= 4) return "grid-cols-2";
    if (total <= 6) return "grid-cols-3";
    if (total <= 9) return "grid-cols-3";
    return "grid-cols-4";
  };

  if (!enabled || !appId) {
    return (
      <Card variant="glass" padding="md" className="text-center">
        <div className="flex flex-col items-center gap-2 py-4">
          <svg className="w-8 h-8 text-txt-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          <p className="text-txt-muted text-sm">Video not available</p>
        </div>
      </Card>
    );
  }

  return (
    <Card variant="elevated" padding="none" className="overflow-hidden">
      {/* Error Display */}
      {error && (
        <div className="bg-error-muted p-3 border-b border-error/30">
          <Badge variant="error" size="md">{error}</Badge>
        </div>
      )}

      {/* Video Grid */}
      <div className={`grid ${getGridClass()} gap-1 p-1 bg-base`}>
        {/* Local Video */}
        <div className="relative aspect-video bg-surface-primary rounded-md overflow-hidden">
          <div 
            ref={localVideoRef} 
            className={`w-full h-full ${isCameraOff ? 'hidden' : ''}`}
          />
          {isCameraOff && (
            <div className="absolute inset-0 flex items-center justify-center bg-surface-secondary">
              <div className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-full bg-surface-tertiary flex items-center justify-center">
                  <svg className="w-6 h-6 text-txt-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                  </svg>
                </div>
                <span className="text-xs text-txt-muted">Camera Off</span>
              </div>
            </div>
          )}
          <div className="absolute bottom-2 left-2 bg-base/80 backdrop-blur-sm px-2 py-1 text-xs text-txt-primary rounded-md flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-success"></span>
            You {isMuted && <span className="text-error">🔇</span>}
          </div>
        </div>

        {/* Remote Videos */}
        {remoteUsers.map(remoteUser => (
          <div key={remoteUser.uid} className="relative aspect-video bg-surface-primary rounded-md overflow-hidden">
            <div 
              ref={(el) => {
                if (el) remoteVideoRefs.current.set(remoteUser.uid, el);
              }}
              className={`w-full h-full ${!remoteUser.hasVideo ? 'hidden' : ''}`}
            />
            {!remoteUser.hasVideo && (
              <div className="absolute inset-0 flex items-center justify-center bg-surface-secondary">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-full bg-surface-tertiary flex items-center justify-center">
                    <svg className="w-6 h-6 text-txt-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                    </svg>
                  </div>
                  <span className="text-xs text-txt-muted">No Video</span>
                </div>
              </div>
            )}
            <div className="absolute bottom-2 left-2 bg-base/80 backdrop-blur-sm px-2 py-1 text-xs text-txt-primary rounded-md flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${remoteUser.hasAudio ? 'bg-success' : 'bg-error'}`}></span>
              {getDisplayName(remoteUser.uid)}
            </div>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex justify-center gap-3 p-3 bg-surface-primary/50 backdrop-blur-sm border-t border-border-subtle">
        <Button
          variant={isMuted ? "danger" : "secondary"}
          size="sm"
          onClick={toggleMute}
          icon={<span>{isMuted ? "🔇" : "🎤"}</span>}
        >
          {isMuted ? "Unmute" : "Mute"}
        </Button>
        <Button
          variant={isCameraOff ? "danger" : "secondary"}
          size="sm"
          onClick={toggleCamera}
          icon={<span>{isCameraOff ? "📷" : "📹"}</span>}
        >
          {isCameraOff ? "Show" : "Hide"}
        </Button>
      </div>

      {/* Connection status */}
      {!isInitialized && !error && (
        <div className="flex items-center justify-center gap-2 py-3 text-txt-muted text-sm bg-surface-primary/30">
          <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          Connecting to video...
        </div>
      )}
    </Card>
  );
}
