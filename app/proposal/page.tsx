'use client';

import '@/styles/map-style.css'; // 분리한 CSS 임포트
import { useEffect, useState, useRef, useCallback } from 'react';
import { GoogleMap, useJsApiLoader } from '@react-google-maps/api';
import { MarkerClusterer } from '@googlemaps/markerclusterer';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin, Heart, ChevronLeft, ChevronRight, ArrowLeft, ArrowRight, RotateCcw } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const libraries: any = ['marker'];

export default function ProposalPage() {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
    libraries: libraries,
  });

  const [timeline, setTimeline] = useState<any[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [currentAssetIndex, setCurrentAssetIndex] = useState(0);
  const [visitedIds, setVisitedIds] = useState<number[]>([]);
  const [likedEvents, setLikedEvents] = useState<number[]>([]);
  const [mapCenter, setMapCenter] = useState({ lat: 49.2827, lng: -123.1207 });
  
  const mapRef = useRef<google.maps.Map | null>(null);
  const clustererRef = useRef<MarkerClusterer | null>(null);
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);

  // 데이터 페칭
  useEffect(() => {
    const fetchData = async () => {
      const { data } = await supabase
        .from('timeline')
        .select(`*, assets:timeline_assets(asset_url, asset_type)`)
        .order('event_date', { ascending: true });
      if (data) {
        setTimeline(data);
        if (data.length > 0) {
            setSelectedEvent(data[0]);
            setVisitedIds([data[0].id]);
        }
      }
    };
    fetchData();
  }, []);

  // 마커 클릭 핸들러
  const handleMarkerClick = useCallback((event: any) => {
    const newPos = { lat: Number(event.lat), lng: Number(event.lng) };
    setSelectedEvent(event);
    setCurrentAssetIndex(0);
    setMapCenter(newPos);
    if (!visitedIds.includes(event.id)) setVisitedIds(prev => [...prev, event.id]);
    mapRef.current?.panTo(newPos);
    mapRef.current?.setZoom(16);
  }, [visitedIds]);

  // 처음으로 버튼
  const goToStart = () => {
    if (timeline.length > 0) handleMarkerClick(timeline[0]);
  };

  // 좋아요 토글
  const toggleLike = (id: number) => {
    setLikedEvents(prev => 
      prev.includes(id) ? prev.filter(itemId => itemId !== id) : [...prev, id]
    );
  };

  // 다음/이전 네비게이션
  const navigateTimeline = (direction: 'next' | 'prev') => {
    const currentIndex = timeline.findIndex(e => e.id === selectedEvent.id);
    let nextIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
    if (nextIndex >= 0 && nextIndex < timeline.length) {
      handleMarkerClick(timeline[nextIndex]);
    }
  };

  // 마커 및 클러스터러 생성 로직
  useEffect(() => {
    if (!isLoaded || !mapRef.current || timeline.length === 0) return;

    if (clustererRef.current) clustererRef.current.clearMarkers();
    markersRef.current = [];

    const newMarkers = timeline.map((event) => {
      const img = document.createElement('img');
      img.src = event.assets?.[0]?.asset_url || '';
      img.className = 'custom-marker-img';
      
      const marker = new google.maps.marker.AdvancedMarkerElement({
        position: { lat: Number(event.lat), lng: Number(event.lng) },
        content: img,
      });

      marker.addListener('click', () => handleMarkerClick(event));
      markersRef.current.push(marker);
      return marker;
    });

    clustererRef.current = new MarkerClusterer({
      map: mapRef.current,
      markers: newMarkers,
      renderer: {
        render: ({ count, position }) => {
          return new google.maps.marker.AdvancedMarkerElement({
            position,
            content: (() => {
              const div = document.createElement('div');
              div.className = 'custom-cluster-heart';
              div.innerHTML = `
                <svg viewBox="0 0 32 32" class="heart-svg">
                  <path d="M16 28.5L13.65 26.35C5.4 18.85 0 13.95 0 8C0 3.1 3.85 0 8.5 0C11.15 0 13.65 1.25 15.5 3.25C17.35 1.25 19.85 0 22.5 0C27.15 0 31 3.1 31 8C31 13.95 25.6 18.85 17.35 26.35L16 28.5Z" fill="#ffb7c5" stroke="white" stroke-width="2"/>
                </svg>
                <span class="cluster-count">${count}</span>
              `;
              return div;
            })(),
          });
        }
      }
    });
  }, [isLoaded, timeline, handleMarkerClick]);

  if (!isLoaded) return null;

  const currentAsset = selectedEvent?.assets?.[currentAssetIndex];

  return (
    <main className="relative w-full h-screen bg-[#faf7f5] overflow-hidden">
      
      {/* [살려낸 부분 1] 상단 프로그레스 UI */}
      <div className="absolute top-10 left-1/2 -translate-x-1/2 z-[50] flex flex-col items-center gap-3 w-80">
        <div className="bg-white/90 backdrop-blur-xl p-4 rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.08)] border border-orange-50 w-full">
          <div className="flex justify-between text-[10px] mb-2 font-bold text-stone-400 tracking-widest uppercase">
            <span>Our Journey</span>
            <span>{visitedIds.length} / {timeline.length}</span>
          </div>
          <div className="w-full bg-stone-100 h-1.5 rounded-full overflow-hidden">
            <motion.div 
              className="bg-[#d4af37] h-full" 
              initial={{ width: 0 }}
              animate={{ width: `${(visitedIds.length / timeline.length) * 100}%` }} 
            />
          </div>
        </div>
        <button onClick={goToStart} className="flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-md rounded-full shadow-sm border border-orange-50 text-[11px] font-bold text-stone-500 hover:text-[#d4af37] transition-all">
          <RotateCcw size={14} /> 처음 만난 날로
        </button>
      </div>

      {/* 지도 영역 */}
      <GoogleMap
        mapContainerStyle={{ width: '100%', height: '100vh' }}
        center={mapCenter}
        zoom={14}
        onLoad={(map) => { mapRef.current = map; }}
        options={{ 
            disableDefaultUI: true, 
            mapId: process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID 
        }}
      />

      {/* [살려낸 부분 2] 이벤트 카드 상세 UI */}
      <AnimatePresence>
        {selectedEvent && (
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
                    key={`${selectedEvent.id}-${currentAssetIndex}`}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="w-full h-full"
                  >
                    {currentAsset?.asset_url ? (
                      currentAsset.asset_type === 'video' ? (
                        <video src={currentAsset.asset_url} className="w-full h-full object-cover" autoPlay muted loop playsInline />
                      ) : (
                        <img src={currentAsset.asset_url} alt="Memory" className="w-full h-full object-cover" />
                      )
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-stone-50">
                        <div className="w-6 h-6 border-2 border-[#d4af37] border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>

                {selectedEvent.assets?.length > 1 && (
                  <div className="absolute inset-x-3 top-1/2 -translate-y-1/2 flex justify-between z-10 px-1">
                    <button onClick={() => setCurrentAssetIndex(prev => (prev - 1 + selectedEvent.assets.length) % selectedEvent.assets.length)} className="p-2.5 rounded-full bg-white/80 backdrop-blur shadow-sm"><ChevronLeft size={18} /></button>
                    <button onClick={() => setCurrentAssetIndex(prev => (prev + 1) % selectedEvent.assets.length)} className="p-2.5 rounded-full bg-white/80 backdrop-blur shadow-sm"><ChevronRight size={18} /></button>
                  </div>
                )}
                <button onClick={() => setSelectedEvent(null)} className="absolute top-5 right-5 p-2 bg-white/60 backdrop-blur-md rounded-full z-20"><X size={16} /></button>
              </div>

              <div className="p-8">
                <div className="flex items-center gap-2 mb-3">
                  <MapPin size={12} className="text-orange-300" />
                  <span className="text-[10px] font-extrabold text-stone-400 uppercase tracking-[0.2em]">{selectedEvent.location_name}</span>
                </div>
                <h3 className="text-2xl font-bold text-stone-800 mb-3">{selectedEvent.title}</h3>
                <p className="text-stone-500/90 text-[15px] leading-relaxed mb-8">{selectedEvent.content}</p>
                
                <div className="pt-6 border-t border-stone-100/60 flex flex-col gap-6">
                  <div className="flex justify-between items-center bg-stone-50 p-1.5 rounded-2xl">
                    <button onClick={() => navigateTimeline('prev')} disabled={timeline.findIndex(e => e.id === selectedEvent.id) === 0} className="flex items-center gap-2 px-5 py-2 text-stone-400 disabled:opacity-20 hover:text-stone-800 transition-colors">
                      <ArrowLeft size={14} /> <span className="text-[11px] font-bold tracking-widest">PREV</span>
                    </button>
                    <div className="h-4 w-[1px] bg-stone-200" />
                    <button onClick={() => navigateTimeline('next')} disabled={timeline.findIndex(e => e.id === selectedEvent.id) === timeline.length - 1} className="flex items-center gap-2 px-5 py-2 text-stone-400 disabled:opacity-20 hover:text-stone-800 transition-colors">
                      <span className="text-[11px] font-bold tracking-widest">NEXT</span> <ArrowRight size={14} />
                    </button>
                  </div>

                  <div className="flex justify-between items-center">
                    <div className="flex gap-2.5">
                      {selectedEvent.assets?.map((_: any, i: number) => (
                        <div key={i} className={`h-1.5 rounded-full transition-all duration-500 ${i === currentAssetIndex ? 'w-8 bg-orange-200' : 'w-1.5 bg-stone-100'}`} />
                      ))}
                    </div>
                    <motion.button whileTap={{ scale: 1.4 }} onClick={() => toggleLike(selectedEvent.id)}>
                      <Heart size={28} className={`transition-colors duration-300 ${likedEvents.includes(selectedEvent.id) ? 'text-rose-500 fill-rose-500' : 'text-stone-300'}`} />
                    </motion.button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}