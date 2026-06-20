'use client';

import { useState } from 'react';
import { Grid, MapPin, Heart } from 'lucide-react';
import HighlightModal from './HighlightModal'; // 분리한 모달 파일 임포트

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
  // 모달을 제어하기 위한 간단한 상태
  const [modalData, setModalData] = useState<{ items: HighlightItem[], year: string } | null>(null);

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
                onClick={() => setModalData({ items, year })}
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

      {/* 6. 하이라이트 모달 뷰어 (분리된 컴포넌트 호출) */}
      {modalData && (
        <HighlightModal 
          items={modalData.items} 
          activeYear={modalData.year} 
          onClose={() => setModalData(null)} 
        />
      )}
    </div>
  );
}