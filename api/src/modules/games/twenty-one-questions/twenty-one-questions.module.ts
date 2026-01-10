import { Module } from "@nestjs/common";
import { TwentyOneQuestionsService } from "./twenty-one-questions.service";

@Module({
  providers: [TwentyOneQuestionsService],
  exports: [TwentyOneQuestionsService]
})
export class TwentyOneQuestionsModule {}

