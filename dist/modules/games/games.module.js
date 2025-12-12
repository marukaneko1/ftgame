"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GamesModule = void 0;
const common_1 = require("@nestjs/common");
const games_service_1 = require("./games.service");
const tictactoe_module_1 = require("./tictactoe/tictactoe.module");
const tictactoe_service_1 = require("./tictactoe/tictactoe.service");
const chess_module_1 = require("./chess/chess.module");
const chess_service_1 = require("./chess/chess.service");
const trivia_module_1 = require("./trivia/trivia.module");
const trivia_service_1 = require("./trivia/trivia.service");
const trivia_timer_service_1 = require("./trivia/trivia.timer.service");
const prisma_module_1 = require("../../prisma/prisma.module");
let GamesModule = class GamesModule {
};
exports.GamesModule = GamesModule;
exports.GamesModule = GamesModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule, tictactoe_module_1.TicTacToeModule, chess_module_1.ChessModule, trivia_module_1.TriviaModule],
        providers: [games_service_1.GamesService, tictactoe_service_1.TicTacToeService, chess_service_1.ChessService, trivia_service_1.TriviaService, trivia_timer_service_1.TriviaTimerService],
        exports: [games_service_1.GamesService, tictactoe_service_1.TicTacToeService, chess_service_1.ChessService, trivia_service_1.TriviaService, trivia_timer_service_1.TriviaTimerService]
    })
], GamesModule);
//# sourceMappingURL=games.module.js.map