"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const configuration_1 = __importDefault(require("./config/configuration"));
const env_validation_1 = require("./config/env.validation");
const prisma_module_1 = require("./prisma/prisma.module");
const auth_module_1 = require("./modules/auth/auth.module");
const users_module_1 = require("./modules/users/users.module");
const subscriptions_module_1 = require("./modules/subscriptions/subscriptions.module");
const wallet_module_1 = require("./modules/wallet/wallet.module");
const websocket_module_1 = require("./modules/websocket/websocket.module");
const video_module_1 = require("./modules/video/video.module");
const admin_module_1 = require("./modules/admin/admin.module");
const rooms_module_1 = require("./modules/rooms/rooms.module");
const health_controller_1 = require("./common/health.controller");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                load: [configuration_1.default],
                validationSchema: env_validation_1.validationSchema
            }),
            prisma_module_1.PrismaModule,
            auth_module_1.AuthModule,
            users_module_1.UsersModule,
            subscriptions_module_1.SubscriptionsModule,
            wallet_module_1.WalletModule,
            websocket_module_1.WebsocketModule,
            video_module_1.VideoModule,
            admin_module_1.AdminModule,
            rooms_module_1.RoomsModule
        ],
        controllers: [health_controller_1.HealthController]
    })
], AppModule);
//# sourceMappingURL=app.module.js.map