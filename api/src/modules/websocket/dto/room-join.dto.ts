import { IsString, IsOptional } from "class-validator";

export class RoomJoinDto {
  @IsString()
  roomId!: string;

  @IsOptional()
  @IsString()
  password?: string;
}







