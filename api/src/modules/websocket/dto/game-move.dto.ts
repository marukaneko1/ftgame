import { IsString, IsNumber, IsOptional, Min, Max, IsIn } from "class-validator";
import { PieceType } from "../../games/chess/chess.types";

export class GameMoveDto {
  @IsString()
  gameId!: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(8)
  cellIndex?: number;

  @IsOptional()
  from?: { row: number; col: number };

  @IsOptional()
  to?: { row: number; col: number };

  @IsOptional()
  @IsIn(['Q', 'R', 'B', 'N'])
  promotionPiece?: PieceType;
}








