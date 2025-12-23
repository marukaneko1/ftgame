import { Module } from "@nestjs/common";
import { GamesService } from "./games.service";
import { TicTacToeModule } from "./tictactoe/tictactoe.module";
import { TicTacToeService } from "./tictactoe/tictactoe.service";
import { ChessModule } from "./chess/chess.module";
import { ChessService } from "./chess/chess.service";
import { TriviaModule } from "./trivia/trivia.module";
import { TriviaService } from "./trivia/trivia.service";
import { TruthsAndLieModule } from "./truths-and-lie/truths-and-lie.module";
import { TruthsAndLieService } from "./truths-and-lie/truths-and-lie.service";
import { BilliardsModule } from "./billiards/billiards.module";
import { BilliardsService } from "./billiards/billiards.service";
import { PrismaModule } from "../../prisma/prisma.module";

@Module({
  imports: [PrismaModule, TicTacToeModule, ChessModule, TriviaModule, TruthsAndLieModule, BilliardsModule],
  providers: [GamesService, TicTacToeService, ChessService, TriviaService, TruthsAndLieService, BilliardsService],
  exports: [GamesService, TicTacToeService, ChessService, TriviaService, TruthsAndLieService, BilliardsService]
})
export class GamesModule {}

