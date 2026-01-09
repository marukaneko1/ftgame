// @ts-nocheck
import { Vector3 } from "three";
import { Container } from "../../container";
import { Aim } from "../../controller/aim";
import { Controller } from "../../controller/controller";
import { PlaceBall } from "../../controller/placeball";
import { WatchAim } from "../../controller/watchaim";
import { ChatEvent } from "../../events/chatevent";
import { PlaceBallEvent } from "../../events/placeballevent";
import { WatchEvent } from "../../events/watchevent";
import { Ball } from "../../model/ball";
import { Outcome } from "../../model/outcome";
import { Table } from "../../model/table";
import { Rack } from "../../utils/rack";
import { zero } from "../../utils/utils";
import { End } from "../end";
import { Rules } from "./rules";
import { R } from "../../model/physics/constants";
import { Respot } from "../../utils/respot";
import { TableGeometry } from "../../view/tablegeometry";
import { StartAimEvent } from "../../events/startaimevent";

export class EightBall implements Rules {
  readonly container: Container;

  cueball: Ball;
  currentBreak = 0;
  previousBreak = 0;
  score = 0;
  rulename = "eightball";
  
  // 8-ball specific state
  playerGroup: "solids" | "stripes" | null = null;
  opponentGroup: "solids" | "stripes" | null = null;
  isBreakShot = true;

  constructor(container) {
    this.container = container;
  }

  startTurn() {
    this.previousBreak = this.currentBreak;
    this.currentBreak = 0;
  }

  nextCandidateBall() {
    return Respot.closest(
      this.container.table.cueball,
      this.container.table.balls
    );
  }

  placeBall(target?): Vector3 {
    if (target) {
      const max = new Vector3(-TableGeometry.X / 2, TableGeometry.tableY);
      const min = new Vector3(-TableGeometry.tableX, -TableGeometry.tableY);
      return target.clamp(min, max);
    }
    // Place cue ball in the kitchen (behind the head string)
    return new Vector3((-R * 11) / 0.5, 0, 0);
  }

  asset(): string {
    return "models/p8.min.gltf";
  }

  tableGeometry() {
    TableGeometry.hasPockets = true;
  }

  table(): Table {
    const table = new Table(this.rack());
    this.cueball = table.cueball;
    return table;
  }

  rack() {
    // 8-ball rack: 1-ball at front, 8-ball in center, random arrangement otherwise
    return Rack.eightBall();
  }

  // Determine if a ball is solid (1-7) or stripe (9-15)
  isSolid(ball: Ball): boolean {
    // Ball IDs: 0 = cue, 1-7 = solids, 8 = 8-ball, 9-15 = stripes
    return ball.id >= 1 && ball.id <= 7;
  }

  isStripe(ball: Ball): boolean {
    return ball.id >= 9 && ball.id <= 15;
  }

  isEightBall(ball: Ball): boolean {
    return ball.id === 8;
  }

  // Assign groups based on first ball potted
  assignGroups(outcome: Outcome[]) {
    if (this.playerGroup !== null) return; // Already assigned

    const potted = outcome.filter(o => o.type === "pocket" && o.ball !== this.cueball);
    if (potted.length === 0) return;

    const firstPotted = potted[0].ball;
    if (this.isSolid(firstPotted)) {
      this.playerGroup = "solids";
      this.opponentGroup = "stripes";
    } else if (this.isStripe(firstPotted)) {
      this.playerGroup = "stripes";
      this.opponentGroup = "solids";
    }
  }

  // Check if player can legally shoot 8-ball
  canShootEightBall(): boolean {
    if (!this.playerGroup) return false;
    
    const onTable = this.container.table.balls.filter(ball => ball.onTable());
    const playerBalls = onTable.filter(ball => 
      this.playerGroup === "solids" ? this.isSolid(ball) : this.isStripe(ball)
    );
    
    return playerBalls.length === 0; // All player's balls are potted
  }

  update(outcome: Outcome[]): Controller {
    const table = this.container.table;
    
    // Handle break shot
    if (this.isBreakShot) {
      this.isBreakShot = false;
      this.assignGroups(outcome);
    }

    // Cue ball potted = foul, switch turn
    if (Outcome.isCueBallPotted(table.cueball, outcome)) {
      this.startTurn();
      if (this.container.isSinglePlayer) {
        return new PlaceBall(this.container);
      }
      this.container.sendEvent(new PlaceBallEvent(zero, true));
      return new WatchAim(this.container);
    }

    // Check for 8-ball potted
    const eightBallPotted = outcome.some(o => 
      o.type === "pocket" && this.isEightBall(o.ball)
    );

    if (eightBallPotted) {
      // Check if it was a legal shot
      if (!this.canShootEightBall()) {
        // Foul: shot 8-ball before clearing group
        this.container.eventQueue.push(new ChatEvent(null, "Foul: 8-ball potted illegally"));
        return new End(this.container);
      }
      
      // Check if cue ball was also potted (scratch on 8-ball = loss)
      if (Outcome.isCueBallPotted(table.cueball, outcome)) {
        this.container.eventQueue.push(new ChatEvent(null, "Game over: scratched on 8-ball"));
        return new End(this.container);
      }
      
      // Check if 8-ball was potted in correct pocket (for call-shot rules)
      // For now, any pocket is valid
      this.container.eventQueue.push(new ChatEvent(null, "Game over: 8-ball potted"));
      this.container.recorder.wholeGameLink();
      return new End(this.container);
    }

    // Regular shot: check if player potted their group balls
    if (this.playerGroup && Outcome.isBallPottedNoFoul(table.cueball, outcome)) {
      const pots = Outcome.potCount(outcome);
      const playerBallsPotted = outcome.filter(o => 
        o.type === "pocket" && 
        o.ball !== table.cueball && 
        !this.isEightBall(o.ball) &&
        (this.playerGroup === "solids" ? this.isSolid(o.ball) : this.isStripe(o.ball))
      ).length;

      if (playerBallsPotted > 0) {
        this.currentBreak += pots;
        this.score += pots;
        this.container.sound.playSuccess(table.inPockets());
        
        // Check if all player's balls are potted
        const onTable = table.balls.filter(ball => ball.onTable());
        const playerBallsRemaining = onTable.filter(ball => 
          this.playerGroup === "solids" ? this.isSolid(ball) : this.isStripe(ball)
        );
        
        if (playerBallsRemaining.length === 0) {
          // Player can now shoot 8-ball
          this.container.eventQueue.push(new ChatEvent(null, "Shoot the 8-ball"));
        }
        
        this.container.sendEvent(new WatchEvent(table.serialise()));
        return new Aim(this.container);
      }
    }

    // No pot or wrong ball potted = switch turn
    this.container.sendEvent(new StartAimEvent());
    if (this.container.isSinglePlayer) {
      this.container.sendEvent(new WatchEvent(table.serialise()));
      this.startTurn();
      return new Aim(this.container);
    }
    return new WatchAim(this.container);
  }

  isPartOfBreak(outcome: Outcome[]) {
    if (!this.playerGroup) return false;
    
    return outcome.some(o => 
      o.type === "pocket" && 
      o.ball !== this.container.table.cueball &&
      !this.isEightBall(o.ball) &&
      (this.playerGroup === "solids" ? this.isSolid(o.ball) : this.isStripe(o.ball))
    );
  }

  isEndOfGame(outcome: Outcome[]): boolean {
    const eightBallPotted = outcome.some(o => 
      o.type === "pocket" && this.isEightBall(o.ball)
    );
    return eightBallPotted && this.canShootEightBall();
  }

  otherPlayersCueBall(): Ball {
    return this.cueball;
  }

  secondToPlay() {
    // Not used in 8-ball
  }

  allowsPlaceBall() {
    return true;
  }
}





