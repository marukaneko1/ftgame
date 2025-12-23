import { Module } from "@nestjs/common";
import { ReportsService } from "./reports.service";
import { PrismaService } from "../../prisma/prisma.service";

@Module({
  providers: [ReportsService, PrismaService],
  exports: [ReportsService]
})
export class ReportsModule {}

