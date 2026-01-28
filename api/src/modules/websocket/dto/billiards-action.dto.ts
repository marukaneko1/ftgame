import { IsString, IsNumber, IsObject, Min, Max, ValidateNested } from "class-validator";
import { Type } from "class-transformer";

class Position {
  @IsNumber()
  @Min(-500)
  @Max(500)
  x!: number;

  @IsNumber()
  @Min(-500)
  @Max(500)
  y!: number;
}

export class BilliardsShotDto {
  @IsString()
  gameId!: string;

  @IsNumber()
  @Min(0)
  @Max(100)
  power!: number;

  @IsNumber()
  @Min(-360)
  @Max(360)
  angle!: number;
}

export class BilliardsPlaceCueBallDto {
  @IsString()
  gameId!: string;

  @ValidateNested()
  @Type(() => Position)
  position!: Position;
}

export class BilliardsEventDto {
  @IsString()
  gameId!: string;

  @IsObject()
  event!: Record<string, any>;
}



