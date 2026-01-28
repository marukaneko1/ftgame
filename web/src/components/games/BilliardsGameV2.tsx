"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Socket } from "socket.io-client";

interface BallData {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  pocketed: boolean;
}

interface GameState {
  balls: BallData[];
  currentPlayer: string;
  playerGroups: { [key: string]: 'solids' | 'stripes' | null };
  phase: 'break' | 'playing' | 'ballInHand' | 'gameOver';
  winnerId: string | null;
  foul: boolean;
  message: string;
}

interface BilliardsGameV2Props {
  gameId: string;
  socket: Socket;
  odUserId: string;
  initialState?: any;
  initialPlayers?: Array<{ odUserId: string; side: string; displayName: string }>;
  onGameEnd?: (result: any) => void;
}

// Constants
const TABLE_WIDTH = 2.24;
const TABLE_HEIGHT = 1.12;
const BALL_RADIUS = 0.028;
const POCKET_RADIUS = 0.055;
const FRICTION = 0.992;
const MIN_VELOCITY = 0.001;
const PHYSICS_STEP = 1 / 120;
const MAX_STEPS_PER_FRAME = 4;

// Ball colors for 8-ball
const BALL_COLORS: { [key: number]: number } = {
  0: 0xFFFFFF, 1: 0xFFD700, 2: 0x0000FF, 3: 0xFF0000, 4: 0x800080,
  5: 0xFF8C00, 6: 0x008000, 7: 0x8B4513, 8: 0x000000,
  9: 0xFFD700, 10: 0x0000FF, 11: 0xFF0000, 12: 0x800080,
  13: 0xFF8C00, 14: 0x008000, 15: 0x8B4513
};

const POCKETS = [
  { x: 0, y: 0 }, { x: TABLE_WIDTH / 2, y: 0 }, { x: TABLE_WIDTH, y: 0 },
  { x: 0, y: TABLE_HEIGHT }, { x: TABLE_WIDTH / 2, y: TABLE_HEIGHT }, { x: TABLE_WIDTH, y: TABLE_HEIGHT }
];

export default function BilliardsGameV2({
  gameId, socket, odUserId, initialState, initialPlayers, onGameEnd
}: BilliardsGameV2Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const threeRef = useRef<any>(null);
  const sceneRef = useRef<any>(null);
  const rendererRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const ballMeshesRef = useRef<Map<number, any>>(new Map());
  const cueLineRef = useRef<any>(null);
  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const accumulatorRef = useRef<number>(0);
  
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [aimAngle, setAimAngle] = useState(0);
  const [power, setPower] = useState(50);
  const [placingBall, setPlacingBall] = useState(false);
  const [shooting, setShooting] = useState(false);
  const [message, setMessage] = useState("Loading game...");
  const [initialized, setInitialized] = useState(false);
  const [threeLoaded, setThreeLoaded] = useState(false);
  const [renderError, setRenderError] = useState<string | null>(null);

  const ballsRef = useRef<BallData[]>([]);
  const simulatingRef = useRef(false);
  const gameStateRef = useRef<GameState | null>(null);

  useEffect(() => { gameStateRef.current = gameState; }, [gameState]);

  const myName = initialPlayers?.find(p => p.odUserId === odUserId)?.displayName || "You";
  const opponentName = initialPlayers?.find(p => p.odUserId !== odUserId)?.displayName || "Opponent";
  const opponentId = initialPlayers?.find(p => p.odUserId !== odUserId)?.odUserId || "";

  // Create initial balls
  const createInitialBalls = useCallback((): BallData[] => {
    const balls: BallData[] = [];
    balls.push({ id: 0, x: TABLE_WIDTH * 0.75, y: TABLE_HEIGHT / 2, vx: 0, vy: 0, pocketed: false });
    
    const rackX = TABLE_WIDTH * 0.25;
    const rackY = TABLE_HEIGHT / 2;
    const spacing = BALL_RADIUS * 2.1;
    const rackOrder = [1, 9, 2, 10, 8, 11, 3, 12, 4, 13, 5, 14, 6, 15, 7];
    let idx = 0;
    
    for (let row = 0; row < 5; row++) {
      const ballsInRow = row + 1;
      const rowX = rackX - row * spacing * Math.cos(Math.PI / 6);
      const startY = rackY - (ballsInRow - 1) * spacing / 2;
      for (let col = 0; col < ballsInRow; col++) {
        balls.push({ id: rackOrder[idx++], x: rowX, y: startY + col * spacing, vx: 0, vy: 0, pocketed: false });
      }
    }
    return balls;
  }, []);

  // Initialize Three.js scene
  useEffect(() => {
    if (!containerRef.current || sceneRef.current) return;
    
    let cleanup: (() => void) | null = null;
    
    const initScene = async () => {
      try {
        console.log("[Billiards] Loading Three.js...");
        const THREE = await import('three');
        threeRef.current = THREE;
        setThreeLoaded(true);
        
        const container = containerRef.current;
        if (!container) return;
        
        const width = container.clientWidth || 800;
        const height = container.clientHeight || 400;
        console.log("[Billiards] Container size:", width, "x", height);

        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x1a1a2e);
        sceneRef.current = scene;

        const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
        camera.position.set(TABLE_WIDTH / 2, TABLE_HEIGHT / 2, 2.5);
        camera.lookAt(TABLE_WIDTH / 2, TABLE_HEIGHT / 2, 0);
        cameraRef.current = camera;

        const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        container.appendChild(renderer.domElement);
        rendererRef.current = renderer;

        scene.add(new THREE.AmbientLight(0xffffff, 0.7));
        const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
        dirLight.position.set(TABLE_WIDTH / 2, TABLE_HEIGHT / 2, 5);
        scene.add(dirLight);

        // Table
        const tableGeometry = new THREE.PlaneGeometry(TABLE_WIDTH, TABLE_HEIGHT);
        const tableMaterial = new THREE.MeshStandardMaterial({ color: 0x0d6b32, roughness: 0.8 });
        const tableMesh = new THREE.Mesh(tableGeometry, tableMaterial);
        tableMesh.position.set(TABLE_WIDTH / 2, TABLE_HEIGHT / 2, -0.01);
        scene.add(tableMesh);

        // Rails
        const railMaterial = new THREE.MeshStandardMaterial({ color: 0x4a2c00 });
        const railHeight = 0.05, railWidth = 0.04;
        
        const topRail = new THREE.Mesh(new THREE.BoxGeometry(TABLE_WIDTH + railWidth * 2, railWidth, railHeight), railMaterial);
        topRail.position.set(TABLE_WIDTH / 2, -railWidth / 2, railHeight / 2);
        scene.add(topRail);
        
        const bottomRail = new THREE.Mesh(new THREE.BoxGeometry(TABLE_WIDTH + railWidth * 2, railWidth, railHeight), railMaterial);
        bottomRail.position.set(TABLE_WIDTH / 2, TABLE_HEIGHT + railWidth / 2, railHeight / 2);
        scene.add(bottomRail);
        
        const leftRail = new THREE.Mesh(new THREE.BoxGeometry(railWidth, TABLE_HEIGHT, railHeight), railMaterial);
        leftRail.position.set(-railWidth / 2, TABLE_HEIGHT / 2, railHeight / 2);
        scene.add(leftRail);
        
        const rightRail = new THREE.Mesh(new THREE.BoxGeometry(railWidth, TABLE_HEIGHT, railHeight), railMaterial);
        rightRail.position.set(TABLE_WIDTH + railWidth / 2, TABLE_HEIGHT / 2, railHeight / 2);
        scene.add(rightRail);

        // Pockets
        const pocketGeometry = new THREE.CircleGeometry(POCKET_RADIUS, 32);
        const pocketMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
        POCKETS.forEach(p => {
          const pocket = new THREE.Mesh(pocketGeometry, pocketMaterial);
          pocket.position.set(p.x, p.y, 0);
          scene.add(pocket);
        });

        // Aim line
        const lineGeometry = new THREE.BufferGeometry();
        const lineMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6 });
        const line = new THREE.Line(lineGeometry, lineMaterial);
        line.visible = false;
        scene.add(line);
        cueLineRef.current = line;

        const handleResize = () => {
          const w = container.clientWidth;
          const h = container.clientHeight;
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
          renderer.setSize(w, h);
        };
        window.addEventListener('resize', handleResize);

        console.log("[Billiards] 3D scene initialized successfully");

        cleanup = () => {
          window.removeEventListener('resize', handleResize);
          if (animationRef.current) cancelAnimationFrame(animationRef.current);
          renderer.dispose();
          if (container.contains(renderer.domElement)) {
            container.removeChild(renderer.domElement);
          }
        };
      } catch (err) {
        console.error("[Billiards] Error:", err);
        setRenderError("Failed to load 3D graphics: " + (err as Error).message);
      }
    };
    
    initScene();
    
    return () => { cleanup?.(); };
  }, []);

  // Update ball meshes
  const updateBallMeshes = useCallback((balls: BallData[]) => {
    const THREE = threeRef.current;
    if (!sceneRef.current || !THREE) return;
    
    balls.forEach(ball => {
      let mesh = ballMeshesRef.current.get(ball.id);
      
      if (ball.pocketed) {
        if (mesh) mesh.visible = false;
        return;
      }

      if (!mesh) {
        const geometry = new THREE.SphereGeometry(BALL_RADIUS, 24, 24);
        const color = BALL_COLORS[ball.id] || 0xFFFFFF;
        const material = new THREE.MeshStandardMaterial({ color, roughness: 0.3, metalness: 0.1 });
        mesh = new THREE.Mesh(geometry, material);
        
        if (ball.id >= 9 && ball.id <= 15) {
          const stripeGeometry = new THREE.TorusGeometry(BALL_RADIUS * 0.7, BALL_RADIUS * 0.15, 8, 24);
          const stripeMaterial = new THREE.MeshStandardMaterial({ color: 0xFFFFFF });
          const stripe = new THREE.Mesh(stripeGeometry, stripeMaterial);
          stripe.rotation.x = Math.PI / 2;
          mesh.add(stripe);
        }
        
        sceneRef.current.add(mesh);
        ballMeshesRef.current.set(ball.id, mesh);
      }

      mesh.visible = true;
      mesh.position.set(ball.x, ball.y, BALL_RADIUS);
    });
  }, []);

  // Physics step
  const simulatePhysicsStep = useCallback(() => {
    const balls = ballsRef.current;
    
    for (const ball of balls) {
      if (ball.pocketed) continue;
      const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
      if (speed < MIN_VELOCITY) { ball.vx = 0; ball.vy = 0; continue; }
      ball.vx *= FRICTION;
      ball.vy *= FRICTION;
      ball.x += ball.vx * PHYSICS_STEP;
      ball.y += ball.vy * PHYSICS_STEP;
    }
    
    // Wall collisions
    for (const ball of balls) {
      if (ball.pocketed) continue;
      if (ball.x < BALL_RADIUS) { ball.x = BALL_RADIUS; ball.vx = -ball.vx * 0.85; }
      if (ball.x > TABLE_WIDTH - BALL_RADIUS) { ball.x = TABLE_WIDTH - BALL_RADIUS; ball.vx = -ball.vx * 0.85; }
      if (ball.y < BALL_RADIUS) { ball.y = BALL_RADIUS; ball.vy = -ball.vy * 0.85; }
      if (ball.y > TABLE_HEIGHT - BALL_RADIUS) { ball.y = TABLE_HEIGHT - BALL_RADIUS; ball.vy = -ball.vy * 0.85; }
    }
    
    // Ball-ball collisions
    for (let i = 0; i < balls.length; i++) {
      for (let j = i + 1; j < balls.length; j++) {
        const a = balls[i], b = balls[j];
        if (a.pocketed || b.pocketed) continue;
        const dx = b.x - a.x, dy = b.y - a.y;
        const distSq = dx * dx + dy * dy;
        const minDist = BALL_RADIUS * 2;
        if (distSq < minDist * minDist && distSq > 0) {
          const dist = Math.sqrt(distSq);
          const nx = dx / dist, ny = dy / dist;
          const overlap = minDist - dist;
          a.x -= nx * overlap / 2; a.y -= ny * overlap / 2;
          b.x += nx * overlap / 2; b.y += ny * overlap / 2;
          const dvx = a.vx - b.vx, dvy = a.vy - b.vy;
          const dvDotN = dvx * nx + dvy * ny;
          if (dvDotN > 0) {
            a.vx -= dvDotN * nx * 0.95; a.vy -= dvDotN * ny * 0.95;
            b.vx += dvDotN * nx * 0.95; b.vy += dvDotN * ny * 0.95;
          }
        }
      }
    }
    
    // Pocket check
    for (const ball of balls) {
      if (ball.pocketed) continue;
      for (const pocket of POCKETS) {
        const dx = ball.x - pocket.x, dy = ball.y - pocket.y;
        if (Math.sqrt(dx * dx + dy * dy) < POCKET_RADIUS - BALL_RADIUS * 0.3) {
          ball.pocketed = true;
          ball.vx = 0; ball.vy = 0;
          break;
        }
      }
    }
  }, []);

  const checkAllStopped = useCallback((): boolean => {
    return ballsRef.current.every(ball => ball.pocketed || (Math.abs(ball.vx) < MIN_VELOCITY && Math.abs(ball.vy) < MIN_VELOCITY));
  }, []);

  // Handle shot completion
  const handleShotComplete = useCallback(() => {
    const balls = [...ballsRef.current];
    const state = gameStateRef.current;
    if (!state) return;

    const cueBall = balls.find(b => b.id === 0);
    let newState: GameState = { ...state };
    let switchTurn = true;
    let foul = false;
    let gameOver = false;

    // Scratch check
    if (cueBall?.pocketed) {
      foul = true;
      cueBall.pocketed = false;
      cueBall.x = TABLE_WIDTH * 0.75;
      cueBall.y = TABLE_HEIGHT / 2;
      cueBall.vx = 0; cueBall.vy = 0;
      newState.phase = 'ballInHand';
      newState.message = "Scratch! Opponent places cue ball.";
    }

    // 8-ball check
    const eightBall = balls.find(b => b.id === 8);
    if (eightBall?.pocketed && !gameOver) {
      const myGroup = state.playerGroups[state.currentPlayer];
      const myBallsLeft = balls.filter(b => {
        if (b.pocketed || b.id === 0 || b.id === 8) return false;
        if (myGroup === 'solids') return b.id >= 1 && b.id <= 7;
        if (myGroup === 'stripes') return b.id >= 9 && b.id <= 15;
        return false;
      });
      
      gameOver = true;
      newState.phase = 'gameOver';
      if (myBallsLeft.length > 0 || foul) {
        newState.winnerId = state.currentPlayer === odUserId ? opponentId : odUserId;
        newState.message = state.currentPlayer === odUserId ? "You lose! 8-ball too early." : "You win!";
      } else {
        newState.winnerId = state.currentPlayer;
        newState.message = state.currentPlayer === odUserId ? "🎉 You win!" : "Opponent wins!";
      }
    }

    // Determine groups
    if (!state.playerGroups[state.currentPlayer] && !gameOver && !foul) {
      const pocketedBalls = balls.filter(b => b.pocketed && b.id !== 0 && b.id !== 8);
      if (pocketedBalls.length > 0) {
        const firstPocketed = pocketedBalls[0];
        const group = firstPocketed.id <= 7 ? 'solids' : 'stripes';
        newState.playerGroups = {
          [state.currentPlayer]: group,
          [state.currentPlayer === odUserId ? opponentId : odUserId]: group === 'solids' ? 'stripes' : 'solids'
        };
        newState.message = `Groups set! You: ${newState.playerGroups[odUserId] === 'solids' ? 'Solids (1-7)' : 'Stripes (9-15)'}`;
        switchTurn = false;
      }
    }

    // Continue turn if pocketed own ball
    if (!foul && !gameOver && state.playerGroups[state.currentPlayer]) {
      const myGroup = state.playerGroups[state.currentPlayer];
      const prevPocketed = state.balls.filter(b => b.pocketed).map(b => b.id);
      const newlyPocketed = balls.filter(b => {
        if (!b.pocketed || b.id === 0 || b.id === 8 || prevPocketed.includes(b.id)) return false;
        if (myGroup === 'solids') return b.id >= 1 && b.id <= 7;
        return b.id >= 9 && b.id <= 15;
      });
      if (newlyPocketed.length > 0) {
        switchTurn = false;
        newState.message = "Nice shot! Your turn continues.";
      }
    }

    // Switch turn
    if (switchTurn && !gameOver && newState.phase !== 'ballInHand') {
      newState.currentPlayer = state.currentPlayer === odUserId ? opponentId : odUserId;
      newState.phase = 'playing';
      newState.message = newState.currentPlayer === odUserId ? "Your turn!" : `${opponentName}'s turn`;
    }

    newState.balls = balls;
    newState.foul = foul;
    
    ballsRef.current = balls;
    setGameState(newState);
    gameStateRef.current = newState;
    setShooting(false);
    setIsMyTurn(newState.currentPlayer === odUserId && newState.phase !== 'gameOver');
    setMessage(newState.message);
    setPlacingBall(newState.phase === 'ballInHand' && newState.currentPlayer === odUserId);

    socket.emit("billiards.event", { gameId, event: { type: 'STATE_UPDATE', state: newState } });

    if (gameOver && onGameEnd) {
      setTimeout(() => onGameEnd({ winnerId: newState.winnerId }), 2000);
    }
  }, [odUserId, opponentId, opponentName, socket, gameId, onGameEnd]);

  // Animation loop
  useEffect(() => {
    if (!rendererRef.current || !sceneRef.current || !cameraRef.current) return;

    const animate = (timestamp: number) => {
      animationRef.current = requestAnimationFrame(animate);
      
      if (lastTimeRef.current === 0) { lastTimeRef.current = timestamp; return; }
      
      const deltaTime = Math.min((timestamp - lastTimeRef.current) / 1000, 0.1);
      lastTimeRef.current = timestamp;
      
      if (simulatingRef.current) {
        accumulatorRef.current += deltaTime;
        let steps = 0;
        while (accumulatorRef.current >= PHYSICS_STEP && steps < MAX_STEPS_PER_FRAME) {
          simulatePhysicsStep();
          accumulatorRef.current -= PHYSICS_STEP;
          steps++;
        }
        updateBallMeshes(ballsRef.current);
        if (checkAllStopped()) {
          simulatingRef.current = false;
          accumulatorRef.current = 0;
          handleShotComplete();
        }
      }
      
      rendererRef.current.render(sceneRef.current, cameraRef.current);
    };
    
    animationRef.current = requestAnimationFrame(animate);
    return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); };
  }, [simulatePhysicsStep, updateBallMeshes, checkAllStopped, handleShotComplete]);

  // Update aim line
  useEffect(() => {
    const THREE = threeRef.current;
    if (!cueLineRef.current || !gameState || !THREE) return;
    
    const cueBall = ballsRef.current.find(b => b.id === 0);
    if (!cueBall || !isMyTurn || shooting || placingBall) {
      cueLineRef.current.visible = false;
      return;
    }

    const angleRad = (aimAngle * Math.PI) / 180;
    const length = 0.3 + (power / 100) * 0.4;
    
    const points = [
      new THREE.Vector3(cueBall.x, cueBall.y, BALL_RADIUS),
      new THREE.Vector3(cueBall.x + Math.cos(angleRad) * length, cueBall.y + Math.sin(angleRad) * length, BALL_RADIUS)
    ];
    
    cueLineRef.current.geometry.dispose();
    cueLineRef.current.geometry = new THREE.BufferGeometry().setFromPoints(points);
    cueLineRef.current.visible = true;
  }, [aimAngle, power, gameState, isMyTurn, shooting, placingBall]);

  // Mouse handlers
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!containerRef.current || shooting) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = 1 - (e.clientY - rect.top) / rect.height;
    
    const cueBall = ballsRef.current.find(b => b.id === 0);
    if (!cueBall) return;

    if (placingBall && isMyTurn) {
      const newX = Math.max(BALL_RADIUS, Math.min(TABLE_WIDTH - BALL_RADIUS, x * TABLE_WIDTH));
      const newY = Math.max(BALL_RADIUS, Math.min(TABLE_HEIGHT - BALL_RADIUS, y * TABLE_HEIGHT));
      const canPlace = ballsRef.current.every(b => {
        if (b.id === 0 || b.pocketed) return true;
        const dx = newX - b.x, dy = newY - b.y;
        return Math.sqrt(dx * dx + dy * dy) >= BALL_RADIUS * 2.5;
      });
      if (canPlace) {
        cueBall.x = newX;
        cueBall.y = newY;
        updateBallMeshes(ballsRef.current);
      }
    } else if (isMyTurn && !shooting) {
      const targetX = x * TABLE_WIDTH, targetY = y * TABLE_HEIGHT;
      setAimAngle(Math.atan2(targetY - cueBall.y, targetX - cueBall.x) * 180 / Math.PI);
    }
  }, [isMyTurn, shooting, placingBall, updateBallMeshes]);

  const handleClick = useCallback(() => {
    if (!isMyTurn || !placingBall) return;
    setPlacingBall(false);
    setMessage("Your turn - aim and shoot!");
    if (gameState) {
      const newState: GameState = { ...gameState, phase: 'playing', balls: [...ballsRef.current] };
      setGameState(newState);
      gameStateRef.current = newState;
      socket.emit("billiards.event", { gameId, event: { type: 'STATE_UPDATE', state: newState } });
    }
  }, [isMyTurn, placingBall, gameState, socket, gameId]);

  const handleShoot = useCallback(() => {
    if (!isMyTurn || shooting || placingBall) return;
    const cueBall = ballsRef.current.find(b => b.id === 0);
    if (!cueBall || cueBall.pocketed) return;

    setShooting(true);
    setMessage("Shooting...");

    const angleRad = (aimAngle * Math.PI) / 180;
    const velocity = (power / 100) * 4;
    cueBall.vx = Math.cos(angleRad) * velocity;
    cueBall.vy = Math.sin(angleRad) * velocity;
    
    simulatingRef.current = true;
    accumulatorRef.current = 0;

    socket.emit("billiards.event", {
      gameId,
      event: { type: 'SHOT', angle: aimAngle, power, cueBallPos: { x: cueBall.x, y: cueBall.y } }
    });
  }, [isMyTurn, shooting, placingBall, aimAngle, power, socket, gameId]);

  // Initialize game
  useEffect(() => {
    if (!socket || initialized) return;
    
    console.log("[Billiards] Initializing game...");
    
    const player1 = initialPlayers?.find(p => p.side === "player1");
    const isFirst = player1?.odUserId === odUserId;
    const balls = createInitialBalls();
    ballsRef.current = balls;
    
    const firstPlayerId = player1?.odUserId || odUserId;
    const secondPlayerId = firstPlayerId === odUserId ? opponentId : odUserId;
    
    const newState: GameState = {
      balls,
      currentPlayer: firstPlayerId,
      playerGroups: { [firstPlayerId]: null, [secondPlayerId]: null },
      phase: 'break',
      winnerId: null,
      foul: false,
      message: isFirst ? "Your break! Aim and SHOOT." : `${opponentName}'s break. Please wait.`
    };
    
    setGameState(newState);
    gameStateRef.current = newState;
    setIsMyTurn(isFirst);
    setMessage(newState.message);
    updateBallMeshes(balls);
    setInitialized(true);

    const handleEvent = (data: { gameId: string; event: any }) => {
      if (data.gameId !== gameId) return;
      const { event } = data;
      
      if (event.type === 'STATE_UPDATE') {
        ballsRef.current = event.state.balls.map((b: BallData) => ({ ...b }));
        setGameState(event.state);
        gameStateRef.current = event.state;
        setIsMyTurn(event.state.currentPlayer === odUserId && event.state.phase !== 'gameOver');
        setMessage(event.state.message || (event.state.currentPlayer === odUserId ? "Your turn!" : "Opponent's turn"));
        setPlacingBall(event.state.phase === 'ballInHand' && event.state.currentPlayer === odUserId);
        updateBallMeshes(event.state.balls);
        setShooting(false);
      }
      
      if (event.type === 'SHOT') {
        const cueBall = ballsRef.current.find(b => b.id === 0);
        if (cueBall) {
          if (event.cueBallPos) { cueBall.x = event.cueBallPos.x; cueBall.y = event.cueBallPos.y; }
          const angleRad = (event.angle * Math.PI) / 180;
          const velocity = (event.power / 100) * 4;
          cueBall.vx = Math.cos(angleRad) * velocity;
          cueBall.vy = Math.sin(angleRad) * velocity;
        }
        simulatingRef.current = true;
        accumulatorRef.current = 0;
        setMessage(`${opponentName} is shooting...`);
      }
    };

    socket.on("billiards.event", handleEvent);
    return () => { socket.off("billiards.event", handleEvent); };
  }, [socket, gameId, odUserId, opponentId, opponentName, initialPlayers, createInitialBalls, updateBallMeshes, initialized]);

  if (renderError) {
    return (
      <div className="bg-gray-900 rounded-lg border border-red-500/50 p-6">
        <h2 className="text-xl font-bold text-white mb-4">8-Ball Pool</h2>
        <div className="bg-red-900/30 border border-red-500/50 rounded p-4 text-center">
          <p className="text-red-400 mb-2">⚠️ {renderError}</p>
          <button onClick={() => window.location.reload()} className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded">Reload</button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-lg border border-white/20 p-4">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-xl font-bold text-white">8-Ball Pool</h2>
        <span className={`px-3 py-1 rounded text-sm font-medium ${
          gameState?.phase === 'gameOver' ? 'bg-purple-600 text-white' : isMyTurn ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-300'
        }`}>
          {gameState?.phase === 'gameOver' ? 'Game Over' : isMyTurn ? "Your Turn" : `${opponentName}'s Turn`}
        </span>
      </div>

      {gameState && (gameState.playerGroups[odUserId] || gameState.playerGroups[opponentId]) && (
        <div className="flex justify-between text-xs mb-2 bg-gray-800/50 p-2 rounded">
          <span className="text-gray-300"><span className="font-medium text-white">{myName}:</span> {gameState.playerGroups[odUserId] === 'solids' ? '🔴 Solids (1-7)' : gameState.playerGroups[odUserId] === 'stripes' ? '🟡 Stripes (9-15)' : 'Not assigned'}</span>
          <span className="text-gray-300"><span className="font-medium text-white">{opponentName}:</span> {gameState.playerGroups[opponentId] === 'solids' ? '🔴 Solids (1-7)' : gameState.playerGroups[opponentId] === 'stripes' ? '🟡 Stripes (9-15)' : 'Not assigned'}</span>
        </div>
      )}

      <div className={`text-center mb-3 py-2 rounded ${gameState?.foul ? 'bg-red-900/50' : 'bg-gray-800/70'}`}>
        <p className="text-white text-sm">{message}</p>
      </div>

      <div ref={containerRef} className="w-full rounded-lg overflow-hidden border border-gray-700 cursor-crosshair relative bg-gray-800" style={{ height: '400px', minHeight: '400px' }} onMouseMove={handleMouseMove} onClick={handleClick}>
        {!threeLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500 mx-auto mb-4"></div>
              <p className="text-gray-400">Loading 3D graphics...</p>
            </div>
          </div>
        )}
      </div>

      {isMyTurn && !shooting && gameState?.phase !== 'gameOver' && !placingBall && (
        <div className="flex gap-4 items-center mt-4">
          <div className="flex-1">
            <label className="text-xs text-gray-400 mb-1 block">Power: {power}%</label>
            <input type="range" min="10" max="100" value={power} onChange={(e) => setPower(parseInt(e.target.value))} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-green-500" />
          </div>
          <button onClick={handleShoot} className="px-6 py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg transition-colors shadow-lg">🎱 SHOOT</button>
        </div>
      )}

      {placingBall && isMyTurn && (
        <div className="mt-4 text-center py-3 bg-yellow-900/50 rounded border border-yellow-600/30">
          <p className="text-yellow-200 text-sm">🎯 Click on the table to place the cue ball</p>
        </div>
      )}

      {gameState?.phase === 'gameOver' && (
        <div className="mt-4 text-center py-4 bg-gradient-to-r from-purple-900/50 to-blue-900/50 rounded border border-purple-500/30">
          <p className="text-2xl font-bold text-white">{gameState.winnerId === odUserId ? '🎉 You Win!' : '😢 You Lose'}</p>
        </div>
      )}

      <div className="mt-3 text-xs text-gray-500 bg-gray-800/30 p-2 rounded">
        <p><strong>🎱 Rules:</strong> Pocket your balls (solids 1-7 or stripes 9-15), then sink the 8-ball to win!</p>
        <p className="mt-1"><strong>Controls:</strong> Move mouse to aim → Adjust power → Click SHOOT</p>
      </div>
    </div>
  );
}
