import { BallState, Vector2D, BallHitRecord, BallPocketRecord, PhysicsResult } from './billiards.types';

// Matter.js import - lazy load to ensure it's available
function getMatter(): any {
  try {
    // @ts-ignore
    const MatterLib = require('matter-js');
    if (!MatterLib || !MatterLib.Engine) {
      throw new Error('Matter.js Engine not found');
    }
    return MatterLib;
  } catch (error) {
    console.error('Failed to load Matter.js:', error);
    throw new Error('Matter.js library not found. Please run: npm install matter-js');
  }
}

// Type definitions for Matter.js
type MatterEngine = any;
type MatterWorld = any;
type MatterBody = any;

export class BilliardsPhysics {
  private engine: MatterEngine;
  private world: MatterWorld;
  private tableBodies: MatterBody[] = [];
  private ballBodies: Map<number, MatterBody> = new Map();
  private pocketBodies: MatterBody[] = [];
  
  // Physics constants (standard 8-foot table)
  private readonly CONFIG = {
    tableWidth: 2.24,           // 2.24m (8-foot table)
    tableHeight: 1.12,          // 1.12m
    ballRadius: 0.028,           // 28mm standard pool ball
    pocketRadius: 0.11,          // 11cm pocket opening (all pockets same size)
    friction: 0.015,            // Table friction
    frictionAir: 0.01,          // Air resistance
    restitution: 0.8,           // Ball-to-ball bounce
    cushionRestitution: 0.7,    // Cushion bounce
    density: 0.001,             // Ball density
    velocityThreshold: 0.01,    // Stop when velocity below this (m/s)
    maxSimulationTime: 10000,    // Max 10 seconds per shot
    playableMargin: 0.05,       // 5cm margin from cushions for playable area
  };

  constructor() {
    // Load Matter.js
    const M = getMatter();
    
    try {
      // Create Matter.js engine
      this.engine = M.Engine.create();
      this.world = this.engine.world;
      
      // Set gravity to 0 (top-down view, no gravity)
      this.engine.world.gravity.y = 0;
      this.engine.world.gravity.x = 0;
      
      // Create table boundaries and pockets
      this.createTable();
      this.createPockets();
    } catch (error: any) {
      console.error('Failed to create Matter.js engine:', error);
      throw new Error(`Failed to initialize physics engine: ${error.message}`);
    }
  }

  /**
   * Create table boundaries (cushions/rails)
   * Properly positioned to contain balls within playable area
   */
  private createTable(): void {
    const M = getMatter();
    const { tableWidth, tableHeight, ballRadius, playableMargin } = this.CONFIG;
    const cushionThickness = 0.05; // 5cm thick cushions
    const cushionHeight = 0.1;     // 10cm high
    
    // Playable area boundaries (with margin from cushions)
    const playableX = playableMargin;
    const playableY = playableMargin;
    const playableWidth = tableWidth - 2 * playableMargin;
    const playableHeight = tableHeight - 2 * playableMargin;
    
    // Top cushion (full width, but balls can't go past playable area)
    const topCushion = M.Bodies.rectangle(
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
    const bottomCushion = M.Bodies.rectangle(
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
    
    // Left cushions (with gaps for corner pockets)
    // Gap size: pocket radius * 2 + some clearance
    const pocketGap = this.CONFIG.pocketRadius * 2.5;
    const leftCushionTop = M.Bodies.rectangle(
      cushionThickness / 2,
      (cushionHeight + pocketGap) / 2,
      cushionThickness,
      (tableHeight - pocketGap) / 2,
      {
        isStatic: true,
        restitution: this.CONFIG.cushionRestitution,
        label: 'cushion-left-top'
      }
    );
    
    const leftCushionBottom = M.Bodies.rectangle(
      cushionThickness / 2,
      tableHeight - (cushionHeight + pocketGap) / 2,
      cushionThickness,
      (tableHeight - pocketGap) / 2,
      {
        isStatic: true,
        restitution: this.CONFIG.cushionRestitution,
        label: 'cushion-left-bottom'
      }
    );
    
    // Right cushions (with gaps for corner pockets)
    const rightCushionTop = M.Bodies.rectangle(
      tableWidth - cushionThickness / 2,
      (cushionHeight + pocketGap) / 2,
      cushionThickness,
      (tableHeight - pocketGap) / 2,
      {
        isStatic: true,
        restitution: this.CONFIG.cushionRestitution,
        label: 'cushion-right-top'
      }
    );
    
    const rightCushionBottom = M.Bodies.rectangle(
      tableWidth - cushionThickness / 2,
      tableHeight - (cushionHeight + pocketGap) / 2,
      cushionThickness,
      (tableHeight - pocketGap) / 2,
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
    
    M.World.add(this.world, this.tableBodies);
  }

  /**
   * Create 6 pockets (4 corners + 2 side)
   */
  private createPockets(): void {
    const M = getMatter();
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
      const pocket = M.Bodies.circle(pos.x, pos.y, pocketRadius, {
        isStatic: true,
        isSensor: true,           // Doesn't collide, just detects
        label: `pocket-${index}`
      });
      return pocket;
    });
    
    const M2 = getMatter();
    M2.World.add(this.world, this.pocketBodies);
  }

  /**
   * Initialize balls on table
   */
  initializeBalls(ballStates: BallState[]): void {
    const M = getMatter();
    // Clear existing balls
    this.ballBodies.forEach(body => M.World.remove(this.world, body));
    this.ballBodies.clear();
    
    // Create Matter.js bodies for each ball
    ballStates.forEach(ballState => {
      if (!ballState.pocketed && ballState.onTable) {
        const ballBody = M.Bodies.circle(
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
        M.World.add(this.world, ballBody);
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
    const M = getMatter();
    const cueBallBody = this.ballBodies.get(cueBallId);
    if (!cueBallBody) {
      throw new Error(`Cue ball ${cueBallId} not found`);
    }
    
    // Convert power (0-100) to velocity (m/s)
    // Typical pool shot: 5-15 m/s velocity
    const maxVelocity = 15; // m/s
    const velocity = (power / 100) * maxVelocity;
    
    // Convert angle (degrees) to radians
    const angleRad = (angle * Math.PI) / 180;
    
    // Calculate velocity vector
    const velocityX = Math.cos(angleRad) * velocity;
    const velocityY = Math.sin(angleRad) * velocity;
    
    // Apply velocity to cue ball
    M.Body.setVelocity(cueBallBody, { x: velocityX, y: velocityY });
    
    // Track collisions and pocketing
    const ballsHit: BallHitRecord[] = [];
    const ballsPocketed: BallPocketRecord[] = [];
    const hitBallIds = new Set<number>();
    let pocketOrder = 1;
    
    // Collision detection
    M.Events.on(this.engine, 'collisionStart', (event: any) => {
      event.pairs.forEach((pair: any) => {
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
      M.Engine.update(this.engine, 1000 / 60); // 60 FPS
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
        pocketedBy: null, // Will be set by game logic
        pocketedAt: pocketed ? Date.now() : null,
        pocketId,
        onTable: !pocketed
      });
    }
    
    // Remove collision listeners
    M.Events.off(this.engine, 'collisionStart');
    
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
  private getBallType(ballId: number): 'cue' | 'solid' | 'stripe' | 'eight' {
    if (ballId === 0) return 'cue';
    if (ballId === 8) return 'eight';
    if (ballId >= 1 && ballId <= 7) return 'solid';
    return 'stripe';
  }

  /**
   * Place cue ball (for ball-in-hand)
   */
  placeCueBall(cueBallId: number, position: Vector2D): boolean {
    const M = getMatter();
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
    M.Body.setPosition(cueBallBody, { x: position.x, y: position.y });
    M.Body.setVelocity(cueBallBody, { x: 0, y: 0 });
    M.Body.setAngularVelocity(cueBallBody, 0);
    
    return true;
  }
}

