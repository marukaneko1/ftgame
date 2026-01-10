// Ball types
export type BallType = 'cue' | 'solid' | 'stripe' | 'eight';
export type BallGroup = 'solids' | 'stripes' | null; // null = open table

// Game phases
export type BilliardsPhase = 'break' | 'playing' | 'ballInHand' | 'gameEnd';

// Vector for 2D physics
export interface Vector2D {
  x: number;
  y: number;
}

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

// Pocket state
export interface PocketState {
  id: number;                    // 0-5 (6 pockets)
  position: Vector2D;
  radius: number;
  ballsPocketed: number[];        // Ball IDs pocketed in this pocket
}

// Ball hit record
export interface BallHitRecord {
  ballId: number;
  timestamp: number;             // When in simulation it was hit
  position: Vector2D;
}

// Ball pocket record
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

// Turn result
export type TurnResult = 
  | 'continue'                   // Player continues (pocketed their ball)
  | 'switch'                     // Turn switches to opponent
  | 'win'                        // Player won
  | 'loss'                       // Player lost (8-ball foul)
  | 'ball_in_hand';             // Opponent gets ball-in-hand

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

// Physics simulation result
export interface PhysicsResult {
  finalBallStates: BallState[];
  ballsHit: BallHitRecord[];
  ballsPocketed: BallPocketRecord[];
  simulationTime: number;        // How long simulation ran (ms)
  frames: number;                // Number of physics frames
}

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






