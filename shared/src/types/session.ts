export type SessionStatus = "matching" | "connected" | "ended";
export type SessionEndReason = "user_left" | "timeout" | "report" | "error";

export interface SessionPeer {
  id: string;
  displayName: string;
  level: number;
  avatarUrl?: string | null;
}

export interface SessionSummary {
  id: string;
  status: SessionStatus;
  startedAt?: string | null;
  endedAt?: string | null;
  endReason?: SessionEndReason | null;
  videoChannelName: string;
}


