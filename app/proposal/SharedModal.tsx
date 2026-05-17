'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin, Heart, ChevronLeft, ChevronRight, ArrowLeft, ArrowRight } from 'lucide-react';

interface SharedModalProps {
  timeline: any[];
  selectedEvent: any;
  setSelectedEvent: (event: any) => void;
  currentAssetIndex: number;
  setCurrentAssetIndex: (index: number | ((prev: number) => number)) => void;
  navigateTimeline: (direction: 'next' | 'prev') => void;
  likedEvents: number[];
  toggleLike: (id: number) => void;
}

export default function SharedModal({
  timeline,
  selectedEvent,
  setSelectedEvent,
  currentAssetIndex,
  setCurrentAssetIndex,
  navigateTimeline,
  likedEvents,
  toggleLike,
}: SharedModalProps) {
  if (!selectedEvent) return null;
  const currentAsset = selectedEvent.assets?.[currentAssetIndex];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* 아웃포커스 배경 슬라이드 백드롭 */}
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }}
        onClick={() => setSelectedEvent(null)}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      
      {/* 모달 박스 메인 바디 */}
      <motion.div 
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        className="relative w-full max-w-[420px] bg-[#fffdfb] rounded-[2.5rem] overflow-hidden shadow-[0_30px_70px_rgba(0,0,0,0.3)] border border-stone-100"
      >
        {/* 미디어 전용 3:4 스케일 상단 박스 */}
        <div className="relative aspect-[3/4] overflow-hidden bg-stone-900">
          <AnimatePresence mode="wait">
            <motion.div key={`${selectedEvent.id}-${currentAssetIndex}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full h-full">
              {currentAsset?.asset_url ? (
                currentAsset.asset_type === 'video' ? (
                  <video src={currentAsset.asset_url} className="w-full h-full object-cover" autoPlay muted loop playsInline />
                ) : (
                  <img src={currentAsset.asset_url} alt="Memory" className="w-full h-full object-cover" />
                )
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-stone-900"><div className="w-6 h-6 border-2 border-[#d4af37] border-t-transparent rounded-full animate-spin" /></div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* 에셋 체인저 */}
          {selectedEvent.assets?.length > 1 && (
            <div className="absolute inset-x-3 top-1/2 -translate-y-1/2 flex justify-between z-10 px-1">
              <button onClick={(e) => { e.stopPropagation(); setCurrentAssetIndex(prev => (prev - 1 + selectedEvent.assets.length) % selectedEvent.assets.length); }} className="p-2.5 rounded-full bg-white/80 backdrop-blur shadow-sm hover:bg-white transition-colors"><ChevronLeft size={18} className="text-stone-800" /></button>
              <button onClick={(e) => { e.stopPropagation(); setCurrentAssetIndex(prev => (prev + 1) % selectedEvent.assets.length); }} className="p-2.5 rounded-full bg-white/80 backdrop-blur shadow-sm hover:bg-white transition-colors"><ChevronRight size={18} className="text-stone-800" /></button>
            </div>
          )}
          <button onClick={() => setSelectedEvent(null)} className="absolute top-5 right-5 p-2 bg-black/40 text-white backdrop-blur-md rounded-full z-20 hover:bg-black/60 transition-colors"><X size={16} /></button>
        </div>

        {/* 텍스트 내용 기술 영역 */}
        <div className="p-6 lg:p-8">
          <div className="flex items-center gap-2 mb-3"><MapPin size={12} className="text-orange-300" /><span className="text-[10px] font-extrabold text-stone-400 uppercase tracking-[0.2em]">{selectedEvent.location_name}</span></div>
          <h3 className="text-xl lg:text-2xl font-bold text-stone-800 mb-2 lg:mb-3">{selectedEvent.title}</h3>
          <p className="text-stone-500/90 text-sm lg:text-[15px] leading-relaxed mb-6 lg:mb-8">{selectedEvent.content}</p>
          
          <div className="pt-5 border-t border-stone-100/60 flex flex-col gap-5">
            {/* 상하 흐름 제어 내비게이션 바 */}
            <div className="flex justify-between items-center bg-stone-50 p-1.5 rounded-2xl">
              <button onClick={() => navigateTimeline('prev')} disabled={timeline.findIndex((e: any) => e.id === selectedEvent.id) === 0} className="flex items-center gap-2 px-5 py-2 text-stone-400 disabled:opacity-20 hover:text-stone-800 transition-colors"><ArrowLeft size={14} /> <span className="text-[11px] font-bold tracking-widest">PREV</span></button>
              <div className="h-4 w-[1px] bg-stone-200" />
              <button onClick={() => navigateTimeline('next')} disabled={timeline.findIndex((e: any) => e.id === selectedEvent.id) === timeline.length - 1} className="flex items-center gap-2 px-5 py-2 text-stone-400 disabled:opacity-20 hover:text-stone-800 transition-colors"><span className="text-[11px] font-bold tracking-widest">NEXT</span> <ArrowRight size={14} /></button>
            </div>
            {/* 도트 바 및 좋아요 하트 */}
            <div className="flex justify-between items-center">
              <div className="flex gap-2.5">{selectedEvent.assets?.map((_: any, i: number) => <div key={i} className={`h-1.5 rounded-full transition-all duration-500 ${i === currentAssetIndex ? 'w-8 bg-orange-200' : 'w-1.5 bg-stone-100'}`} />)}</div>
              <motion.button whileTap={{ scale: 1.4 }} onClick={() => toggleLike(selectedEvent.id)}><Heart size={28} className={`transition-colors duration-300 ${likedEvents.includes(selectedEvent.id) ? 'text-rose-500 fill-rose-500' : 'text-stone-300'}`} /></motion.button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}