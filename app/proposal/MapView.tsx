'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { GoogleMap } from '@react-google-maps/api';
import { MarkerClusterer } from '@googlemaps/markerclusterer';
import { motion, AnimatePresence } from 'framer-motion';
import SharedModal from './SharedModal';

interface MapViewProps {
  isLoaded: boolean;
  timeline: any[];
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

  // Calculate current progress logic
  const selectedIndex = selectedEvent 
    ? timeline.findIndex((e) => e.id === selectedEvent.id) 
    : -1;
  const displayIndex = selectedIndex >= 0 ? selectedIndex + 1 : 0;
  const progressWidth = timeline.length > 0 ? (displayIndex / timeline.length) * 100 : 0;

  const handleMarkerClick = useCallback((event: any) => {
    setSelectedEvent(event);
    setCurrentAssetIndex(0);
  }, [setSelectedEvent, setCurrentAssetIndex]);

  useEffect(() => {
    if (isMapReady && timeline.length > 0 && !hasInitialSelected) {
      setSelectedEvent(timeline[0]);
      setHasInitialSelected(true);
    }
  }, [isMapReady, timeline, hasInitialSelected, setSelectedEvent]);

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

  // Initialize markers
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
              div.innerHTML = `<svg viewBox="0 0 32 32" class="heart-svg"><path d="M16 28.5L13.65 26.35C5.4 18.85 0 13.95 0 8C0 3.1 3.85 0 8.5 0C11.15 0 13.65 1.25 15.5 3.25C17.35 1.25 19.85 0 22.5 0C27.15 0 31 3.1 31 8C31 13.95 25.6 18.85 17.35 26.35L16 28.5Z" fill="#ffb7c5" stroke="white" stroke-width="2"/></svg><span class="cluster-count">${count}</span>`;
              return div;
            })(),
          });
        },
      },
    });

    return () => { if (clustererRef.current) clustererRef.current.clearMarkers(); };
  }, [isLoaded, isMapReady, timeline, handleMarkerClick]);

  if (!isLoaded) return null;

  return (
    <>
      {/* Top UI */}
      <div className="fixed top-6 left-1/2 -translate-x-1/2 lg:left-auto lg:right-6 lg:translate-x-0 z-[50] flex flex-col items-center gap-3 w-80">
        <div className="bg-white/95 backdrop-blur-xl p-4 rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.06)] border border-orange-50 w-full">
          <div className="flex justify-between text-[10px] mb-2 font-bold text-stone-400 tracking-widest uppercase">
            <span>Our Journey</span>
            {selectedEvent && <span>{displayIndex} / {timeline.length}</span>}
          </div>
          
          {selectedEvent && (
            <div className="w-full bg-stone-100 h-1.5 rounded-full overflow-hidden">
              <motion.div 
                className="bg-[#d4af37] h-full" 
                initial={{ width: 0 }} 
                animate={{ width: `${progressWidth}%` }} 
              />
            </div>
          )}
        </div>
      </div>

      <GoogleMap
        mapContainerStyle={{ width: '100%', height: '100dvh' }} // Changed from 100vh
        center={mapCenter}
        zoom={14}
        onLoad={(map) => { mapRef.current = map; setIsMapReady(true); }}
        options={{ disableDefaultUI: true, mapId: process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID }}
      />

      <AnimatePresence>
        {selectedEvent && (
          <SharedModal
            event={selectedEvent}
            onClose={() => setSelectedEvent(null)}
            currentAssetIndex={currentAssetIndex}
            setCurrentAssetIndex={setCurrentAssetIndex}
            toggleLike={toggleLike}
            navigateTimeline={navigateTimeline}
            timeline={timeline}
            /* Changed to 'fixed' and centered to avoid clipping into the bottom navigation bar */

            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 lg:left-25 lg:translate-x-0 z-[55] w-[90vw] sm:w-[400px] aspect-[9/16] max-h-[80vh] z-[55] flex flex-col"
          />
        )}
      </AnimatePresence>
    </>
  );
}