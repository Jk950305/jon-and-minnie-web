'use client';

import { useState, useEffect, useRef } from 'react';
import { Grid, MapPin, X, ChevronLeft, ChevronRight, Heart } from 'lucide-react';

interface ProfileViewProps {
  timeline: any[];
  onPostClick: (event: any) => void;
}

interface HighlightItem {
  asset: any;
  eventTitle: string;
  eventContent: string;
  eventLocation: string;
  eventDate: string;
}

export default function ProfileView({ timeline, onPostClick }: ProfileViewProps) {
  const [activeHighlightItems, setActiveHighlightItems] = useState<HighlightItem[] | null>(null);
  const [currentStoryIndex, setCurrentStoryIndex] = useState<number>(0);
  const [activeYear, setActiveYear] = useState<string>('');

  const [progress, setProgress] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  
  const nextTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  
  const STORY_DURATION = 5000;

  const getHighlights = () => {
    const groups: { [key: string]: HighlightItem[] } = {};
    const covers: { [key: string]: string | null } = {};

    timeline.forEach((event) => {
      const dateString = event.event_date || event.created_at || event.date;
      if (!dateString) return;

      const year = new Date(dateString).getFullYear().toString();
      if (!groups[year]) {
        groups[year] = [];
        covers[year] = event.assets?.[0]?.asset_url || null;
      }

      if (event.assets && event.assets.length > 0) {
        event.assets.forEach((asset: any) => {
          groups[year].push({
            asset,
            eventTitle: event.title || '',
            eventContent: event.content || '',
            eventLocation: event.location_name || '',
            eventDate: event.event_date || '',
          });
        });
      }
    });

    return Object.keys(groups)
      .sort()
      .map((year) => ({
        year,
        items: groups[year],
        coverUrl: covers[year], 
      }));
  };

  const highlights = getHighlights();

  const handleHighlightClick = (year: string, items: HighlightItem[]) => {
    videoRefs.current = new Array(items.length).fill(null);
    setActiveYear(year);
    setActiveHighlightItems(items);
    setCurrentStoryIndex(0);
    setProgress(0);
    setIsPaused(false);
  };

  const nextStory = () => {
    if (!activeHighlightItems) return;
    if (currentStoryIndex < activeHighlightItems.length - 1) {
      setProgress(0);
      setCurrentStoryIndex((prev) => prev + 1);
    } else {
      closeHighlight();
    }
  };

  const prevStory = () => {
    if (currentStoryIndex > 0) {
      setProgress(0);
      setCurrentStoryIndex((prev) => prev - 1);
    }
  };

  const closeHighlight = () => {
    videoRefs.current.forEach((video) => {
      if (video) video.pause();
    });
    setActiveHighlightItems(null);
    setProgress(0);
    setIsPaused(false);
  };

  useEffect(() => {
    if (!activeHighlightItems) return;

    videoRefs.current.forEach((video, index) => {
      if (!video) return;

      if (index === currentStoryIndex) {
        if (isPaused) {
          video.pause();
        } else {
          video.play().catch(() => {});
        }
      } else {
        video.pause();
        video.currentTime = 0;
      }
    });
  }, [currentStoryIndex, isPaused, activeHighlightItems]);

  useEffect(() => {
    if (!activeHighlightItems) return;

    if (nextTimeoutRef.current) clearTimeout(nextTimeoutRef.current);
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);

    if (!isPaused) {
      nextTimeoutRef.current = setTimeout(() => {
        nextStory();
      }, STORY_DURATION);

      const startTime = Date.now();
      progressIntervalRef.current = setInterval(() => {
        const elapsedTime = Date.now() - startTime;
        const currentProgress = Math.min((elapsedTime / STORY_DURATION) * 100, 100);
        setProgress(currentProgress);
      }, 25);
    }

    return () => {
      if (nextTimeoutRef.current) clearTimeout(nextTimeoutRef.current);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, [activeHighlightItems, currentStoryIndex, isPaused]);

  useEffect(() => {
    if (activeHighlightItems) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [activeHighlightItems]);

  const currentItem = activeHighlightItems?.[currentStoryIndex];

  return (
    <div className="w-full max-w-5xl mx-auto pt-10 px-4 md:px-6 lg:px-8">
      {/* 1. 프로필 헤더 */}
      <div className="flex items-center gap-8 md:gap-16 mb-8 px-2 justify-start">
        <div className="w-20 h-20 md:w-28 md:h-28 rounded-full bg-gradient-to-tr from-amber-200 to-rose-400 flex items-center justify-center shadow-md shrink-0">
          <Heart size={40} className="text-white fill-white" />
        </div>
        <div className="flex gap-8 text-center">
          <div>
            <div className="text-base md:text-lg font-bold text-stone-800">{timeline.length}</div>
            <div className="text-xs text-stone-400">Memories</div>
          </div>
          <div>
            <div className="text-base md:text-lg font-bold text-stone-800">2019.10.25 ~</div>
            <div className="text-xs text-stone-400">Since</div>
          </div>
        </div>
      </div>

      {/* 2. 소개글 */}
      <div className="px-2 mb-8 text-left">
        <h2 className="text-sm font-bold text-stone-800">Our Lovestagram</h2>
        <p className="text-xs text-stone-500 mt-1.5">우리가 함께 걸어온 발자취들을 기록하는 공간 🤍</p>
      </div>

      {/* 3. 하이라이트 섹션 */}
      {highlights.length > 0 && (
        <div className="w-full mb-6 border-b border-stone-100 pb-6">
          <div className="flex items-center justify-start gap-3 md:gap-6 px-2 overflow-x-auto scrollbar-none w-full py-2">
            {highlights.map(({ year, items, coverUrl }) => (
              <div
                key={year}
                onClick={() => handleHighlightClick(year, items)}
                className="flex flex-col items-center justify-center cursor-pointer group active:scale-95 transition-all duration-150 ease-out shrink-0 w-20 md:w-24 p-1"
              >
                <div className="w-[64px] h-[64px] md:w-[88px] md:h-[88px] rounded-full border border-stone-200 p-[2px] md:p-[4px] group-hover:scale-105 group-hover:border-transparent group-hover:bg-gradient-to-tr group-hover:from-amber-200 group-hover:to-rose-400 transition-all duration-300 bg-stone-50 shadow-sm flex items-center justify-center overflow-hidden">
                  <div className="w-full h-full rounded-full bg-white p-[2px] flex items-center justify-center">
                    <div className="w-full h-full rounded-full bg-stone-200 overflow-hidden">
                      {coverUrl ? (
                        <img src={coverUrl} className="w-full h-full object-cover" alt={`${year} highlight`} />
                      ) : (
                        <div className="w-full h-full bg-stone-300" />
                      )}
                    </div>
                  </div>
                </div>
                <span className="text-[11px] md:text-[13px] font-medium text-stone-600 mt-2 tracking-wide group-hover:text-stone-900 transition-colors duration-300">
                  {year}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. 포스트 그리드 헤더 */}
      <div className="flex justify-center border-t border-stone-200 mb-2">
        <div className="flex items-center gap-2 border-t border-stone-800 py-3 text-stone-800 uppercase tracking-widest text-[10px] font-bold">
          <Grid size={14} /> POSTS
        </div>
      </div>
      
      {/* 5. 포스트 그리드 */}
      <div className="grid grid-cols-3 md:grid-cols-4 gap-1 md:gap-2">
        {timeline.map((event) => (
          <div 
            key={event.id} 
            onClick={() => onPostClick(event)}
            className="relative aspect-square bg-stone-100 overflow-hidden group cursor-pointer rounded-sm md:rounded-md shadow-sm"
          >
            {event.assets?.[0]?.asset_url ? (
              event.assets[0].asset_type === 'video' ? (
                <video src={event.assets[0].asset_url} className="w-full h-full object-cover" muted />
              ) : (
                <img src={event.assets[0].asset_url} className="w-full h-full object-cover" alt={event.title} />
              )
            ) : (
              <div className="w-full h-full bg-stone-200" />
            )}
            
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center p-3 backdrop-blur-[2px]">
              <span className="text-white text-xs font-bold truncate w-full mb-1 text-center px-1">{event.title}</span>
              <span className="text-white/80 text-[10px] flex items-center gap-1"><MapPin size={10} /> {event.location_name}</span>
            </div>
          </div>
        ))}
      </div>

      {/* 6. 하이라이트 모달 뷰어 */}
      {activeHighlightItems && currentItem && (
        <div 
          className="fixed inset-0 z-[100] bg-stone-950/90 flex items-center justify-center animate-fade-in backdrop-blur-sm"
          onClick={closeHighlight}
        >
          <div 
            className="relative w-full max-w-lg h-full md:h-[90vh] flex items-center justify-center cursor-default"
            onClick={(e) => e.stopPropagation()}
            onMouseEnter={() => setIsPaused(true)}  
            onMouseLeave={() => setIsPaused(false)} 
          >
            <div className="absolute top-0 inset-x-0 p-4 bg-gradient-to-b from-black/70 to-transparent z-[110]">
              <div className="flex gap-1 mb-4">
                {activeHighlightItems.map((_, index) => (
                  <div key={index} className="h-[2px] flex-1 bg-white/30 rounded-full overflow-hidden relative">
                    <div 
                      className="h-full bg-white rounded-full"
                      style={{
                        width: index === currentStoryIndex 
                          ? `${progress}%` 
                          : index < currentStoryIndex 
                          ? '100%' 
                          : '0%',
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
                <button 
                  onClick={closeHighlight} 
                  className="p-2 hover:bg-white/10 rounded-full transition-colors z-[120]"
                >
                  <X size={28} />
                </button>
              </div>
            </div>

            <div className="w-full h-full bg-stone-900 md:rounded-xl overflow-hidden relative flex items-center justify-center">
              {activeHighlightItems.map((item, index) => {
                const isCurrent = index === currentStoryIndex;
                if (!item.asset?.asset_url) return null;
                return (
                  <div
                    key={index}
                    className={`absolute inset-0 w-full h-full flex items-center justify-center transition-opacity duration-200 ${
                      isCurrent ? 'opacity-100 z-10' : 'opacity-0 -z-10 pointer-events-none'
                    }`}
                  >
                    {item.asset.asset_type === 'video' ? (
                      <video 
                        ref={(el) => { videoRefs.current[index] = el; }}
                        src={item.asset.asset_url} 
                        className="w-full h-full object-contain" 
                        preload="auto"
                        muted 
                        playsInline 
                        loop 
                      />
                    ) : (
                      <img 
                        src={item.asset.asset_url} 
                        className="w-full h-full object-contain" 
                        alt={`highlight-${index}`} 
                      />
                    )}
                  </div>
                );
              })}

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

            <button 
              onClick={(e) => { e.stopPropagation(); prevStory(); }}
              className={`absolute -left-16 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 text-white hover:bg-white/20 hidden lg:block transition-all ${currentStoryIndex === 0 ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
            >
              <ChevronLeft size={32} />
            </button>
            
            <button 
              onClick={(e) => { e.stopPropagation(); nextStory(); }}
              className="absolute -right-16 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 text-white hover:bg-white/20 hidden lg:block transition-all opacity-100"
            >
              <ChevronRight size={32} />
            </button>

            <div 
              className="absolute inset-y-0 left-0 w-1/3 z-[105] md:hidden" 
              onClick={prevStory}
              onTouchStart={() => setIsPaused(true)}
              onTouchEnd={() => setIsPaused(false)}
            />
            <div 
              className="absolute inset-y-0 right-0 w-2/3 z-[105] md:hidden" 
              onClick={nextStory}
              onTouchStart={() => setIsPaused(true)}
              onTouchEnd={() => setIsPaused(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}