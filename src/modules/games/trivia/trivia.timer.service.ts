import { Injectable } from '@nestjs/common';

@Injectable()
export class TriviaTimerService {
  private timers = new Map<string, NodeJS.Timeout>();
  private tickIntervals = new Map<string, NodeJS.Timeout>();

  /**
   * Start a question timer with tick callbacks
   */
  startQuestionTimer(
    gameId: string,
    duration: number,
    onTick: (remaining: number) => void,
    onExpire: () => void
  ) {
    // Clear existing timers for this game
    this.clearTimers(gameId);

    let remaining = duration;

    // Immediate first tick
    onTick(remaining);

    // Tick every second
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

  /**
   * Clear all timers for a game
   */
  clearTimers(gameId: string) {
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

  /**
   * Check if a game has an active timer
   */
  hasActiveTimer(gameId: string): boolean {
    return this.tickIntervals.has(gameId) || this.timers.has(gameId);
  }

  /**
   * Cleanup all timers (useful for shutdown)
   */
  clearAllTimers() {
    for (const [gameId] of this.tickIntervals) {
      this.clearTimers(gameId);
    }
  }
}

