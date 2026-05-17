'use client';

import { motion } from 'framer-motion';
import { Heart } from 'lucide-react';

export default function HomeView() {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-6 bg-[#faf7f5]">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="text-center flex flex-col items-center gap-6"
      >
        <div className="relative">
          <Heart size={48} className="text-rose-300 animate-pulse fill-rose-100" />
        </div>
        
        <h1 className="text-3xl lg:text-4xl font-serif font-bold tracking-widest text-stone-800">
          OUR BEAUTIFUL STORY
        </h1>
        
        <p className="text-stone-400 font-medium tracking-wide max-w-sm leading-relaxed text-sm">
          여기에 두 분의 특별한 메인 소개글이나 <br />
          디데이 카운트다운 등을 자유롭게 꾸며보세요. 🤍
        </p>
      </motion.div>
    </div>
  );
}