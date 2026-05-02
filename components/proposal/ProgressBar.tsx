import { motion } from 'framer-motion';
import { RotateCcw } from 'lucide-react';

interface ProgressBarProps {
  visitedCount: number;
  totalCount: number;
  onGoToStart: () => void;
}

export default function ProgressBar({ visitedCount, totalCount, onGoToStart }: ProgressBarProps) {
  return (
    <div className="absolute top-10 left-1/2 -translate-x-1/2 z-[50] flex flex-col items-center gap-3 w-80">
      <div className="bg-white/90 backdrop-blur-xl p-4 rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.08)] border border-orange-50 w-full">
        <div className="flex justify-between text-[10px] mb-2 font-bold text-stone-400 tracking-widest uppercase">
          <span>Our Journey</span>
          <span>{visitedCount} / {totalCount}</span>
        </div>
        <div className="w-full bg-stone-100 h-1.5 rounded-full overflow-hidden">
          <motion.div 
            className="bg-[#d4af37] h-full" 
            initial={{ width: 0 }}
            animate={{ width: `${(visitedCount / totalCount) * 100}%` }} 
          />
        </div>
      </div>
      <button 
        onClick={onGoToStart}
        className="flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-md rounded-full shadow-sm border border-orange-50 text-[11px] font-bold text-stone-500 hover:text-[#d4af37] transition-all active:scale-95"
      >
        <RotateCcw size={14} /> 처음 만난 날로
      </button>
    </div>
  );
}