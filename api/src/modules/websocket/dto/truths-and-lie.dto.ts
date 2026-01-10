import { IsString, IsNumber, IsArray, ArrayMinSize, ArrayMaxSize, Min, Max, MaxLength } from "class-validator";

export class TruthsAndLieSubmitStatementsDto {
  @IsString()
  gameId!: string;

  @IsArray()
  @ArrayMinSize(3)
  @ArrayMaxSize(3)
  @IsString({ each: true })
  @MaxLength(500, { each: true })
  statements!: string[];

  @IsNumber()
  @Min(0)
  @Max(2)
  lieIndex!: number;
}

export class TruthsAndLieSubmitGuessDto {
  @IsString()
  gameId!: string;

  @IsNumber()
  @Min(0)
  @Max(2)
  selectedIndex!: number;
}


