import { IsString, IsOptional, IsNumber, Min, Max } from "class-validator";

export class MatchJoinDto {
  @IsString()
  region!: string;

  @IsString()
  language!: string;

  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;
}







