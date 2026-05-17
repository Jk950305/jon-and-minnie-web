'use client';

import { Grid, MapPin } from 'lucide-react';

interface ProfileViewProps {
  timeline: any[];
  onPostClick: (event: any) => void;
}

export default function ProfileView({ timeline, onPostClick }: ProfileViewProps) {
  return (
    <div className="w-full max-w-2xl mx-auto pt-10 px-6 lg:px-4">
      {/* 헤더 프로필 요약 인포 */}
      <div className="flex items-center gap-10 md:gap-16 mb-10 px-2">
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
          <div><div className="text-base md:text-lg font-bold text-stone-800">{timeline.length}</div><div className="text-xs text-stone-400">Memories</div></div>
          <div><div className="text-base md:text-lg font-bold text-stone-800">2023 ~</div><div className="text-xs text-stone-400">Since</div></div>
        </div>
      </div>

      <div className="px-2 mb-10">
        <h2 className="text-sm font-bold text-stone-800">Our Lovestagram</h2>
        <p className="text-xs text-stone-500 mt-1.5">우리가 함께 걸어온 발자취들을 기록하는 공간 🤍</p>
      </div>

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
            
            {/* 호버 시 오버레이 디테일 */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center p-3 backdrop-blur-[2px]">
              <span className="text-white text-xs font-bold truncate w-full mb-1 text-center">{event.title}</span>
              <span className="text-white/80 text-[10px] flex items-center gap-1"><MapPin size={10} /> {event.location_name}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}