import { Module } from "@nestjs/common";
import { TicTacToeService } from "./tictactoe.service";
import { PrismaModule } from "../../../prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  providers: [TicTacToeService],
  exports: [TicTacToeService]
})
export class TicTacToeModule {}

