import { BallState, Vector2D, BallHitRecord, BallPocketRecord, PhysicsResult } from './billiards.types';

// Simple 2D vector math
function distance(a: Vector2D, b: Vector2D): number {
  return Math.sqrt(Math.pow(b.x - a.x, 2) + Math.pow(b.y - a.y, 2));
}

function normalize(v: Vector2D): Vector2D {
  const len = Math.sqrt(v.x * v.x + v.y * v.y);
  if (len === 0) return { x: 0, y: 0 };
  return { x: v.x / len, y: v.y / len };
}

function dot(a: Vector2D, b: Vector2D): number {
  return a.x * b.x + a.y * b.y;
}

function subtract(a: Vector2D, b: Vector2D): Vector2D {
  return { x: a.x - b.x, y: a.y - b.y };
}

function add(a: Vector2D, b: Vector2D): Vector2D {
  return { x: a.x + b.x, y: a.y + b.y };
}

function scale(v: Vector2D, s: number): Vector2D {
  return { x: v.x * s, y: v.y * s };
}

function length(v: Vector2D): number {
  return Math.sqrt(v.x * v.x + v.y * v.y);
}

interface SimBall {
  id: number;
  pos: Vector2D;
  vel: Vector2D;
  pocketed: boolean;
  pocketId: number | null;
}

export class BilliardsPhysics {
  private balls: Map<number, SimBall> = new Map();
  
  // Physics constants
  private readonly CONFIG = {
    tableWidth: 2.24,
    tableHeight: 1.12,
    ballRadius: 0.028,
    pocketRadius: 0.055,    // Pocket detection radius
    friction: 0.985,        // Velocity decay per frame
    restitution: 0.9,       // Ball-to-ball bounce
    cushionRestitution: 0.8,
    minVelocity: 0.001,     // Stop threshold
    maxFrames: 500,         // Max simulation frames
    dt: 1/60,               // Time step
  };

  // Pocket positions
  private readonly pockets: Vector2D[] = [
    { x: 0, y: 0 },                                              // Top-left
    { x: this.CONFIG.tableWidth / 2, y: 0 },                     // Top-center
    { x: this.CONFIG.tableWidth, y: 0 },                         // Top-right
    { x: 0, y: this.CONFIG.tableHeight },                        // Bottom-left
    { x: this.CONFIG.tableWidth / 2, y: this.CONFIG.tableHeight }, // Bottom-center
    { x: this.CONFIG.tableWidth, y: this.CONFIG.tableHeight }    // Bottom-right
  ];

  constructor() {}

  /**
   * Initialize balls from state
   */
  initializeBalls(ballStates: BallState[]): void {
    this.balls.clear();
    
    ballStates.forEach(ball => {
      if (!ball.pocketed) {
        this.balls.set(ball.id, {
          id: ball.id,
          pos: { ...ball.position },
          vel: { x: 0, y: 0 },
          pocketed: false,
          pocketId: null
        });
      }
    });
  }

  /**
   * Simulate a shot and return final positions
   */
  simulateShot(
    cueBallId: number,
    power: number,
    angle: number
  ): PhysicsResult {
    const cueBall = this.balls.get(cueBallId);
    if (!cueBall) {
      throw new Error(`Cue ball ${cueBallId} not found`);
    }

    // Convert power (0-100) to velocity
    const maxVelocity = 3.0; // m/s max
    const velocity = (power / 100) * maxVelocity;
    
    // Convert angle (degrees) to radians
    const angleRad = (angle * Math.PI) / 180;
    
    // Set cue ball velocity
    cueBall.vel = {
      x: Math.cos(angleRad) * velocity,
      y: Math.sin(angleRad) * velocity
    };

    // Track collisions
    const ballsHit: BallHitRecord[] = [];
    const ballsPocketed: BallPocketRecord[] = [];
    const hitBallIds = new Set<number>();
    let pocketOrder = 1;

    // Run simulation
    for (let frame = 0; frame < this.CONFIG.maxFrames; frame++) {
      // Update positions
      for (const ball of this.balls.values()) {
        if (ball.pocketed) continue;
        
        // Apply velocity
        ball.pos.x += ball.vel.x * this.CONFIG.dt;
        ball.pos.y += ball.vel.y * this.CONFIG.dt;
        
        // Apply friction
        ball.vel.x *= this.CONFIG.friction;
        ball.vel.y *= this.CONFIG.friction;
        
        // Stop if very slow
        if (length(ball.vel) < this.CONFIG.minVelocity) {
          ball.vel = { x: 0, y: 0 };
        }
      }

      // Check ball-ball collisions
      const ballArray = Array.from(this.balls.values()).filter(b => !b.pocketed);
      for (let i = 0; i < ballArray.length; i++) {
        for (let j = i + 1; j < ballArray.length; j++) {
          const a = ballArray[i];
          const b = ballArray[j];
          
          const dist = distance(a.pos, b.pos);
          const minDist = this.CONFIG.ballRadius * 2;
          
          if (dist < minDist && dist > 0) {
            // Collision detected
            const normal = normalize(subtract(b.pos, a.pos));
            
            // Separate balls
            const overlap = minDist - dist;
            a.pos = add(a.pos, scale(normal, -overlap / 2));
            b.pos = add(b.pos, scale(normal, overlap / 2));
            
            // Calculate collision response
            const relVel = subtract(a.vel, b.vel);
            const velAlongNormal = dot(relVel, normal);
            
            if (velAlongNormal > 0) {
              // Apply impulse
              const impulse = velAlongNormal * this.CONFIG.restitution;
              a.vel = subtract(a.vel, scale(normal, impulse));
              b.vel = add(b.vel, scale(normal, impulse));
              
              // Track hit
              if (a.id === cueBallId && !hitBallIds.has(b.id)) {
                hitBallIds.add(b.id);
                ballsHit.push({
                  ballId: b.id,
                  timestamp: Date.now(),
                  position: { ...b.pos }
                });
              } else if (b.id === cueBallId && !hitBallIds.has(a.id)) {
                hitBallIds.add(a.id);
                ballsHit.push({
                  ballId: a.id,
                  timestamp: Date.now(),
                  position: { ...a.pos }
                });
              }
            }
          }
        }
      }

      // Check cushion collisions
      for (const ball of this.balls.values()) {
        if (ball.pocketed) continue;
        
        const r = this.CONFIG.ballRadius;
        
        // Left cushion
        if (ball.pos.x < r) {
          ball.pos.x = r;
          ball.vel.x = -ball.vel.x * this.CONFIG.cushionRestitution;
        }
        // Right cushion
        if (ball.pos.x > this.CONFIG.tableWidth - r) {
          ball.pos.x = this.CONFIG.tableWidth - r;
          ball.vel.x = -ball.vel.x * this.CONFIG.cushionRestitution;
        }
        // Top cushion
        if (ball.pos.y < r) {
          ball.pos.y = r;
          ball.vel.y = -ball.vel.y * this.CONFIG.cushionRestitution;
        }
        // Bottom cushion
        if (ball.pos.y > this.CONFIG.tableHeight - r) {
          ball.pos.y = this.CONFIG.tableHeight - r;
          ball.vel.y = -ball.vel.y * this.CONFIG.cushionRestitution;
        }
      }

      // Check pockets
      for (const ball of this.balls.values()) {
        if (ball.pocketed) continue;
        
        for (let pocketIdx = 0; pocketIdx < this.pockets.length; pocketIdx++) {
          const pocket = this.pockets[pocketIdx];
          const dist = distance(ball.pos, pocket);
          
          if (dist < this.CONFIG.pocketRadius) {
            ball.pocketed = true;
            ball.pocketId = pocketIdx;
            ball.vel = { x: 0, y: 0 };
            
            ballsPocketed.push({
              ballId: ball.id,
              pocketId: pocketIdx,
              timestamp: Date.now(),
              order: pocketOrder++
            });
            break;
          }
        }
      }

      // Check if all balls have stopped
      let allStopped = true;
      for (const ball of this.balls.values()) {
        if (!ball.pocketed && length(ball.vel) > this.CONFIG.minVelocity) {
          allStopped = false;
          break;
        }
      }
      
      if (allStopped) break;
    }

    // Build final ball states
    const finalBallStates: BallState[] = [];
    for (const ball of this.balls.values()) {
      finalBallStates.push({
        id: ball.id,
        type: this.getBallType(ball.id),
        number: ball.id,
        position: { ...ball.pos },
        velocity: { ...ball.vel },
        angularVelocity: 0,
        angle: 0,
        pocketed: ball.pocketed,
        pocketedBy: null,
        pocketedAt: ball.pocketed ? Date.now() : null,
        pocketId: ball.pocketId,
        onTable: !ball.pocketed
      });
    }

    return {
      finalBallStates,
      ballsHit,
      ballsPocketed,
      simulationTime: 0,
      frames: 0
    };
  }

  /**
   * Get ball type from ID
   */
  private getBallType(ballId: number): 'cue' | 'solid' | 'stripe' | 'eight' {
    if (ballId === 0) return 'cue';
    if (ballId === 8) return 'eight';
    if (ballId >= 1 && ballId <= 7) return 'solid';
    return 'stripe';
  }

  /**
   * Place cue ball
   */
  placeCueBall(cueBallId: number, position: Vector2D): boolean {
    const { tableWidth, tableHeight, ballRadius } = this.CONFIG;
    
    // Check bounds
    if (position.x < ballRadius || position.x > tableWidth - ballRadius ||
        position.y < ballRadius || position.y > tableHeight - ballRadius) {
      return false;
    }
    
    // Check overlap with other balls
    for (const ball of this.balls.values()) {
      if (ball.id === cueBallId || ball.pocketed) continue;
      
      const dist = distance(position, ball.pos);
      if (dist < ballRadius * 2.5) {
        return false;
      }
    }
    
    // Get or create cue ball
    let cueBall = this.balls.get(cueBallId);
    if (!cueBall) {
      cueBall = {
        id: cueBallId,
        pos: { ...position },
        vel: { x: 0, y: 0 },
        pocketed: false,
        pocketId: null
      };
      this.balls.set(cueBallId, cueBall);
    } else {
      cueBall.pos = { ...position };
      cueBall.vel = { x: 0, y: 0 };
      cueBall.pocketed = false;
      cueBall.pocketId = null;
    }
    
    return true;
  }
}
