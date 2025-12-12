"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TriviaTimerService = void 0;
const common_1 = require("@nestjs/common");
let TriviaTimerService = class TriviaTimerService {
    timers = new Map();
    tickIntervals = new Map();
    startQuestionTimer(gameId, duration, onTick, onExpire) {
        this.clearTimers(gameId);
        let remaining = duration;
        onTick(remaining);
        const tickInterval = setInterval(() => {
            remaining--;
            onTick(remaining);
            if (remaining <= 0) {
                this.clearTimers(gameId);
                onExpire();
            }
        }, 1000);
        this.tickIntervals.set(gameId, tickInterval);
    }
    clearTimers(gameId) {
        const timer = this.timers.get(gameId);
        if (timer) {
            clearTimeout(timer);
            this.timers.delete(gameId);
        }
        const tick = this.tickIntervals.get(gameId);
        if (tick) {
            clearInterval(tick);
            this.tickIntervals.delete(gameId);
        }
    }
    hasActiveTimer(gameId) {
        return this.tickIntervals.has(gameId) || this.timers.has(gameId);
    }
    clearAllTimers() {
        for (const [gameId] of this.tickIntervals) {
            this.clearTimers(gameId);
        }
    }
};
exports.TriviaTimerService = TriviaTimerService;
exports.TriviaTimerService = TriviaTimerService = __decorate([
    (0, common_1.Injectable)()
], TriviaTimerService);
//# sourceMappingURL=trivia.timer.service.js.map