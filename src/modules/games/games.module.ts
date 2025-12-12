import { Module } from "@nestjs/common";
import { GamesService } from "./games.service";
import { TicTacToeModule } from "./tictactoe/tictactoe.module";
import { TicTacToeService } from "./tictactoe/tictactoe.service";
import { ChessModule } from "./chess/chess.module";
import { ChessService } from "./chess/chess.service";
import { TriviaModule } from "./trivia/trivia.module";
import { TriviaService } from "./trivia/trivia.service";
import { PrismaModule } from "../../prisma/prisma.module";

@Module({
  imports: [PrismaModule, TicTacToeModule, ChessModule, TriviaModule],
  providers: [GamesService, TicTacToeService, ChessService, TriviaService],
  exports: [GamesService, TicTacToeService, ChessService, TriviaService]
})
export class GamesModule {}

