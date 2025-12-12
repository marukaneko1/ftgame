import { Module } from "@nestjs/common";
import { RoomsService } from "./rooms.service";
import { RoomsController } from "./rooms.controller";
import { PrismaModule } from "../../prisma/prisma.module";
import { GamesModule } from "../games/games.module";

@Module({
  imports: [PrismaModule, GamesModule],
  controllers: [RoomsController],
  providers: [RoomsService],
  exports: [RoomsService]
})
export class RoomsModule {}

