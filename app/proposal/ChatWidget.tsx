'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, X, Heart } from 'lucide-react';

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    // left-6에서 right-6로 변경하여 오른쪽 하단에 고정
    <div className="fixed bottom-24 lg:bottom-10 right-6 z-[100] flex flex-col items-end">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            // 오른쪽 아래를 기준으로 팝업이 커지도록 transformOrigin을 bottom right로 변경
            initial={{ opacity: 0, scale: 0.8, y: 20, transformOrigin: 'bottom right' }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            className="mb-4 w-[320px] bg-white rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-rose-100 overflow-hidden flex flex-col"
          >
            {/* 채팅창 헤더 */}
            <div className="bg-rose-50 p-4 flex justify-between items-center border-b border-rose-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-rose-200 flex items-center justify-center">
                  <Heart size={14} className="text-white fill-white" />
                </div>
                <span className="text-sm font-bold text-rose-500">Love Agent</span>
              </div>
              <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-rose-100 rounded-full transition-colors">
                <X size={18} className="text-rose-400" />
              </button>
            </div>

            {/* 채팅 내용 영역 */}
            <div className="h-80 p-4 overflow-y-auto flex flex-col gap-3 bg-[#fffafb]">
              <div className="bg-white p-3 rounded-2xl rounded-bl-none shadow-sm border border-rose-50 max-w-[80%]">
                <p className="text-xs text-stone-600 leading-relaxed">
                  안녕! 우리의 소중한 기록들을 잘 둘러보고 있니? 궁금한 게 있다면 언제든 물어봐 🤍
                </p>
              </div>
              <div className="self-end bg-rose-400 p-3 rounded-2xl rounded-br-none shadow-sm max-w-[80%]">
                <p className="text-xs text-white leading-relaxed">
                  우리가 처음 만난 날이 언제였지?
                </p>
              </div>
              <div className="bg-white p-3 rounded-2xl rounded-bl-none shadow-sm border border-rose-50 max-w-[80%]">
                <p className="text-xs text-stone-600 leading-relaxed">
                  우리의 이야기는 2023년 어느 따뜻한 날, 밴쿠버의 한 카페에서 시작되었어! 지도 탭의 첫 번째 마커를 확인해봐. ☕️
                </p>
              </div>
            </div>

            {/* 채팅 입력창 */}
            <div className="p-4 bg-white border-t border-rose-50">
              <div className="flex items-center gap-2 bg-stone-50 px-4 py-2 rounded-full border border-stone-100">
                <input 
                  type="text" 
                  placeholder="메시지 보내기..." 
                  className="bg-transparent text-xs flex-1 outline-none text-stone-600"
                />
                <button className="text-rose-400 hover:text-rose-500">
                  <Send size={16} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 핑크색 동그라미 디엠 아이콘 버튼 */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 bg-[#ffb7c5] rounded-full shadow-lg flex items-center justify-center text-white relative overflow-hidden group"
      >
        <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
        {isOpen ? <X size={24} /> : <Send size={24} className="ml-0.5 mt-0.5 rotate-[-20deg]" />}
      </motion.button>
    </div>
  );
}