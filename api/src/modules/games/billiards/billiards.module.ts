import { Module } from '@nestjs/common';
import { BilliardsService } from './billiards.service';

@Module({
  providers: [BilliardsService],
  exports: [BilliardsService]
})
export class BilliardsModule {}







