-- AlterEnum (add new RoomStatus values if they don't exist)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'VOTING' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'RoomStatus')) THEN
        ALTER TYPE "RoomStatus" ADD VALUE 'VOTING';
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'IN_GAME' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'RoomStatus')) THEN
        ALTER TYPE "RoomStatus" ADD VALUE 'IN_GAME';
    END IF;
END $$;

-- AlterEnum (update RoomRole values)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'PLAYER' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'RoomRole')) THEN
        ALTER TYPE "RoomRole" ADD VALUE 'PLAYER';
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'SPECTATOR' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'RoomRole')) THEN
        ALTER TYPE "RoomRole" ADD VALUE 'SPECTATOR';
    END IF;
END $$;

-- AlterEnum (add RoundStatus)
DO $$ BEGIN
    CREATE TYPE "RoundStatus" AS ENUM ('WAITING', 'VOTING', 'IN_GAME', 'COMPLETED', 'CANCELED');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- AlterTable Room - add missing columns
ALTER TABLE "Room" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "Room" ADD COLUMN IF NOT EXISTS "passwordHash" TEXT;
ALTER TABLE "Room" ADD COLUMN IF NOT EXISTS "maxMembers" INTEGER NOT NULL DEFAULT 8;
ALTER TABLE "Room" ADD COLUMN IF NOT EXISTS "region" TEXT NOT NULL DEFAULT 'global';
ALTER TABLE "Room" ADD COLUMN IF NOT EXISTS "entryFeeTokens" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Room" ADD COLUMN IF NOT EXISTS "isPublic" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Room" ADD COLUMN IF NOT EXISTS "currentRoundId" TEXT;

-- AlterTable RoomParticipant - add missing columns
ALTER TABLE "RoomParticipant" ADD COLUMN IF NOT EXISTS "tokensInPool" INTEGER NOT NULL DEFAULT 0;

-- CreateTable RoomRound if not exists
CREATE TABLE IF NOT EXISTS "RoomRound" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "roundNumber" INTEGER NOT NULL,
    "entryFeeTokens" INTEGER NOT NULL DEFAULT 0,
    "poolTokens" INTEGER NOT NULL DEFAULT 0,
    "status" "RoundStatus" NOT NULL DEFAULT 'WAITING',
    "gameType" "GameType",
    "gameId" TEXT,
    "winnerId" TEXT,
    "votingEndsAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoomRound_pkey" PRIMARY KEY ("id")
);

-- CreateTable RoundParticipant if not exists
CREATE TABLE IF NOT EXISTS "RoundParticipant" (
    "id" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "roomParticipantId" TEXT NOT NULL,
    "tokensStaked" INTEGER NOT NULL DEFAULT 0,
    "result" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoundParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable RoundVote if not exists
CREATE TABLE IF NOT EXISTS "RoundVote" (
    "id" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "odUserId" TEXT NOT NULL,
    "gameType" "GameType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoundVote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (safe with IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS "Room_status_idx" ON "Room"("status");
CREATE INDEX IF NOT EXISTS "Room_region_idx" ON "Room"("region");
CREATE INDEX IF NOT EXISTS "RoomRound_roomId_idx" ON "RoomRound"("roomId");
CREATE INDEX IF NOT EXISTS "RoundParticipant_roundId_idx" ON "RoundParticipant"("roundId");
CREATE INDEX IF NOT EXISTS "RoundParticipant_roomParticipantId_idx" ON "RoundParticipant"("roomParticipantId");
CREATE INDEX IF NOT EXISTS "RoundVote_roundId_idx" ON "RoundVote"("roundId");

-- Create unique constraint for RoundVote (skip if exists)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'RoundVote_roundId_odUserId_key') THEN
        ALTER TABLE "RoundVote" ADD CONSTRAINT "RoundVote_roundId_odUserId_key" UNIQUE ("roundId", "odUserId");
    END IF;
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN others THEN NULL;
END $$;

-- AddForeignKey constraints (safe approach)
DO $$ BEGIN
    ALTER TABLE "RoomRound" ADD CONSTRAINT "RoomRound_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "RoundParticipant" ADD CONSTRAINT "RoundParticipant_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "RoomRound"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "RoundParticipant" ADD CONSTRAINT "RoundParticipant_roomParticipantId_fkey" FOREIGN KEY ("roomParticipantId") REFERENCES "RoomParticipant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "RoundVote" ADD CONSTRAINT "RoundVote_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "RoomRound"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;
