import { IsDateString, IsEmail, IsNotEmpty, IsOptional, IsString, Length, Matches, MinLength } from "class-validator";

export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsString()
  @Length(2, 50)
  displayName!: string;

  @IsString()
  @Matches(/^[a-zA-Z0-9_]{3,20}$/)
  username!: string;

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;
}


