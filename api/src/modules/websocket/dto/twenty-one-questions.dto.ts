import { IsString, IsNotEmpty } from "class-validator";

export class TwentyOneQuestionsNextDto {
  @IsString()
  @IsNotEmpty()
  gameId!: string;
}

