import { Body, Controller, Get, Patch, UseGuards } from "@nestjs/common";
import { IsNumber, IsNotEmpty } from "class-validator";
import { UsersService } from "./users.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { JwtPayload } from "../../common/types/auth";

class UpdateLocationDto {
  @IsNumber()
  @IsNotEmpty()
  latitude!: number;

  @IsNumber()
  @IsNotEmpty()
  longitude!: number;
}

@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(JwtAuthGuard)
  @Get("me")
  async me(@CurrentUser() user: JwtPayload) {
    return this.usersService.getMe(user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Patch("me/location")
  async updateLocation(@CurrentUser() user: JwtPayload, @Body() dto: UpdateLocationDto) {
    return this.usersService.updateLocation(user.sub, dto.latitude, dto.longitude);
  }
}


