'use client';

import { useRef, useEffect } from 'react';
import { motion, useMotionValue, animate } from 'framer-motion';
import { X, MapPin, Heart, ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Interface for SharedModal properties.
 * Controls the display of a single timeline event within a modal window.
 * * @param event - The specific post object containing assets, title, and liked status
 * @param onClose - Function to close the modal
 * @param currentAssetIndex - Current index of the media carousel
 * @param setCurrentAssetIndex - Function to update the media carousel index
 * @param toggleLike - Function to update the like status in DB
 * @param navigateTimeline - Function to cycle through next/prev timeline items
 * @param timeline - Array of all posts to determine next/prev availability
 * @param className - Styling wrapper for positioning (this is what ensures it behaves differently between Map View and Profile View)
 */
interface SharedModalProps {
  event: any;
  onClose: () => void;
  currentAssetIndex: number;
  setCurrentAssetIndex: (index: number | ((prev: number) => number)) => void;
  toggleLike: (event: any) => void;
  navigateTimeline: (direction: 'next' | 'prev') => void;
  timeline: any[];
  className?: string;
}

export default function SharedModal({
  event,
  onClose,
  currentAssetIndex,
  setCurrentAssetIndex,
  toggleLike,
  navigateTimeline,
  timeline,
  className,
}: SharedModalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartIndex = useRef(0);
  const x = useMotionValue(0);

  useEffect(() => {
    // Reset the animation position to 0 whenever the post (event.id) changes
    x.set(0);
  }, [event.id, x]);

  /**
   * Syncs the filmstrip position when the index changes.
   * Uses spring animation to snap to the exact frame width.
   */
  const handleIndexChange = (newIndex: number) => {
    if (containerRef.current) {
      const width = containerRef.current.offsetWidth;
      animate(x, -newIndex * width, { type: 'spring', stiffness: 300, damping: 30 });
    }
  };

  /**
   * Capture the index when the user starts dragging to track movement delta.
   */
  const handleDragStart = () => {
    dragStartIndex.current = currentAssetIndex;
  };

  /**
   * Logic to determine if the user dragged far enough to switch to next/prev slide.
   */
  const handleDragEnd = () => {
    if (!containerRef.current) return;
    const width = containerRef.current.offsetWidth;
    const offset = x.get();
    
    // Calculate how many indices the user moved based on drag offset
    const delta = Math.round(-offset / width) - dragStartIndex.current;
    
    // Ensure we only move one step at a time, keeping it within bounds
    const step = Math.max(-1, Math.min(1, delta));
    const nextIndex = Math.max(0, Math.min(dragStartIndex.current + step, (event?.assets?.length || 1) - 1));
    
    setCurrentAssetIndex(nextIndex);
    handleIndexChange(nextIndex);
  };

  return (
    <motion.div
      initial={{ y: 50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 50, opacity: 0 }}
      /* * className applies the exterior positioning based on parent (Map vs Profile). 
       * `max-w-[400px]` ensures it remains appropriately sized as a card on large screens. 
       */
      className={`${className} w-full max-w-[400px]`} 
    >
      {/* Main Container: Fixed height for consistent mobile/desktop look */}
      <div className="bg-[#fffdfb] rounded-[2.5rem] overflow-hidden shadow-[0_30px_70px_rgba(0,0,0,0.1)] border border-orange-50/50 flex flex-col h-[80vh] lg:h-[850px] w-full">        
        
        {/* Media Container: 
            Occupies top 60% of the modal.
            'aspect-square' forces the container to remain a perfect square.
            'flex-shrink-0' ensures height remains stable.
        */}
        <div 
          ref={containerRef} 
          className="relative flex-[0.6_0.6_60%] w-full flex-shrink-0 overflow-hidden bg-stone-100 touch-pan-x aspect-square"
        >
          
          {/* Asset Progress Indicators: Only show if there is more than one asset */}
          {event.assets && event.assets.length > 1 && (
            <div className="absolute top-4 inset-x-0 flex justify-center gap-1.5 z-20">
              {event.assets.map((_: any, i: number) => (
                <div 
                  key={i} 
                  className={`h-1 rounded-full transition-all ${i === currentAssetIndex ? 'w-6 bg-white' : 'w-2 bg-white/50'}`} 
                />
              ))}
            </div>
          )}

          {/* Draggable Media Carousel using Framer Motion */}
          <motion.div 
            className="flex w-full h-full"
            animate={
              event.assets && event.assets.length > 1 
                ? { cursor: 'grab' } 
                : { cursor: 'default' }
            }
            drag={event.assets && event.assets.length > 1 ? "x" : false}
            dragConstraints={{ 
              left: -((event.assets?.length || 1) - 1) * (containerRef.current?.offsetWidth || 0), 
              right: 0 
            }}
            style={{ x }}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            {/* Asset Rendering: Maps through assets or shows placeholder if missing */}
            {event.assets && event.assets.length > 0 ? (
              event.assets.map((asset: any, idx: number) => (
                <div key={idx} className="min-w-full h-full relative">
                  {asset.asset_type === 'video' ? (
                    <video 
                      src={asset.asset_url} 
                      className="w-full h-full object-cover" 
                      autoPlay 
                      muted 
                      loop 
                      playsInline 
                    />
                  ) : (
                    <img 
                      src={asset.asset_url} 
                      className="w-full h-full object-cover" 
                      alt={`Memory ${idx}`} 
                    />
                  )}
                </div>
              ))
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-stone-200 text-stone-400">
                No media available
              </div>
            )}
          </motion.div>
          
          {/* Navigation Arrows: Only show if there is more than one asset */}
          {event.assets?.length > 1 && (
            <div className="absolute inset-x-3 top-1/2 -translate-y-1/2 flex justify-between z-10 px-1 pointer-events-none">
              <button 
                onClick={() => {
                  const next = Math.max(0, currentAssetIndex - 1);
                  setCurrentAssetIndex(next);
                  handleIndexChange(next);
                }}
                disabled={currentAssetIndex === 0}
                className="p-3 rounded-full bg-black/30 backdrop-blur-md shadow-lg text-white hover:bg-black/50 transition-colors pointer-events-auto disabled:opacity-30"
              >
                <ChevronLeft size={22} />
              </button>
              <button 
                onClick={() => {
                  const next = Math.min(event.assets.length - 1, currentAssetIndex + 1);
                  setCurrentAssetIndex(next);
                  handleIndexChange(next);
                }}
                disabled={currentAssetIndex === event.assets.length - 1}
                className="p-3 rounded-full bg-black/30 backdrop-blur-md shadow-lg text-white hover:bg-black/50 transition-colors pointer-events-auto disabled:opacity-30"
              >
                <ChevronRight size={22} />
              </button>
            </div>
          )}

          {/* Close Button: Absolute top right */}
          <button 
            onClick={onClose} 
            className="absolute top-5 right-5 p-2.5 bg-black/30 backdrop-blur-md rounded-full z-20 text-white hover:bg-black/50 transition-colors pointer-events-auto"
          >
            <X size={20} />
          </button>

          {/* Like Button: Bottom right */}
          <motion.button 
            whileTap={{ scale: 1.2 }} 
            onClick={() => toggleLike(event)}
            className="absolute bottom-5 right-5 z-20 p-3 bg-black/20 backdrop-blur-md rounded-full text-white hover:bg-black/40 transition-colors"
          >
            <Heart 
              size={22} 
              className={`transition-colors ${event.liked ? 'text-rose-500 fill-rose-500' : 'text-white'}`} 
            />
          </motion.button>
        </div>

        {/* Text Content Area: Occupies bottom 40% */}
        <div className="flex-[0.4_0.4_40%] overflow-y-auto p-8 lg:p-10 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <MapPin size={14} className="text-orange-300" />
              <span className="text-[11px] font-extrabold text-stone-400 uppercase tracking-[0.2em]">
                {event.location_name}
              </span>
            </div>
            <h3 className="text-xl font-bold text-stone-800 mb-4">{event.title}</h3>
            <p className="text-stone-500/90 text-sm leading-relaxed">{event.content}</p>
          </div>

          {/* Footer Navigation: Switch between previous/next posts in timeline */}
          <div className="flex justify-between items-center bg-stone-50 p-1 rounded-2xl mt-6">
            <button 
              onClick={() => navigateTimeline('prev')} 
              disabled={timeline.findIndex((e: any) => e.id === event.id) === 0} 
              className="flex items-center gap-2 px-4 py-2 text-stone-400 disabled:opacity-20 hover:text-stone-800 transition-colors"
            >
              <ChevronLeft size={16} /> <span className="text-[10px] font-bold uppercase">Prev</span>
            </button>
            <button 
              onClick={() => navigateTimeline('next')} 
              disabled={timeline.findIndex((e: any) => e.id === event.id) === timeline.length - 1} 
              className="flex items-center gap-2 px-4 py-2 text-stone-400 disabled:opacity-20 hover:text-stone-800 transition-colors"
            >
              <span className="text-[10px] font-bold uppercase">Next</span> <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}