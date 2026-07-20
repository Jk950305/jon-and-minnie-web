'use client';

import { useState } from 'react';
import { Grid, MapPin, Heart, BadgeCheck } from 'lucide-react';
import HighlightModal from './HighlightModal'; 

interface ProfileViewProps {
  timeline: any[];
  toggleLike: (event: any) => Promise<void>;
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
    <div className="w-full max-w-5xl mx-auto pt-6 md:pt-12 px-4 md:px-6">
      
      {/* 상단 프로필 영역 */}
      <div className="max-w-3xl mx-auto w-full mb-6 md:mb-12">
        
        {/* [상단 로우] 프로필 이미지(좌) + 계정정보/스펙/데스크탑소개글(우) */}
        <div className="flex items-center gap-6 md:gap-16 mb-4 md:mb-0 px-1">
          
          {/* 좌측: 아바타 써클 */}
          <div className="shrink-0 w-20 h-20 md:w-32 md:h-32">
            <div className="w-full h-full rounded-full bg-gradient-to-tr from-amber-200 via-pink-400 to-rose-400 p-[2.5px] md:p-[3px] flex items-center justify-center shadow-sm">
              <div className="w-full h-full rounded-full bg-white p-[2.5px] flex items-center justify-center">
                <div className="w-full h-full rounded-full bg-stone-50 flex items-center justify-center border border-stone-100">
                  <Heart className="text-rose-400 fill-rose-400 w-7 h-7 md:w-9 md:h-9" />
                </div>
              </div>
            </div>
          </div>

          {/* 우측: 계정 정보 및 데스크탑용 바이오 기입란 */}
          <div className="flex-1 flex flex-col gap-2 md:gap-4 text-left">
            
            {/* ID & 인증 배지 */}
            <div className="flex items-center gap-1.5">
              <h2 className="text-lg md:text-2xl font-bold text-stone-900 tracking-wide font-sans truncate max-w-[180px] sm:max-w-none">
                jon_and_minnie
              </h2>
              <BadgeCheck className="text-[#0095f6] fill-[#0095f6] stroke-white shrink-0 w-[18px] h-[18px] md:w-[22px] md:h-[22px]" />
            </div>

            {/* 인스타 스펙 카운터 */}
            <div className="flex gap-4 md:gap-6 text-xs md:text-sm text-stone-600">
              <div>
                <span className="font-semibold text-stone-900">{timeline.length}</span> posts
              </div>
              <div>
                <span className="font-semibold text-stone-900">{highlights.length}</span> highlights
              </div>
              <div className="hidden sm:block text-stone-500">
                since <span className="font-semibold text-stone-900">2019.10.25</span>
              </div>
            </div>

            {/* [데스크탑 전용 소개글] 우측 정렬라인에 맞춰 자연스럽게 왼쪽 정렬됨 */}
            <div className="hidden md:block text-left text-sm space-y-0.5 pt-2"> 
              <span className="font-bold text-stone-900 block">Our Lovestagram</span>
              <p className="text-stone-500 font-normal leading-relaxed">
                우리가 함께 걸어온 발자취들을 기록하는 공간 🩷
              </p>
              <span className="block text-stone-400 text-[11px] font-medium tracking-wide pt-0.5">
                Followed by happiness
              </span>
            </div>

          </div>
        </div>

        {/* [모바일 전용 소개글] 모바일 화면에서는 이미지 아래로 떨어져서 노출 */}
        <div className="md:hidden text-left text-xs space-y-0.5 px-1 mt-4"> 
          <span className="font-bold text-stone-900 block">Our Lovestagram</span>
          <p className="text-stone-500 font-normal leading-relaxed">
            우리가 함께 걸어온 발자취들을 기록하는 공간 🩷
          </p>
          <span className="block text-stone-400 text-[11px] font-medium tracking-wide pt-0.5">
            Followed by happiness
          </span>
          <div className="text-[11px] text-stone-400 pt-1">
            since <span className="font-semibold text-stone-500">2019.10.25</span>
          </div>
        </div>

      </div>

      {/* Highlights Section */}
      {highlights.length > 0 && (
        <div className="max-w-3xl mx-auto w-full mb-2 border-b border-stone-100 pb-4">
          <div className="flex items-center justify-start gap-0 px-1 overflow-x-auto scrollbar-none w-full py-2">
            {highlights.map(({ year, items, coverUrl }) => (
              <div
                key={year}
                onClick={() => setModalData({ items, year })}
                className="flex flex-col items-center justify-center cursor-pointer group active:scale-95 transition-all duration-150 ease-out shrink-0 w-[68px] md:w-[92px]"
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

      {/* Posts Grid Title Bar */}
      <div className="flex justify-center border-t border-stone-200 mb-2">
        <div className="flex items-center gap-2 border-t border-stone-800 py-3 text-stone-800 uppercase tracking-widest text-[10px] font-bold">
          <Grid size={14} /> POSTS
        </div>
      </div>
      
      {/* Posts Grid Layout */}
      <div className="w-full grid grid-cols-3 md:grid-cols-4 gap-[3px] md:gap-2 pb-12">
        {timeline.map((event) => (
          <div 
            key={event.id} 
            onClick={() => onPostClick(event)}
            className="relative aspect-square bg-stone-100 overflow-hidden group cursor-pointer"
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
              <span className="text-white text-xs md:text-sm font-bold truncate w-full mb-1 text-center px-1">{event.title}</span>
              <span className="text-white/80 text-[10px] md:text-xs flex items-center gap-1"><MapPin size={12} /> {event.location_name}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Story Highlight Modal */}
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