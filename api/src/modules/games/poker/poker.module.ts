import { Module } from '@nestjs/common';
import { PokerService } from './poker.service';
import { PrismaModule } from '../../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [PokerService],
  exports: [PokerService],
})
export class PokerModule {}


