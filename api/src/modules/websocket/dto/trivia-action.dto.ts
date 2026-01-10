import { IsString, IsNumber, Min, Max } from "class-validator";

export class TriviaSelectThemeDto {
  @IsString()
  gameId!: string;

  @IsString()
  theme!: string;
}

export class TriviaAnswerDto {
  @IsString()
  gameId!: string;

  @IsNumber()
  @Min(0)
  @Max(100)
  questionIndex!: number;

  @IsNumber()
  @Min(0)
  @Max(10)
  answerIndex!: number;
}


