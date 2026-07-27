'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Matter from 'matter-js';
import { Heart, MessageCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';

const GAME_WIDTH = 380;
const GAME_HEIGHT = 600;
const WALL_THICKNESS = 60;
const DROP_Y = 40;

// 1. 레벨 10(인덱스 10) 과일 추가
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
  { level: 10, radius: 95, color: '#ff4500', name: 'Level 11' }, // 새로 추가된 최종 과일
];

const ALLOWED_NEXT_LEVELS = [0,1,2];
const getRandomNextLevel = () => ALLOWED_NEXT_LEVELS[Math.floor(Math.random() * ALLOWED_NEXT_LEVELS.length)];



interface GameViewProps {
  onGameClear?: () => void;
}

export default function GameView({ onGameClear }: GameViewProps) {
  const router = useRouter();
  const sceneRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<Matter.Engine | null>(null);
  const imageCacheRef = useRef<Record<number, HTMLImageElement>>({});

  const isGameOverRef = useRef(false);
  const proposeSuccessRef = useRef(false); // 물리 엔진 안에서 성공 여부를 즉각 판단하기 위한 Ref

  const [score, setScore] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [proposeSuccess, setProposeSuccess] = useState(false);
  const [currentFruitLevel, setCurrentFruitLevel] = useState(getRandomNextLevel());
  const [nextFruitLevel, setNextFruitLevel] = useState(getRandomNextLevel());
  const [mouseX, setMouseX] = useState(GAME_WIDTH / 2);
  const [isDropping, setIsDropping] = useState(false);
  const [imagesLoaded, setImagesLoaded] = useState(false);
  
  const [showExitModal, setShowExitModal] = useState(false);

  const [isBlurActive, setIsBlurActive] = useState(false);

  useEffect(() => {
    if (proposeSuccess) {
      const timer = setTimeout(() => setIsBlurActive(true), 2000);
      return () => clearTimeout(timer);
    } else {
      setIsBlurActive(false);
    }
  }, [proposeSuccess]);

  useEffect(() => {
    isGameOverRef.current = isGameOver;
  }, [isGameOver]);

  useEffect(() => {
    proposeSuccessRef.current = proposeSuccess;
    if (proposeSuccess && onGameClear) {
      onGameClear();
    }
  }, [proposeSuccess, onGameClear]);

  useEffect(() => {
    if (isGameOver || proposeSuccess) return;

    window.history.pushState({ gameGuard: true }, '', window.location.href);

    const handlePopState = () => {
      if (!isGameOverRef.current && !proposeSuccessRef.current) {
        setShowExitModal(true);
        window.history.pushState({ gameGuard: true }, '', window.location.href);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isGameOver, proposeSuccess]);

  const handleCancelExit = () => {
    setShowExitModal(false);
  };

  const handleConfirmExit = () => {
    setShowExitModal(false);
    router.replace('?tab=home');
  };

  const initWorld = useCallback((engine: Matter.Engine) => {
    const { Bodies, Composite } = Matter;
    const wallOptions = { isStatic: true, render: { visible: false } };

    const ground = Bodies.rectangle(GAME_WIDTH / 2, GAME_HEIGHT + WALL_THICKNESS / 2 - 10, GAME_WIDTH, WALL_THICKNESS, wallOptions);
    const wallLeft = Bodies.rectangle(0 - WALL_THICKNESS / 2, GAME_HEIGHT / 2, WALL_THICKNESS, GAME_HEIGHT, wallOptions);
    const wallRight = Bodies.rectangle(GAME_WIDTH + WALL_THICKNESS / 2, GAME_HEIGHT / 2, WALL_THICKNESS, GAME_HEIGHT, wallOptions);
    const deadLine = Bodies.rectangle(GAME_WIDTH / 2, 80, GAME_WIDTH, 2, {
      isStatic: true, isSensor: true, label: 'deadline', render: { fillStyle: '#ff9999', opacity: 0.3 },
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
        img.onload = () => { imageCacheRef.current[item.level] = img; resolve(); };
        img.onerror = () => resolve();
      });
    });
    await Promise.all(promises);
    setImagesLoaded(true);
  };

  useEffect(() => { preloadImages(); }, []);

  useEffect(() => {
    if (!sceneRef.current || !imagesLoaded) return;
    if (sceneRef.current.childNodes.length > 0) sceneRef.current.innerHTML = '';

    const { Engine, Render, Runner, Composite, Events } = Matter;
    const engine = Engine.create();
    engineRef.current = engine;
    engine.timing.timeScale = 1;

    const render = Render.create({
      element: sceneRef.current,
      engine: engine,
      options: { width: GAME_WIDTH, height: GAME_HEIGHT, wireframes: false, background: '#fffbf9' },
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

          // 2. 새로운 레벨 생성 (현재 인덱스가 마지막보다 작을 때만 합치기)
          if (level < FRUITS.length - 1) {
            const nextLevel = level + 1;
            setScore((prev) => prev + (nextLevel * 10));
            const newFruit = Matter.Bodies.circle(
              (bodyA.position.x + bodyB.position.x) / 2, (bodyA.position.y + bodyB.position.y) / 2, FRUITS[nextLevel].radius,
              { restitution: 0.2, label: nextLevel.toString(), render: { visible: false }, plugin: { createdAt: Date.now() } }
            );
            Composite.add(engine.world, newFruit);

            // 방금 만들어진 과일이 마지막 레벨(Level 10)일 경우 클리어 처리
            if (nextLevel === FRUITS.length - 1) {
              setProposeSuccess(true);
              proposeSuccessRef.current = true;
              
              // 10레벨 과일이 만들어지는 모습이 렌더링되도록 살짝(100ms) 여유를 둔 뒤 게임 프리즈
              setTimeout(() => {
                if (engineRef.current) {
                  engineRef.current.timing.timeScale = 0; // 물리 흐름 정지
                  Composite.allBodies(engineRef.current.world).forEach((body) => {
                    //Matter.Body.setStatic(body, true); // 모든 물체 얼리기
                    Matter.Body.setVelocity(body, { x: 0, y: 0 });
                    Matter.Body.setAngularVelocity(body, 0);
                  });
                }
              }, 100);
            }
          }
        }
      });
    });

    Events.on(engine, 'afterUpdate', () => {
      if (isGameOverRef.current) return;
      const bodies = Composite.allBodies(engine.world);
      const now = Date.now();

      const isOver = bodies.some((body) => {
        if (body.label === 'wall' || body.label === 'deadline') return false;
        const createdAt = (body.plugin as any)?.createdAt || 0;
        if (now - createdAt < 1000) return false;
        return body.position.y < 80 && body.velocity.y < 0.5 && body.velocity.x < 0.5;
      });

      // 클리어 상태가 아닐 때만 게임 오버 판단
      if (isOver && !proposeSuccessRef.current) {
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
  }, [initWorld, imagesLoaded]); // proposeSuccess 의존성을 제거하여 불필요한 재시작 방지

  const getPhysicsX = useCallback((clientX: number) => {
    if (!sceneRef.current) return GAME_WIDTH / 2;
    const rect = sceneRef.current.getBoundingClientRect();
    const relativeX = clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, relativeX / rect.width));
    return percentage * GAME_WIDTH;
  }, []);

  const handleMove = (e: React.PointerEvent) => {
    e.preventDefault();
    if (isDropping || isGameOver || proposeSuccess || !sceneRef.current) return;
    const rawX = getPhysicsX(e.clientX);
    const currentRadius = FRUITS[currentFruitLevel]?.radius ?? 15;
    const minX = currentRadius + 8;
    const maxX = GAME_WIDTH - currentRadius - 8;
    setMouseX(Math.max(minX, Math.min(rawX, maxX)));
  };

  const handleDrop = (e: React.PointerEvent) => {
    e.preventDefault();
    if (isDropping || isGameOver || proposeSuccess || !engineRef.current) return;
    const rawX = getPhysicsX(e.clientX);
    const currentRadius = FRUITS[currentFruitLevel]?.radius ?? 15;
    const dropX = Math.max(currentRadius, Math.min(rawX, GAME_WIDTH - currentRadius));
    
    setIsDropping(true);
    const body = Matter.Bodies.circle(dropX, DROP_Y, currentRadius, {
        restitution: 0.2, label: currentFruitLevel.toString(), render: { visible: false }, plugin: { createdAt: Date.now() },
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
    proposeSuccessRef.current = false;
    setIsDropping(false);
    setCurrentFruitLevel(getRandomNextLevel()); 
    setNextFruitLevel(getRandomNextLevel());
  };

  if (!imagesLoaded) {
    return <div className="flex w-full h-dvh items-center justify-center bg-[#faf7f5] text-stone-600 font-semibold">Loading...</div>;
  }

  return (
    <div className="flex flex-col items-center justify-center pt-8 pb-20 w-full h-dvh select-none bg-[#faf7f5]">
        <div className="flex justify-between items-end mb-4 px-1 w-full max-w-[450px]">
            <div>
                <h2 className="text-2xl font-serif font-bold text-stone-800 tracking-wide mb-1">The Minnie Game</h2>
                <p className="text-sm font-bold text-[#d4af37]">Score: {score}</p>
            </div>
            <div className="w-20 h-20 bg-white/80 backdrop-blur-sm rounded-2xl shadow-[0_4px_15px_rgba(0,0,0,0.1)] border border-stone-200 flex flex-col items-center justify-center shrink-0">
                <span className="text-[9px] font-bold text-stone-400 tracking-widest mb-1.5">NEXT</span>
                <div className="w-12 h-12 flex items-center justify-center overflow-hidden rounded-full">
                  <img src={imageCacheRef.current[nextFruitLevel]?.src} className="w-full h-full object-cover" />
                </div>
            </div>
        </div>

        {showExitModal && (
          <div className="absolute inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center p-6">
            <div className="bg-white rounded-2xl p-6 w-full max-w-xs shadow-2xl text-center animate-in fade-in zoom-in duration-200">
              <h3 className="text-lg font-bold text-stone-800 mb-2">정말 나가시겠습니까?</h3>
              <p className="text-sm text-stone-500 mb-6">진행 중인 게임 내용이 사라집니다.</p>
              <div className="flex gap-3">
                <button 
                  onClick={handleCancelExit}
                  className="flex-1 py-2.5 bg-stone-100 text-stone-700 rounded-xl font-semibold text-sm hover:bg-stone-200 transition-colors"
                >
                  취소
                </button>
                <button 
                  onClick={handleConfirmExit}
                  className="flex-1 py-2.5 bg-[#d4af37] text-white rounded-xl font-semibold text-sm hover:bg-[#c49f27] transition-colors shadow-sm"
                >
                  나가기
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="relative w-full max-w-[450px] aspect-[380/600]">
            <div
                ref={sceneRef}
                // 3. 투명도는 낮추지 않고 그대로 유지하여 게임화면이 배경으로 보이도록 함 (opacity-100 유지)
                className="w-full h-full rounded-2xl overflow-hidden bg-white shadow-[0_10px_40px_rgba(0,0,0,0.1)] border-[10px] border-white cursor-crosshair touch-none"
                onPointerDown={(e) => { (e.target as HTMLElement).setPointerCapture(e.pointerId); handleMove(e); }}
                onPointerMove={handleMove}
                onPointerUp={handleDrop}
            />
            <style jsx global>{`canvas { width: 100% !important; height: 100% !important; } .touch-none { touch-action: none; }`}</style>

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
                <img src={imageCacheRef.current[currentFruitLevel]?.src} className="w-full h-full object-cover" />
            </div>
            )}

            {/* 3 & 4. 메세지 창 디자인 변경: 배경 blur 적용 및 텍스트를 버튼형태에서 일반 텍스트 형태로 수정 */}
            {/* 게임 클리어 시 메세지 언락 화면 */}
            {proposeSuccess && (
              <div className="absolute inset-0 z-50 flex items-center justify-center p-6 text-center">
                {/* 1. 서서히 블러가 진해지는 배경 레이어 (transition-all duration-1000) */}
                <div 
                  className={`absolute inset-0 transition-all duration-1000 ease-out ${
                    isBlurActive 
                      ? 'backdrop-blur-md bg-white/25' // 최종 블러 상태 (희미한 흰색 + 적당한 블러)
                      : 'backdrop-blur-none bg-white/0'  // 처음 시작 상태 (블러 없음, 투명)
                  }`} 
                />

                {/* 2. 메시지 박스 (배경이 과하지 않아 뒤의 멈춘 게임 화면이 잘 보임) */}
                <div 
                  className={`relative z-10 flex flex-col items-center bg-white/90 p-8 rounded-3xl shadow-2xl ring-1 ring-black/5 transition-all duration-700 ease-out ${
                    isBlurActive ? 'opacity-90 scale-100' : 'opacity-0 scale-95'
                  }`}
                >
                  <MessageCircle 
                    className="text-orange-500 w-16 h-16 mb-5 animate-bounce" 
                    fill="currentColor" 
                    strokeWidth={1.5}
                  />
                  <h3 className="text-3xl font-extrabold text-stone-900 mb-3 tracking-tight">
                    축하합니다!
                  </h3>
                  <p className="text-lg text-stone-700 font-semibold mb-1.5">
                    숨겨져 있던 메뉴가 잠금 해제되었습니다.
                  </p>
                  <p className="text-sm text-stone-500 font-medium">
                    메뉴에서 확인해보세요!
                  </p>
                </div>
              </div>
            )}

            {isGameOver && !proposeSuccess && (
            <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center z-40 animate-in fade-in duration-300">
                <h3 className="text-3xl font-bold text-white mb-2">GAME OVER</h3>
                <p className="text-xl text-white font-medium mb-6">Final Score: {score}</p>
                <button onClick={resetGame} className="px-8 py-3 bg-white text-stone-800 rounded-full font-bold shadow-lg hover:bg-stone-100 transition-colors">
                  Try Again
                </button>
            </div>
            )}
        </div>
    </div>
  );
}