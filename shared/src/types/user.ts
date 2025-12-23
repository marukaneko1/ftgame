export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  username: string;
  avatarUrl?: string | null;
  dateOfBirth?: string | null;
  is18PlusVerified: boolean;
  kycStatus: "pending" | "verified" | "rejected";
  level: number;
  xp: number;
  isBanned: boolean;
  banReason?: string | null;
}


