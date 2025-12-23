import { Module } from "@nestjs/common";
import { TriviaService } from "./trivia.service";

@Module({
  providers: [TriviaService],
  exports: [TriviaService]
})
export class TriviaModule {}





