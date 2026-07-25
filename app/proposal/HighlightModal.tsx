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
  allHighlights: any[];
  onYearChange: (data: { items: HighlightItem[], year: string }, direction: 'next' | 'prev') => void;
  transitionState: { isAnimating: boolean; direction: 'next' | 'prev' | null; displayYear: string };
  onClose: () => void;
}

export default function HighlightModal({ 
  items, 
  activeYear, 
  allHighlights, 
  onYearChange, 
  transitionState,
  onClose 
}: HighlightModalProps) {
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const nextTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const touchStartX = useRef<number>(0);
  const touchStartTime = useRef<number>(0);
  
  const STORY_DURATION = 5000;

  // 💡 [핵심 수정] items 배열 길이에 맞춰 안전한 인덱스를 보장합니다.
  const safeStoryIndex = Math.min(currentStoryIndex, items.length - 1);
  const currentItem = items[safeStoryIndex] || items[0];

  // activeYear가 바뀔 때 인덱스 초기화
  useEffect(() => {
    setCurrentStoryIndex(0);
    setProgress(0);
  }, [activeYear]);

  const nextStory = () => {
    setIsPaused(false);
    if (safeStoryIndex < items.length - 1) {
      setProgress(0);
      setCurrentStoryIndex((prev) => prev + 1);
    } else {
      navigateToNextYear();
    }
  };

  const prevStory = () => {
    setIsPaused(false);
    if (safeStoryIndex > 0) {
      setProgress(0);
      setCurrentStoryIndex((prev) => prev - 1);
    } else {
      navigateToPrevYear();
    }
  };

  const navigateToNextYear = () => {
    const currentYearIndex = allHighlights.findIndex((h) => h.year === activeYear);
    if (currentYearIndex < allHighlights.length - 1) {
      const nextGroup = allHighlights[currentYearIndex + 1];
      onYearChange({ items: nextGroup.items, year: nextGroup.year }, 'next');
    } else {
      onClose();
    }
  };

  const navigateToPrevYear = () => {
    const currentYearIndex = allHighlights.findIndex((h) => h.year === activeYear);
    if (currentYearIndex > 0) {
      const prevGroup = allHighlights[currentYearIndex - 1];
      onYearChange({ items: prevGroup.items, year: prevGroup.year }, 'prev');
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (transitionState.isAnimating) return;
    touchStartX.current = e.touches[0].clientX;
    touchStartTime.current = Date.now();
    setIsPaused(true);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (transitionState.isAnimating) return;
    setIsPaused(false);
    
    const touchEndX = e.changedTouches[0].clientX;
    const deltaX = touchEndX - touchStartX.current;
    const duration = Date.now() - touchStartTime.current;
    
    const SWIPE_THRESHOLD = 50; 
    const TAP_THRESHOLD = 300;  

    if (Math.abs(deltaX) > SWIPE_THRESHOLD) {
      if (deltaX < 0) {
        navigateToNextYear();
      } else {
        navigateToPrevYear();
      }
    } 
    else if (duration < TAP_THRESHOLD) {
      const rect = e.currentTarget.getBoundingClientRect();
      const tapX = touchEndX - rect.left;
      
      if (tapX < rect.width / 3) {
        prevStory(); 
      } else {
        nextStory(); 
      }
    }
  };

  // Video playback control
  useEffect(() => {
    videoRefs.current.forEach((video, index) => {
      if (!video) return;
      if (index === safeStoryIndex && !isPaused && !transitionState.isAnimating) {
        video.play().catch(() => {});
      } else {
        video.pause();
      }
    });
  }, [safeStoryIndex, isPaused, transitionState.isAnimating]);

  // Timer and progress bar logic
  useEffect(() => {
    if (nextTimeoutRef.current) clearTimeout(nextTimeoutRef.current);
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);

    if (!isPaused && !transitionState.isAnimating) {
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
  }, [safeStoryIndex, isPaused, transitionState.isAnimating]);

  // Lock scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = 'unset'; };
  }, []);

  const getCubeStyle = () => {
    if (!transitionState.isAnimating) return {};
    const rotation = transitionState.direction === 'next' ? 95 : -95;
    return {
      transform: `rotateY(${rotation}deg) scale(0.85)`,
      transformOrigin: transitionState.direction === 'next' ? 'left center' : 'right center',
      transition: 'transform 400ms cubic-bezier(0.1, 0.8, 0.25, 1), opacity 400ms',
      opacity: 0.3,
    };
  };

  return (
    <div 
      className="fixed inset-0 z-[100] bg-stone-950 flex items-center justify-center animate-fade-in backdrop-blur-sm perspective-1000 select-none overflow-hidden"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-lg h-full md:h-[90vh] flex items-center justify-center cursor-default preserve-3d"
        onClick={(e) => e.stopPropagation()}
        onMouseEnter={() => setIsPaused(true)}  
        onMouseLeave={() => setIsPaused(false)} 
      >
        {/* Top Progress Bar and Header */}
        <div className="absolute top-0 inset-x-0 p-4 bg-gradient-to-b from-black/80 via-black/40 to-transparent z-[110]">
          <div className="flex gap-1 mb-4">
            {items.map((_, index) => (
              <div key={index} className="h-[2px] flex-1 bg-white/30 rounded-full overflow-hidden relative">
                <div 
                  className="h-full bg-white rounded-full"
                  style={{
                    width: index === safeStoryIndex ? `${progress}%` : index < safeStoryIndex ? '100%' : '0%',
                    transition: index === safeStoryIndex ? 'width 30ms linear' : 'none'
                  }} 
                />
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between text-white">
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-white/80 tracking-wider">{activeYear} Highlight</span>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors z-[120]">
              <X size={28} />
            </button>
          </div>
        </div>

        {/* Media Viewer */}
        <div 
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          style={getCubeStyle()}
          className="w-full h-full bg-stone-900 md:rounded-xl overflow-hidden relative flex items-center justify-center touch-none backface-hidden preserve-3d transition-transform duration-300 ease-out"
        >
          {items.map((item, index) => (
            <div
              key={index}
              className={`absolute inset-0 w-full h-full flex items-center justify-center transition-opacity duration-200 ${
                index === safeStoryIndex ? 'opacity-100 z-10' : 'opacity-0 -z-10 pointer-events-none'
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

          {/* Bottom Info Area */}
          <div className="absolute bottom-0 inset-x-0 p-8 bg-gradient-to-t from-black/90 via-black/50 to-transparent text-white flex flex-col gap-2.5 z-[110] pointer-events-none">
            {currentItem?.eventLocation && (
              <span className="text-[11px] flex items-center gap-1 bg-white/20 px-2 py-0.5 rounded-full w-fit backdrop-blur-md mb-1">
                <MapPin size={10} /> {currentItem.eventLocation}
              </span>
            )}
            
            <h3 className="text-[19px] font-bold text-white break-keep leading-snug">
              {currentItem?.eventTitle}
            </h3>
            
            <p className="text-[15px] text-white/90 leading-relaxed font-normal whitespace-pre-wrap break-all mt-0.5">
              {currentItem?.eventContent?.split(/\\n/g).map((line: string, index: number) => (
                <span key={index}>
                  {line}
                  {index < currentItem.eventContent.split(/\\n/g).length - 1 && <br />}
                </span>
              ))}
            </p>
            <span className="text-[10px] text-white/40 mt-1">{currentItem?.eventDate}</span>
          </div>
        </div>

        {/* Transition Overlay */}
        {transitionState.isAnimating && (
          <div className="absolute inset-0 bg-stone-950/40 z-[150] flex flex-col items-center justify-center pointer-events-none animate-fade-in">
            <div className="bg-black/60 px-6 py-4 rounded-2xl backdrop-blur-md border border-white/10 flex flex-col items-center justify-center scale-95 transition-transform duration-300">
              <span className="text-3xl font-extrabold text-white tracking-widest drop-shadow-md">
                {transitionState.displayYear}
              </span>
              <span className="text-xs uppercase text-amber-200/90 font-bold tracking-widest mt-1.5">
                Highlight
              </span>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <button 
          onClick={(e) => { e.stopPropagation(); prevStory(); }} 
          className={`absolute -left-16 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 text-white hover:bg-white/20 hidden lg:block transition-all ${allHighlights.findIndex(h => h.year === activeYear) === 0 && safeStoryIndex === 0 ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
        >
          <ChevronLeft size={32} />
        </button>
        <button 
          onClick={(e) => { e.stopPropagation(); nextStory(); }} 
          className="absolute -right-16 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 text-white hover:bg-white/20 hidden lg:block transition-all opacity-100"
        >
          <ChevronRight size={32} />
        </button>
      </div>
    </div>
  );
}