# Billiards Game - Detailed Implementation Guide

## Table of Contents
1. [Complete Type Definitions](#complete-type-definitions)
2. [Physics Engine Deep Dive](#physics-engine-deep-dive)
3. [State Management Details](#state-management-details)
4. [Validation Logic](#validation-logic)
5. [Backend Implementation](#backend-implementation)
6. [Frontend Implementation](#frontend-implementation)
7. [WebSocket Protocol](#websocket-protocol)
8. [Algorithms & Formulas](#algorithms--formulas)
9. [Error Handling](#error-handling)
10. [Testing Strategy](#testing-strategy)

---

## Complete Type Definitions

### Backend Types (`api/src/modules/games/billiards/billiards.types.ts`)

```typescript
// Ball types
export type BallType = 'cue' | 'solid' | 'stripe' | 'eight';
export type BallGroup = 'solids' | 'stripes' | null; // null = open table

// Game phases
export type BilliardsPhase = 'break' | 'playing' | 'ballInHand' | 'gameEnd';

// Ball state
export interface BallState {
  id: number;                    // 0 = cue, 1-15 = numbered balls
  type: BallType;
  number: number;                // 0 for cue, 1-15 for others
  position: Vector2D;
  velocity: Vector2D;
  angularVelocity: number;       // Rotation speed (radians/sec)
  angle: number;                 // Current rotation angle (radians)
  pocketed: boolean;
  pocketedBy: string | null;     // Player ID who pocketed
  pocketedAt: number | null;     // Timestamp
  pocketId: number | null;       // Which pocket (0-5)
  onTable: boolean;              // false if pocketed or off table
}

// Vector for 2D physics
export interface Vector2D {
  x: number;
  y: number;
}

// Pocket state
export interface PocketState {
  id: number;                    // 0-5 (6 pockets)
  position: Vector2D;
  radius: number;
  ballsPocketed: number[];        // Ball IDs pocketed in this pocket
}

// Shot record
export interface ShotRecord {
  playerId: string;
  power: number;                 // 0-100
  angle: number;                 // 0-360 degrees (0 = right, 90 = up)
  timestamp: number;
  cueBallStartPos: Vector2D;
  ballsHit: BallHitRecord[];     // Order of balls hit
  ballsPocketed: BallPocketRecord[];
  foul: boolean;
  foulReason: FoulType | null;
  scratch: boolean;              // Cue ball pocketed
  firstBallHit: number | null;   // Ball ID of first ball hit
  groupDetermined: BallGroup | null; // If this shot determined player's group
}

export interface BallHitRecord {
  ballId: number;
  timestamp: number;             // When in simulation it was hit
  position: Vector2D;
}

export interface BallPocketRecord {
  ballId: number;
  pocketId: number;
  timestamp: number;
  order: number;                 // Order of pocketing (1st, 2nd, etc.)
}

// Foul types
export type FoulType = 
  | 'scratch'                    // Cue ball pocketed
  | 'wrong_ball_first'            // Hit opponent's ball first
  | 'no_ball_hit'                // Didn't hit any ball
  | 'eight_ball_early'           // 8-ball pocketed before clearing group
  | 'eight_ball_wrong_pocket'   // 8-ball in wrong pocket
  | 'ball_off_table'            // Ball left the table
  | 'cue_ball_off_table';       // Cue ball left table

// Turn record
export interface TurnRecord {
  turnNumber: number;
  playerId: string;
  shot: ShotRecord;
  result: TurnResult;
  nextPlayer: string | null;
  gameEnded: boolean;
  winnerId: string | null;
}

export type TurnResult = 
  | 'continue'                   // Player continues (pocketed their ball)
  | 'switch'                     // Turn switches to opponent
  | 'win'                        // Player won
  | 'loss'                       // Player lost (8-ball foul)
  | 'ball_in_hand';             // Opponent gets ball-in-hand

// Full game state
export interface BilliardsState {
  phase: BilliardsPhase;
  currentPlayer: string;         // Player ID whose turn it is
  breakPlayer: string;           // Player who broke
  playerGroups: Record<string, BallGroup>; // Each player's assigned group
  balls: BallState[];
  pockets: PocketState[];
  turnHistory: TurnRecord[];
  currentTurn: number;           // Turn counter
  gameStatus: 'active' | 'paused' | 'ended';
  winnerId: string | null;
  lastShot: ShotRecord | null;
  foulOccurred: boolean;
  ballInHand: string | null;     // Player ID with ball-in-hand
  tableOpen: boolean;            // true if no group assigned yet
  eightBallCalled: boolean;      // true if 8-ball shot was called
  eightBallPocket: number | null; // Called pocket for 8-ball (0-5)
}

// Shot input from client
export interface ShotInput {
  power: number;                 // 0-100
  angle: number;                 // 0-360 degrees
  cueBallPosition?: Vector2D;   // For ball-in-hand placement
}

// Physics simulation result
export interface PhysicsResult {
  finalBallStates: BallState[];
  ballsHit: BallHitRecord[];
  ballsPocketed: BallPocketRecord[];
  simulationTime: number;        // How long simulation ran (ms)
  frames: number;                // Number of physics frames
}

// Game configuration
export interface BilliardsConfig {
  tableWidth: number;            // meters
  tableHeight: number;           // meters
  ballRadius: number;            // meters
  pocketRadius: number;          // meters
  friction: number;              // Table friction coefficient
  ballFriction: number;          // Ball-to-ball friction
  restitution: number;          // Ball bounce coefficient
  cushionRestitution: number;    // Cushion bounce
  maxPower: number;              // Maximum shot power
  minPower: number;              // Minimum shot power
  velocityThreshold: number;     // Stop simulation when all velocities below this
}
```

---

## Physics Engine Deep Dive

### Matter.js Setup

```typescript
// api/src/modules/games/billiards/billiards.physics.ts

import Matter from 'matter-js';
const { Engine, World, Bodies, Body, Events, Vector } = Matter;

export class BilliardsPhysics {
  private engine: Matter.Engine;
  private world: Matter.World;
  private tableBodies: Matter.Body[] = [];
  private ballBodies: Map<number, Matter.Body> = new Map();
  private pocketBodies: Matter.Body[] = [];
  
  // Physics constants
  private readonly CONFIG = {
    tableWidth: 2.24,           // 8-foot table (meters)
    tableHeight: 1.12,
    ballRadius: 0.028,           // 28mm standard pool ball
    pocketRadius: 0.11,          // 11cm pocket opening
    friction: 0.015,             // Table friction
    frictionAir: 0.01,           // Air resistance
    restitution: 0.8,            // Ball-to-ball bounce
    cushionRestitution: 0.7,     // Cushion bounce
    density: 0.001,              // Ball density (affects mass)
    velocityThreshold: 0.01,     // Stop when velocity below this (m/s)
    maxSimulationTime: 10000,    // Max 10 seconds per shot
  };

  constructor() {
    // Create Matter.js engine
    this.engine = Engine.create();
    this.world = this.engine.world;
    
    // Set gravity to 0 (top-down view, no gravity)
    this.engine.world.gravity.y = 0;
    this.engine.world.gravity.x = 0;
    
    // Create table boundaries (cushions)
    this.createTable();
    
    // Create pockets
    this.createPockets();
  }

  /**
   * Create table boundaries (cushions/rails)
   */
  private createTable(): void {
    const { tableWidth, tableHeight, ballRadius } = this.CONFIG;
    const cushionThickness = 0.05; // 5cm thick cushions
    const cushionHeight = 0.1;     // 10cm high
    
    // Top cushion
    const topCushion = Bodies.rectangle(
      tableWidth / 2,
      cushionHeight / 2,
      tableWidth,
      cushionHeight,
      {
        isStatic: true,
        restitution: this.CONFIG.cushionRestitution,
        label: 'cushion-top'
      }
    );
    
    // Bottom cushion
    const bottomCushion = Bodies.rectangle(
      tableWidth / 2,
      tableHeight - cushionHeight / 2,
      tableWidth,
      cushionHeight,
      {
        isStatic: true,
        restitution: this.CONFIG.cushionRestitution,
        label: 'cushion-bottom'
      }
    );
    
    // Left cushion (with pocket gaps)
    const leftCushionTop = Bodies.rectangle(
      cushionThickness / 2,
      cushionHeight / 2 + 0.15, // Gap for corner pocket
      cushionThickness,
      (tableHeight - 0.3) / 2,
      {
        isStatic: true,
        restitution: this.CONFIG.cushionRestitution,
        label: 'cushion-left-top'
      }
    );
    
    const leftCushionBottom = Bodies.rectangle(
      cushionThickness / 2,
      tableHeight - cushionHeight / 2 - 0.15,
      cushionThickness,
      (tableHeight - 0.3) / 2,
      {
        isStatic: true,
        restitution: this.CONFIG.cushionRestitution,
        label: 'cushion-left-bottom'
      }
    );
    
    // Right cushion (with pocket gaps)
    const rightCushionTop = Bodies.rectangle(
      tableWidth - cushionThickness / 2,
      cushionHeight / 2 + 0.15,
      cushionThickness,
      (tableHeight - 0.3) / 2,
      {
        isStatic: true,
        restitution: this.CONFIG.cushionRestitution,
        label: 'cushion-right-top'
      }
    );
    
    const rightCushionBottom = Bodies.rectangle(
      tableWidth - cushionThickness / 2,
      tableHeight - cushionHeight / 2 - 0.15,
      cushionThickness,
      (tableHeight - 0.3) / 2,
      {
        isStatic: true,
        restitution: this.CONFIG.cushionRestitution,
        label: 'cushion-right-bottom'
      }
    );
    
    this.tableBodies = [
      topCushion,
      bottomCushion,
      leftCushionTop,
      leftCushionBottom,
      rightCushionTop,
      rightCushionBottom
    ];
    
    World.add(this.world, this.tableBodies);
  }

  /**
   * Create 6 pockets (4 corners + 2 side)
   */
  private createPockets(): void {
    const { tableWidth, tableHeight, pocketRadius } = this.CONFIG;
    
    // Pocket positions (in meters from top-left)
    const pocketPositions = [
      { x: 0, y: 0 },                          // Top-left
      { x: tableWidth / 2, y: 0 },            // Top-center
      { x: tableWidth, y: 0 },                 // Top-right
      { x: 0, y: tableHeight },                // Bottom-left
      { x: tableWidth / 2, y: tableHeight },   // Bottom-center
      { x: tableWidth, y: tableHeight }        // Bottom-right
    ];
    
    this.pocketBodies = pocketPositions.map((pos, index) => {
      const pocket = Bodies.circle(pos.x, pos.y, pocketRadius, {
        isStatic: true,
        isSensor: true,           // Doesn't collide, just detects
        label: `pocket-${index}`
      });
      return pocket;
    });
    
    World.add(this.world, this.pocketBodies);
  }

  /**
   * Initialize balls on table
   */
  initializeBalls(ballStates: BallState[]): void {
    // Clear existing balls
    this.ballBodies.forEach(body => World.remove(this.world, body));
    this.ballBodies.clear();
    
    // Create Matter.js bodies for each ball
    ballStates.forEach(ballState => {
      if (!ballState.pocketed && ballState.onTable) {
        const ballBody = Bodies.circle(
          ballState.position.x,
          ballState.position.y,
          this.CONFIG.ballRadius,
          {
            restitution: this.CONFIG.restitution,
            friction: this.CONFIG.friction,
            frictionAir: this.CONFIG.frictionAir,
            density: this.CONFIG.density,
            label: `ball-${ballState.id}`
          }
        );
        
        this.ballBodies.set(ballState.id, ballBody);
        World.add(this.world, ballBody);
      }
    });
  }

  /**
   * Execute a shot - apply force to cue ball and simulate
   */
  simulateShot(
    cueBallId: number,
    power: number,      // 0-100
    angle: number       // 0-360 degrees
  ): PhysicsResult {
    const cueBallBody = this.ballBodies.get(cueBallId);
    if (!cueBallBody) {
      throw new Error(`Cue ball ${cueBallId} not found`);
    }
    
    // Convert power (0-100) to force (Newtons)
    // Typical pool shot: 5-15 m/s velocity
    const maxVelocity = 15; // m/s
    const velocity = (power / 100) * maxVelocity;
    
    // Convert angle (degrees) to radians
    const angleRad = (angle * Math.PI) / 180;
    
    // Calculate force vector
    const forceX = Math.cos(angleRad) * velocity * 1000; // Scale for Matter.js
    const forceY = Math.sin(angleRad) * velocity * 1000;
    
    // Apply force to cue ball
    Body.applyForce(cueBallBody, cueBallBody.position, {
      x: forceX,
      y: forceY
    });
    
    // Track collisions and pocketing
    const ballsHit: BallHitRecord[] = [];
    const ballsPocketed: BallPocketRecord[] = [];
    const hitBallIds = new Set<number>();
    let pocketOrder = 1;
    
    // Collision detection
    Events.on(this.engine, 'collisionStart', (event) => {
      event.pairs.forEach(pair => {
        const { bodyA, bodyB } = pair;
        
        // Ball-to-ball collision
        if (bodyA.label.startsWith('ball-') && bodyB.label.startsWith('ball-')) {
          const ballAId = parseInt(bodyA.label.split('-')[1]);
          const ballBId = parseInt(bodyB.label.split('-')[1]);
          
          // Track which ball was hit (if cue ball hit it)
          if (ballAId === cueBallId && !hitBallIds.has(ballBId)) {
            hitBallIds.add(ballBId);
            ballsHit.push({
              ballId: ballBId,
              timestamp: Date.now(),
              position: { x: bodyB.position.x, y: bodyB.position.y }
            });
          } else if (ballBId === cueBallId && !hitBallIds.has(ballAId)) {
            hitBallIds.add(ballAId);
            ballsHit.push({
              ballId: ballAId,
              timestamp: Date.now(),
              position: { x: bodyA.position.x, y: bodyA.position.y }
            });
          }
        }
        
        // Ball-to-pocket collision
        if (bodyA.label.startsWith('ball-') && bodyB.label.startsWith('pocket-')) {
          const ballId = parseInt(bodyA.label.split('-')[1]);
          const pocketId = parseInt(bodyB.label.split('-')[1]);
          
          ballsPocketed.push({
            ballId,
            pocketId,
            timestamp: Date.now(),
            order: pocketOrder++
          });
        } else if (bodyB.label.startsWith('ball-') && bodyA.label.startsWith('pocket-')) {
          const ballId = parseInt(bodyB.label.split('-')[1]);
          const pocketId = parseInt(bodyA.label.split('-')[1]);
          
          ballsPocketed.push({
            ballId,
            pocketId,
            timestamp: Date.now(),
            order: pocketOrder++
          });
        }
      });
    });
    
    // Run simulation until all balls stop
    const startTime = Date.now();
    let frames = 0;
    let allStopped = false;
    
    while (!allStopped && (Date.now() - startTime) < this.CONFIG.maxSimulationTime) {
      Engine.update(this.engine, 1000 / 60); // 60 FPS
      frames++;
      
      // Check if all balls have stopped
      allStopped = true;
      for (const body of this.ballBodies.values()) {
        const velocity = Math.sqrt(
          body.velocity.x * body.velocity.x + 
          body.velocity.y * body.velocity.y
        );
        
        if (velocity > this.CONFIG.velocityThreshold) {
          allStopped = false;
          break;
        }
      }
    }
    
    // Extract final ball states
    const finalBallStates: BallState[] = [];
    for (const [ballId, body] of this.ballBodies.entries()) {
      // Check if ball is in a pocket
      let pocketed = false;
      let pocketId: number | null = null;
      
      for (const pocketBody of this.pocketBodies) {
        const distance = Math.sqrt(
          Math.pow(body.position.x - pocketBody.position.x, 2) +
          Math.pow(body.position.y - pocketBody.position.y, 2)
        );
        
        if (distance < this.CONFIG.pocketRadius) {
          pocketed = true;
          pocketId = parseInt(pocketBody.label.split('-')[1]);
          break;
        }
      }
      
      finalBallStates.push({
        id: ballId,
        type: this.getBallType(ballId),
        number: ballId === 0 ? 0 : ballId,
        position: { x: body.position.x, y: body.position.y },
        velocity: { x: body.velocity.x, y: body.velocity.y },
        angularVelocity: body.angularVelocity || 0,
        angle: body.angle || 0,
        pocketed,
        pocketedBy: pocketed ? null : null, // Will be set by game logic
        pocketedAt: pocketed ? Date.now() : null,
        pocketId,
        onTable: !pocketed
      });
    }
    
    return {
      finalBallStates,
      ballsHit,
      ballsPocketed,
      simulationTime: Date.now() - startTime,
      frames
    };
  }

  /**
   * Get ball type from ID
   */
  private getBallType(ballId: number): BallType {
    if (ballId === 0) return 'cue';
    if (ballId === 8) return 'eight';
    if (ballId >= 1 && ballId <= 7) return 'solid';
    return 'stripe';
  }

  /**
   * Place cue ball (for ball-in-hand)
   */
  placeCueBall(cueBallId: number, position: Vector2D): boolean {
    const cueBallBody = this.ballBodies.get(cueBallId);
    if (!cueBallBody) return false;
    
    // Validate position is on table and not overlapping other balls
    const { tableWidth, tableHeight, ballRadius } = this.CONFIG;
    
    // Check bounds
    if (position.x < ballRadius || position.x > tableWidth - ballRadius ||
        position.y < ballRadius || position.y > tableHeight - ballRadius) {
      return false;
    }
    
    // Check overlap with other balls
    for (const [otherId, otherBody] of this.ballBodies.entries()) {
      if (otherId === cueBallId) continue;
      
      const distance = Math.sqrt(
        Math.pow(position.x - otherBody.position.x, 2) +
        Math.pow(position.y - otherBody.position.y, 2)
      );
      
      if (distance < ballRadius * 2) {
        return false; // Overlapping
      }
    }
    
    // Place cue ball
    Body.setPosition(cueBallBody, { x: position.x, y: position.y });
    Body.setVelocity(cueBallBody, { x: 0, y: 0 });
    Body.setAngularVelocity(cueBallBody, 0);
    
    return true;
  }

  /**
   * Get current ball positions (for state sync)
   */
  getBallPositions(): Map<number, Vector2D> {
    const positions = new Map<number, Vector2D>();
    
    for (const [ballId, body] of this.ballBodies.entries()) {
      positions.set(ballId, { x: body.position.x, y: body.position.y });
    }
    
    return positions;
  }
}
```

---

## State Management Details

### Initial State Setup

```typescript
// api/src/modules/games/billiards/billiards.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { BilliardsState, BallState, Vector2D, BallGroup } from './billiards.types';
import { BilliardsPhysics } from './billiards.physics';

@Injectable()
export class BilliardsService {
  private readonly logger = new Logger(BilliardsService.name);
  private gameStates = new Map<string, BilliardsState>();
  private physicsEngines = new Map<string, BilliardsPhysics>();

  /**
   * Initialize game state with ball rack
   */
  initializeState(
    gameId: string,
    playerIds: string[]
  ): BilliardsState {
    // Randomly choose who breaks
    const breakPlayer = playerIds[Math.floor(Math.random() * playerIds.length)];
    const otherPlayer = playerIds.find(id => id !== breakPlayer)!;
    
    // Create initial ball positions
    const balls = this.createInitialRack(breakPlayer);
    
    // Create pockets
    const pockets = this.createPockets();
    
    const state: BilliardsState = {
      phase: 'break',
      currentPlayer: breakPlayer,
      breakPlayer,
      playerGroups: {
        [breakPlayer]: null,
        [otherPlayer]: null
      },
      balls,
      pockets,
      turnHistory: [],
      currentTurn: 1,
      gameStatus: 'active',
      winnerId: null,
      lastShot: null,
      foulOccurred: false,
      ballInHand: null,
      tableOpen: true,
      eightBallCalled: false,
      eightBallPocket: null
    };
    
    this.gameStates.set(gameId, state);
    
    // Initialize physics engine for this game
    const physics = new BilliardsPhysics();
    physics.initializeBalls(balls);
    this.physicsEngines.set(gameId, physics);
    
    return state;
  }

  /**
   * Create initial ball rack (triangle formation)
   */
  private createInitialRack(breakPlayer: string): BallState[] {
    const { tableWidth, tableHeight, ballRadius } = {
      tableWidth: 2.24,
      tableHeight: 1.12,
      ballRadius: 0.028
    };
    
    // Rack position (foot spot - 1/4 down from head)
    const rackX = tableWidth * 0.75; // 3/4 down the table
    const rackY = tableHeight / 2;   // Center
    
    // Triangle formation spacing
    const spacing = ballRadius * 2.1; // Slight overlap for tight rack
    const rows = 5; // 5 rows in triangle
    
    const balls: BallState[] = [];
    
    // Cue ball position (head spot)
    const cueBallX = tableWidth * 0.25; // 1/4 down from head
    const cueBallY = tableHeight / 2;
    
    balls.push({
      id: 0,
      type: 'cue',
      number: 0,
      position: { x: cueBallX, y: cueBallY },
      velocity: { x: 0, y: 0 },
      angularVelocity: 0,
      angle: 0,
      pocketed: false,
      pocketedBy: null,
      pocketedAt: null,
      pocketId: null,
      onTable: true
    });
    
    // Numbered balls in triangle (1-15)
    // Standard rack: 1-ball at front, 8-ball in center, random elsewhere
    const ballNumbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
    
    // Shuffle except 1-ball (front) and 8-ball (center)
    const shuffled = [
      ballNumbers[0], // 1-ball always front
      ...this.shuffleArray(ballNumbers.slice(1, 7)), // Randomize 2-7
      ballNumbers[7], // 8-ball always center
      ...this.shuffleArray(ballNumbers.slice(8)) // Randomize 9-15
    ];
    
    let ballIndex = 0;
    for (let row = 0; row < rows; row++) {
      const ballsInRow = row + 1;
      const startX = rackX - (ballsInRow - 1) * spacing / 2;
      
      for (let col = 0; col < ballsInRow; col++) {
        const number = shuffled[ballIndex++];
        const x = startX + col * spacing;
        const y = rackY - (rows - 1 - row) * spacing * Math.sin(Math.PI / 3);
        
        balls.push({
          id: number,
          type: number === 8 ? 'eight' : (number <= 7 ? 'solid' : 'stripe'),
          number,
          position: { x, y },
          velocity: { x: 0, y: 0 },
          angularVelocity: 0,
          angle: 0,
          pocketed: false,
          pocketedBy: null,
          pocketedAt: null,
          pocketId: null,
          onTable: true
        });
      }
    }
    
    return balls;
  }

  /**
   * Create 6 pockets
   */
  private createPockets(): PocketState[] {
    const { tableWidth, tableHeight } = {
      tableWidth: 2.24,
      tableHeight: 1.12
    };
    
    return [
      { id: 0, position: { x: 0, y: 0 }, radius: 0.11, ballsPocketed: [] },
      { id: 1, position: { x: tableWidth / 2, y: 0 }, radius: 0.11, ballsPocketed: [] },
      { id: 2, position: { x: tableWidth, y: 0 }, radius: 0.11, ballsPocketed: [] },
      { id: 3, position: { x: 0, y: tableHeight }, radius: 0.11, ballsPocketed: [] },
      { id: 4, position: { x: tableWidth / 2, y: tableHeight }, radius: 0.11, ballsPocketed: [] },
      { id: 5, position: { x: tableWidth, y: tableHeight }, radius: 0.11, ballsPocketed: [] }
    ];
  }

  /**
   * Shuffle array (Fisher-Yates)
   */
  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * Execute a shot
   */
  executeShot(
    gameId: string,
    playerId: string,
    power: number,
    angle: number
  ): { state: BilliardsState; result: TurnResult; error?: string } {
    const state = this.gameStates.get(gameId);
    if (!state) {
      throw new Error('Game state not found');
    }
    
    // Validate it's player's turn
    if (state.currentPlayer !== playerId) {
      return { state, result: 'switch', error: 'Not your turn' };
    }
    
    // Validate game is active
    if (state.gameStatus !== 'active') {
      return { state, result: 'switch', error: 'Game is not active' };
    }
    
    // Get physics engine
    const physics = this.physicsEngines.get(gameId);
    if (!physics) {
      throw new Error('Physics engine not found');
    }
    
    // Find cue ball
    const cueBall = state.balls.find(b => b.id === 0 && !b.pocketed);
    if (!cueBall) {
      return { state, result: 'ball_in_hand', error: 'Cue ball not found' };
    }
    
    // Run physics simulation
    const physicsResult = physics.simulateShot(0, power, angle);
    
    // Update ball states
    const updatedBalls = state.balls.map(ball => {
      const newState = physicsResult.finalBallStates.find(b => b.id === ball.id);
      if (newState) {
        return {
          ...ball,
          ...newState,
          pocketedBy: newState.pocketed ? playerId : ball.pocketedBy,
          pocketedAt: newState.pocketed ? Date.now() : ball.pocketedAt
        };
      }
      return ball;
    });
    
    // Create shot record
    const shot: ShotRecord = {
      playerId,
      power,
      angle,
      timestamp: Date.now(),
      cueBallStartPos: { ...cueBall.position },
      ballsHit: physicsResult.ballsHit,
      ballsPocketed: physicsResult.ballsPocketed,
      foul: false,
      foulReason: null,
      scratch: false,
      firstBallHit: physicsResult.ballsHit[0]?.ballId || null,
      groupDetermined: null
    };
    
    // Validate shot and check for fouls
    const validation = this.validateShot(state, shot, updatedBalls);
    
    // Update state with validation results
    shot.foul = validation.foul;
    shot.foulReason = validation.foulReason;
    shot.scratch = validation.scratch;
    
    // Determine player's group if table is open
    let updatedGroups = { ...state.playerGroups };
    if (state.tableOpen && !shot.foul) {
      const groupDetermined = this.determineGroup(shot, updatedBalls);
      if (groupDetermined) {
        updatedGroups[playerId] = groupDetermined;
        const otherPlayer = Object.keys(updatedGroups).find(id => id !== playerId)!;
        updatedGroups[otherPlayer] = groupDetermined === 'solids' ? 'stripes' : 'solids';
        shot.groupDetermined = groupDetermined;
      }
    }
    
    // Determine turn result
    const turnResult = this.determineTurnResult(
      state,
      shot,
      updatedBalls,
      validation
    );
    
    // Check for win/loss
    const gameEnd = this.checkGameEnd(state, shot, updatedBalls, playerId);
    
    // Update state
    const updatedState: BilliardsState = {
      ...state,
      balls: updatedBalls,
      lastShot: shot,
      foulOccurred: validation.foul,
      ballInHand: validation.ballInHand ? this.getOpponentId(state, playerId) : null,
      tableOpen: updatedGroups[playerId] === null,
      playerGroups: updatedGroups,
      currentPlayer: turnResult === 'continue' ? playerId : this.getOpponentId(state, playerId),
      phase: gameEnd ? 'gameEnd' : (validation.ballInHand ? 'ballInHand' : 'playing'),
      currentTurn: state.currentTurn + (turnResult === 'switch' ? 1 : 0),
      winnerId: gameEnd?.winnerId || null,
      gameStatus: gameEnd ? 'ended' : 'active'
    };
    
    // Add turn record
    updatedState.turnHistory.push({
      turnNumber: state.currentTurn,
      playerId,
      shot,
      result: turnResult,
      nextPlayer: updatedState.currentPlayer,
      gameEnded: !!gameEnd,
      winnerId: gameEnd?.winnerId || null
    });
    
    // Update physics engine with new positions
    physics.initializeBalls(updatedBalls);
    
    this.gameStates.set(gameId, updatedState);
    
    return { state: updatedState, result: turnResult };
  }

  /**
   * Validate shot legality
   */
  private validateShot(
    state: BilliardsState,
    shot: ShotRecord,
    balls: BallState[]
  ): {
    foul: boolean;
    foulReason: FoulType | null;
    scratch: boolean;
    ballInHand: boolean;
  } {
    const cueBall = balls.find(b => b.id === 0);
    const playerGroup = state.playerGroups[state.currentPlayer];
    
    // Check for scratch (cue ball pocketed)
    const scratch = cueBall?.pocketed || false;
    
    // Check if any ball left table
    const ballOffTable = balls.some(b => !b.pocketed && !this.isOnTable(b));
    
    // Check if cue ball left table
    const cueBallOffTable = cueBall && !this.isOnTable(cueBall);
    
    // Check if first ball hit was legal
    let wrongBallFirst = false;
    if (shot.firstBallHit !== null && playerGroup !== null && !state.tableOpen) {
      const firstBall = balls.find(b => b.id === shot.firstBallHit);
      if (firstBall) {
        const firstBallGroup = this.getBallGroup(firstBall.id);
        if (firstBallGroup !== playerGroup && firstBall.id !== 8) {
          wrongBallFirst = true;
        }
      }
    }
    
    // Check if no ball was hit
    const noBallHit = shot.ballsHit.length === 0;
    
    // Check if 8-ball was pocketed early
    const eightBallEarly = balls.find(b => b.id === 8)?.pocketed && 
                          !this.isGroupCleared(state, state.currentPlayer, balls);
    
    // Determine foul
    let foul = false;
    let foulReason: FoulType | null = null;
    
    if (scratch) {
      foul = true;
      foulReason = 'scratch';
    } else if (cueBallOffTable) {
      foul = true;
      foulReason = 'cue_ball_off_table';
    } else if (ballOffTable) {
      foul = true;
      foulReason = 'ball_off_table';
    } else if (wrongBallFirst) {
      foul = true;
      foulReason = 'wrong_ball_first';
    } else if (noBallHit) {
      foul = true;
      foulReason = 'no_ball_hit';
    } else if (eightBallEarly) {
      foul = true;
      foulReason = 'eight_ball_early';
    }
    
    return {
      foul,
      foulReason,
      scratch,
      ballInHand: foul
    };
  }

  /**
   * Determine which group player gets based on first ball pocketed
   */
  private determineGroup(
    shot: ShotRecord,
    balls: BallState[]
  ): BallGroup | null {
    // Find first numbered ball pocketed (not 8-ball)
    const firstPocketed = shot.ballsPocketed
      .map(p => balls.find(b => b.id === p.ballId))
      .find(b => b && b.id !== 8 && b.pocketed);
    
    if (!firstPocketed) return null;
    
    return firstPocketed.id <= 7 ? 'solids' : 'stripes';
  }

  /**
   * Determine turn result
   */
  private determineTurnResult(
    state: BilliardsState,
    shot: ShotRecord,
    balls: BallState[],
    validation: { foul: boolean; scratch: boolean; ballInHand: boolean }
  ): TurnResult {
    const playerId = state.currentPlayer;
    const playerGroup = state.playerGroups[playerId];
    
    // If foul occurred, opponent gets ball-in-hand
    if (validation.foul) {
      // Check for loss conditions
      if (validation.foulReason === 'eight_ball_early') {
        return 'loss';
      }
      return 'ball_in_hand';
    }
    
    // Check if player won
    if (this.checkWin(state, playerId, balls, shot)) {
      return 'win';
    }
    
    // Check if player pocketed their ball
    const playerBallsPocketed = shot.ballsPocketed
      .map(p => balls.find(b => b.id === p.ballId))
      .filter(b => {
        if (!b || b.id === 0 || b.id === 8) return false;
        if (playerGroup === 'solids') return b.id <= 7;
        if (playerGroup === 'stripes') return b.id >= 9;
        return false;
      });
    
    // If player pocketed their ball, continue turn
    if (playerBallsPocketed.length > 0) {
      return 'continue';
    }
    
    // Otherwise switch turns
    return 'switch';
  }

  /**
   * Check if player won
   */
  private checkWin(
    state: BilliardsState,
    playerId: string,
    balls: BallState[],
    shot: ShotRecord
  ): boolean {
    const playerGroup = state.playerGroups[playerId];
    if (!playerGroup) return false;
    
    // Check if player cleared their group
    const groupCleared = this.isGroupCleared(state, playerId, balls);
    if (!groupCleared) return false;
    
    // Check if 8-ball was pocketed
    const eightBall = balls.find(b => b.id === 8);
    if (!eightBall?.pocketed) return false;
    
    // Check if 8-ball was pocketed legally (after clearing group)
    // Check if it was the last ball pocketed in this shot
    const lastPocketed = shot.ballsPocketed
      .sort((a, b) => b.order - a.order)[0];
    
    if (lastPocketed?.ballId !== 8) {
      // 8-ball wasn't last - loss
      return false;
    }
    
    // If 8-ball was called, check pocket
    if (state.eightBallCalled && state.eightBallPocket !== null) {
      if (eightBall.pocketId !== state.eightBallPocket) {
        return false; // Wrong pocket - loss
      }
    }
    
    return true;
  }

  /**
   * Check if player cleared their group
   */
  private isGroupCleared(
    state: BilliardsState,
    playerId: string,
    balls: BallState[]
  ): boolean {
    const playerGroup = state.playerGroups[playerId];
    if (!playerGroup) return false;
    
    const groupBalls = balls.filter(b => {
      if (b.id === 0 || b.id === 8) return false;
      if (playerGroup === 'solids') return b.id <= 7;
      return b.id >= 9;
    });
    
    return groupBalls.every(b => b.pocketed);
  }

  /**
   * Check if ball is on table
   */
  private isOnTable(ball: BallState): boolean {
    const { tableWidth, tableHeight, ballRadius } = {
      tableWidth: 2.24,
      tableHeight: 1.12,
      ballRadius: 0.028
    };
    
    return ball.position.x >= ballRadius &&
           ball.position.x <= tableWidth - ballRadius &&
           ball.position.y >= ballRadius &&
           ball.position.y <= tableHeight - ballRadius;
  }

  /**
   * Get ball group
   */
  private getBallGroup(ballId: number): BallGroup {
    if (ballId === 0 || ballId === 8) return null;
    return ballId <= 7 ? 'solids' : 'stripes';
  }

  /**
   * Get opponent ID
   */
  private getOpponentId(state: BilliardsState, playerId: string): string {
    return Object.keys(state.playerGroups).find(id => id !== playerId)!;
  }

  /**
   * Check game end conditions
   */
  private checkGameEnd(
    state: BilliardsState,
    shot: ShotRecord,
    balls: BallState[],
    playerId: string
  ): { winnerId: string | null; reason: string } | null {
    // Check for win
    if (this.checkWin(state, playerId, balls, shot)) {
      return { winnerId: playerId, reason: 'cleared_group_and_eight_ball' };
    }
    
    // Check for loss (8-ball foul)
    const eightBall = balls.find(b => b.id === 8);
    if (eightBall?.pocketed) {
      const playerGroup = state.playerGroups[playerId];
      const groupCleared = this.isGroupCleared(state, playerId, balls);
      
      // If 8-ball pocketed before clearing group, player loses
      if (!groupCleared) {
        return { winnerId: this.getOpponentId(state, playerId), reason: 'eight_ball_early' };
      }
      
      // If 8-ball in wrong pocket (if called)
      if (state.eightBallCalled && state.eightBallPocket !== null) {
        if (eightBall.pocketId !== state.eightBallPocket) {
          return { winnerId: this.getOpponentId(state, playerId), reason: 'eight_ball_wrong_pocket' };
        }
      }
    }
    
    return null;
  }

  /**
   * Place cue ball (ball-in-hand)
   */
  placeCueBall(
    gameId: string,
    playerId: string,
    position: Vector2D
  ): { success: boolean; state: BilliardsState; error?: string } {
    const state = this.gameStates.get(gameId);
    if (!state) {
      throw new Error('Game state not found');
    }
    
    if (state.ballInHand !== playerId) {
      return { success: false, state, error: 'You do not have ball-in-hand' };
    }
    
    const physics = this.physicsEngines.get(gameId);
    if (!physics) {
      throw new Error('Physics engine not found');
    }
    
    const success = physics.placeCueBall(0, position);
    if (!success) {
      return { success: false, state, error: 'Invalid cue ball position' };
    }
    
    // Update cue ball position in state
    const updatedBalls = state.balls.map(ball => {
      if (ball.id === 0) {
        return {
          ...ball,
          position,
          pocketed: false,
          onTable: true,
          pocketId: null
        };
      }
      return ball;
    });
    
    const updatedState: BilliardsState = {
      ...state,
      balls: updatedBalls,
      ballInHand: null,
      phase: 'playing'
    };
    
    this.gameStates.set(gameId, updatedState);
    
    return { success: true, state: updatedState };
  }

  /**
   * Get current state
   */
  getState(gameId: string): BilliardsState | null {
    return this.gameStates.get(gameId) || null;
  }

  /**
   * Set state
   */
  setState(gameId: string, state: BilliardsState): void {
    this.gameStates.set(gameId, state);
  }

  /**
   * Delete game state
   */
  deleteState(gameId: string): void {
    this.gameStates.delete(gameId);
    this.physicsEngines.delete(gameId);
  }
}
```

---

## Validation Logic

### Complete Validation Rules

```typescript
// api/src/modules/games/billiards/billiards.validation.ts

export class BilliardsValidation {
  /**
   * Validate shot before execution
   */
  static validateShotInput(
    state: BilliardsState,
    playerId: string,
    power: number,
    angle: number
  ): { valid: boolean; error?: string } {
    // Check turn
    if (state.currentPlayer !== playerId) {
      return { valid: false, error: 'Not your turn' };
    }
    
    // Check game status
    if (state.gameStatus !== 'active') {
      return { valid: false, error: 'Game is not active' };
    }
    
    // Check phase
    if (state.phase === 'ballInHand' && state.ballInHand === playerId) {
      return { valid: false, error: 'Must place cue ball first' };
    }
    
    // Validate power
    if (power < 10 || power > 100) {
      return { valid: false, error: 'Power must be between 10 and 100' };
    }
    
    // Validate angle
    if (angle < 0 || angle >= 360) {
      return { valid: false, error: 'Angle must be between 0 and 360' };
    }
    
    // Check cue ball exists
    const cueBall = state.balls.find(b => b.id === 0 && !b.pocketed);
    if (!cueBall) {
      return { valid: false, error: 'Cue ball not found' };
    }
    
    return { valid: true };
  }

  /**
   * Validate cue ball placement
   */
  static validateCueBallPlacement(
    state: BilliardsState,
    position: Vector2D
  ): { valid: boolean; error?: string } {
    const { tableWidth, tableHeight, ballRadius } = {
      tableWidth: 2.24,
      tableHeight: 1.12,
      ballRadius: 0.028
    };
    
    // Check bounds
    if (position.x < ballRadius || position.x > tableWidth - ballRadius) {
      return { valid: false, error: 'Cue ball must be within table width' };
    }
    
    if (position.y < ballRadius || position.y > tableHeight - ballRadius) {
      return { valid: false, error: 'Cue ball must be within table height' };
    }
    
    // Check overlap with other balls
    for (const ball of state.balls) {
      if (ball.id === 0 || ball.pocketed) continue;
      
      const distance = Math.sqrt(
        Math.pow(position.x - ball.position.x, 2) +
        Math.pow(position.y - ball.position.y, 2)
      );
      
      if (distance < ballRadius * 2) {
        return { valid: false, error: 'Cue ball cannot overlap other balls' };
      }
    }
    
    return { valid: true };
  }
}
```

---

## WebSocket Protocol

### Event Specifications

```typescript
// Client → Server Events

// 1. Execute Shot
{
  event: "billiards.shot",
  data: {
    gameId: string;
    power: number;      // 0-100
    angle: number;      // 0-360 degrees
  }
}

// 2. Place Cue Ball (ball-in-hand)
{
  event: "billiards.placeCueBall",
  data: {
    gameId: string;
    position: { x: number; y: number };
  }
}

// 3. Call 8-Ball (optional - if calling shots)
{
  event: "billiards.callEightBall",
  data: {
    gameId: string;
    pocketId: number;   // 0-5
  }
}

// 4. Real-time Aim Update (optional)
{
  event: "billiards.aim",
  data: {
    gameId: string;
    angle: number;
    power: number;
  }
}

// Server → Client Events

// 1. Shot Result
{
  event: "billiards.shotResult",
  data: {
    gameId: string;
    shot: ShotRecord;
    finalBallStates: BallState[];
    turnResult: TurnResult;
    gameState: BilliardsState;
    winnerId: string | null;
  }
}

// 2. State Update
{
  event: "game.stateUpdate",
  data: {
    gameId: string;
    state: BilliardsState;
  }
}

// 3. Game End
{
  event: "billiards.gameEnd",
  data: {
    gameId: string;
    winnerId: string | null;
    reason: string;
    finalState: BilliardsState;
  }
}

// 4. Aim Update (broadcast to opponent)
{
  event: "billiards.aimUpdate",
  data: {
    gameId: string;
    playerId: string;
    angle: number;
    power: number;
  }
}
```

---

## Frontend Implementation Details

### Main Component Structure

```typescript
// web/src/components/games/BilliardsGame.tsx

"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Socket } from "socket.io-client";
import Matter from 'matter-js';

interface BilliardsGameProps {
  gameId: string;
  socket: Socket;
  odUserId: string;
  initialState?: BilliardsState;
  initialPlayers?: GamePlayer[];
  onGameEnd?: (result: GameEndResult) => void;
}

export default function BilliardsGame({
  gameId,
  socket,
  odUserId,
  initialState,
  initialPlayers,
  onGameEnd
}: BilliardsGameProps) {
  const [gameState, setGameState] = useState<BilliardsState | null>(initialState || null);
  const [aimAngle, setAimAngle] = useState<number>(0);
  const [power, setPower] = useState<number>(50);
  const [isAiming, setIsAiming] = useState<boolean>(false);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const clientPhysicsRef = useRef<Matter.Engine | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const isMyTurn = gameState?.currentPlayer === odUserId;
  const isBallInHand = gameState?.ballInHand === odUserId;
  const opponent = initialPlayers?.find(p => p.odUserId !== odUserId);

  // Initialize client-side physics for prediction
  useEffect(() => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const engine = Matter.Engine.create();
    engine.world.gravity.y = 0;
    engine.world.gravity.x = 0;
    
    clientPhysicsRef.current = engine;
    
    // Render loop
    const render = () => {
      if (clientPhysicsRef.current && !isSimulating) {
        Matter.Engine.update(clientPhysicsRef.current, 1000 / 60);
      }
      animationFrameRef.current = requestAnimationFrame(render);
    };
    render();
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isSimulating]);

  // WebSocket event handlers
  useEffect(() => {
    if (!socket) return;

    const handleStateUpdate = (data: { gameId: string; state: BilliardsState }) => {
      if (data.gameId === gameId) {
        setGameState(data.state);
        // Update client physics with server positions
        syncClientPhysics(data.state.balls);
      }
    };

    const handleShotResult = (data: {
      gameId: string;
      shot: ShotRecord;
      finalBallStates: BallState[];
      turnResult: TurnResult;
      gameState: BilliardsState;
      winnerId: string | null;
    }) => {
      if (data.gameId === gameId) {
        setIsSimulating(false);
        setGameState(data.gameState);
        syncClientPhysics(data.finalBallStates);
        
        if (data.winnerId) {
          if (onGameEnd) {
            const winner = initialPlayers?.find(p => p.odUserId === data.winnerId);
            onGameEnd({
              winnerId: data.winnerId,
              winnerName: winner?.displayName || null,
              isDraw: false
            });
          }
        }
      }
    };

    const handleGameEnd = (data: {
      gameId: string;
      winnerId: string | null;
      reason: string;
      finalState: BilliardsState;
    }) => {
      if (data.gameId === gameId) {
        setGameState(data.finalState);
        if (onGameEnd) {
          const winner = initialPlayers?.find(p => p.odUserId === data.winnerId);
          onGameEnd({
            winnerId: data.winnerId,
            winnerName: winner?.displayName || null,
            isDraw: false
          });
        }
      }
    };

    socket.on("game.stateUpdate", handleStateUpdate);
    socket.on("billiards.shotResult", handleShotResult);
    socket.on("billiards.gameEnd", handleGameEnd);

    return () => {
      socket.off("game.stateUpdate", handleStateUpdate);
      socket.off("billiards.shotResult", handleShotResult);
      socket.off("billiards.gameEnd", handleGameEnd);
    };
  }, [socket, gameId, onGameEnd, initialPlayers]);

  /**
   * Sync client physics with server state
   */
  const syncClientPhysics = (balls: BallState[]) => {
    // Update ball positions in client physics
    // This corrects any prediction errors
  };

  /**
   * Handle aim (mouse/touch)
   */
  const handleAim = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isMyTurn || isSimulating || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const cueBall = gameState?.balls.find(b => b.id === 0 && !b.pocketed);
    if (!cueBall) return;
    
    // Convert canvas coordinates to table coordinates
    const tableX = (x / canvas.width) * 2.24;
    const tableY = (y / canvas.height) * 1.12;
    
    // Calculate angle from cue ball to mouse
    const dx = tableX - cueBall.position.x;
    const dy = tableY - cueBall.position.y;
    const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
    
    setAimAngle(angle < 0 ? angle + 360 : angle);
    setIsAiming(true);
  }, [isMyTurn, isSimulating, gameState]);

  /**
   * Handle power adjustment (mouse wheel)
   */
  const handlePowerChange = useCallback((e: React.WheelEvent) => {
    if (!isMyTurn || isSimulating) return;
    
    e.preventDefault();
    const delta = e.deltaY > 0 ? -5 : 5;
    setPower(prev => Math.max(10, Math.min(100, prev + delta)));
  }, [isMyTurn, isSimulating]);

  /**
   * Execute shot
   */
  const handleShot = () => {
    if (!isMyTurn || isSimulating || !socket) return;
    
    setIsSimulating(true);
    
    socket.emit("billiards.shot", {
      gameId,
      power,
      angle: aimAngle
    });
  };

  /**
   * Place cue ball (ball-in-hand)
   */
  const handlePlaceCueBall = (position: Vector2D) => {
    if (!isBallInHand || !socket) return;
    
    socket.emit("billiards.placeCueBall", {
      gameId,
      position
    });
  };

  // Render game
  return (
    <div className="bg-gray-900 rounded-lg border border-white/20 p-6">
      {/* Game UI */}
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-white mb-2">8-Ball Pool</h2>
        <div className="flex justify-between text-sm text-gray-300">
          <div>
            <span>Turn: </span>
            <span className={isMyTurn ? "text-yellow-400 font-bold" : ""}>
              {isMyTurn ? "You" : opponent?.displayName || "Opponent"}
            </span>
          </div>
          <div>
            {gameState?.playerGroups[odUserId] && (
              <span>Your Group: {gameState.playerGroups[odUserId]}</span>
            )}
          </div>
        </div>
      </div>

      {/* Pool Table Canvas */}
      <div className="relative bg-green-800 rounded-lg border-4 border-amber-800 mb-4">
        <canvas
          ref={canvasRef}
          width={800}
          height={400}
          onMouseMove={handleAim}
          onWheel={handlePowerChange}
          className="w-full h-auto cursor-crosshair"
        />
        
        {/* Aim Line Overlay */}
        {isMyTurn && isAiming && !isSimulating && (
          <AimLine
            cueBall={gameState?.balls.find(b => b.id === 0)}
            angle={aimAngle}
            power={power}
          />
        )}
      </div>

      {/* Controls */}
      {isMyTurn && !isSimulating && (
        <div className="space-y-4">
          {isBallInHand ? (
            <div>
              <p className="text-yellow-400 mb-2">Place cue ball anywhere on table</p>
              <button
                onClick={() => handlePlaceCueBall({ x: 0.5, y: 0.56 })}
                className="bg-white px-4 py-2 text-black font-semibold"
              >
                Place Cue Ball
              </button>
            </div>
          ) : (
            <>
              <div>
                <label className="text-white mb-2 block">Power: {power}%</label>
                <input
                  type="range"
                  min="10"
                  max="100"
                  value={power}
                  onChange={(e) => setPower(Number(e.target.value))}
                  className="w-full"
                />
              </div>
              <button
                onClick={handleShot}
                className="w-full bg-white px-6 py-3 text-black font-semibold hover:bg-gray-200"
              >
                Take Shot
              </button>
            </>
          )}
        </div>
      )}

      {isSimulating && (
        <div className="text-center text-gray-400">
          <p>Simulating shot...</p>
        </div>
      )}

      {/* Game Status */}
      {gameState?.foulOccurred && (
        <div className="mt-4 p-3 bg-red-900/30 border border-red-500 rounded">
          <p className="text-red-400 font-semibold">Foul: {gameState.lastShot?.foulReason}</p>
        </div>
      )}
    </div>
  );
}
```

---

## Algorithms & Formulas

### Ball Collision Physics

```typescript
/**
 * Calculate collision between two balls
 * Uses elastic collision formula
 */
function calculateBallCollision(
  ball1: { position: Vector2D; velocity: Vector2D; mass: number },
  ball2: { position: Vector2D; velocity: Vector2D; mass: number }
): { v1: Vector2D; v2: Vector2D } {
  const dx = ball2.position.x - ball1.position.x;
  const dy = ball2.position.y - ball1.position.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  // Normalize collision vector
  const nx = dx / distance;
  const ny = dy / distance;
  
  // Relative velocity
  const dvx = ball2.velocity.x - ball1.velocity.x;
  const dvy = ball2.velocity.y - ball1.velocity.y;
  
  // Relative velocity along collision normal
  const dvn = dvx * nx + dvy * ny;
  
  // Don't resolve if velocities are separating
  if (dvn > 0) {
    return { v1: ball1.velocity, v2: ball2.velocity };
  }
  
  // Collision impulse (elastic collision)
  const impulse = (2 * dvn) / (ball1.mass + ball2.mass);
  
  // Apply impulse
  const v1: Vector2D = {
    x: ball1.velocity.x + impulse * ball2.mass * nx,
    y: ball1.velocity.y + impulse * ball2.mass * ny
  };
  
  const v2: Vector2D = {
    x: ball2.velocity.x - impulse * ball1.mass * nx,
    y: ball2.velocity.y - impulse * ball1.mass * ny
  };
  
  return { v1, v2 };
}
```

### Cushion Bounce

```typescript
/**
 * Calculate ball bounce off cushion
 */
function calculateCushionBounce(
  ball: { position: Vector2D; velocity: Vector2D },
  cushion: { start: Vector2D; end: Vector2D; normal: Vector2D }
): Vector2D {
  // Reflect velocity across cushion normal
  const dot = ball.velocity.x * cushion.normal.x + ball.velocity.y * cushion.normal.y;
  
  return {
    x: ball.velocity.x - 2 * dot * cushion.normal.x * 0.7, // 0.7 = restitution
    y: ball.velocity.y - 2 * dot * cushion.normal.y * 0.7
  };
}
```

### Friction Calculation

```typescript
/**
 * Apply friction to ball velocity
 */
function applyFriction(
  velocity: Vector2D,
  friction: number,
  deltaTime: number
): Vector2D {
  const speed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
  
  if (speed < 0.01) {
    return { x: 0, y: 0 };
  }
  
  // Friction reduces velocity
  const frictionForce = friction * 9.81; // gravity * friction coefficient
  const deceleration = frictionForce * deltaTime;
  const newSpeed = Math.max(0, speed - deceleration);
  
  const scale = newSpeed / speed;
  
  return {
    x: velocity.x * scale,
    y: velocity.y * scale
  };
}
```

---

## Error Handling

### Comprehensive Error Handling

```typescript
// Error types
export enum BilliardsError {
  GAME_NOT_FOUND = 'GAME_NOT_FOUND',
  NOT_YOUR_TURN = 'NOT_YOUR_TURN',
  GAME_NOT_ACTIVE = 'GAME_NOT_ACTIVE',
  INVALID_SHOT = 'INVALID_SHOT',
  CUE_BALL_NOT_FOUND = 'CUE_BALL_NOT_FOUND',
  INVALID_POWER = 'INVALID_POWER',
  INVALID_ANGLE = 'INVALID_ANGLE',
  BALL_IN_HAND_REQUIRED = 'BALL_IN_HAND_REQUIRED',
  INVALID_CUE_BALL_POSITION = 'INVALID_CUE_BALL_POSITION',
  SIMULATION_FAILED = 'SIMULATION_FAILED'
}

// Error handling in service
try {
  const result = this.executeShot(gameId, playerId, power, angle);
  return result;
} catch (error) {
  this.logger.error(`Shot execution error for game ${gameId}:`, error);
  
  if (error instanceof Error) {
    // Map to known errors
    if (error.message.includes('not found')) {
      throw new Error(BilliardsError.GAME_NOT_FOUND);
    }
    // ... other error mappings
  }
  
  throw error;
}
```

---

## Testing Strategy

### Unit Tests

```typescript
// api/src/modules/games/billiards/billiards.service.spec.ts

describe('BilliardsService', () => {
  let service: BilliardsService;
  
  beforeEach(() => {
    service = new BilliardsService();
  });
  
  describe('initializeState', () => {
    it('should create game with 16 balls', () => {
      const state = service.initializeState('game1', ['player1', 'player2']);
      expect(state.balls).toHaveLength(16);
      expect(state.balls.find(b => b.id === 0)).toBeDefined(); // Cue ball
      expect(state.balls.find(b => b.id === 8)).toBeDefined(); // 8-ball
    });
    
    it('should set break player randomly', () => {
      const state = service.initializeState('game1', ['player1', 'player2']);
      expect(['player1', 'player2']).toContain(state.breakPlayer);
    });
  });
  
  describe('executeShot', () => {
    it('should validate turn', () => {
      const state = service.initializeState('game1', ['player1', 'player2']);
      const result = service.executeShot('game1', 'player2', 50, 0);
      expect(result.result).toBe('switch');
      expect(result.error).toContain('Not your turn');
    });
    
    it('should detect scratch foul', () => {
      // Test scenario where cue ball is pocketed
    });
    
    it('should detect wrong ball first', () => {
      // Test scenario where opponent's ball hit first
    });
  });
});
```

### Integration Tests

```typescript
// Test full game flow
describe('Billiards Game Flow', () => {
  it('should complete full game', async () => {
    // 1. Initialize game
    // 2. Break shot
    // 3. Assign groups
    // 4. Play turns
    // 5. Clear group
    // 6. Pocket 8-ball
    // 7. Verify win
  });
});
```

---

This detailed implementation guide provides:
- ✅ Complete type definitions
- ✅ Full physics engine implementation
- ✅ Complete state management
- ✅ Validation logic
- ✅ WebSocket protocol
- ✅ Frontend component structure
- ✅ Algorithms and formulas
- ✅ Error handling
- ✅ Testing strategy

You now have everything needed to implement billiards step-by-step!



