'use client';

import React, { useEffect, useRef, useState, MouseEvent as ReactMouseEvent } from 'react';
import { motion, useScroll, useTransform, useSpring, AnimatePresence, useMotionValue } from 'framer-motion';
import { Heart, Stars, Clock, Sparkles, ArrowDown } from 'lucide-react';

// ==========================================
// 1. Types & Interfaces
// ==========================================
interface Point {
  x: number;
  y: number;
}

interface ParticleProps {
  x: number;
  y: number;
  size: number;
  color: string;
  speedX: number;
  speedY: number;
  angle: number;
  spin: number;
  originX: number;
  originY: number;
}

// ==========================================
// 2. Constants & User Data Context
// ==========================================
const START_DATE = new Date('2019-10-25T00:00:00');
const THEME_COLORS = ['#D4AF37', '#F3E5AB', '#FFFFFF', '#C5B4A2'];

// ==========================================
// 3. Helper Hooks (Physics & Time)
// ==========================================
const useMousePosition = () => {
  const [mousePosition, setMousePosition] = useState<Point>({ x: 0, y: 0 });
  useEffect(() => {
    const updateMousePosition = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', updateMousePosition);
    return () => window.removeEventListener('mousemove', updateMousePosition);
  }, []);
  return mousePosition;
};

const useTimeTogether = () => {
  const [time, setTime] = useState({ years: 0, days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const diff = now.getTime() - START_DATE.getTime();
      
      const years = Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
      const days = Math.floor((diff % (1000 * 60 * 60 * 24 * 365.25)) / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTime({ years, days, hours, minutes, seconds });
    }, 1000);
    return () => clearInterval(timer);
  }, []);
  return time;
};

// ==========================================
// 4. Advanced Canvas Particle System (Heart Engine)
// ==========================================
const InteractiveCanvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouse = useRef<{ x: number; y: number; radius: number }>({ x: 0, y: 0, radius: 150 });
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let particlesArray: any[] = [];
    let animationFrameId: number;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      init();
    };

    window.addEventListener('resize', resize);
    
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.current.x = e.clientX - rect.left;
      mouse.current.y = e.clientY - rect.top;
    };
    window.addEventListener('mousemove', handleMouseMove);

    // 하트 모양을 그리는 수학 공식
    const getHeartPoint = (t: number, scale: number, offsetX: number, offsetY: number) => {
      const x = 16 * Math.pow(Math.sin(t), 3);
      const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
      return { x: x * scale + offsetX, y: y * scale + offsetY };
    };

    class Particle {
      x: number;
      y: number;
      size: number;
      color: string;
      baseX: number;
      baseY: number;
      density: number;
      angle: number;
      velocity: number;

      constructor(x: number, y: number) {
        this.x = Math.random() * canvas!.width;
        this.y = Math.random() * canvas!.height;
        this.baseX = x;
        this.baseY = y;
        this.size = Math.random() * 2 + 0.5;
        this.color = THEME_COLORS[Math.floor(Math.random() * THEME_COLORS.length)];
        this.density = (Math.random() * 30) + 1;
        this.angle = Math.random() * 360;
        this.velocity = Math.random() * 0.05;
      }

      draw() {
        ctx!.fillStyle = this.color;
        ctx!.beginPath();
        ctx!.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx!.closePath();
        ctx!.fill();
      }

      update() {
        // 마우스와의 상호작용 (반발력)
        let dx = mouse.current.x - this.x;
        let dy = mouse.current.y - this.y;
        let distance = Math.sqrt(dx * dx + dy * dy);
        let forceDirectionX = dx / distance;
        let forceDirectionY = dy / distance;
        let maxDistance = mouse.current.radius;
        let force = (maxDistance - distance) / maxDistance;
        let directionX = forceDirectionX * force * this.density;
        let directionY = forceDirectionY * force * this.density;

        if (distance < mouse.current.radius) {
          this.x -= directionX;
          this.y -= directionY;
        } else {
          // 원래 자리(하트 모양)로 천천히 복귀하면서 살짝씩 떠다님 (플로팅 효과)
          this.angle += this.velocity;
          let wobbleX = Math.sin(this.angle) * 2;
          let wobbleY = Math.cos(this.angle) * 2;

          if (this.x !== this.baseX) {
            let dx = this.x - this.baseX;
            this.x -= dx / 20 + wobbleX * 0.1;
          }
          if (this.y !== this.baseY) {
            let dy = this.y - this.baseY;
            this.y -= dy / 20 + wobbleY * 0.1;
          }
        }
      }
    }

    const init = () => {
      particlesArray = [];
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2.5;
      const scale = Math.min(canvas.width, canvas.height) * 0.012; // 화면 크기에 비례한 하트 크기

      // 파티클 생성 (약 600개)
      for (let i = 0; i < 600; i++) {
        const t = Math.random() * Math.PI * 2;
        // 약간의 노이즈를 줘서 선이 너무 뚜렷하지 않고 은하수처럼 보이게 함
        const noiseX = (Math.random() - 0.5) * 30;
        const noiseY = (Math.random() - 0.5) * 30;
        const point = getHeartPoint(t, scale, centerX + noiseX, centerY + noiseY);
        particlesArray.push(new Particle(point.x, point.y));
      }
    };

    const animate = () => {
      // 꼬리 효과를 위한 약간 투명한 배경 덮어씌우기
      ctx!.fillStyle = 'rgba(26, 21, 18, 0.1)';
      ctx!.fillRect(0, 0, canvas.width, canvas.height);
      
      for (let i = 0; i < particlesArray.length; i++) {
        particlesArray[i].update();
        particlesArray[i].draw();
      }
      animationFrameId = requestAnimationFrame(animate);
    };

    resize();
    animate();

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-0 opacity-60 mix-blend-screen"
    />
  );
};

// ==========================================
// 5. Custom Interactive Components
// ==========================================

// 3D 틸트 효과가 들어간 마그네틱 카드
const MagneticTiltCard = ({ children, className }: { children: React.ReactNode, className?: string }) => {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  
  const mouseXSpring = useSpring(x);
  const mouseYSpring = useSpring(y);
  
  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["15deg", "-15deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-15deg", "15deg"]);

  const handleMouseMove = (e: ReactMouseEvent<HTMLDivElement>) => {
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
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
      className={`relative rounded-3xl p-8 backdrop-blur-xl bg-white/5 border border-white/10 shadow-[0_20px_40px_rgba(0,0,0,0.3)] transition-colors duration-500 hover:bg-white/10 ${className}`}
    >
      <div style={{ transform: "translateZ(50px)" }}>
        {children}
      </div>
    </motion.div>
  );
};

// 스플릿 텍스트 애니메이션 (한 글자씩 나타나는 타이포그래피)
const RevealText = ({ text, delay = 0 }: { text: string, delay?: number }) => {
  const words = text.split("");
  
  const container = {
    hidden: { opacity: 0 },
    visible: (i = 1) => ({
      opacity: 1,
      transition: { staggerChildren: 0.05, delayChildren: delay * i },
    }),
  };

  const child = {
    visible: { opacity: 1, y: 0, filter: "blur(0px)", transition: { type: "spring", damping: 12, stiffness: 100 } },
    hidden: { opacity: 0, y: 40, filter: "blur(10px)", transition: { type: "spring", damping: 12, stiffness: 100 } },
  };

  return (
    <motion.div variants={container} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} className="flex flex-wrap justify-center overflow-hidden">
      {words.map((word, index) => (
        <motion.span variants={child} key={index} className="inline-block">
          {word === " " ? "\u00A0" : word}
        </motion.span>
      ))}
    </motion.div>
  );
};

// ==========================================
// 6. Main HomeView Component
// ==========================================
export default function HomeView() {
  const mouse = useMousePosition();
  const time = useTimeTogether();
  const { scrollYProgress } = useScroll();
  
  // 스크롤에 따른 배경색상 변화 (다크모드 -> 밝은 톤)
  const backgroundColor = useTransform(
    scrollYProgress,
    [0, 0.4, 1],
    ["#1A1512", "#2A231E", "#faf7f5"]
  );

  // 스크롤에 따른 첫 섹션 투명도 및 패럴랙스
  const heroOpacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);
  const heroY = useTransform(scrollYProgress, [0, 0.2], [0, -150]);
  const heroScale = useTransform(scrollYProgress, [0, 0.2], [1, 0.9]);

  // 커스텀 커서 스프링 물리값
  const cursorX = useSpring(mouse.x, { stiffness: 500, damping: 28, mass: 0.5 });
  const cursorY = useSpring(mouse.y, { stiffness: 500, damping: 28, mass: 0.5 });

  return (
    <motion.div 
      style={{ backgroundColor }} 
      className="relative w-full flex flex-col font-sans transition-colors duration-1000 ease-in-out"
    >
      

      {/* -------------------------------------------
          Section 1: Hero (Interactive Particle Heart) 
          ------------------------------------------- */}
      <motion.section 
        style={{ opacity: heroOpacity, y: heroY, scale: heroScale }}
        className="relative h-screen w-full flex flex-col items-center justify-center overflow-hidden"
      >
        <InteractiveCanvas />
        
        <div className="relative z-10 flex flex-col items-center text-center px-4 mix-blend-difference">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            className="mb-6 inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/20 bg-white/5 backdrop-blur-md text-white/80 text-xs tracking-[0.3em] uppercase"
          >
            <Stars size={14} className="text-[#D4AF37]" />
            <span>Chapter 1</span>
            <Stars size={14} className="text-[#D4AF37]" />
          </motion.div>

          <h1 className="text-5xl md:text-7xl lg:text-8xl font-light text-white tracking-tighter mb-4">
            <RevealText text="To My Princess," delay={0.2} />
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-[#D4AF37] via-[#F3E5AB] to-[#D4AF37] italic font-serif mt-2">
              <RevealText text="Minnie" delay={0.8} />
            </span>
          </h1>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.5, duration: 1 }}
            className="text-white/60 font-light tracking-widest text-sm md:text-base max-w-xl leading-relaxed mt-6"
          >
            우리가 처음 만난 그날부터 지금까지, <br className="hidden md:block" />
            내 모든 순간의 이유는 너였어.
          </motion.p>
        </div>

        {/* Scroll Indicator */}
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.5, duration: 1 }}
          className="absolute bottom-12 flex flex-col items-center gap-3"
        >
          <span className="text-[10px] text-white/40 tracking-[0.3em] uppercase">Scroll to explore</span>
          <motion.div 
            animate={{ y: [0, 10, 0] }} transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
            className="w-8 h-12 rounded-full border border-white/20 flex justify-center p-2 backdrop-blur-sm"
          >
            <motion.div className="w-1 h-1 bg-[#D4AF37] rounded-full" />
          </motion.div>
        </motion.div>
      </motion.section>

      {/* -------------------------------------------
          Section 2: The Journey Counter (3D Glassmorphism) 
          ------------------------------------------- */}
      <section className="relative min-h-[80vh] w-full flex items-center justify-center py-20 px-4 md:px-8 z-10">
        <div className="max-w-5xl w-full">
          <MagneticTiltCard className="w-full">
            <div className="flex flex-col md:flex-row items-center justify-between gap-12">
              <div className="flex-1 text-left space-y-6">
                <div className="flex items-center gap-3 text-[#D4AF37]">
                  <Clock size={24} />
                  <h2 className="text-sm tracking-[0.2em] font-medium uppercase">Our Timeline</h2>
                </div>
                <h3 className="text-3xl md:text-4xl text-white font-serif italic">
                  우리가 함께한 <br />
                  눈부신 시간들
                </h3>
                <p className="text-white/50 font-light leading-relaxed text-sm">
                  2019년 10월 25일.<br/>
                  서로를 마주 본 첫 순간부터, 우리의 시계는 단 한 번도 멈춘 적이 없어.
                </p>
              </div>

              <div className="flex-1 grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-8 w-full">
                {[
                  { label: 'Years', value: time.years },
                  { label: 'Days', value: time.days },
                  { label: 'Hours', value: time.hours },
                  { label: 'Minutes', value: time.minutes },
                  { label: 'Seconds', value: time.seconds }
                ].map((unit, idx) => (
                  <motion.div 
                    key={unit.label}
                    initial={{ opacity: 0, scale: 0.8, y: 20 }}
                    whileInView={{ opacity: 1, scale: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.1, type: "spring", stiffness: 100 }}
                    className="flex flex-col items-center justify-center p-4 md:p-6 rounded-2xl bg-white/5 border border-white/10"
                  >
                    <span className="text-3xl md:text-5xl font-light text-transparent bg-clip-text bg-gradient-to-b from-white to-white/40">
                      {unit.value.toString().padStart(2, '0')}
                    </span>
                    <span className="text-[10px] md:text-xs text-[#D4AF37] tracking-[0.2em] uppercase mt-2">
                      {unit.label}
                    </span>
                  </motion.div>
                ))}
              </div>
            </div>
          </MagneticTiltCard>
        </div>
      </section>

      {/* -------------------------------------------
          Section 3: Abstract Memory Gallery (Parallax Reveal) 
          ------------------------------------------- */}
      <section className="relative w-full py-32 px-4 overflow-hidden z-10">
        <div className="max-w-6xl mx-auto flex flex-col items-center">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 1 }}
            className="text-center mb-24"
          >
            <h2 className="text-4xl md:text-6xl text-stone-800 font-light tracking-tight transition-colors duration-1000">
              성진이가 <span className="font-serif italic text-[#D4AF37]">공주</span>에게
            </h2>
          </motion.div>

          {/* Interactive Banners */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
            {/* Left Banner */}
            <motion.div 
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ type: "spring", stiffness: 50, delay: 0.2 }}
              className="group relative h-[400px] rounded-3xl overflow-hidden bg-stone-100 shadow-[0_10px_30px_rgba(0,0,0,0.05)] cursor-none"
            >
              <div className="absolute inset-0 bg-gradient-to-tr from-[#D4AF37]/10 to-transparent z-10 transition-opacity group-hover:opacity-100 opacity-0" />
              <div className="absolute inset-0 flex flex-col justify-end p-10 z-20">
                <Heart size={32} strokeWidth={1} className="text-[#D4AF37] mb-6 transform group-hover:scale-110 transition-transform duration-500" />
                <h3 className="text-2xl text-stone-800 mb-3 font-medium">네가 웃을 때</h3>
                <p className="text-stone-500 font-light leading-relaxed">
                  작은 것 하나에도 환하게 웃는 널 볼 때면, 내 세상 전체가 밝아지는 기분이야. 너의 그 미소를 평생 지켜주고 싶어.
                </p>
              </div>
              {/* 장식용 원형 그래픽 */}
              <div className="absolute -top-24 -right-24 w-64 h-64 border border-[#D4AF37]/20 rounded-full group-hover:scale-150 transition-transform duration-1000 ease-out" />
            </motion.div>

            {/* Right Banner */}
            <motion.div 
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ type: "spring", stiffness: 50, delay: 0.4 }}
              className="group relative h-[400px] rounded-3xl overflow-hidden bg-stone-800 shadow-[0_10px_30px_rgba(0,0,0,0.2)] cursor-none"
            >
              <div className="absolute inset-0 bg-gradient-to-bl from-white/5 to-transparent z-10 transition-opacity group-hover:opacity-100 opacity-0" />
              <div className="absolute inset-0 flex flex-col justify-end p-10 z-20">
                <Sparkles size={32} strokeWidth={1} className="text-[#D4AF37] mb-6 transform group-hover:rotate-12 transition-transform duration-500" />
                <h3 className="text-2xl text-white mb-3 font-medium">내가 기댈 수 있는 사람</h3>
                <p className="text-white/60 font-light leading-relaxed">
                  항상 내 편이 되어주고, 나를 더 나은 사람으로 만들어주는 너. 이제는 내가 너의 든든한 나무가 될게.
                </p>
              </div>
              {/* 장식용 선 Гра픽 */}
              <svg className="absolute top-0 right-0 w-full h-full opacity-10 group-hover:opacity-20 transition-opacity duration-1000" viewBox="0 0 100 100" preserveAspectRatio="none">
                <path d="M0,100 C30,70 70,30 100,0" stroke="#D4AF37" strokeWidth="0.5" fill="none" />
                <path d="M0,80 C40,60 60,40 100,20" stroke="#D4AF37" strokeWidth="0.5" fill="none" />
              </svg>
            </motion.div>
          </div>
        </div>
      </section>

      {/* -------------------------------------------
          Section 4: The Final Question / Call to Action
          ------------------------------------------- */}
      <section className="relative min-h-[60vh] w-full flex flex-col items-center justify-center py-20 px-4 pb-40 z-10 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          className="flex flex-col items-center"
        >
          <div className="w-[1px] h-24 bg-gradient-to-b from-stone-300 to-transparent mb-12" />
          
          <h2 className="text-3xl md:text-5xl text-stone-800 font-serif italic mb-8">
            Are you ready for the next chapter?
          </h2>
          
          <p className="text-stone-500 font-light mb-12 max-w-lg">
            좌측 메뉴(모바일은 하단)에서 우리가 함께 걸어온 <strong>지도(Map)</strong>를 확인하고, 숨겨진 <strong>메세지(Messages)</strong>를 찾아봐.
          </p>

          <motion.div 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="relative group cursor-pointer"
          >
            <div className="absolute inset-0 bg-[#D4AF37] blur-xl opacity-20 group-hover:opacity-40 transition-opacity duration-500 rounded-full" />
            <div className="relative flex items-center gap-3 px-8 py-4 bg-stone-900 text-white rounded-full font-medium tracking-wide shadow-xl overflow-hidden">
              <span className="relative z-10">Start the Journey</span>
              <ArrowDown size={18} className="relative z-10 animate-bounce" />
              <div className="absolute inset-0 bg-[#D4AF37] transform translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-out z-0" />
            </div>
          </motion.div>
        </motion.div>
      </section>
      
    </motion.div>
  );
}