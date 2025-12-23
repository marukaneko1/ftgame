import { IsString, IsEnum } from "class-validator";
import { GameType } from "@prisma/client";

export class RoomVoteDto {
  @IsString()
  roomId!: string;

  @IsString()
  roundId!: string;

  @IsEnum(GameType)
  gameType!: GameType;
}




