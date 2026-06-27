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
  const [isMapReady, setIsMapReady] = useState(false);

  const mapRef = useRef<google.maps.Map | null>(null);
  const clustererRef = useRef<MarkerClusterer | null>(null);
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);

  // Callback to set the active event and reset the image index when a user clicks a marker
  const handleMarkerClick = useCallback((event: any) => {
    setSelectedEvent(event);
    setCurrentAssetIndex(0);
  }, [setSelectedEvent, setCurrentAssetIndex]);

  // Automatically select the first event once the map is fully loaded
  useEffect(() => {
    if (isMapReady && timeline.length > 0 && !hasInitialSelected) {
      setSelectedEvent(timeline[0]);
      setHasInitialSelected(true);
    }
  }, [isMapReady, timeline, hasInitialSelected, setSelectedEvent]);

  // Update map center and zoom level whenever the selected event changes
  useEffect(() => {
    if (!mapRef.current || !selectedEvent) return;
    const nextPos = { lat: Number(selectedEvent.lat), lng: Number(selectedEvent.lng) };
    setMapCenter(nextPos);
    mapRef.current.panTo(nextPos);
    mapRef.current.setZoom(16);
    
    // Mark as visited for progress tracking
    if (!visitedIds.includes(selectedEvent.id)) {
      setVisitedIds(prev => [...prev, selectedEvent.id]);
    }
  }, [selectedEvent]);

  // Reset the view to the first event
  const goToStart = () => {
    if (timeline.length > 0) handleMarkerClick(timeline[0]);
  };

  // Initialize and render map markers and clustering
  useEffect(() => {
    if (!isLoaded || !mapRef.current || !isMapReady || timeline.length === 0) return;
    if (clustererRef.current) clustererRef.current.clearMarkers();
    markersRef.current = [];

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
      if (clustererRef.current) clustererRef.current.clearMarkers();
    };
  }, [isLoaded, isMapReady, timeline, handleMarkerClick]);

  if (!isLoaded) return null;
  const currentAsset = selectedEvent?.assets?.[currentAssetIndex];

  return (
    <>
      {/* Top UI Overlay: Progress tracker and Reset button */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 lg:left-auto lg:right-6 lg:translate-x-0 z-[50] flex flex-col items-center gap-3 w-80">
        <div className="bg-white/95 backdrop-blur-xl p-4 rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.06)] border border-orange-50 w-full">
          <div className="flex justify-between text-[10px] mb-2 font-bold text-stone-400 tracking-widest uppercase">
            <span>Our Journey</span>
            <span>{visitedIds.length} / {timeline.length}</span>
          </div>
          <div className="w-full bg-stone-100 h-1.5 rounded-full overflow-hidden">
            <motion.div className="bg-[#d4af37] h-full" initial={{ width: 0 }} animate={{ width: `${(visitedIds.length / timeline.length) * 100}%` }} />
          </div>
        </div>
        <button onClick={goToStart} className="flex items-center gap-2 px-4 py-2 bg-white/90 backdrop-blur-md rounded-full shadow-sm border border-orange-50 text-[11px] font-bold text-stone-500 hover:text-[#d4af37] transition-all">
          <RotateCcw size={14} /> Reset View
        </button>
      </div>

      <GoogleMap
        mapContainerStyle={{ width: '100%', height: '100vh' }}
        center={mapCenter}
        zoom={14}
        onLoad={(map) => { mapRef.current = map; setIsMapReady(true); }}
        options={{ disableDefaultUI: true, mapId: process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID }}
      />

      {/* Detail Modal: Slides up or appears on map based on screen size */}
      <AnimatePresence>
        {selectedEvent && (
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="absolute bottom-20 left-1/2 -translate-x-1/2 lg:bottom-auto lg:top-1/2 lg:-translate-y-1/2 lg:left-8 lg:translate-x-0 z-40 w-[90vw] sm:w-[320px] lg:w-[400px]"
          >
            {/* Modal layout with strict 60/25/15 height distribution */}
            <div className="bg-[#fffdfb] rounded-[2.5rem] overflow-hidden shadow-[0_30px_70px_rgba(0,0,0,0.1)] border border-orange-50/50 flex flex-col h-[650px] lg:h-[850px] min-h-0">
              
              {/* Media Section (60%): Images or Videos */}
              <div className="relative flex-[0.6_0.6_60%] w-full overflow-hidden bg-stone-100">
                <AnimatePresence mode="wait">
                  <motion.div key={`${selectedEvent.id}-${currentAssetIndex}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full h-full">
                    {currentAsset?.asset_url ? (
                      currentAsset.asset_type === 'video' ? (
                        <video src={currentAsset.asset_url} className="w-full h-full object-cover" autoPlay muted loop playsInline />
                      ) : (
                        <img src={currentAsset.asset_url} alt="Memory" className="w-full h-full object-cover" />
                      )
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"><div className="w-6 h-6 border-2 border-[#d4af37] border-t-transparent rounded-full animate-spin" /></div>
                    )}
                  </motion.div>
                </AnimatePresence>
                
                {/* Navigation arrows for assets */}
                {selectedEvent.assets?.length > 1 && (
                  <div className="absolute inset-x-3 top-1/2 -translate-y-1/2 flex justify-between z-10 px-1">
                    <button onClick={() => setCurrentAssetIndex(prev => (prev - 1 + selectedEvent.assets.length) % selectedEvent.assets.length)} className="p-2.5 rounded-full bg-white/80 backdrop-blur shadow-sm hover:bg-white"><ChevronLeft size={18} /></button>
                    <button onClick={() => setCurrentAssetIndex(prev => (prev + 1) % selectedEvent.assets.length)} className="p-2.5 rounded-full bg-white/80 backdrop-blur shadow-sm hover:bg-white"><ChevronRight size={18} /></button>
                  </div>
                )}
                <button onClick={() => setSelectedEvent(null)} className="absolute top-5 right-5 p-2 bg-white/70 backdrop-blur-md rounded-full z-20 hover:bg-white"><X size={16} /></button>
              </div>

              {/* Text Section (25%): Location and Description */}
              <div className="flex-[0.25_0.25_25%] overflow-y-auto p-8 lg:p-10">
                <div className="flex items-center gap-2 mb-2"><MapPin size={14} className="text-orange-300" /><span className="text-[11px] font-extrabold text-stone-400 uppercase tracking-[0.2em]">{selectedEvent.location_name}</span></div>
                <h3 className="text-2xl font-bold text-stone-800 mb-4">{selectedEvent.title}</h3>
                <p className="text-stone-500/90 text-sm leading-relaxed">{selectedEvent.content}</p>
              </div>

              {/* Footer Section (15%): Timeline navigation and interaction */}
              <div className="flex-[0.15_0.15_15%] p-6 border-t border-stone-100 bg-[#fffdfb] flex flex-col justify-center">
                <div className="flex flex-col gap-3">
                  <div className="flex justify-between items-center bg-stone-50 p-1 rounded-2xl">
                    <button onClick={() => navigateTimeline('prev')} disabled={timeline.findIndex((e: any) => e.id === selectedEvent.id) === 0} className="flex items-center gap-2 px-4 py-2 text-stone-400 disabled:opacity-20 hover:text-stone-800"><ArrowLeft size={14} /> <span className="text-[10px] font-bold">PREV</span></button>
                    <button onClick={() => navigateTimeline('next')} disabled={timeline.findIndex((e: any) => e.id === selectedEvent.id) === timeline.length - 1} className="flex items-center gap-2 px-4 py-2 text-stone-400 disabled:opacity-20 hover:text-stone-800"><span className="text-[10px] font-bold">NEXT</span> <ArrowRight size={14} /></button>
                  </div>
                  <div className="flex justify-between items-center px-1">
                    <div className="flex gap-2">{selectedEvent.assets?.map((_: any, i: number) => <div key={i} className={`h-1 rounded-full ${i === currentAssetIndex ? 'w-6 bg-orange-300' : 'w-1 bg-stone-200'}`} />)}</div>
                    <motion.button whileTap={{ scale: 1.2 }} onClick={() => toggleLike(selectedEvent.id)}><Heart size={22} className={`transition-colors ${likedEvents.includes(selectedEvent.id) ? 'text-rose-500 fill-rose-500' : 'text-stone-300'}`} /></motion.button>
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