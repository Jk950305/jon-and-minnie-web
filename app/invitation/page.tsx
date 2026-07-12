'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion, useScroll, useTransform, useSpring, AnimatePresence, useMotionValue } from 'framer-motion';
import { Heart, Stars, ChevronDown, X, Send, Calendar, MapPin, ZoomIn, Music, Play, Pause, Camera } from 'lucide-react';

// ==========================================
// 1. Common Utility Hooks
// ==========================================
const useWindowSize = () => {
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const handleResize = () => setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  return windowSize;
};

const useMousePosition = () => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  useEffect(() => {
    const updateMousePosition = (e: MouseEvent) => setMousePosition({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', updateMousePosition);
    return () => window.removeEventListener('mousemove', updateMousePosition);
  }, []);
  return mousePosition;
};

const scrollToSection = (sectionId: string) => {
  const element = document.getElementById(sectionId);
  if (element) {
    // 부드러운 네이티브 스크롤 보장
    const y = element.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: y, behavior: 'smooth' });
  }
};

// ==========================================
// 2. High-End UI Components
// ==========================================

// 2.1 아날로그 필름 노이즈 텍스처 (프리미엄 웹사이트 필수 기법)
const NoiseOverlay = () => (
  <div className="fixed inset-0 pointer-events-none z-[9999] opacity-[0.04] mix-blend-overlay">
    <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <filter id="noiseFilter">
        <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" stitchTiles="stitch" />
      </filter>
      <rect width="100%" height="100%" filter="url(#noiseFilter)" />
    </svg>
  </div>
);

// 2.2 마우스에 끌려오는 마그네틱 버튼 컨테이너
const MagneticWrapper = ({ children, className }: { children: React.ReactNode, className?: string }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const handleMouse = (e: React.MouseEvent<HTMLDivElement>) => {
    const { clientX, clientY } = e;
    const { height, width, left, top } = ref.current!.getBoundingClientRect();
    const middleX = clientX - (left + width / 2);
    const middleY = clientY - (top + height / 2);
    setPosition({ x: middleX * 0.2, y: middleY * 0.2 }); // 0.2 is the magnetic pull strength
  };

  const reset = () => setPosition({ x: 0, y: 0 });

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouse}
      onMouseLeave={reset}
      animate={{ x: position.x, y: position.y }}
      transition={{ type: "spring", stiffness: 150, damping: 15, mass: 0.1 }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

// 2.3 혼합 블렌드 모드가 적용된 고급 커서
const CustomCursor = () => {
  const { x, y } = useMousePosition();
  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('a') || target.closest('button') || target.closest('.hover-trigger')) {
        setIsHovering(true);
      } else {
        setIsHovering(false);
      }
    };
    window.addEventListener('mouseover', handleMouseOver);
    return () => window.removeEventListener('mouseover', handleMouseOver);
  }, []);

  if (typeof window === 'undefined') return null;

  return (
    <>
      <motion.div
        className="fixed top-0 left-0 w-4 h-4 bg-rose-400 rounded-full pointer-events-none z-[10000] mix-blend-exclusion hidden md:block"
        animate={{ x: x - 8, y: y - 8, scale: isHovering ? 0 : 1 }}
        transition={{ type: 'spring', stiffness: 1000, damping: 40, mass: 0.2 }}
      />
      <motion.div
        className="fixed top-0 left-0 w-12 h-12 border border-rose-400 rounded-full pointer-events-none z-[9999] hidden md:flex items-center justify-center mix-blend-exclusion"
        animate={{ 
          x: x - 24, 
          y: y - 24, 
          scale: isHovering ? 1.5 : 1,
          backgroundColor: isHovering ? 'rgba(251, 113, 133, 1)' : 'rgba(0,0,0,0)'
        }}
        transition={{ type: 'spring', stiffness: 300, damping: 30, mass: 0.5 }}
      >
        {isHovering && <span className="text-[8px] font-bold text-white tracking-widest absolute opacity-50">VIEW</span>}
      </motion.div>
    </>
  );
};

// ==========================================
// 3. Particle System (Gold/Rose Dust)
// ==========================================
class DustParticle {
  x: number; y: number; size: number; speedX: number; speedY: number; opacity: number; color: string;
  constructor(w: number, h: number) {
    this.x = Math.random() * w;
    this.y = Math.random() * h;
    this.size = Math.random() * 2 + 0.5;
    this.speedX = Math.random() * 0.3 - 0.15;
    this.speedY = Math.random() * 0.5 - 0.25;
    this.opacity = Math.random() * 0.5 + 0.1;
    this.color = Math.random() > 0.5 ? '#fecdd3' : '#fef08a'; // Rose and Soft Gold
  }
  update(w: number, h: number) {
    this.x += this.speedX;
    this.y += this.speedY;
    if (this.x > w) this.x = 0;
    if (this.x < 0) this.x = w;
    if (this.y > h) this.y = 0;
    if (this.y < 0) this.y = h;
  }
  draw(ctx: CanvasRenderingContext2D) {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.globalAlpha = this.opacity;
    ctx.fill();
  }
}

const ParticleBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let particles: DustParticle[] = [];
    let animationId: number;

    const init = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      particles = [];
      const count = Math.floor(window.innerWidth / 15);
      for (let i = 0; i < count; i++) particles.push(new DustParticle(canvas.width, canvas.height));
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => { p.update(canvas.width, canvas.height); p.draw(ctx); });
      animationId = requestAnimationFrame(animate);
    };

    init(); animate();
    window.addEventListener('resize', init);
    return () => { window.removeEventListener('resize', init); cancelAnimationFrame(animationId); };
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-[1]" />;
};

// ==========================================
// 4. Floating Navigation & Music Player
// ==========================================
const FloatingUI = () => {
  const [isPlaying, setIsPlaying] = useState(false);

  return (
    <>
      <motion.nav 
        initial={{ y: -100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5, duration: 1 }}
        className="fixed top-8 left-1/2 transform -translate-x-1/2 z-[100] px-8 py-4 bg-white/70 backdrop-blur-xl rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.08)] border border-white"
      >
        <ul className="flex items-center gap-8 md:gap-12 text-xs font-bold tracking-[0.2em] text-stone-600">
          <li className="cursor-pointer hover-trigger hover:text-rose-500 transition-colors" onClick={() => scrollToSection('story')}>STORY</li>
          <li className="cursor-pointer hover-trigger transition-colors" onClick={() => scrollToSection('hero')}>
            <MagneticWrapper><Heart size={20} className="text-rose-400 fill-rose-100" /></MagneticWrapper>
          </li>
          <li className="cursor-pointer hover-trigger hover:text-rose-500 transition-colors" onClick={() => scrollToSection('gallery')}>GALLERY</li>
          <li className="cursor-pointer hover-trigger hover:text-rose-500 transition-colors hidden md:block" onClick={() => scrollToSection('rsvp')}>RSVP</li>
        </ul>
      </motion.nav>

      {/* Aesthetic Music Player Toggle */}
      <motion.div 
        initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 1 }}
        className="fixed bottom-8 right-8 z-[100] hover-trigger"
      >
        <MagneticWrapper>
          <button 
            onClick={() => setIsPlaying(!isPlaying)}
            className="w-14 h-14 bg-stone-900 text-white rounded-full flex items-center justify-center shadow-2xl hover:bg-rose-500 transition-colors"
          >
            {isPlaying ? <Pause size={20} /> : <Music size={20} />}
          </button>
        </MagneticWrapper>
      </motion.div>
    </>
  );
};

// ==========================================
// 5. Sections
// ==========================================

const HeroSection = () => {
  const { scrollY } = useScroll();
  const yText = useTransform(scrollY, [0, 1000], [0, 400]);
  const yBg = useTransform(scrollY, [0, 1000], [0, 200]);
  const opacity = useTransform(scrollY, [0, 600], [1, 0]);

  return (
    <section id="hero" className="relative w-full h-[100svh] flex items-center justify-center overflow-hidden">
      {/* Background Image with Parallax */}
      <motion.div style={{ y: yBg }} className="absolute inset-0 z-0 w-full h-[120%] -top-[10%]">
        <img 
          src="https://images.unsplash.com/photo-1511285560929-80b456fea0bc?q=80&w=2069&auto=format&fit=crop" 
          alt="Hero" 
          className="w-full h-full object-cover opacity-[0.3]"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#faf7f5]/40 via-[#faf7f5]/80 to-[#faf7f5]" />
      </motion.div>

      {/* Infinite Marquee Background Text */}
      <div className="absolute w-full top-1/2 -translate-y-1/2 overflow-hidden z-[2] opacity-10 pointer-events-none flex">
        <motion.div 
          animate={{ x: ["0%", "-50%"] }} 
          transition={{ repeat: Infinity, ease: "linear", duration: 20 }}
          className="flex whitespace-nowrap text-[15vw] font-serif font-black text-stone-800"
        >
          <span>FOREVER AND ALWAYS • FOREVER AND ALWAYS • FOREVER AND ALWAYS • </span>
        </motion.div>
      </div>

      {/* Main Foreground Text */}
      <motion.div style={{ y: yText, opacity }} className="relative z-10 flex flex-col items-center px-4 w-full">
        <motion.div
          initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, delay: 0.2 }}
          className="text-center"
        >
          <span className="text-rose-500 font-bold tracking-[0.3em] uppercase text-xs md:text-sm mb-6 block">
            We are getting married
          </span>
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-serif font-bold text-stone-900 tracking-tight leading-tight mb-8 drop-shadow-sm">
            THE BEGINNING <br />
            <span className="italic font-light text-stone-600">of</span> FOREVER
          </h1>
          
          <div className="flex items-center justify-center gap-6 mt-8">
            <div className="h-[1px] w-12 md:w-24 bg-stone-300" />
            <span className="text-stone-500 tracking-widest font-serif italic text-lg md:text-xl">October 24th, 2026</span>
            <div className="h-[1px] w-12 md:w-24 bg-stone-300" />
          </div>
        </motion.div>
      </motion.div>

      {/* Scroll Indicator */}
      <motion.div 
        style={{ opacity }}
        className="absolute bottom-12 z-10 flex flex-col items-center gap-3 cursor-pointer hover-trigger"
        onClick={() => scrollToSection('story')}
      >
        <span className="text-[10px] tracking-[0.4em] text-stone-500">DISCOVER</span>
        <motion.div animate={{ y: [0, 8, 0] }} transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}>
          <ChevronDown size={24} className="text-stone-400 font-light" />
        </motion.div>
      </motion.div>
    </section>
  );
};

const TimelineSection = () => {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: containerRef, offset: ["start 80%", "end 50%"] });
  const pathLength = useSpring(scrollYProgress, { stiffness: 50, damping: 20 });

  const events = [
    { 
      date: "Spring 2022", title: "THE FIRST GLANCE", 
      text: "우연인 듯 운명처럼 마주친 첫눈에, 우리의 시간은 멈춘 듯했습니다. 모든 것이 완벽했던 그날의 공기를 아직도 기억합니다.",
      img: "https://images.unsplash.com/photo-1606800052052-a08af7148866?q=80&w=1000&auto=format&fit=crop"
    },
    { 
      date: "Winter 2023", title: "THE PROMISE", 
      text: "서로의 손을 맞잡고 영원을 약속하던 밤. 차가운 겨울바람도 우리의 따뜻한 마음을 막을 수는 없었습니다.",
      img: "https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=1000&auto=format&fit=crop"
    },
    { 
      date: "Now & Forever", title: "OUR NEXT CHAPTER", 
      text: "이제는 둘이 아닌 하나가 되어, 세상에서 가장 아름답고 눈부신 다음 이야기를 함께 써 내려가려 합니다.",
      img: "https://images.unsplash.com/photo-1520854221256-17451cc331bf?q=80&w=1000&auto=format&fit=crop"
    }
  ];

  return (
    <section id="story" ref={containerRef} className="relative w-full py-40 px-6 lg:px-12 bg-white z-10 rounded-[3rem] shadow-[0_-20px_50px_rgba(0,0,0,0.02)]">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-32">
          <Stars size={32} className="mx-auto text-rose-300 mb-6" />
          <h2 className="text-4xl md:text-5xl font-serif font-bold text-stone-800">OUR STORY</h2>
        </div>

        <div className="relative">
          {/* Animated SVG Path for Timeline */}
          <div className="absolute left-[23px] md:left-1/2 top-0 bottom-0 w-[2px] bg-stone-100 transform md:-translate-x-1/2" />
          <motion.div 
            style={{ scaleY: pathLength }}
            className="absolute left-[23px] md:left-1/2 top-0 bottom-0 w-[4px] bg-gradient-to-b from-rose-300 to-rose-500 transform md:-translate-x-1/2 origin-top rounded-full shadow-[0_0_10px_rgba(251,113,133,0.5)]"
          />

          <div className="flex flex-col gap-32">
            {events.map((item, i) => (
              <div key={i} className={`relative flex flex-col md:flex-row items-center gap-12 md:gap-24 ${i % 2 === 0 ? 'md:flex-row-reverse' : ''}`}>
                
                <div className="absolute left-[12px] md:left-1/2 w-6 h-6 bg-white border-[6px] border-rose-400 rounded-full transform md:-translate-x-1/2 z-10 shadow-lg" />

                <motion.div 
                  initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-100px" }} transition={{ duration: 0.8 }}
                  className={`flex-1 pl-16 md:pl-0 w-full ${i % 2 === 0 ? 'md:text-left' : 'md:text-right'}`}
                >
                  <span className="inline-block font-mono text-rose-500 text-xs font-bold tracking-widest mb-4 border-b border-rose-200 pb-1">{item.date}</span>
                  <h3 className="text-3xl md:text-4xl font-serif text-stone-800 font-bold mb-6">{item.title}</h3>
                  <p className="text-stone-500 leading-loose md:text-lg break-keep text-justify">{item.text}</p>
                </motion.div>
                
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true, margin: "-100px" }} transition={{ duration: 1 }}
                  className="flex-1 w-full pl-16 md:pl-0"
                >
                  <div className={`relative w-full aspect-[4/5] md:aspect-square overflow-hidden shadow-2xl group ${i % 2 === 0 ? 'rounded-tl-[5rem] rounded-br-[5rem]' : 'rounded-tr-[5rem] rounded-bl-[5rem]'}`}>
                    <img src={item.img} alt={item.title} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" />
                    <div className="absolute inset-0 bg-stone-900/10 group-hover:bg-transparent transition-colors duration-500" />
                  </div>
                </motion.div>

              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

const ParallaxBanner = () => {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], ["-20%", "20%"]);

  return (
    <section ref={ref} className="relative w-full h-[60vh] overflow-hidden bg-stone-900">
      <motion.div style={{ y }} className="absolute inset-0 w-full h-[140%] -top-[20%]">
        <img 
          src="https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?q=80&w=2070&auto=format&fit=crop" 
          alt="Banner" 
          className="w-full h-full object-cover opacity-60 grayscale-[30%]"
        />
      </motion.div>
      <div className="absolute inset-0 flex items-center justify-center">
        <h2 className="text-4xl md:text-6xl font-serif font-bold text-white tracking-widest text-center px-4 mix-blend-overlay">
          TWO SOULS, <br className="md:hidden" /> ONE HEART
        </h2>
      </div>
    </section>
  );
};

const GallerySection = () => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const images = [
    { url: "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?q=80&w=800", h: "h-[400px]" },
    { url: "https://images.unsplash.com/photo-1469334031218-e382a71b716b?q=80&w=800", h: "h-[500px]" },
    { url: "https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=800", h: "h-[350px]" },
    { url: "https://images.unsplash.com/photo-1606800052052-a08af7148866?q=80&w=800", h: "h-[450px]" },
    { url: "https://images.unsplash.com/photo-1520854221256-17451cc331bf?q=80&w=800", h: "h-[400px]" },
    { url: "https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?q=80&w=800", h: "h-[550px]" },
  ];

  return (
    <section id="gallery" className="relative w-full py-40 px-4 md:px-8 bg-[#faf7f5] z-10">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-end mb-20 px-4">
          <div>
            <h2 className="text-5xl font-serif font-bold text-stone-800 mb-4">GALLERY</h2>
            <p className="text-stone-500 font-mono tracking-widest text-sm">CAPTURED MEMORIES</p>
          </div>
          <p className="text-stone-400 text-sm max-w-xs text-right hidden md:block italic">
            "우리가 함께 걸어온, 그리고 앞으로 걸어갈 아름다운 순간들"
          </p>
        </div>

        {/* Asymmetric Masonry Grid */}
        <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
          {images.map((img, idx) => (
            <motion.div 
              key={idx}
              initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "50px" }} transition={{ duration: 0.6, delay: (idx % 3) * 0.1 }}
              className={`relative w-full ${img.h} break-inside-avoid overflow-hidden rounded-2xl group cursor-pointer hover-trigger`}
              onClick={() => setSelectedImage(img.url.replace('w=800', 'w=2000'))}
            >
              <img src={img.url} alt="Gallery" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
              <div className="absolute inset-0 bg-stone-900/0 group-hover:bg-stone-900/30 transition-colors duration-300" />
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="bg-white/20 backdrop-blur-md p-4 rounded-full border border-white/50 text-white"><ZoomIn size={24} /></div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Lightbox Modal */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[99999] bg-stone-900/98 backdrop-blur-3xl flex items-center justify-center p-4"
            onClick={() => setSelectedImage(null)}
          >
            <button className="absolute top-8 right-8 text-white/50 hover:text-white transition-colors hover-trigger">
              <X size={40} />
            </button>
            <motion.img 
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} transition={{ type: "spring", damping: 25 }}
              src={selectedImage} alt="Fullscreen" className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-[0_0_100px_rgba(0,0,0,0.5)]"
              onClick={(e) => e.stopPropagation()} 
            />
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};

const RsvpSection = () => {
  return (
    <section id="rsvp" className="relative w-full py-40 px-6 z-10 bg-stone-900 overflow-hidden">
      {/* Abstract Background Elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-rose-500/20 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500/20 rounded-full blur-[120px] translate-y-1/2 -translate-x-1/2 pointer-events-none" />

      <div className="max-w-5xl mx-auto relative z-10 flex flex-col lg:flex-row gap-16 items-center">
        <div className="flex-1 text-left">
          <h2 className="text-4xl md:text-6xl font-serif font-bold text-white mb-6">BE OUR <br/><span className="text-rose-400 italic">GUEST</span></h2>
          <p className="text-stone-400 text-lg leading-relaxed mb-12 max-w-md">
            소중한 발걸음으로 저희 두 사람의 새로운 시작을 축복해 주세요. 참석을 희망하시는 분들은 아래 폼을 통해 알려주시면 감사하겠습니다.
          </p>
          
          <div className="space-y-6">
            <div className="flex items-center gap-4 text-white">
              <div className="w-12 h-12 rounded-full border border-stone-700 flex items-center justify-center bg-stone-800"><Calendar size={20} className="text-rose-400"/></div>
              <div><p className="font-bold tracking-wider">OCTOBER 24, 2026</p><p className="text-sm text-stone-400">토요일 오후 12시 30분</p></div>
            </div>
            <div className="flex items-center gap-4 text-white">
              <div className="w-12 h-12 rounded-full border border-stone-700 flex items-center justify-center bg-stone-800"><MapPin size={20} className="text-rose-400"/></div>
              <div><p className="font-bold tracking-wider">GRAND BALLROOM</p><p className="text-sm text-stone-400">더 마리에쥬 웨딩홀 2층</p></div>
            </div>
          </div>
        </div>

        {/* Glassmorphism Form UI */}
        <div className="flex-1 w-full max-w-md">
          <div className="bg-white/10 backdrop-blur-2xl border border-white/20 p-8 md:p-10 rounded-3xl shadow-2xl">
            <h3 className="text-2xl font-serif text-white mb-8 text-center">RSVP</h3>
            <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
              <div>
                <input type="text" placeholder="성함 (Name)" className="w-full bg-stone-900/50 border border-stone-700 rounded-xl px-5 py-4 text-white placeholder-stone-500 focus:outline-none focus:border-rose-400 transition-colors" />
              </div>
              <div>
                <select className="w-full bg-stone-900/50 border border-stone-700 rounded-xl px-5 py-4 text-stone-300 focus:outline-none focus:border-rose-400 transition-colors appearance-none">
                  <option value="" disabled selected>참석 여부 (Attendance)</option>
                  <option value="yes">참석합니다 (Yes, I will attend)</option>
                  <option value="no">마음으로 축하할게요 (No, but congratulations!)</option>
                </select>
              </div>
              <div>
                <textarea rows={3} placeholder="축하 메시지 (Message)" className="w-full bg-stone-900/50 border border-stone-700 rounded-xl px-5 py-4 text-white placeholder-stone-500 focus:outline-none focus:border-rose-400 transition-colors resize-none" />
              </div>
              <MagneticWrapper>
                <button className="w-full bg-white text-stone-900 font-bold tracking-widest py-4 rounded-xl hover:bg-rose-400 hover:text-white transition-all duration-300 flex items-center justify-center gap-2 group hover-trigger">
                  SEND MESSAGE <Send size={16} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                </button>
              </MagneticWrapper>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
};

const Footer = () => (
  <footer className="w-full py-16 bg-stone-950 text-center relative z-10 border-t border-stone-900">
    <div className="flex justify-center mb-8"><Heart size={32} className="text-rose-500 fill-rose-500" /></div>
    <h2 className="text-2xl font-serif text-stone-300 tracking-[0.3em] mb-4">THANK YOU</h2>
    <p className="text-xs text-stone-600 font-mono tracking-widest">© 2026 FOREVER BEGINS. DESIGNED WITH PASSION.</p>
  </footer>
);

// ==========================================
// 6. Main Assembly (Fully Scrollable Container)
// ==========================================
export default function HomeView() {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
    // 강제로 스크롤 이슈를 일으키는 body의 설정 해제 (안전 장치)
    document.body.style.overflow = 'auto';
    document.documentElement.style.overflow = 'auto';
  }, []);

  if (!mounted) return <div className="w-full min-h-screen bg-[#faf7f5]" />; 

  return (
    // overflow-x-hidden을 제거하거나 안전하게 w-full 내부에서 처리하여 네이티브 스크롤 보장
    <div className="w-full bg-[#faf7f5] text-stone-800 cursor-none relative">
      <NoiseOverlay />
      <CustomCursor />
      <ParticleBackground />
      <FloatingUI />

      <main className="w-full flex flex-col">
        <HeroSection />
        <TimelineSection />
        <ParallaxBanner />
        <GallerySection />
        <RsvpSection />
        <Footer />
      </main>
    </div>
  );
}