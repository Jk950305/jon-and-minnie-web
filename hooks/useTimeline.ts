import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export function useTimeline() {
  const [timeline, setTimeline] = useState<any[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [currentAssetIndex, setCurrentAssetIndex] = useState(0);
  const [visitedIds, setVisitedIds] = useState<number[]>([]);
  const [likedEvents, setLikedEvents] = useState<number[]>([]);
  const [mapCenter, setMapCenter] = useState({ lat: 49.2827, lng: -123.1207 });

  useEffect(() => {
    const fetchData = async () => {
      const { data } = await supabase
        .from('timeline')
        .select(`*, assets:timeline_assets(asset_url, asset_type)`)
        .order('event_date', { ascending: true });
      
      if (data && data.length > 0) {
        setTimeline(data);
        setSelectedEvent(data[0]);
        setVisitedIds([data[0].id]);
        setMapCenter({ lat: Number(data[0].lat), lng: Number(data[0].lng) });
      }
    };
    fetchData();
  }, []);

  const selectEvent = useCallback((event: any, mapRef: any) => {
    const newPos = { lat: Number(event.lat), lng: Number(event.lng) };
    setSelectedEvent(event);
    setCurrentAssetIndex(0);
    setMapCenter(newPos);
    
    if (!visitedIds.includes(event.id)) {
      setVisitedIds(prev => [...prev, event.id]);
    }
    
    mapRef.current?.panTo(newPos);
    mapRef.current?.setZoom(16);
  }, [visitedIds]);

  return {
    timeline, selectedEvent, setSelectedEvent,
    currentAssetIndex, setCurrentAssetIndex,
    visitedIds, likedEvents, setLikedEvents,
    mapCenter, setMapCenter, selectEvent
  };
}