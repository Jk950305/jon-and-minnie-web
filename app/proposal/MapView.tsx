'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { GoogleMap } from '@react-google-maps/api';
import { MarkerClusterer } from '@googlemaps/markerclusterer';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin, Heart, ChevronLeft, ChevronRight, ArrowLeft, ArrowRight, RotateCcw } from 'lucide-react';

interface MapViewProps {
  isLoaded: boolean;
  timeline: any[];
  likedEvents: number[];
  toggleLike: (id: number) => void;
  selectedEvent: any;
  setSelectedEvent: (event: any) => void;
  currentAssetIndex: number;
  setCurrentAssetIndex: (index: number | ((prev: number) => number)) => void;
  navigateTimeline: (direction: 'next' | 'prev') => void;
}

export default function MapView({
  isLoaded,
  timeline,
  likedEvents,
  toggleLike,
  selectedEvent,
  setSelectedEvent,
  currentAssetIndex,
  setCurrentAssetIndex,
  navigateTimeline,
}: MapViewProps) {
  const [visitedIds, setVisitedIds] = useState<number[]>([]);
  const [mapCenter, setMapCenter] = useState({ lat: 49.2827, lng: -123.1207 });
  const [hasInitialSelected, setHasInitialSelected] = useState(false);
  const [isMapReady, setIsMapReady] = useState(false); // 🔥 구글 맵이 렌더링 완료되었는지 감지하는 상태 추가

  const mapRef = useRef<google.maps.Map | null>(null);
  const clustererRef = useRef<MarkerClusterer | null>(null);
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);

  // 마커를 직접 클릭했을 때 핸들러 (의존성 최소화)
  const handleMarkerClick = useCallback((event: any) => {
    setSelectedEvent(event);
    setCurrentAssetIndex(0);
  }, [setSelectedEvent, setCurrentAssetIndex]);

  // 1. 탭 전환 후 지도가 완전히 준비되었을 때 딱 "한 번만" 첫 번째 이벤트를 열어줌
  useEffect(() => {
    if (isMapReady && timeline.length > 0 && !hasInitialSelected) {
      setSelectedEvent(timeline[0]);
      setHasInitialSelected(true);
    }
  }, [isMapReady, timeline, hasInitialSelected, setSelectedEvent]);

  // 2. selectedEvent가 변경될 때마다 구글 맵 위치와 visitedIds를 자동으로 동기화
  useEffect(() => {
    if (!mapRef.current || !selectedEvent) return;

    const nextPos = { lat: Number(selectedEvent.lat), lng: Number(selectedEvent.lng) };
    
    setMapCenter(nextPos);
    mapRef.current.panTo(nextPos);
    mapRef.current.setZoom(16);

    if (!visitedIds.includes(selectedEvent.id)) {
      setVisitedIds(prev => [...prev, selectedEvent.id]);
    }
  }, [selectedEvent]);

  const goToStart = () => {
    if (timeline.length > 0) handleMarkerClick(timeline[0]);
  };

  // 3. [핵심 수정] 구글 맵 마커 및 하트 클러스터러 렌더링 (isMapReady 상태 조건 결합으로 완벽 타이밍 보장)
  useEffect(() => {
    if (!isLoaded || !mapRef.current || !isMapReady || timeline.length === 0) return;
    
    // 기존 마커 및 클러스터러 클리어
    if (clustererRef.current) {
      clustererRef.current.clearMarkers();
    }
    markersRef.current = [];

    // 새로운 마커 인스턴스 배열 생성
    const newMarkers = timeline.map((event: any) => {
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

    // 하트 클러스터러 렌더링 바인딩
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
        },
      },
    });

    return () => {
      if (clustererRef.current) {
        clustererRef.current.clearMarkers();
      }
    };
  }, [isLoaded, isMapReady, timeline, handleMarkerClick]);

  if (!isLoaded) return null;
  const currentAsset = selectedEvent?.assets?.[currentAssetIndex];

  return (
    <>
      {/* 상단 프로그레스 UI */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 lg:left-auto lg:right-6 lg:translate-x-0 z-[50] flex flex-col items-center gap-3 w-80">
        <div className="bg-white/95 backdrop-blur-xl p-4 rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.06)] border border-orange-50 w-full">
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
        <button onClick={goToStart} className="flex items-center gap-2 px-4 py-2 bg-white/90 backdrop-blur-md rounded-full shadow-sm border border-orange-50 text-[11px] font-bold text-stone-500 hover:text-[#d4af37] transition-all">
          <RotateCcw size={14} /> 처음 만난 날로
        </button>
      </div>

      {/* 구글 맵 전체 영역 */}
      <GoogleMap
        mapContainerStyle={{ width: '100%', height: '100vh' }}
        center={mapCenter}
        zoom={14}
        onLoad={(map) => { 
          mapRef.current = map; 
          setIsMapReady(true); // 💡 구글 지도 로드 완료 신호를 활성화하여 마커 useEffect를 깨워줍니다.
        }}
        options={{ disableDefaultUI: true, mapId: process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID }}
      />

      {/* 상세 이벤트 카드 레이어 */}
      <AnimatePresence>
        {selectedEvent && (
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="absolute bottom-24 left-1/2 -translate-x-1/2 lg:bottom-auto lg:top-1/2 lg:-translate-y-1/2 lg:left-8 lg:translate-x-0 z-40 w-[92%] sm:w-[380px] lg:w-[420px] lg:max-w-none"
          >
            <div className="bg-[#fffdfb] rounded-[2.5rem] overflow-hidden shadow-[0_30px_70px_rgba(0,0,0,0.1)] border border-orange-50/50">
              
              {/* 이미지/비디오 에셋 미디어 박스 */}
              <div className="relative aspect-[1.1/1] lg:aspect-[3/4] overflow-hidden">
                <AnimatePresence mode="wait">
                  <motion.div key={`${selectedEvent.id}-${currentAssetIndex}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full h-full">
                    {currentAsset?.asset_url ? (
                      currentAsset.asset_type === 'video' ? (
                        <video src={currentAsset.asset_url} className="w-full h-full object-cover" autoPlay muted loop playsInline />
                      ) : (
                        <img src={currentAsset.asset_url} alt="Memory" className="w-full h-full object-cover" />
                      )
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-stone-50"><div className="w-6 h-6 border-2 border-[#d4af37] border-t-transparent rounded-full animate-spin" /></div>
                    )}
                  </motion.div>
                </AnimatePresence>

                {/* 다중 에셋 슬라이드 화살표 버튼 */}
                {selectedEvent.assets?.length > 1 && (
                  <div className="absolute inset-x-3 top-1/2 -translate-y-1/2 flex justify-between z-10 px-1">
                    <button onClick={() => setCurrentAssetIndex(prev => (prev - 1 + selectedEvent.assets.length) % selectedEvent.assets.length)} className="p-2.5 rounded-full bg-white/80 backdrop-blur shadow-sm hover:bg-white transition-colors"><ChevronLeft size={18} className="text-stone-800" /></button>
                    <button onClick={() => setCurrentAssetIndex(prev => (prev + 1) % selectedEvent.assets.length)} className="p-2.5 rounded-full bg-white/80 backdrop-blur shadow-sm hover:bg-white transition-colors"><ChevronRight size={18} className="text-stone-800" /></button>
                  </div>
                )}
                
                {/* 닫기(X) 버튼 */}
                <button onClick={() => setSelectedEvent(null)} className="absolute top-5 right-5 p-2 bg-white/70 backdrop-blur-md rounded-full z-20 hover:bg-white shadow-sm transition-colors"><X size={16} className="text-stone-700" /></button>
              </div>

              {/* 텍스트 내용 기술 바디 */}
              <div className="p-6 lg:p-8">
                <div className="flex items-center gap-2 mb-3"><MapPin size={12} className="text-orange-300" /><span className="text-[10px] font-extrabold text-stone-400 uppercase tracking-[0.2em]">{selectedEvent.location_name}</span></div>
                <h3 className="text-xl lg:text-2xl font-bold text-stone-800 mb-2 lg:mb-3">{selectedEvent.title}</h3>
                <p className="text-stone-500/90 text-sm lg:text-[15px] leading-relaxed mb-6 lg:mb-8">{selectedEvent.content}</p>
                
                {/* 하단 제어 인터페이스 */}
                <div className="pt-5 border-t border-stone-100/60 flex flex-col gap-5">
                  {/* PREV / NEXT 내비게이션 트래커 */}
                  <div className="flex justify-between items-center bg-stone-50 p-1.5 rounded-2xl">
                    <button onClick={() => navigateTimeline('prev')} disabled={timeline.findIndex((e: any) => e.id === selectedEvent.id) === 0} className="flex items-center gap-2 px-5 py-2 text-stone-400 disabled:opacity-20 hover:text-stone-800 transition-colors"><ArrowLeft size={14} /> <span className="text-[11px] font-bold tracking-widest">PREV</span></button>
                    <div className="h-4 w-[1px] bg-stone-200" />
                    <button onClick={() => navigateTimeline('next')} disabled={timeline.findIndex((e: any) => e.id === selectedEvent.id) === timeline.length - 1} className="flex items-center gap-2 px-5 py-2 text-stone-400 disabled:opacity-20 hover:text-stone-800 transition-colors"><span className="text-[11px] font-bold tracking-widest">NEXT</span> <ArrowRight size={14} /></button>
                  </div>
                  {/* 슬라이드 인디케이터 도트 & 하트 좋아요 버튼 */}
                  <div className="flex justify-between items-center">
                    <div className="flex gap-2.5">{selectedEvent.assets?.map((_: any, i: number) => <div key={i} className={`h-1.5 rounded-full transition-all duration-500 ${i === currentAssetIndex ? 'w-8 bg-orange-200' : 'w-1.5 bg-stone-100'}`} />)}</div>
                    <motion.button whileTap={{ scale: 1.4 }} onClick={() => toggleLike(selectedEvent.id)}><Heart size={28} className={`transition-colors duration-300 ${likedEvents.includes(selectedEvent.id) ? 'text-rose-500 fill-rose-500' : 'text-stone-300'}`} /></motion.button>
                  </div>
                </div>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}