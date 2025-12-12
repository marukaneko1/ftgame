import { Body, Controller, Get, Param, Post, Query, UseGuards, Request } from "@nestjs/common";
import { RoomsService } from "./rooms.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { CreateRoomDto } from "./rooms.types";
import { IsString, IsOptional, IsNumber, IsBoolean, Min, Max } from "class-validator";

class CreateRoomBody {
  @IsString()
  title!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  password?: string;

  @IsNumber()
  @IsOptional()
  @Min(2)
  @Max(16)
  maxMembers?: number;

  @IsString()
  @IsOptional()
  region?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  entryFeeTokens?: number;

  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;
}

class JoinRoomBody {
  @IsString()
  @IsOptional()
  password?: string;
}

@Controller("rooms")
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Get()
  async getPublicRooms(@Query("region") region?: string) {
    return this.roomsService.getPublicRooms(region);
  }

  @Get(":id")
  @UseGuards(JwtAuthGuard)
  async getRoomDetails(@Param("id") id: string) {
    return this.roomsService.getRoomDetails(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async createRoom(@Request() req: any, @Body() body: CreateRoomBody) {
    return this.roomsService.createRoom(req.user.sub, body);
  }

  @Post(":id/join")
  @UseGuards(JwtAuthGuard)
  async joinRoom(
    @Request() req: any,
    @Param("id") id: string,
    @Body() body: JoinRoomBody
  ) {
    return this.roomsService.joinRoom(req.user.sub, id, body.password);
  }

  @Post(":id/leave")
  @UseGuards(JwtAuthGuard)
  async leaveRoom(@Request() req: any, @Param("id") id: string) {
    return this.roomsService.leaveRoom(req.user.sub, id);
  }

  @Post(":id/end")
  @UseGuards(JwtAuthGuard)
  async endRoom(@Request() req: any, @Param("id") id: string) {
    return this.roomsService.endRoom(id, req.user.sub);
  }
}

