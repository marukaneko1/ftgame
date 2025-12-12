"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebsocketModule = void 0;
const common_1 = require("@nestjs/common");
const websocket_gateway_1 = require("./websocket.gateway");
const matchmaking_service_1 = require("../matchmaking/matchmaking.service");
const sessions_service_1 = require("../sessions/sessions.service");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const ws_jwt_guard_1 = require("../../common/guards/ws-jwt.guard");
const video_module_1 = require("../video/video.module");
const wallet_module_1 = require("../wallet/wallet.module");
const reports_module_1 = require("../reports/reports.module");
const games_module_1 = require("../games/games.module");
const rooms_module_1 = require("../rooms/rooms.module");
const trivia_module_1 = require("../games/trivia/trivia.module");
let WebsocketModule = class WebsocketModule {
};
exports.WebsocketModule = WebsocketModule;
exports.WebsocketModule = WebsocketModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule,
            video_module_1.VideoModule,
            wallet_module_1.WalletModule,
            reports_module_1.ReportsModule,
            games_module_1.GamesModule,
            trivia_module_1.TriviaModule,
            rooms_module_1.RoomsModule,
            jwt_1.JwtModule.registerAsync({
                imports: [config_1.ConfigModule],
                useFactory: (configService) => ({
                    secret: configService.get("jwt.accessSecret")
                }),
                inject: [config_1.ConfigService]
            })
        ],
        providers: [websocket_gateway_1.AppGateway, matchmaking_service_1.MatchmakingService, sessions_service_1.SessionsService, ws_jwt_guard_1.WsJwtGuard]
    })
], WebsocketModule);
//# sourceMappingURL=websocket.module.js.map