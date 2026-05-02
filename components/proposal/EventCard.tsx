import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin, Heart, ChevronLeft, ChevronRight, ArrowLeft, ArrowRight } from 'lucide-react';

interface EventCardProps {
  event: any;
  currentAssetIndex: number;
  setCurrentAssetIndex: (idx: any) => void;
  onClose: () => void;
  onNavigate: (dir: 'next' | 'prev') => void;
  onLike: (id: number) => void;
  isLiked: boolean;
  isFirst: boolean;
  isLast: boolean;
  totalAssets: number;
}

export default function EventCard({ 
  event, currentAssetIndex, setCurrentAssetIndex, onClose, onNavigate, onLike, isLiked, isFirst, isLast, totalAssets 
}: EventCardProps) {
  const currentAsset = event.assets?.[currentAssetIndex];

  return (
    <motion.div 
      initial={{ y: 20, opacity: 0, x: '-50%' }}
      animate={{ y: 0, opacity: 1, x: '-50%' }}
      exit={{ y: 20, opacity: 0, x: '-50%' }}
      className="absolute bottom-16 left-1/2 z-40 w-[92%] max-w-[400px]"
    >
      <div className="bg-[#fffdfb] rounded-[2.5rem] overflow-hidden shadow-[0_30px_70px_rgba(0,0,0,0.1)] border border-orange-50/50">
        <div className="relative aspect-[1.1/1] overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div 
              key={`${event.id}-${currentAssetIndex}`}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="w-full h-full"
            >
              {currentAsset?.asset_type === 'video' ? (
                <video src={currentAsset.asset_url} className="w-full h-full object-cover" autoPlay muted loop playsInline />
              ) : (
                <img src={currentAsset?.asset_url} alt="Memory" className="w-full h-full object-cover" />
              )}
            </motion.div>
          </AnimatePresence>

          {totalAssets > 1 && (
            <div className="absolute inset-x-3 top-1/2 -translate-y-1/2 flex justify-between z-10 px-1">
              <button onClick={() => setCurrentAssetIndex((prev: number) => (prev - 1 + totalAssets) % totalAssets)} className="p-2.5 rounded-full bg-white/80 backdrop-blur shadow-sm text-stone-800"><ChevronLeft size={18} /></button>
              <button onClick={() => setCurrentAssetIndex((prev: number) => (prev + 1) % totalAssets)} className="p-2.5 rounded-full bg-white/80 backdrop-blur shadow-sm text-stone-800"><ChevronRight size={18} /></button>
            </div>
          )}
          <button onClick={onClose} className="absolute top-5 right-5 p-2 bg-white/60 backdrop-blur-md text-stone-500 rounded-full z-20"><X size={16} /></button>
        </div>

        <div className="p-8">
          <div className="flex items-center gap-2 mb-3">
            <MapPin size={12} className="text-orange-300" />
            <span className="text-[10px] font-extrabold text-stone-400 uppercase tracking-[0.2em]">{event.location_name}</span>
          </div>
          <h3 className="text-2xl font-bold text-stone-800 mb-3 tracking-tight">{event.title}</h3>
          <p className="text-stone-500/90 text-[15px] leading-relaxed mb-8 font-medium">{event.content}</p>
          
          <div className="pt-6 border-t border-stone-100/60 flex flex-col gap-6">
            <div className="flex justify-between items-center bg-stone-50 p-1.5 rounded-2xl">
              <button onClick={() => onNavigate('prev')} disabled={isFirst} className="flex items-center gap-2 px-5 py-2 text-stone-400 disabled:opacity-20"><ArrowLeft size={14} /><span className="text-[11px] font-bold">PREV</span></button>
              <div className="h-4 w-[1px] bg-stone-200" />
              <button onClick={() => onNavigate('next')} disabled={isLast} className="flex items-center gap-2 px-5 py-2 text-stone-400 disabled:opacity-20"><span className="text-[11px] font-bold">NEXT</span><ArrowRight size={14} /></button>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex gap-2.5">
                {event.assets?.map((_: any, i: number) => (
                  <div key={i} className={`h-1.5 rounded-full transition-all duration-500 ${i === currentAssetIndex ? 'w-8 bg-orange-200' : 'w-1.5 bg-stone-100'}`} />
                ))}
              </div>
              <motion.button whileTap={{ scale: 1.4 }} onClick={() => onLike(event.id)}>
                <Heart size={28} className={`transition-colors ${isLiked ? 'text-rose-500 fill-rose-500' : 'text-stone-300'}`} />
              </motion.button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}