export type RoomStatus = "live" | "ended";

export interface RoomSummary {
  id: string;
  hostUserId: string;
  title: string;
  status: RoomStatus;
  videoChannelName: string;
  createdAt: string;
  endedAt?: string | null;
}


