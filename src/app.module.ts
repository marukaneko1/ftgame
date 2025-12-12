import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import configuration from "./config/configuration";
import { validationSchema } from "./config/env.validation";
import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from "./modules/auth/auth.module";
import { UsersModule } from "./modules/users/users.module";
import { SubscriptionsModule } from "./modules/subscriptions/subscriptions.module";
import { WalletModule } from "./modules/wallet/wallet.module";
import { WebsocketModule } from "./modules/websocket/websocket.module";
import { VideoModule } from "./modules/video/video.module";
import { AdminModule } from "./modules/admin/admin.module";
import { RoomsModule } from "./modules/rooms/rooms.module";
import { HealthController } from "./common/health.controller";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    SubscriptionsModule,
    WalletModule,
    WebsocketModule,
    VideoModule,
    AdminModule,
    RoomsModule
  ],
  controllers: [HealthController]
})
export class AppModule {}

