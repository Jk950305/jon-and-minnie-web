import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase'; // Import the constant singleton

export function useTimeline() {
  const [timeline, setTimeline] = useState<any[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [currentAssetIndex, setCurrentAssetIndex] = useState(0);
  const [visitedIds, setVisitedIds] = useState<number[]>([]);
  const [likedEvents, setLikedEvents] = useState<number[]>([]);
  const [mapCenter, setMapCenter] = useState({ lat: 49.2827, lng: -123.1207 });

  // --- Data Fetching ---
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

  // --- Like Toggle Logic ---
  const toggleLike = async (event: any) => {
    const isLiked = likedEvents.includes(event.id);
    const newStatus = !isLiked;

    // 1. Update Database
    const { error } = await supabase
      .from('timeline')
      .update({ liked: newStatus })
      .eq('id', event.id);

    if (error) {
      console.error("Error updating like status:", error);
      return;
    }

    // 2. Update Local State
    setLikedEvents(prev => 
      newStatus 
        ? [...prev, event.id] 
        : prev.filter(id => id !== event.id)
    );
    
    // Update the local timeline object for immediate UI reflection
    setTimeline(prev => prev.map(item => 
      item.id === event.id ? { ...item, liked: newStatus } : item
    ));
  };

  // --- Event Selection Logic ---
  const selectEvent = useCallback((event: any, mapRef: any) => {
    const newPos = { lat: Number(event.lat), lng: Number(event.lng) };
    setSelectedEvent(event);
    setCurrentAssetIndex(0);
    setMapCenter(newPos);
    
    // Track visited markers
    if (!visitedIds.includes(event.id)) {
      setVisitedIds(prev => [...prev, event.id]);
    }
    
    // Pan and Zoom on Map
    mapRef.current?.panTo(newPos);
    mapRef.current?.setZoom(16);
  }, [visitedIds]);

  // --- Return Exposed API ---
  return {
    timeline, 
    setTimeline,
    selectedEvent, 
    setSelectedEvent,
    currentAssetIndex, 
    setCurrentAssetIndex,
    visitedIds, 
    likedEvents, 
    setLikedEvents,
    mapCenter, 
    setMapCenter, 
    selectEvent,
    toggleLike
  };
}