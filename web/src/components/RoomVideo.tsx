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
      <div className="bg-gray-800 p-4 border border-white/20 text-center">
        <p className="text-gray-500 text-sm">Video not available</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 border border-white/20 overflow-hidden">
      {/* Error Display */}
      {error && (
        <div className="bg-red-900/50 p-2 text-red-300 text-sm text-center">
          {error}
        </div>
      )}

      {/* Video Grid */}
      <div className={`grid ${getGridClass()} gap-1 p-1`}>
        {/* Local Video */}
        <div className="relative aspect-video bg-gray-800">
          <div 
            ref={localVideoRef} 
            className={`w-full h-full ${isCameraOff ? 'hidden' : ''}`}
          />
          {isCameraOff && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-700">
              <span className="text-4xl">📷</span>
            </div>
          )}
          <div className="absolute bottom-1 left-1 bg-black/70 px-2 py-0.5 text-xs text-white rounded">
            You {isMuted && "🔇"} {isCameraOff && "📷"}
          </div>
        </div>

        {/* Remote Videos */}
        {remoteUsers.map(remoteUser => (
          <div key={remoteUser.uid} className="relative aspect-video bg-gray-800">
            <div 
              ref={(el) => {
                if (el) remoteVideoRefs.current.set(remoteUser.uid, el);
              }}
              className={`w-full h-full ${!remoteUser.hasVideo ? 'hidden' : ''}`}
            />
            {!remoteUser.hasVideo && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-700">
                <span className="text-4xl">👤</span>
              </div>
            )}
            <div className="absolute bottom-1 left-1 bg-black/70 px-2 py-0.5 text-xs text-white rounded">
              {getDisplayName(remoteUser.uid)} {!remoteUser.hasAudio && "🔇"}
            </div>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex justify-center gap-2 p-2 bg-gray-800/50">
        <button
          onClick={toggleMute}
          className={`px-3 py-1.5 text-sm rounded transition-colors ${
            isMuted 
              ? "bg-red-600 text-white hover:bg-red-500" 
              : "bg-gray-700 text-white hover:bg-gray-600"
          }`}
        >
          {isMuted ? "🔇 Unmute" : "🎤 Mute"}
        </button>
        <button
          onClick={toggleCamera}
          className={`px-3 py-1.5 text-sm rounded transition-colors ${
            isCameraOff 
              ? "bg-red-600 text-white hover:bg-red-500" 
              : "bg-gray-700 text-white hover:bg-gray-600"
          }`}
        >
          {isCameraOff ? "📷 Show" : "📹 Hide"}
        </button>
      </div>

      {/* Connection status */}
      {!isInitialized && !error && (
        <div className="text-center py-2 text-gray-400 text-sm">
          Connecting to video...
        </div>
      )}
    </div>
  );
}
