import { IsString } from "class-validator";

export class TokenPackDto {
  @IsString()
  packId!: string;
}


