import { IsString, IsNumber, Min } from "class-validator";

export class SendGiftDto {
  @IsString()
  sessionId!: string;

  @IsNumber()
  @Min(1)
  amountTokens!: number;
}






