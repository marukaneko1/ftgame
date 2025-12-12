import { GameType, RoomStatus, RoomRole, RoundStatus } from "@prisma/client";
export interface CreateRoomDto {
    title: string;
    description?: string;
    password?: string;
    maxMembers?: number;
    region?: string;
    entryFeeTokens?: number;
    isPublic?: boolean;
}
export interface JoinRoomDto {
    roomId: string;
    password?: string;
}
export interface StartRoundDto {
    roomId: string;
    entryFeeTokens: number;
}
export interface VoteGameDto {
    roomId: string;
    roundId: string;
    gameType: GameType;
}
export interface RoomWithParticipants {
    id: string;
    title: string;
    description: string | null;
    hostUserId: string;
    maxMembers: number;
    region: string;
    entryFeeTokens: number;
    status: RoomStatus;
    isPublic: boolean;
    currentRoundId: string | null;
    participantCount: number;
    participants: RoomParticipantInfo[];
    currentRound?: RoundInfo | null;
}
export interface RoomParticipantInfo {
    odUserId: string;
    displayName: string;
    username: string;
    role: RoomRole;
    tokensInPool: number;
    walletBalance: number;
}
export interface RoundInfo {
    id: string;
    roundNumber: number;
    entryFeeTokens: number;
    poolTokens: number;
    status: RoundStatus;
    gameType: GameType | null;
    gameId: string | null;
    votingEndsAt: Date | null;
    participants: RoundParticipantInfo[];
    votes: {
        odUserId: string;
        gameType: GameType;
    }[];
}
export interface RoundParticipantInfo {
    odUserId: string;
    displayName: string;
    tokensStaked: number;
}
export interface VotingResult {
    gameType: GameType;
    voteCount: number;
}
//# sourceMappingURL=rooms.types.d.ts.map