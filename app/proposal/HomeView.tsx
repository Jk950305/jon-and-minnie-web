'use client';

import React, { useEffect, useRef, useState } from 'react';
import { 
  motion, 
  AnimatePresence, 
  useMotionValue, 
  useSpring,
  useTransform
} from 'framer-motion';
import { Clock } from 'lucide-react';

// =========================================================================
// [1] CONFIG & EXACT TIME MATH
// =========================================================================
const START_DATE = new Date('2019-10-25T00:00:00');

const PETAL_COLORS = [
  'rgba(255, 182, 193, 0.65)', 
  'rgba(255, 228, 225, 0.75)', 
  'rgba(255, 240, 245, 0.85)', 
  'rgba(255, 255, 255, 0.9)'   
];

function useExactTimeTogether() {
  const [time, setTime] = useState({ years: 0, months: 0, days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      let years = now.getFullYear() - START_DATE.getFullYear();
      let months = now.getMonth() - START_DATE.getMonth();
      let days = now.getDate() - START_DATE.getDate();
      let hours = now.getHours() - START_DATE.getHours();
      let minutes = now.getMinutes() - START_DATE.getMinutes();
      let seconds = now.getSeconds() - START_DATE.getSeconds();

      if (seconds < 0) { seconds += 60; minutes--; }
      if (minutes < 0) { minutes += 60; hours--; }
      if (hours < 0) { hours += 24; days--; }
      if (days < 0) {
        months--;
        const previousMonth = new Date(now.getFullYear(), now.getMonth(), 0);
        days += previousMonth.getDate();
      }
      if (months < 0) { months += 12; years--; }

      setTime({ years, months, days, hours, minutes, seconds });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return time;
}

// =========================================================================
// [2] BACKGROUND PHYSICS ENGINE (벚꽃잎 캔버스)
// =========================================================================
const SpringPetalCanvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: -1000, y: -1000 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let petals: Petal[] = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resize);
    resize();

    class Petal {
      x: number;
      y: number;
      w: number;
      h: number;
      opacity: number;
      speedX: number;
      speedY: number;
      angle: number;
      spin: number;
      spinSpeed: number;
      color: string;

      constructor() {
        this.x = Math.random() * canvas!.width;
        this.y = Math.random() * canvas!.height - canvas!.height;
        this.w = Math.random() * 6 + 4;
        this.h = Math.random() * 10 + 6;
        this.opacity = Math.random() * 0.5 + 0.3;
        this.speedX = Math.random() * 1.2 - 0.6;
        this.speedY = Math.random() * 1.2 + 0.4;
        this.angle = Math.random() * 360;
        this.spin = Math.random() * 360;
        this.spinSpeed = Math.random() * 0.04 - 0.02;
        this.color = PETAL_COLORS[Math.floor(Math.random() * PETAL_COLORS.length)];
      }

      draw() {
        if (!ctx) return;
        ctx.save();
        ctx.globalAlpha = this.opacity;
        ctx.translate(this.x, this.y);
        ctx.rotate((this.angle * Math.PI) / 180);
        ctx.scale(Math.cos(this.spin), 1); 
        
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.bezierCurveTo(this.w / 2, -this.h / 2, this.w, this.h / 3, 0, this.h);
        ctx.bezierCurveTo(-this.w, this.h / 3, -this.w / 2, -this.h / 2, 0, 0);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.restore();
      }

      update() {
        this.y += this.speedY;
        this.x += this.speedX + Math.sin(this.y * 0.01) * 0.5;
        this.spin += this.spinSpeed;
        this.angle += this.spinSpeed * 10;

        const dx = mouseRef.current.x - this.x;
        const dy = mouseRef.current.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 100) {
          this.x -= (dx / dist) * 1.5;
          this.y -= (dy / dist) * 1.5;
        }

        if (this.y > canvas!.height + this.h) {
          this.y = -this.h;
          this.x = Math.random() * canvas!.width;
        }
        if (this.x > canvas!.width + this.w) this.x = -this.w;
        if (this.x < -this.w) this.x = canvas!.width + this.w;
      }
    }

    const petalCount = window.innerWidth > 768 ? 45 : 20;
    for (let i = 0; i < petalCount; i++) {
      petals.push(new Petal());
    }

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current.x = e.clientX;
      mouseRef.current.y = e.clientY;
    };
    
    const handleTouchMove = (e: TouchEvent) => {
      if(e.touches.length > 0) {
        mouseRef.current.x = e.touches[0].clientX;
        mouseRef.current.y = e.touches[0].clientY;
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchmove', handleTouchMove);

    const renderLoop = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      petals.forEach(p => {
        p.update();
        p.draw();
      });
      animationFrameId = requestAnimationFrame(renderLoop);
    };

    renderLoop();

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouchMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-0" />;
};

// =========================================================================
// [3] 3D TILT CARD
// =========================================================================
const TiltCard = ({ block }: { block: { label: string; val: number } }) => {
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseXSpring = useSpring(x);
  const mouseYSpring = useSpring(y);

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["15deg", "-15deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-15deg", "15deg"]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const xPct = mouseX / width - 0.5;
    const yPct = mouseY / height - 0.5;
    x.set(xPct);
    y.set(yPct);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative p-2 sm:p-4 md:p-6 rounded-xl md:rounded-[2rem] bg-white/50 backdrop-blur-md border border-white/70 shadow-[0_10px_30px_rgba(255,182,193,0.15)] flex flex-col items-center justify-center cursor-default transition-colors duration-500 hover:bg-white/70"
    >
      <div 
        style={{ transform: "translateZ(30px)" }}
        className="flex flex-col items-center"
      >
        <AnimatePresence mode="popLayout">
          <motion.span
            key={block.val}
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -10, opacity: 0, position: "absolute" }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            /* 변경점: 모바일 숫자 크기 인상 (text-2xl -> text-3xl), 자간 타이틀 매칭 */
            className="text-3xl sm:text-4xl md:text-5xl font-light text-slate-700 tracking-tighter tabular-nums"
          >
            {block.val.toString().padStart(2, '0')}
          </motion.span>
        </AnimatePresence>

        {/* 변경점: 모바일 라벨 크기 인상 (text-[8px] -> text-[10px]), 자간 최적화 */}
        <span className="text-[10px] md:text-[11px] tracking-[0.1em] md:tracking-[0.3em] font-medium text-pink-400 mt-1 md:mt-4">
          {block.label}
        </span>
      </div>
    </motion.div>
  );
};

// =========================================================================
// [4] MAIN ONE-PAGE COMPONENT
// =========================================================================
export default function SinglePageProposal() {
  const time = useExactTimeTogether();
  const timeBlocks = [
    { label: 'YEARS', val: time.years },
    { label: 'MONTHS', val: time.months },
    { label: 'DAYS', val: time.days },
    { label: 'HOURS', val: time.hours },
    { label: 'MINUTES', val: time.minutes },
    { label: 'SECONDS', val: time.seconds },
  ];

  return (
    <div className="fixed inset-0 overscroll-none bg-gradient-to-b from-[#FFF5F7] via-white to-[#FEF0F5] overflow-hidden selection:bg-pink-200 selection:text-pink-900 font-sans flex flex-col justify-center gap-y-8 md:gap-y-12 py-4 md:py-12">
      
      <SpringPetalCanvas />

      {/* --- Section 1: Hero (Top) --- */}
      <header className="relative z-10 text-center px-5 shrink-0">
        {/* 변경점: 모바일 자간 타이트하게 고정(tracking-tighter) 및 행간(leading-relaxed) 수정 */}
        <h1 className="font-extralight text-slate-800 tracking-tighter leading-relaxed">
          {/* 변경점: text-[5.8vw]로 모바일 화면 너비에 맞춰 꽉 차게 스케일링 */}
          <motion.span 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 1, ease: "easeOut" }}
            className="block text-[5.8vw] sm:text-4xl md:text-5xl lg:text-6xl break-keep"
          >
            우리가 같이 보내온 수많은 계절,
          </motion.span>
          {/* 변경점: 두 번째 줄도 모바일에서 더 웅장하게 확장되도록 밸런스 조정 */}
          <motion.span 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 1, ease: "easeOut" }}
            className="font-serif italic text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-rose-400 to-pink-400 font-medium block text-[6vw] sm:text-4xl md:text-5xl lg:text-6xl mt-2 md:mt-4 break-keep"
          >
            그리고 앞으로 채워 갈 우리의 내일.
          </motion.span>
        </h1>
      </header>

      {/* --- Section 2: Timer (Middle) --- */}
      <main className="relative z-10 w-full px-4 md:px-8 shrink-0 flex flex-col items-center justify-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1, duration: 1 }}
          className="text-center w-full max-w-4xl mx-auto"
        >
          <div className="flex flex-col items-center mb-4 md:mb-8">
            <Clock size={16} className="text-pink-300 mb-2 md:mb-3" />
            {/* 변경점: 서브헤더 크기 인상 (text-sm -> text-base) */}
            <h2 className="text-base sm:text-xl text-slate-700 font-light tracking-wide">
              서로 마주보며 걸어온 시간
            </h2>
          </div>
          
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2 md:gap-4 touch-none" style={{ perspective: 1000 }}>
            {timeBlocks.map((block) => (
              <TiltCard key={block.label} block={block} />
            ))}
          </div>
        </motion.div>
      </main>

      {/* --- Section 3: Outro (Bottom) --- */}
      <footer className="relative z-10 text-center px-6 shrink-0">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 1 }}
          className="flex flex-col items-center space-y-3 md:space-y-6 max-w-2xl mx-auto"
        >
          <div className="w-[1px] h-6 md:h-16 bg-gradient-to-b from-pink-400 to-transparent" />
          
          {/* 변경점: 푸터 본문 크기 인상 (text-xs -> text-sm) 및 줄바꿈 최적화 */}
          <div className="space-y-2 md:space-y-3">
            <p className="text-sm sm:text-base font-normal text-slate-600 tracking-wide break-keep">
              그동안 우리가 차곡차곡 쌓아온 추억들을 정리해봤어
            </p>
            <p className="text-sm sm:text-base font-medium text-pink-500 tracking-wide break-keep">
              앞으로 더 예쁜 순간들을 함께 만들어가 보자 ❤️
            </p>
          </div>
        </motion.div>
      </footer>

    </div>
  );
}