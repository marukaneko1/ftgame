import { IsString, IsNumber, IsOptional, IsIn, Min, Max } from "class-validator";

export class PokerActionDto {
  @IsString()
  gameId!: string;

  @IsString()
  @IsIn(['fold', 'check', 'call', 'bet', 'raise', 'all-in'])
  action!: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1000000) // Max bet amount
  amount?: number;
}

export class PokerNewHandDto {
  @IsString()
  gameId!: string;
}


