export const ROLES = ["host", "speaker", "listener"] as const;
export type RoomRole = (typeof ROLES)[number];


