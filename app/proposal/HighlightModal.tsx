'use client';

import { useEffect, useRef, useState } from 'react';
import { X, MapPin, ChevronLeft, ChevronRight } from 'lucide-react';

interface HighlightItem {
  asset: any;
  eventTitle: string;
  eventContent: string;
  eventLocation: string;
  eventDate: string;
}

interface HighlightModalProps {
  items: HighlightItem[];
  activeYear: string;
  onClose: () => void;
}

export default function HighlightModal({ items, activeYear, onClose }: HighlightModalProps) {
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const nextTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const STORY_DURATION = 5000;
  const currentItem = items[currentStoryIndex];

  const nextStory = () => {
    if (currentStoryIndex < items.length - 1) {
      setProgress(0);
      setCurrentStoryIndex((prev) => prev + 1);
    } else {
      onClose();
    }
  };

  const prevStory = () => {
    if (currentStoryIndex > 0) {
      setProgress(0);
      setCurrentStoryIndex((prev) => prev - 1);
    }
  };

  // 비디오 재생 제어
  useEffect(() => {
    videoRefs.current.forEach((video, index) => {
      if (!video) return;
      if (index === currentStoryIndex && !isPaused) {
        video.play().catch(() => {});
      } else {
        video.pause();
        video.currentTime = 0;
      }
    });
  }, [currentStoryIndex, isPaused]);

  // 타이머 및 프로그레스 바 로직
  useEffect(() => {
    if (nextTimeoutRef.current) clearTimeout(nextTimeoutRef.current);
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);

    if (!isPaused) {
      nextTimeoutRef.current = setTimeout(nextStory, STORY_DURATION);

      const startTime = Date.now();
      progressIntervalRef.current = setInterval(() => {
        const elapsed = Date.now() - startTime;
        setProgress(Math.min((elapsed / STORY_DURATION) * 100, 100));
      }, 25);
    }

    return () => {
      if (nextTimeoutRef.current) clearTimeout(nextTimeoutRef.current);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, [currentStoryIndex, isPaused]);

  // 스크롤 잠금
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = 'unset'; };
  }, []);

  return (
    <div 
      className="fixed inset-0 z-[100] bg-stone-950/90 flex items-center justify-center animate-fade-in backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-lg h-full md:h-[90vh] flex items-center justify-center cursor-default"
        onClick={(e) => e.stopPropagation()}
        onMouseEnter={() => setIsPaused(true)}  
        onMouseLeave={() => setIsPaused(false)} 
      >
        {/* 상단 프로그레스 바 및 헤더 */}
        <div className="absolute top-0 inset-x-0 p-4 bg-gradient-to-b from-black/70 to-transparent z-[110]">
          <div className="flex gap-1 mb-4">
            {items.map((_, index) => (
              <div key={index} className="h-[2px] flex-1 bg-white/30 rounded-full overflow-hidden relative">
                <div 
                  className="h-full bg-white rounded-full"
                  style={{
                    width: index === currentStoryIndex ? `${progress}%` : index < currentStoryIndex ? '100%' : '0%',
                    transition: index === currentStoryIndex ? 'width 30ms linear' : 'none'
                  }} 
                />
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between text-white">
            <div className="flex flex-col">
              <span className="font-bold text-sm">{activeYear} 하이라이트</span>
              <span className="text-[11px] text-white/70 truncate max-w-[200px]">{currentItem.eventTitle}</span>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors z-[120]">
              <X size={28} />
            </button>
          </div>
        </div>

        {/* 미디어 뷰어 */}
        <div className="w-full h-full bg-stone-900 md:rounded-xl overflow-hidden relative flex items-center justify-center">
          {items.map((item, index) => (
            <div
              key={index}
              className={`absolute inset-0 w-full h-full flex items-center justify-center transition-opacity duration-200 ${
                index === currentStoryIndex ? 'opacity-100 z-10' : 'opacity-0 -z-10 pointer-events-none'
              }`}
            >
              {item.asset.asset_type === 'video' ? (
                <video 
                  ref={(el) => { videoRefs.current[index] = el; }}
                  src={item.asset.asset_url} 
                  className="w-full h-full object-contain" 
                  preload="auto"
                  muted playsInline loop 
                />
              ) : (
                <img src={item.asset.asset_url} className="w-full h-full object-contain" alt="highlight" />
              )}
            </div>
          ))}

          {/* 하단 정보 영역 */}
          <div className="absolute bottom-0 inset-x-0 p-8 bg-gradient-to-t from-black/90 via-black/40 to-transparent text-white flex flex-col gap-2 z-[110]">
            {currentItem.eventLocation && (
              <span className="text-[11px] flex items-center gap-1 bg-white/20 px-2 py-0.5 rounded-full w-fit backdrop-blur-md">
                <MapPin size={10} /> {currentItem.eventLocation}
              </span>
            )}
            <p className="text-sm text-white/95 leading-relaxed font-medium">{currentItem.eventContent}</p>
            <span className="text-[10px] text-white/40">{currentItem.eventDate}</span>
          </div>
        </div>

        {/* 내비게이션 버튼 (데스크탑) */}
        <button onClick={(e) => { e.stopPropagation(); prevStory(); }} className={`absolute -left-16 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 text-white hover:bg-white/20 hidden lg:block transition-all ${currentStoryIndex === 0 ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
          <ChevronLeft size={32} />
        </button>
        <button onClick={(e) => { e.stopPropagation(); nextStory(); }} className="absolute -right-16 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 text-white hover:bg-white/20 hidden lg:block transition-all opacity-100">
          <ChevronRight size={32} />
        </button>

        {/* 터치 제어 영역 (모바일) */}
        <div className="absolute inset-y-0 left-0 w-1/3 z-[105] md:hidden" onClick={prevStory} onTouchStart={() => setIsPaused(true)} onTouchEnd={() => setIsPaused(false)} />
        <div className="absolute inset-y-0 right-0 w-2/3 z-[105] md:hidden" onClick={nextStory} onTouchStart={() => setIsPaused(true)} onTouchEnd={() => setIsPaused(false)} />
      </div>
    </div>
  );
}