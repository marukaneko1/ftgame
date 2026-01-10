import { Module } from "@nestjs/common";
import { TruthsAndLieService } from "./truths-and-lie.service";

@Module({
  providers: [TruthsAndLieService],
  exports: [TruthsAndLieService]
})
export class TruthsAndLieModule {}






