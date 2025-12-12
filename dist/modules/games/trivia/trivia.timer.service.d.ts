export declare class TriviaTimerService {
    private timers;
    private tickIntervals;
    startQuestionTimer(gameId: string, duration: number, onTick: (remaining: number) => void, onExpire: () => void): void;
    clearTimers(gameId: string): void;
    hasActiveTimer(gameId: string): boolean;
    clearAllTimers(): void;
}
//# sourceMappingURL=trivia.timer.service.d.ts.map