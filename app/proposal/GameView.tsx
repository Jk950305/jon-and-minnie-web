'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Matter from 'matter-js';
import { createClient } from '@supabase/supabase-js';
import { Heart } from 'lucide-react';

// Supabase 클라이언트 연결
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const FRUITS = [
  { level: 0, radius: 15, color: '#ff1a1a', name: '1단계' },
  { level: 1, radius: 25, color: '#ff9933', name: '2단계' },
  { level: 2, radius: 35, color: '#ffff33', name: '3단계' },
  { level: 3, radius: 45, color: '#66ff33', name: '4단계' },
  { level: 4, radius: 55, color: '#ff8c00', name: '5단계' },
  { level: 5, radius: 65, color: '#ffa500', name: '6단계' },
  { level: 6, radius: 75, color: '#ffd700', name: '7단계' },
  { level: 7, radius: 85, color: '#dda0dd', name: '8단계' },
  { level: 8, radius: 95, color: '#ba55d3', name: '9단계' },
  { level: 9, radius: 105, color: '#32cd32', name: '수박(최종)' },
];

const ALLOWED_NEXT_LEVELS = [0,1,2];
const CONFIG = {
  width: 380,
  height: 600,
  wallThickness: 60,
  dropY: 40,
  borderWidth: 10,
};

const getRandomNextLevel = () => 
  ALLOWED_NEXT_LEVELS[Math.floor(Math.random() * ALLOWED_NEXT_LEVELS.length)];

export default function GameView() {
  const sceneRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<Matter.Engine | null>(null);
  const imageCacheRef = useRef<Record<number, HTMLImageElement>>({});
  
  const [score, setScore] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [proposeSuccess, setProposeSuccess] = useState(false);
  
  const [currentFruitLevel, setCurrentFruitLevel] = useState(getRandomNextLevel());
  const [nextFruitLevel, setNextFruitLevel] = useState(getRandomNextLevel());
  
  const [mouseX, setMouseX] = useState(CONFIG.width / 2);
  const [isDropping, setIsDropping] = useState(false);
  const [imagesLoaded, setImagesLoaded] = useState(false);

  const initWorld = useCallback((engine: Matter.Engine) => {
    const { Bodies, Composite } = Matter;
    const wallOptions = { isStatic: true, render: { visible: false } };
    
    const ground = Bodies.rectangle(CONFIG.width / 2, CONFIG.height + CONFIG.wallThickness / 2 - 10, CONFIG.width, CONFIG.wallThickness, wallOptions);
    const wallLeft = Bodies.rectangle(0 - CONFIG.wallThickness / 2, CONFIG.height / 2, CONFIG.wallThickness, CONFIG.height, wallOptions);
    const wallRight = Bodies.rectangle(CONFIG.width + CONFIG.wallThickness / 2, CONFIG.height / 2, CONFIG.wallThickness, CONFIG.height, wallOptions);
    const deadLine = Bodies.rectangle(CONFIG.width / 2, 80, CONFIG.width, 2, { 
      isStatic: true, isSensor: true, label: 'deadline', render: { fillStyle: '#ff9999', opacity: 0.3 } 
    });

    Composite.add(engine.world, [ground, wallLeft, wallRight, deadLine]);
  }, []);

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

  useEffect(() => {
    if (!sceneRef.current || !imagesLoaded) return;

    if (sceneRef.current.childNodes.length > 0) sceneRef.current.innerHTML = '';

    const { Engine, Render, Runner, Bodies, Composite, Events } = Matter;
    const engine = Engine.create();
    engineRef.current = engine;

    const render = Render.create({
      element: sceneRef.current,
      engine: engine,
      options: { width: CONFIG.width, height: CONFIG.height, wireframes: false, background: '#fffbf9' }
    });

    initWorld(engine);

    Events.on(render, 'afterRender', () => {
      const context = render.context;
      const bodies = Composite.allBodies(engine.world);
      
      bodies.forEach((body) => {
        if (body.label === 'wall' || body.label === 'deadline' || !body.label || isNaN(parseInt(body.label))) return;
        const level = parseInt(body.label);
        const img = imageCacheRef.current[level];
        const radius = body.circleRadius!;
        
        context.save();
        context.beginPath();
        context.arc(body.position.x, body.position.y, radius, 0, 2 * Math.PI);
        context.clip();
        
        if (img) {
          context.drawImage(img, body.position.x - radius, body.position.y - radius, radius * 2, radius * 2);
        } else {
          // 안전한 접근
          context.fillStyle = FRUITS[level]?.color ?? '#cccccc';
          context.fill();
        }
        context.restore();
      });
    });

    Events.on(engine, 'collisionStart', (event) => {
      event.pairs.forEach((pair) => {
        const { bodyA, bodyB } = pair;
        if (bodyA.label === bodyB.label && bodyA.label !== 'wall' && bodyA.label !== 'deadline') {
          const level = parseInt(bodyA.label);
          if ((bodyA as any).isMerging || (bodyB as any).isMerging) return;
          (bodyA as any).isMerging = true; (bodyB as any).isMerging = true;
          Composite.remove(engine.world, [bodyA, bodyB]);

          if (level < FRUITS.length - 1) {
            const nextLevel = level + 1;
            setScore((prev) => prev + (nextLevel * 10));
            const newFruit = Bodies.circle((bodyA.position.x + bodyB.position.x) / 2, (bodyA.position.y + bodyB.position.y) / 2, FRUITS[nextLevel].radius, {
              restitution: 0.2, label: nextLevel.toString(), render: { visible: false } 
            });
            Composite.add(engine.world, newFruit);
          } else if (level === FRUITS.length - 1) setProposeSuccess(true);
        }
      });
    });

    Events.on(engine, 'afterUpdate', () => {
      const bodies = Composite.allBodies(engine.world);
      if (bodies.some(b => b.label !== 'wall' && b.label !== 'deadline' && b.position.y < 80 && b.velocity.y < 0.1) && !proposeSuccess) setIsGameOver(true);
    });

    Render.run(render);
    const runner = Runner.create();
    Runner.run(runner, engine);

    return () => { Render.stop(render); Runner.stop(runner); Engine.clear(engine); };
  }, [initWorld, proposeSuccess, imagesLoaded]);

  const handleDrop = () => {
    if (isDropping || isGameOver || proposeSuccess || !engineRef.current) return;
    setIsDropping(true);

    const body = Matter.Bodies.circle(mouseX, CONFIG.dropY, FRUITS[currentFruitLevel].radius, {
      restitution: 0.2, label: currentFruitLevel.toString(), render: { visible: false }
    });
    Matter.Composite.add(engineRef.current.world, body);

    setCurrentFruitLevel(nextFruitLevel);
    setNextFruitLevel(getRandomNextLevel());

    setTimeout(() => setIsDropping(false), 800);
  };

  const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (isDropping || isGameOver || proposeSuccess || !sceneRef.current) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const x = Math.max(FRUITS[currentFruitLevel].radius, Math.min(clientX - sceneRef.current.getBoundingClientRect().left - CONFIG.borderWidth, CONFIG.width - FRUITS[currentFruitLevel].radius));
    setMouseX(x);
  };

  const resetGame = () => {
    if (!engineRef.current) return;
    Matter.Composite.clear(engineRef.current.world, false);
    initWorld(engineRef.current);
    setScore(0); setIsGameOver(false); setProposeSuccess(false); setIsDropping(false);
    setCurrentFruitLevel(getRandomNextLevel());
    setNextFruitLevel(getRandomNextLevel());
  };

  return (
    <div className="flex flex-col items-center justify-center pt-8 w-full h-full select-none bg-[#faf7f5]">
      <div className="w-[380px] flex justify-between items-end mb-4 px-1">
        <div>
          <h2 className="text-2xl font-serif font-bold text-stone-800 tracking-wide mb-1">Our Memories</h2>
          <p className="text-sm font-bold text-[#d4af37]">Score: {score}</p>
        </div>
        
        <div className="w-20 h-20 bg-white/80 backdrop-blur-sm rounded-2xl shadow-[0_4px_15px_rgba(0,0,0,0.1)] border border-stone-200 flex flex-col items-center justify-center shrink-0">
          <span className="text-[9px] font-bold text-stone-400 tracking-widest mb-1.5">NEXT</span>
          <div className="w-12 h-12 flex items-center justify-center overflow-hidden rounded-full">
            {imageCacheRef.current[nextFruitLevel] ? (
              <img src={imageCacheRef.current[nextFruitLevel].src} className="w-full h-full object-cover" />
            ) : (
              // [방어 코드] ?. 및 ?? 사용
              <div className="w-full h-full" style={{ backgroundColor: FRUITS[nextFruitLevel]?.color ?? '#cccccc' }} />
            )}
          </div>
        </div>
      </div>

      <div className="relative">
        <div ref={sceneRef} className="rounded-2xl overflow-hidden bg-white shadow-[0_10px_40px_rgba(0,0,0,0.1)] border-[10px] border-white cursor-crosshair touch-none"
          onMouseMove={handleMove} onTouchMove={handleMove} onClick={handleDrop} onTouchEnd={handleDrop}
          style={{ width: CONFIG.width, height: CONFIG.height, boxSizing: 'content-box' }}
        />

        {!isDropping && !isGameOver && !proposeSuccess && (
          <div className="absolute rounded-full pointer-events-none z-10 flex items-center justify-center overflow-hidden shadow-sm" style={{
            width: FRUITS[currentFruitLevel].radius * 2, height: FRUITS[currentFruitLevel].radius * 2,
            left: mouseX + CONFIG.borderWidth - FRUITS[currentFruitLevel].radius,
            top: CONFIG.dropY + CONFIG.borderWidth - FRUITS[currentFruitLevel].radius,
          }}>
            {imageCacheRef.current[currentFruitLevel] ? (
               <img src={imageCacheRef.current[currentFruitLevel].src} className="w-full h-full object-cover" />
            ) : (
               // [방어 코드] ?. 및 ?? 사용
               <div className="w-full h-full" style={{ backgroundColor: FRUITS[currentFruitLevel]?.color ?? '#cccccc' }} />
            )}
          </div>
        )}

        {proposeSuccess && (
           <div className="absolute inset-0 bg-white/90 backdrop-blur-md rounded-2xl flex flex-col items-center justify-center z-50 p-6 text-center">
            <Heart className="text-rose-400 w-20 h-20 mb-6 animate-bounce" fill="currentColor" />
            <h3 className="text-3xl font-serif font-bold text-stone-800 mb-4">Will You Marry Me?</h3>
            <button onClick={() => alert("YES!")} className="px-10 py-4 bg-gradient-to-r from-rose-400 to-[#d4af37] text-white rounded-full font-bold">당연하지! (YES)</button>
          </div>
        )}

        {isGameOver && !proposeSuccess && (
          <div className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center z-40">
            <h3 className="text-3xl font-bold text-white mb-2">GAME OVER</h3>
            <button onClick={resetGame} className="px-8 py-3 bg-white text-stone-800 rounded-full font-bold">다시하기</button>
          </div>
        )}
      </div>
    </div>
  );
}