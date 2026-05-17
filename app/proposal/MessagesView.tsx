'use client';

import { motion } from 'framer-motion';
import { MessageCircle } from 'lucide-react';

export default function MessagesView() {
  return (
    <div className="w-full h-full max-w-2xl mx-auto pt-10 px-6 lg:px-4 flex flex-col overflow-hidden">
      <div className="px-2 mb-8 shrink-0">
        <h2 className="text-xl font-bold text-stone-800 flex items-center gap-2">
          <MessageCircle size={22} className="text-[#d4af37]" /> Dear. Us
        </h2>
        <p className="text-xs text-stone-500 mt-1.5">서로에게 전하는 소중한 메시지나 방명록을 기록하는 공간입니다. ✨</p>
      </div>

      {/* 메시지 리스트 영역 (스크롤 가능) */}
      <div className="flex-1 overflow-y-auto pb-24 lg:pb-12 px-2 flex flex-col gap-4">
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-5 rounded-2xl border border-stone-100 shadow-sm"
        >
          <div className="flex justify-between items-center mb-3">
            <span className="font-bold text-sm text-stone-700">익명의 축하객</span>
            <span className="text-[10px] text-stone-400">2026.05.17</span>
          </div>
          <p className="text-stone-600 text-sm leading-relaxed">
            [메시지 샘플] 두 분의 소중한 앞날을 진심으로 축하합니다! 평생 예쁜 사랑 하세요 🤍
          </p>
        </motion.div>
        
        <div className="text-center text-xs text-stone-400 mt-8">
          나중에 이 자리에 Supabase DB와 연동하여 <br />
          방명록 작성 폼과 리스트를 연결해 보세요!
        </div>
      </div>
    </div>
  );
}