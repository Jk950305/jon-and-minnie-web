'use client';

import { useState, useEffect } from 'react';
import { Grid, MapPin, X, ChevronLeft, ChevronRight } from 'lucide-react';

interface ProfileViewProps {
  timeline: any[];
  onPostClick: (event: any) => void;
}

// 하이라이트 슬라이드 내에서 개별 미디어와 부모 이벤트 정보를 함께 관리하기 위한 인터페이스
interface HighlightItem {
  asset: any;
  eventTitle: string;
  eventContent: string;
  eventLocation: string;
  eventDate: string;
}

export default function ProfileView({ timeline, onPostClick }: ProfileViewProps) {
  // --- 하이라이트 모달 관련 상태 ---
  const [activeHighlightItems, setActiveHighlightItems] = useState<HighlightItem[] | null>(null);
  const [currentStoryIndex, setCurrentStoryIndex] = useState<number>(0);
  const [activeYear, setActiveYear] = useState<string>('');

  // 1. 타임라인 데이터를 년도별로 묶어 하이라이트 데이터 생성하는 함수
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

      // 이벤트 안의 모든 assets를 추출하여 하이라이트 아이템 배열에 하나씩 펼쳐서 넣어줍니다.
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

  // 2. 하이라이트 클릭 시 핸들러
  const handleHighlightClick = (year: string, items: HighlightItem[]) => {
    setActiveYear(year);
    setActiveHighlightItems(items);
    setCurrentStoryIndex(0);
  };

  // 3. 스토리 넘기기 제어
  const nextStory = () => {
    if (!activeHighlightItems) return;
    if (currentStoryIndex < activeHighlightItems.length - 1) {
      setCurrentStoryIndex((prev) => prev + 1);
    } else {
      closeHighlight();
    }
  };

  const prevStory = () => {
    if (currentStoryIndex > 0) {
      setCurrentStoryIndex((prev) => prev - 1);
    }
  };

  const closeHighlight = () => {
    setActiveHighlightItems(null);
  };

  // 모달 오픈 시 배경 스크롤 방지
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
    <div className="w-full max-w-2xl mx-auto pt-10 px-6 lg:px-4">
      {/* 헤더 프로필 요약 인포 */}
      <div className="flex items-center gap-10 md:gap-16 mb-8 px-2">
        <div className="w-20 h-20 md:w-28 md:h-28 rounded-full bg-gradient-to-tr from-amber-200 to-rose-400 p-[3px] shrink-0">
          <div className="w-full h-full rounded-full bg-white p-1">
            <div className="w-full h-full rounded-full bg-stone-200 overflow-hidden">
              {timeline[0]?.assets?.[0]?.asset_url && (
                <img src={timeline[0].assets[0].asset_url} className="w-full h-full object-cover" alt="Profile" />
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-8 text-center">
          <div>
            <div className="text-base md:text-lg font-bold text-stone-800">{timeline.length}</div>
            <div className="text-xs text-stone-400">Memories</div>
          </div>
          <div>
            {/* 고정된 Static 날짜로 변경 완료 */}
            <div className="text-base md:text-lg font-bold text-stone-800">2019.10.25 ~</div>
            <div className="text-xs text-stone-400">Since</div>
          </div>
        </div>
      </div>

      {/* 소개글 섹션 */}
      <div className="px-2 mb-8">
        <h2 className="text-sm font-bold text-stone-800">Our Lovestagram</h2>
        <p className="text-xs text-stone-500 mt-1.5">우리가 함께 걸어온 발자취들을 기록하는 공간 🤍</p>
      </div>

      {/* 년도별 인스타그램 하이라이트 섹션 */}
      {highlights.length > 0 && (
        <div className="flex items-center gap-4 overflow-x-auto pb-6 px-2 scrollbar-none mb-4">
          {highlights.map(({ year, items, coverUrl }) => (
            <div
              key={year}
              onClick={() => handleHighlightClick(year, items)}
              className="flex flex-col items-center shrink-0 cursor-pointer group"
            >
              <div className="w-14 h-14 md:w-16 md:h-16 rounded-full border border-stone-200 p-[3px] group-hover:scale-105 transition-transform bg-stone-50">
                <div className="w-full h-full rounded-full bg-stone-200 overflow-hidden">
                  {coverUrl ? (
                    <img src={coverUrl} className="w-full h-full object-cover" alt={`${year} highlight`} />
                  ) : (
                    <div className="w-full h-full bg-stone-300" />
                  )}
                </div>
              </div>
              <span className="text-[11px] font-medium text-stone-600 mt-2 tracking-wide">
                {year}년
              </span>
            </div>
          ))}
        </div>
      )}

      {/* 탭 메뉴 구분선 */}
      <div className="flex justify-center border-t border-stone-200 mb-2">
        <div className="flex items-center gap-2 border-t border-stone-800 py-3 text-stone-800 uppercase tracking-widest text-[10px] font-bold">
          <Grid size={14} /> POSTS
        </div>
      </div>
      
      {/* 사진 그리드 */}
      <div className="grid grid-cols-3 gap-1 md:gap-2">
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
              <span className="text-white text-xs font-bold truncate w-full mb-1 text-center">{event.title}</span>
              <span className="text-white/80 text-[10px] flex items-center gap-1"><MapPin size={10} /> {event.location_name}</span>
            </div>
          </div>
        ))}
      </div>

      {/* 인스타그램 하이라이트 스토리 전체화면 뷰어 모달 */}
      {activeHighlightItems && currentItem && (
        <div className="fixed inset-0 z-50 bg-stone-950 flex items-center justify-center md:p-4 animate-fade-in">
          {/* 상단 인스타그램 스타일 게이지 및 정보 헤더 */}
          <div className="absolute top-0 inset-x-0 p-4 bg-gradient-to-b from-black/60 to-transparent z-10 max-w-lg mx-auto w-full">
            <div className="flex gap-1 mb-3">
              {activeHighlightItems.map((_, index) => (
                <div key={index} className="h-[2px] flex-1 bg-white/30 rounded-full overflow-hidden">
                  <div 
                    className={`h-full bg-white transition-all duration-300 ${
                      index === currentStoryIndex ? 'w-full' : index < currentStoryIndex ? 'w-full' : 'w-0'
                    }`} 
                  />
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between text-white">
              <div className="flex flex-col">
                <span className="font-bold text-sm">{activeYear}년 하이라이트</span>
                <span className="text-[11px] text-white/70 truncate max-w-[250px]">{currentItem.eventTitle}</span>
              </div>
              <button onClick={closeHighlight} className="p-1 text-white/80 hover:text-white">
                <X size={24} />
              </button>
            </div>
          </div>

          {/* 메인 미디어 컨테이너 */}
          <div className="relative w-full max-w-lg h-full md:h-[85vh] md:rounded-lg overflow-hidden flex items-center justify-center bg-stone-900">
            {currentItem.asset?.asset_url ? (
              currentItem.asset.asset_type === 'video' ? (
                <video 
                  src={currentItem.asset.asset_url} 
                  className="w-full h-full object-contain" 
                  autoPlay 
                  controls 
                  muted
                  playsInline
                />
              ) : (
                <img 
                  src={currentItem.asset.asset_url} 
                  className="w-full h-full object-contain" 
                  alt={currentItem.eventTitle} 
                />
              )
            ) : (
              <div className="text-white text-xs">표시할 미디어가 없습니다.</div>
            )}

            {/* 하단 위치 및 본문 정보 오버레이 */}
            <div className="absolute bottom-0 inset-x-0 p-6 bg-gradient-to-t from-black/80 via-black/40 to-transparent text-white flex flex-col gap-1.5 pt-12 z-10">
              {currentItem.eventLocation && (
                <span className="text-[11px] flex items-center gap-1 bg-white/20 px-2 py-0.5 rounded-full w-fit backdrop-blur-sm">
                  <MapPin size={10} /> {currentItem.eventLocation}
                </span>
              )}
              <p className="text-xs text-white/90 leading-relaxed whitespace-pre-wrap">{currentItem.eventContent}</p>
              <span className="text-[10px] text-white/50 mt-1">{currentItem.eventDate}</span>
            </div>
          </div>

          {/* 좌우 이동 버튼 (데스크톱용) */}
          {currentStoryIndex > 0 && (
            <button 
              onClick={prevStory} 
              className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 hidden md:block z-20"
            >
              <ChevronLeft size={24} />
            </button>
          )}
          <button 
            onClick={nextStory} 
            className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 hidden md:block z-20"
          >
            <ChevronRight size={24} />
          </button>

          {/* 모바일 터치 영역 분할 */}
          <div className="absolute inset-y-0 left-0 w-1/4 z-10 md:hidden" onClick={prevStory} />
          <div className="absolute inset-y-0 right-0 w-3/4 z-10 md:hidden" onClick={nextStory} />
        </div>
      )}
    </div>
  );
}