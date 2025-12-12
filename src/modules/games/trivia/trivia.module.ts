import { Module } from '@nestjs/common';
import { TriviaService } from './trivia.service';
import { TriviaQuestionService } from './trivia.question.service';
import { TriviaTimerService } from './trivia.timer.service';
import { PrismaModule } from '../../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [TriviaService, TriviaQuestionService, TriviaTimerService],
  exports: [TriviaService, TriviaQuestionService, TriviaTimerService],
})
export class TriviaModule {}

