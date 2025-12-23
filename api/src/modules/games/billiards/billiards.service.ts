import { Injectable, Logger } from '@nestjs/common';
import {
  BilliardsState,
  BallState,
  Vector2D,
  BallGroup,
  ShotRecord,
  TurnResult,
  TurnRecord,
  FoulType,
  PhysicsResult,
  PocketState
} from './billiards.types';
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
   * Layout matches standard pool table:
   * - Head spot: 1/4 down from head end (where cue ball starts)
   * - Foot spot: 3/4 down from head end (where rack is positioned)
   * - Head string: line across table at head spot
   */
  private createInitialRack(breakPlayer: string): BallState[] {
    const { tableWidth, tableHeight, ballRadius } = {
      tableWidth: 2.24,
      tableHeight: 1.12,
      ballRadius: 0.028
    };
    
    // Rack position: Left side of table (about 1/3 from left rail), centered vertically
    // Cue ball position: Right side of table (about 1/3 from right rail), centered vertically
    const rackX = tableWidth * 0.33;       // 1/3 from left (left side)
    const rackY = tableHeight / 2;         // Center vertically
    
    const cueBallX = tableWidth * 0.67;    // 1/3 from right (right side)
    const cueBallY = tableHeight / 2;       // Center vertically
    
    // Triangle formation spacing
    const spacing = ballRadius * 2.1;
    const rows = 5;
    
    const balls: BallState[] = [];
    
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
    
    // Check if ball-in-hand
    if (state.phase === 'ballInHand' && state.ballInHand === playerId) {
      return { state, result: 'switch', error: 'Must place cue ball first' };
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
    
    // Update shot with validation results
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
      validation,
      playerId
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
      phase: gameEnd ? 'gameEnd' : (validation.ballInHand ? 'ballInHand' : (state.phase === 'break' ? 'playing' : state.phase)),
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
    validation: { foul: boolean; foulReason: FoulType | null; scratch: boolean; ballInHand: boolean },
    playerId: string
  ): TurnResult {
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
    const playerGroup = state.playerGroups[playerId];
    if (playerGroup) {
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
   * Balls are considered on table if they're within the playable area
   * (with margin from cushions) or in a pocket
   */
  private isOnTable(ball: BallState): boolean {
    const { tableWidth, tableHeight, ballRadius } = {
      tableWidth: 2.24,
      tableHeight: 1.12,
      ballRadius: 0.028
    };
    
    // Playable margin from cushions (5cm)
    const playableMargin = 0.05;
    
    // Ball is on table if it's within playable bounds (not pocketed)
    // Allow some tolerance for balls near edges
    const tolerance = ballRadius * 0.5;
    
    const minX = playableMargin + ballRadius - tolerance;
    const maxX = tableWidth - playableMargin - ballRadius + tolerance;
    const minY = playableMargin + ballRadius - tolerance;
    const maxY = tableHeight - playableMargin - ballRadius + tolerance;
    
    const inBounds = ball.position.x >= minX &&
                     ball.position.x <= maxX &&
                     ball.position.y >= minY &&
                     ball.position.y <= maxY;
    
    // If ball is pocketed, it's not on table
    if (ball.pocketed) {
      return false;
    }
    
    return inBounds;
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

