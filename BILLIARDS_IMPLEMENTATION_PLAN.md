# Billiards Game Implementation Plan

## Table of Contents
1. [Game Overview](#game-overview)
2. [Game Mechanics Analysis](#game-mechanics-analysis)
3. [Technical Architecture](#technical-architecture)
4. [State Management](#state-management)
5. [Physics Simulation](#physics-simulation)
6. [UI/UX Design](#uiux-design)
7. [Integration Plan](#integration-plan)
8. [Implementation Steps](#implementation-steps)

---

## Game Overview

### Game Type: 8-Ball Pool (Standard Billiards)

**Objective**: Be the first player to pocket all your assigned balls (solids or stripes) and then pocket the 8-ball.

**Players**: 2 players (1v1)

**Game Flow**:
1. Break shot (random player starts)
2. Players take turns
3. Player continues if they pocket a ball
4. First to clear their group + 8-ball wins

---

## Game Mechanics Analysis

### 1. Ball Types and Groups

**15 Balls Total**:
- **1-7**: Solid balls (low numbers)
- **8**: Black ball (must be pocketed last)
- **9-15**: Striped balls (high numbers)
- **Cue Ball**: White ball (striker)

**Assignment**:
- After break, first player to pocket a ball determines their group
- If player pockets both solid and stripe on break, they choose
- If no balls pocketed on break, table is "open" until first pocket

### 2. Turn Structure

**Turn Phases**:
1. **Aiming Phase**: Player positions cue stick, adjusts angle/power
2. **Shot Phase**: Player executes shot with chosen power and angle
3. **Ball Movement Phase**: Physics simulation runs until all balls stop
4. **Validation Phase**: Check if shot was legal
5. **Scoring Phase**: Update game state, determine next turn

**Turn Continuation Rules**:
- ✅ Player pockets their ball → Continue turn
- ✅ Player pockets their ball + opponent's ball → Continue turn (opponent's ball stays pocketed)
- ❌ Player pockets opponent's ball only → Foul, switch turns
- ❌ Player pockets 8-ball early → Loss
- ❌ Player scratches (cue ball in pocket) → Foul, switch turns
- ❌ No balls pocketed → Switch turns

### 3. Fouls and Penalties

**Foul Conditions**:
- Scratch (cue ball pocketed)
- Hitting opponent's ball first
- No ball hit
- 8-ball pocketed before clearing group
- 8-ball pocketed in wrong pocket (if called)
- Ball leaves table

**Penalties**:
- Opponent gets ball-in-hand (can place cue ball anywhere)
- Turn switches to opponent

### 4. Win Conditions

**Legal Win**:
- Player pockets all their group balls
- Player pockets 8-ball in called pocket
- Game ends immediately

**Loss Conditions**:
- Player pockets 8-ball before clearing group
- Player pockets 8-ball in wrong pocket (if called)
- Player scratches on 8-ball shot

---

## Technical Architecture

### 1. Backend Structure

```
api/src/modules/games/billiards/
├── billiards.types.ts          # TypeScript interfaces
├── billiards.service.ts        # Game logic & state management
├── billiards.physics.ts         # Physics simulation engine
├── billiards.validation.ts     # Shot validation logic
└── billiards.module.ts         # NestJS module
```

### 2. Frontend Structure

```
web/src/components/games/
└── BilliardsGame.tsx           # Main game component
    ├── PoolTable.tsx           # Table rendering
    ├── Ball.tsx                # Individual ball component
    ├── CueStick.tsx            # Cue stick aiming interface
    ├── PowerMeter.tsx          # Shot power indicator
    └── GameUI.tsx              # Score, turn info, controls
```

### 3. State Management Flow

```
Game State → Physics Engine → Validation → State Update → UI Render
     ↑                                                          ↓
     └─────────────────── WebSocket Events ────────────────────┘
```

---

## State Management

### Game State Structure

```typescript
interface BilliardsState {
  phase: "break" | "playing" | "gameEnd";
  currentPlayer: string;        // Player ID whose turn it is
  playerGroups: {
    [playerId: string]: "solids" | "stripes" | null;  // null = open table
  };
  balls: BallState[];           // All 16 balls (15 + cue)
  pockets: PocketState[];       // 6 pockets
  turnHistory: TurnRecord[];
  gameStatus: "active" | "paused" | "ended";
  winnerId: string | null;
  lastShot: ShotRecord | null;
  foulOccurred: boolean;
  ballInHand: string | null;    // Player ID with ball-in-hand
}

interface BallState {
  id: number;                   // 0 = cue, 1-15 = numbered
  position: { x: number; y: number };
  velocity: { x: number; y: number };
  angle: number;                // Rotation angle
  pocketed: boolean;
  pocketedBy: string | null;    // Player who pocketed
  pocketedAt: number | null;    // Timestamp
}

interface ShotRecord {
  playerId: string;
  power: number;                // 0-100
  angle: number;                // 0-360 degrees
  timestamp: number;
  ballsHit: number[];            // Ball IDs hit in order
  ballsPocketed: number[];       // Ball IDs pocketed
  foul: boolean;
  foulReason: string | null;
}

interface TurnRecord {
  playerId: string;
  shot: ShotRecord;
  result: "continue" | "switch" | "win" | "loss";
  nextPlayer: string | null;
}
```

### State Transitions

```
INITIAL → BREAK → PLAYING → GAME_END
           ↓         ↓
        (first shot) (normal turns)
```

---

## Physics Simulation

### 1. Physics Engine Requirements

**Library Options**:
- **Matter.js** (Recommended): 2D physics, lightweight, good performance
- **Cannon.js**: 3D physics (overkill for 2D pool)
- **Custom**: More control but more work

**Why Matter.js**:
- ✅ 2D physics perfect for top-down pool view
- ✅ Collision detection built-in
- ✅ Friction and restitution (bounce) support
- ✅ Good performance for 16 balls
- ✅ Easy to sync between client/server

### 2. Physics Parameters

**Ball Properties**:
```typescript
const BALL_RADIUS = 0.028;        // 28mm (standard pool ball)
const BALL_MASS = 0.17;            // 170g
const FRICTION = 0.015;            // Table friction
const RESTITUTION = 0.8;           // Ball-to-ball bounce
const CUSHION_RESTITUTION = 0.7;   // Ball-to-cushion bounce
```

**Table Dimensions** (Standard 8-foot table):
```typescript
const TABLE_WIDTH = 2.24;          // 2.24m (88 inches)
const TABLE_HEIGHT = 1.12;         // 1.12m (44 inches)
const POCKET_RADIUS = 0.11;        // 11cm pocket opening
```

**Shot Mechanics**:
```typescript
const MAX_POWER = 100;             // Maximum shot power
const MIN_POWER = 10;              // Minimum shot power
const POWER_TO_VELOCITY = 0.5;     // Conversion factor
```

### 3. Simulation Steps

**Per Frame (60 FPS)**:
1. Update ball positions based on velocity
2. Check ball-to-ball collisions
3. Check ball-to-cushion collisions
4. Check ball-to-pocket collisions
5. Apply friction (reduce velocity)
6. Check if all balls stopped (velocity < threshold)
7. If stopped, end simulation

**Collision Detection**:
- Circle-to-circle (ball-to-ball)
- Circle-to-line (ball-to-cushion)
- Circle-to-circle (ball-to-pocket)

**Collision Response**:
- Elastic collision for ball-to-ball
- Angle reflection for cushions
- Immediate pocketing if ball center enters pocket

### 4. Synchronization Strategy

**Authoritative Server**:
- Server runs physics simulation
- Client shows predicted/interpolated movement
- Server sends final positions after each shot
- Client corrects if prediction was wrong

**Why Server Authority**:
- Prevents cheating (client can't fake shots)
- Ensures consistent game state
- Handles network lag gracefully

---

## UI/UX Design

### 1. Visual Layout

**Top-Down View** (Primary):
```
┌─────────────────────────────────────┐
│  Player 1: Solids (7 remaining)    │
│  Turn: Player 1                     │
├─────────────────────────────────────┤
│                                     │
│    [Pool Table - Top View]         │
│    - 16 balls rendered              │
│    - Cue stick aiming interface     │
│    - Power meter                    │
│                                     │
├─────────────────────────────────────┤
│  Player 2: Stripes (7 remaining)   │
│  Power: [=====>    ] 65%           │
│  [Aim] [Adjust Power] [Take Shot]  │
└─────────────────────────────────────┘
```

**Components**:
- **Pool Table**: SVG or Canvas rendering
- **Balls**: Colored circles with numbers
- **Cue Stick**: Line showing aim direction
- **Power Meter**: Visual slider/bar
- **Pockets**: 6 corner/side pockets
- **UI Overlay**: Score, turn info, controls

### 2. Interaction Flow

**Aiming**:
1. Player clicks/drags to set aim direction
2. Cue stick rotates to show aim line
3. Line extends from cue ball showing trajectory preview
4. Power meter adjusts with mouse wheel or slider

**Shot Execution**:
1. Player clicks "Take Shot" or presses spacebar
2. Animation: Cue stick moves back, then forward
3. Cue ball receives velocity based on power/angle
4. Physics simulation runs (animated)
5. Balls move until all stop
6. Results displayed

**Turn Management**:
- Visual indicator for current player
- Disabled controls for non-active player
- Turn timer (optional: 30-60 seconds per shot)

### 3. Visual Feedback

**During Shot**:
- Ball trails (optional)
- Collision sparks (optional)
- Sound effects (ball hits, pocketing)
- Vibration (mobile)

**After Shot**:
- Highlight pocketed balls
- Show foul indicators
- Display turn result (continue/switch)
- Animation for ball-in-hand placement

---

## Integration Plan

### 1. Database Schema

**Add to Prisma Schema**:
```prisma
enum GameType {
  CHESS
  TRIVIA
  TICTACTOE
  TRUTHS_AND_LIE
  BILLIARDS  // Add this
}
```

### 2. Backend Integration

**Files to Create/Modify**:

1. **`api/src/modules/games/billiards/billiards.types.ts`**
   - Define all TypeScript interfaces
   - Ball types, state structure, shot records

2. **`api/src/modules/games/billiards/billiards.service.ts`**
   - Game state management
   - Turn logic
   - Win/loss detection
   - Foul validation

3. **`api/src/modules/games/billiards/billiards.physics.ts`**
   - Matter.js integration
   - Physics simulation
   - Collision handling
   - Ball movement calculation

4. **`api/src/modules/games/billiards/billiards.validation.ts`**
   - Shot legality checks
   - Foul detection
   - Turn continuation rules

5. **`api/src/modules/games/billiards/billiards.module.ts`**
   - NestJS module definition

6. **`api/src/modules/games/games.module.ts`**
   - Import BilliardsModule
   - Add BilliardsService to providers

7. **`api/src/modules/games/games.service.ts`**
   - Add BILLIARDS case to createGame()
   - Add BILLIARDS case to startGame()

8. **`api/src/modules/websocket/websocket.gateway.ts`**
   - Add `billiards.shot` handler
   - Add `billiards.aim` handler (optional, for real-time aim sync)
   - Add `billiards.placeCueBall` handler (for ball-in-hand)

### 3. Frontend Integration

**Files to Create/Modify**:

1. **`web/src/components/games/BilliardsGame.tsx`**
   - Main game component
   - State management
   - WebSocket event handlers
   - Turn management

2. **`web/src/components/games/billiards/PoolTable.tsx`**
   - Table rendering (SVG or Canvas)
   - Ball rendering
   - Pocket rendering
   - Cushion rendering

3. **`web/src/components/games/billiards/Ball.tsx`**
   - Individual ball component
   - Number/color rendering
   - Animation

4. **`web/src/components/games/billiards/CueStick.tsx`**
   - Aiming interface
   - Power adjustment
   - Shot preview

5. **`web/src/app/session/[id]/page.tsx`**
   - Add "Billiards" button
   - Add BILLIARDS case to game rendering
   - Import BilliardsGame component

### 4. Dependencies

**Backend**:
```json
{
  "matter-js": "^0.19.0"  // Physics engine
}
```

**Frontend**:
```json
{
  "matter-js": "^0.19.0",  // Physics engine (for client prediction)
  "@react-spring/web": "^9.7.0"  // Optional: smooth animations
}
```

---

## Implementation Steps

### Phase 1: Foundation (Backend)

**Step 1.1: Create Types**
- [ ] Create `billiards.types.ts` with all interfaces
- [ ] Define BallState, BilliardsState, ShotRecord, etc.

**Step 1.2: Create Service Structure**
- [ ] Create `billiards.service.ts` skeleton
- [ ] Implement `initializeState()` - set up initial ball positions
- [ ] Implement `getState()` / `setState()` methods
- [ ] Add to GamesModule

**Step 1.3: Basic Game Logic**
- [ ] Implement turn management
- [ ] Implement group assignment logic
- [ ] Implement win/loss detection
- [ ] Add to GamesService.createGame() and startGame()

### Phase 2: Physics Engine (Backend)

**Step 2.1: Matter.js Setup**
- [ ] Install matter-js
- [ ] Create `billiards.physics.ts`
- [ ] Set up Matter.js world with table boundaries
- [ ] Create ball bodies with correct properties

**Step 2.2: Ball Setup**
- [ ] Create 16 ball bodies (15 + cue)
- [ ] Set initial positions (triangle rack for 1-15, cue ball at break position)
- [ ] Configure collision properties

**Step 2.3: Simulation**
- [ ] Implement `simulateShot(power, angle)` function
- [ ] Apply force to cue ball
- [ ] Run simulation until all balls stop
- [ ] Return final ball positions

**Step 2.4: Collision Handling**
- [ ] Ball-to-ball collisions
- [ ] Ball-to-cushion collisions
- [ ] Ball-to-pocket detection

### Phase 3: Validation (Backend)

**Step 3.1: Shot Validation**
- [ ] Create `billiards.validation.ts`
- [ ] Check if first ball hit is legal
- [ ] Check if player's group ball was hit first
- [ ] Detect scratches (cue ball pocketed)

**Step 3.2: Foul Detection**
- [ ] Implement foul checking logic
- [ ] Determine foul type and penalty
- [ ] Handle ball-in-hand situations

**Step 3.3: Turn Logic**
- [ ] Determine if player continues turn
- [ ] Determine next player
- [ ] Handle game end conditions

### Phase 4: WebSocket Handlers (Backend)

**Step 4.1: Shot Handler**
- [ ] Create `billiards.shot` WebSocket handler
- [ ] Validate shot request
- [ ] Run physics simulation
- [ ] Validate results
- [ ] Update game state
- [ ] Emit results to both players

**Step 4.2: Aim Handler (Optional)**
- [ ] Create `billiards.aim` handler for real-time aim sync
- [ ] Broadcast aim direction to opponent (for spectator view)

**Step 4.3: Cue Ball Placement**
- [ ] Create `billiards.placeCueBall` handler
- [ ] Validate placement (within table, not on other balls)
- [ ] Update cue ball position

### Phase 5: Frontend - Core Component

**Step 5.1: Main Component**
- [ ] Create `BilliardsGame.tsx`
- [ ] Set up state management
- [ ] Add WebSocket event listeners
- [ ] Handle game phases (break, playing, gameEnd)

**Step 5.2: Table Rendering**
- [ ] Create `PoolTable.tsx`
- [ ] Render table background (green felt)
- [ ] Render 6 pockets
- [ ] Render cushions (rails)

**Step 5.3: Ball Rendering**
- [ ] Create `Ball.tsx` component
- [ ] Render ball with correct color/number
- [ ] Handle ball animations
- [ ] Show pocketed state

### Phase 6: Frontend - Interaction

**Step 6.1: Aiming Interface**
- [ ] Create `CueStick.tsx`
- [ ] Implement click/drag to aim
- [ ] Show aim line preview
- [ ] Rotate cue stick based on aim

**Step 6.2: Power Control**
- [ ] Create `PowerMeter.tsx`
- [ ] Implement power slider or mouse wheel
- [ ] Visual feedback (bar, percentage)
- [ ] Send power value with shot

**Step 6.3: Shot Execution**
- [ ] Implement "Take Shot" button
- [ ] Send shot data to backend
- [ ] Show loading/animation during simulation
- [ ] Display results

### Phase 7: Frontend - Physics (Client Prediction)

**Step 7.1: Client-Side Physics**
- [ ] Set up Matter.js on client
- [ ] Run prediction simulation
- [ ] Show smooth ball movement
- [ ] Correct when server sends final positions

**Step 7.2: Animation**
- [ ] Smooth ball movement
- [ ] Cue stick animation
- [ ] Pocketing animations
- [ ] Collision effects (optional)

### Phase 8: UI Polish

**Step 8.1: Game Info Display**
- [ ] Show current player
- [ ] Show player groups (solids/stripes)
- [ ] Show balls remaining
- [ ] Show turn timer (if implemented)

**Step 8.2: Result Display**
- [ ] Show shot results
- [ ] Highlight pocketed balls
- [ ] Show foul indicators
- [ ] Display win/loss screen

**Step 8.3: Controls**
- [ ] Exit game button
- [ ] Pause/resume (optional)
- [ ] Settings (power sensitivity, etc.)

### Phase 9: Integration & Testing

**Step 9.1: Session Page Integration**
- [ ] Add "Billiards" button to game selection
- [ ] Add BILLIARDS case to game rendering
- [ ] Test game start/end flow

**Step 9.2: Testing**
- [ ] Test break shot
- [ ] Test normal shots
- [ ] Test fouls
- [ ] Test win conditions
- [ ] Test ball-in-hand
- [ ] Test with network lag

**Step 9.3: Edge Cases**
- [ ] Handle disconnections
- [ ] Handle invalid shots
- [ ] Handle simultaneous actions
- [ ] Handle game state recovery

---

## Technical Considerations

### 1. Performance

**Optimizations**:
- Limit physics simulation to 60 FPS
- Stop simulation when all velocities < threshold
- Use object pooling for ball bodies (if recreating)
- Debounce aim updates (don't send every mouse move)

**Network**:
- Only send final positions, not every frame
- Compress state updates
- Use delta updates when possible

### 2. Accuracy

**Physics Precision**:
- Use fixed timestep for simulation
- Run simulation on server (authoritative)
- Client prediction for smoothness, server for truth

**Collision Detection**:
- Use Matter.js built-in collision (accurate)
- Handle edge cases (balls touching, simultaneous collisions)

### 3. Cheating Prevention

**Server Authority**:
- All physics runs on server
- Client only sends input (power, angle)
- Server validates and simulates
- Client can't fake results

**Validation**:
- Check shot legality on server
- Verify ball positions match physics
- Prevent impossible shots

### 4. Mobile Support

**Touch Controls**:
- Tap to aim
- Drag to adjust power
- Swipe for shot direction
- Larger touch targets

**Performance**:
- Reduce physics quality on mobile
- Lower frame rate if needed
- Optimize rendering

---

## Alternative: Simplified Version

If full physics is too complex, consider a **simplified version**:

### Simplified Mechanics:
- Pre-calculated shot trajectories
- Simplified collision (basic bounce angles)
- No complex physics simulation
- Faster to implement, less realistic

### Trade-offs:
- ✅ Faster development
- ✅ Lower server load
- ✅ Easier to debug
- ❌ Less realistic
- ❌ Less engaging

---

## Estimated Timeline

**Full Implementation**: 2-3 weeks
- Phase 1-2: 3-4 days (Backend foundation + physics)
- Phase 3-4: 2-3 days (Validation + WebSocket)
- Phase 5-6: 3-4 days (Frontend core + interaction)
- Phase 7: 2-3 days (Client physics + animation)
- Phase 8-9: 2-3 days (Polish + testing)

**Simplified Version**: 1 week
- Basic mechanics: 2-3 days
- Frontend: 2-3 days
- Testing: 1 day

---

## Next Steps

1. **Decide on approach**: Full physics vs. simplified
2. **Set up Matter.js**: Install and test basic physics
3. **Create types**: Define all interfaces
4. **Build prototype**: Simple table with 2-3 balls
5. **Iterate**: Add features incrementally

---

## Resources

- **Matter.js Docs**: https://brm.io/matter-js/docs/
- **Pool Rules**: https://www.bca-pool.com/general/rules/
- **Physics Tutorials**: Various Matter.js tutorials online

---

This plan provides a complete roadmap for implementing billiards. Start with Phase 1 and work through incrementally, testing at each step.







