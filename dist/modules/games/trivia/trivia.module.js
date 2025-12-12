"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TriviaModule = void 0;
const common_1 = require("@nestjs/common");
const trivia_service_1 = require("./trivia.service");
const trivia_question_service_1 = require("./trivia.question.service");
const trivia_timer_service_1 = require("./trivia.timer.service");
const prisma_module_1 = require("../../../prisma/prisma.module");
let TriviaModule = class TriviaModule {
};
exports.TriviaModule = TriviaModule;
exports.TriviaModule = TriviaModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule],
        providers: [trivia_service_1.TriviaService, trivia_question_service_1.TriviaQuestionService, trivia_timer_service_1.TriviaTimerService],
        exports: [trivia_service_1.TriviaService, trivia_question_service_1.TriviaQuestionService, trivia_timer_service_1.TriviaTimerService],
    })
], TriviaModule);
//# sourceMappingURL=trivia.module.js.map