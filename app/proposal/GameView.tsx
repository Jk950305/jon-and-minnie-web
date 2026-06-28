'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Matter from 'matter-js';
import { Heart } from 'lucide-react';
import { supabase } from '@/lib/supabase';

/**
 * FIXED PHYSICS DIMENSIONS
 * The physics engine will always treat the world as 380x600.
 * CSS will scale this up or down to fit the screen while keeping the aspect ratio.
 */
const GAME_WIDTH = 380;
const GAME_HEIGHT = 600;
const WALL_THICKNESS = 60;
const DROP_Y = 40;
const BORDER_WIDTH = 10;

// Definition of fruit levels, radii, colors, and identifiers.
const FRUITS = [
  { level: 0, radius: 12, color: '#ff1a1a', name: 'Level 1' },
  { level: 1, radius: 18, color: '#ff9933', name: 'Level 2' },
  { level: 2, radius: 25, color: '#ffff33', name: 'Level 3' },
  { level: 3, radius: 32, color: '#66ff33', name: 'Level 4' },
  { level: 4, radius: 39, color: '#ff8c00', name: 'Level 5' },
  { level: 5, radius: 46, color: '#ffa500', name: 'Level 6' },
  { level: 6, radius: 54, color: '#ffd700', name: 'Level 7' },
  { level: 7, radius: 62, color: '#dda0dd', name: 'Level 8' },
  { level: 8, radius: 70, color: '#ba55d3', name: 'Level 9' },
  { level: 9, radius: 80, color: '#32cd32', name: 'Level 10' },
];

const ALLOWED_NEXT_LEVELS = [0, 1, 2];

/**
 * Returns a random fruit level for the next item to drop.
 */
const getRandomNextLevel = () =>
  ALLOWED_NEXT_LEVELS[Math.floor(Math.random() * ALLOWED_NEXT_LEVELS.length)];

export default function GameView() {
  // DOM and Engine Refs
  const sceneRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<Matter.Engine | null>(null);
  const imageCacheRef = useRef<Record<number, HTMLImageElement>>({});

  // Game state
  const isGameOverRef = useRef(false);
  const [score, setScore] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [proposeSuccess, setProposeSuccess] = useState(false);
  const [currentFruitLevel, setCurrentFruitLevel] = useState(getRandomNextLevel());
  const [nextFruitLevel, setNextFruitLevel] = useState(getRandomNextLevel());
  const [mouseX, setMouseX] = useState(GAME_WIDTH / 2);
  const [isDropping, setIsDropping] = useState(false);
  const [imagesLoaded, setImagesLoaded] = useState(false);

  // Sync isGameOver state with the ref for event listeners
  useEffect(() => {
    isGameOverRef.current = isGameOver;
  }, [isGameOver]);

  /**
   * Helper to safely extract clientX from Mouse or Touch events
   */
  const getClientX = (e: React.MouseEvent | React.TouchEvent): number => {
    if ('touches' in e) {
      // If it's a touch event, prioritize active touches; fallback to changedTouches for 'touchend'
      if (e.touches.length > 0) return e.touches[0].clientX;
      if (e.changedTouches.length > 0) return e.changedTouches[0].clientX;
    }
    // Otherwise assume MouseEvent
    return (e as React.MouseEvent).clientX;
  };

  /**
   * Initializes the physical boundaries (walls and ground) of the game world.
   */
  const initWorld = useCallback((engine: Matter.Engine) => {
    const { Bodies, Composite } = Matter;
    const wallOptions = { isStatic: true, render: { visible: false } };

    const ground = Bodies.rectangle(
      GAME_WIDTH / 2,
      GAME_HEIGHT + WALL_THICKNESS / 2 - 10,
      GAME_WIDTH,
      WALL_THICKNESS,
      wallOptions
    );
    const wallLeft = Bodies.rectangle(
      0 - WALL_THICKNESS / 2,
      GAME_HEIGHT / 2,
      WALL_THICKNESS,
      GAME_HEIGHT,
      wallOptions
    );
    const wallRight = Bodies.rectangle(
      GAME_WIDTH + WALL_THICKNESS / 2,
      GAME_HEIGHT / 2,
      WALL_THICKNESS,
      GAME_HEIGHT,
      wallOptions
    );
    const deadLine = Bodies.rectangle(GAME_WIDTH / 2, 80, GAME_WIDTH, 2, {
      isStatic: true,
      isSensor: true,
      label: 'deadline',
      render: { fillStyle: '#ff9999', opacity: 0.3 },
    });

    Composite.add(engine.world, [ground, wallLeft, wallRight, deadLine]);
  }, []);

  /**
   * Preloads images from Supabase.
   */
  const preloadImages = async () => {
    const { data } = await supabase.from('watermelon_images').select('level, image_url');
    if (!data) {
      setImagesLoaded(true);
      return;
    }

    const promises = data.map((item) => {
      return new Promise<void>((resolve) => {
        const img = new Image();
        img.src = item.image_url;
        img.onload = () => {
          imageCacheRef.current[item.level] = img;
          resolve();
        };
        img.onerror = () => resolve();
      });
    });
    await Promise.all(promises);
    setImagesLoaded(true);
  };

  useEffect(() => {
    preloadImages();
  }, []);

  // Main Matter.js initialization
  useEffect(() => {
    if (!sceneRef.current || !imagesLoaded) return;

    // Clear previous scene if it exists
    if (sceneRef.current.childNodes.length > 0) sceneRef.current.innerHTML = '';

    const { Engine, Render, Runner, Composite, Events } = Matter;
    const engine = Engine.create();
    engineRef.current = engine;
    engine.timing.timeScale = 1;

    const render = Render.create({
      element: sceneRef.current,
      engine: engine,
      options: {
        width: GAME_WIDTH,
        height: GAME_HEIGHT,
        wireframes: false,
        background: '#fffbf9',
      },
    });

    initWorld(engine);

    // Custom rendering loop to draw fruit images
    Events.on(render, 'afterRender', () => {
      const context = render.context;
      const bodies = Composite.allBodies(engine.world);

      bodies.forEach((body) => {
        if (body.label === 'wall' || body.label === 'deadline' || !body.label || isNaN(parseInt(body.label))) return;

        const level = parseInt(body.label);
        const img = imageCacheRef.current[level];
        const radius = body.circleRadius!;

        context.save();
        context.translate(body.position.x, body.position.y);
        context.rotate(body.angle);

        context.beginPath();
        context.arc(0, 0, radius, 0, 2 * Math.PI);
        context.clip();

        if (img) {
          context.drawImage(img, -radius, -radius, radius * 2, radius * 2);
        } else {
          context.fillStyle = FRUITS[level]?.color ?? '#cccccc';
          context.fill();
        }

        context.restore();
      });
    });

    // Handle collision logic for merging
    Events.on(engine, 'collisionStart', (event) => {
      if (isGameOverRef.current) return;

      event.pairs.forEach((pair) => {
        const { bodyA, bodyB } = pair;
        if (bodyA.label === bodyB.label && bodyA.label !== 'wall' && bodyA.label !== 'deadline') {
          const level = parseInt(bodyA.label);
          if ((bodyA as any).isMerging || (bodyB as any).isMerging) return;
          (bodyA as any).isMerging = true;
          (bodyB as any).isMerging = true;
          Composite.remove(engine.world, [bodyA, bodyB]);

          if (level < FRUITS.length - 1) {
            const nextLevel = level + 1;
            setScore((prev) => prev + (nextLevel * 10));
            const newFruit = Matter.Bodies.circle(
              (bodyA.position.x + bodyB.position.x) / 2,
              (bodyA.position.y + bodyB.position.y) / 2,
              FRUITS[nextLevel].radius,
              {
                restitution: 0.2,
                label: nextLevel.toString(),
                render: { visible: false },
                plugin: { createdAt: Date.now() },
              }
            );
            Composite.add(engine.world, newFruit);
          } else if (level === FRUITS.length - 1) {
            setProposeSuccess(true);
          }
        }
      });
    });

    // Check for game over condition
    Events.on(engine, 'afterUpdate', () => {
      if (isGameOverRef.current) return;

      const bodies = Composite.allBodies(engine.world);
      const now = Date.now();

      const isOver = bodies.some((body) => {
        if (body.label === 'wall' || body.label === 'deadline') return false;
        const createdAt = (body.plugin as any)?.createdAt || 0;
        // Check if fruit has crossed the deadline
        if (now - createdAt < 1000) return false;
        return body.position.y < 80 && body.velocity.y < 0.5 && body.velocity.x < 0.5;
      });

      if (isOver && !proposeSuccess) {
        setIsGameOver(true);
        engine.timing.timeScale = 0;
        Composite.allBodies(engine.world).forEach((body) => {
          body.isStatic = true;
          Matter.Body.setVelocity(body, { x: 0, y: 0 });
          Matter.Body.setAngularVelocity(body, 0);
        });
      }
    });

    Render.run(render);
    const runner = Runner.create();
    Runner.run(runner, engine);

    return () => {
      Render.stop(render);
      Runner.stop(runner);
      Engine.clear(engine);
    };
  }, [initWorld, proposeSuccess, imagesLoaded]); // Removed gameConfig dependency

  /**
 * Helper to map touch/mouse input to physics-space with strict clamping.
 * This ensures coordinates are always within 0 and GAME_WIDTH.
 */
    const getPhysicsX = useCallback((clientX: number) => {
    if (!sceneRef.current) return GAME_WIDTH / 2;
    const rect = sceneRef.current.getBoundingClientRect();
    
    // 1. Calculate relative position
    const relativeX = clientX - rect.left;
    
    // 2. Convert to percentage (0 to 1) and clamp it so it never goes negative or above 1
    const percentage = Math.max(0, Math.min(1, relativeX / rect.width));
    
    // 3. Map to physics world width
    return percentage * GAME_WIDTH;
    }, []);

    const handleMove = (e: React.PointerEvent) => {
    e.preventDefault();
    if (isDropping || isGameOver || proposeSuccess || !sceneRef.current) return;

    // Calculate clamped X
    const rawX = getPhysicsX(e.clientX);
    
    // Apply fruit radius constraints so the edges of the fruit don't stick out of the walls
    const currentRadius = FRUITS[currentFruitLevel]?.radius ?? 15;
    const minX = currentRadius + 8;
    const maxX = GAME_WIDTH - currentRadius - 8;
    
    const clampedX = Math.max(minX, Math.min(rawX, maxX));
    setMouseX(clampedX);
    };

    const handleDrop = (e: React.PointerEvent) => {
    e.preventDefault();
    if (isDropping || isGameOver || proposeSuccess || !engineRef.current) return;
    
    // Calculate X, but reuse the same radius constraints as handleMove
    // This ensures the drop point is identical to the visual position
    const rawX = getPhysicsX(e.clientX);
    const currentRadius = FRUITS[currentFruitLevel]?.radius ?? 15;
    const minX = currentRadius;
    const maxX = GAME_WIDTH - currentRadius;
    const dropX = Math.max(minX, Math.min(rawX, maxX));
    
    setIsDropping(true);

    const body = Matter.Bodies.circle(dropX, DROP_Y, currentRadius, {
        restitution: 0.2,
        label: currentFruitLevel.toString(),
        render: { visible: false },
        plugin: { createdAt: Date.now() },
    });

    Matter.Composite.add(engineRef.current.world, body);
    setCurrentFruitLevel(nextFruitLevel);
    setNextFruitLevel(getRandomNextLevel());

    setTimeout(() => setIsDropping(false), 800);
    };

  const resetGame = () => {
    if (!engineRef.current) return;
    engineRef.current.timing.timeScale = 1;
    Matter.Composite.clear(engineRef.current.world, false);
    initWorld(engineRef.current);
    setScore(0);
    setIsGameOver(false);
    setProposeSuccess(false);
    setIsDropping(false);
    setCurrentFruitLevel(getRandomNextLevel());
    setNextFruitLevel(getRandomNextLevel());
  };

  if (!imagesLoaded) {
    return (
      <div className="flex w-full h-dvh items-center justify-center bg-[#faf7f5] text-stone-600 font-semibold">
        Loading...
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center pt-8 pb-20 w-full h-dvh select-none bg-[#faf7f5]">
        {/* Header container */}
        <div className="flex justify-between items-end mb-4 px-1 w-full max-w-[450px]">
            <div>
                <h2 className="text-2xl font-serif font-bold text-stone-800 tracking-wide mb-1">
                Our Memories
                </h2>
                <p className="text-sm font-bold text-[#d4af37]">Score: {score}</p>
            </div>

            <div className="w-20 h-20 bg-white/80 backdrop-blur-sm rounded-2xl shadow-[0_4px_15px_rgba(0,0,0,0.1)] border border-stone-200 flex flex-col items-center justify-center shrink-0">
                <span className="text-[9px] font-bold text-stone-400 tracking-widest mb-1.5">NEXT</span>
                <div className="w-12 h-12 flex items-center justify-center overflow-hidden rounded-full">
                <img src={imageCacheRef.current[nextFruitLevel].src} className="w-full h-full object-cover" />
                </div>
            </div>
        </div>

        {/* Game Container */}
        <div className="relative w-full max-w-[450px] aspect-[380/600]">
            <div
                ref={sceneRef}
                // Add 'touch-action-none' to prevent browser scrolling interference
                className={`w-full h-full rounded-2xl overflow-hidden bg-white shadow-[0_10px_40px_rgba(0,0,0,0.1)] border-[10px] border-white cursor-crosshair touch-none transition-opacity duration-500 ${
                    proposeSuccess ? 'opacity-30' : 'opacity-100'
                }`}
                // Use Pointer Events
                onPointerDown={(e) => {
                    // This captures the pointer so it stays locked to this element even if dragged outside
                    (e.target as HTMLElement).setPointerCapture(e.pointerId);
                    handleMove(e);
                }}
                onPointerMove={handleMove}
                onPointerUp={handleDrop}
                // We don't need these anymore as Pointer handles both
                // onMouseMove={handleMove} 
                // onTouchMove={handleMove}
                // onClick={handleDrop}
                // onTouchEnd={handleDrop}
            />

            {/* This style ensures the internal canvas created by Matter.js fills the container perfectly */}
            <style jsx global>{`
                canvas { width: 100% !important; height: 100% !important; }
                /* This is critical for mobile game drag-to-move interactions */
                .touch-none { touch-action: none; }
            `}</style>

            {/* Floating fruit cursor */}
            {!isDropping && !isGameOver && !proposeSuccess && (
            <div
                className="absolute rounded-full pointer-events-none z-10 flex items-center justify-center overflow-hidden shadow-sm"
                style={{
                width: `${(FRUITS[currentFruitLevel].radius * 2 / GAME_WIDTH) * 100}%`,
                height: `${(FRUITS[currentFruitLevel].radius * 2 / GAME_HEIGHT) * 100}%`,
                left: `${((mouseX) / GAME_WIDTH) * 100}%`,
                top: `${((DROP_Y) / GAME_HEIGHT) * 100}%`,
                transform: 'translate(-50%, -50%)',
                }}
            >
                <img src={imageCacheRef.current[currentFruitLevel].src} className="w-full h-full object-cover" />
            </div>
            )}

            {/* Win Screen */}
            {proposeSuccess && (
            <div className="absolute inset-0 flex flex-col items-center justify-center z-50 p-6 text-center">
                <Heart className="text-rose-400 w-20 h-20 mb-6 animate-bounce" fill="currentColor" />
                <h3 className="text-3xl font-serif font-bold text-stone-800 mb-4">Will You Marry Me?</h3>
                <button
                onClick={() => alert('YES!')}
                className="px-10 py-4 bg-gradient-to-r from-rose-400 to-[#d4af37] text-white rounded-full font-bold shadow-lg"
                >
                YES!
                </button>
            </div>
            )}

            {/* Game Over Screen */}
            {isGameOver && !proposeSuccess && (
            <div className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center z-40">
                <h3 className="text-3xl font-bold text-white mb-2">GAME OVER</h3>
                <p className="text-xl text-white font-medium mb-6">Final Score: {score}</p>
                <button 
                onClick={resetGame} 
                className="px-8 py-3 bg-white text-stone-800 rounded-full font-bold"
                >
                Try Again
                </button>
            </div>
            )}
        </div>
    </div>
  );
}