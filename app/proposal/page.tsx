'use client';

import '@/styles/map-style.css';
import { useEffect, useState } from 'react';
import { useJsApiLoader } from '@react-google-maps/api';
import { AnimatePresence, motion } from 'framer-motion';
import { Home, Map, MessageCircle, User, Heart } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

// 분리된 모든 서브 컴포넌트 임포트
import HomeView from './HomeView';
import MapView from './MapView';
import MessagesView from './MessagesView';
import ProfileView from './ProfileView';
import SharedModal from './SharedModal';
import ChatWidget from './ChatWidget'; // 핑크색 DM 채팅 모달 추가

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const libraries: any = ['marker'];

export default function ProposalPage() {
  const [currentTab, setCurrentTab] = useState<'home' | 'map' | 'messages' | 'profile'>('home');
  const [timeline, setTimeline] = useState<any[]>([]);
  const [likedEvents, setLikedEvents] = useState<number[]>([]);
  
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [currentAssetIndex, setCurrentAssetIndex] = useState<number>(0);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
    libraries,
  });

  // Supabase로부터 타임라인 데이터 가져오기
  useEffect(() => {
    const fetchData = async () => {
      const { data } = await supabase
        .from('timeline')
        .select(`*, assets:timeline_assets(asset_url, asset_type)`)
        .order('event_date', { ascending: true });
      if (data) setTimeline(data);
    };
    fetchData();
  }, []);

  // 카드 컴포넌트 내부의 PREV / NEXT 핸들러
  const navigateTimeline = (direction: 'next' | 'prev') => {
    const currentIndex = timeline.findIndex((e: any) => e.id === selectedEvent.id);
    let nextIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
    if (nextIndex >= 0 && nextIndex < timeline.length) {
      setSelectedEvent(timeline[nextIndex]);
      setCurrentAssetIndex(0);
    }
  };

  // 좋아요 토글
  const toggleLike = (id: number) => {
    setLikedEvents(prev => 
      prev.includes(id) ? prev.filter(itemId => itemId !== id) : [...prev, id]
    );
  };

  // 탭 변경 제어
  const handleTabChange = (tab: 'home' | 'map' | 'messages' | 'profile') => {
    setCurrentTab(tab);
    if (tab !== 'map') {
      setSelectedEvent(null);
      setCurrentAssetIndex(0);
    }
  };

  return (
    <div className="relative w-full h-screen bg-[#faf7f5] flex flex-col lg:flex-row justify-between overflow-hidden">
      
      {/* 1. 데스크톱 전용 마우스 오버 익스펜드 사이드바 */}
      <aside className="hidden lg:flex flex-col justify-between w-20 hover:w-64 h-full bg-white border-r border-stone-100 p-4 hover:p-6 z-[60] shrink-0 shadow-[2px_0_20px_rgba(0,0,0,0.01)] transition-all duration-300 ease-in-out group">
        <div className="flex flex-col gap-8">
          
          {/* 🌟 로고 영역 (접혔을 때나 펼쳐졌을 때나 일관되게 하트 그라데이션 유지) */}
          <div className="h-14 flex items-center relative overflow-hidden whitespace-nowrap px-1">
            <div className="flex items-center gap-3">
              {/* 하트 로고 서클 - 항시 고정 노출 */}
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-amber-200 to-rose-400 flex items-center justify-center shadow-sm shrink-0 ml-1.5 group-hover:ml-0 transition-all duration-300">
                <Heart size={15} className="text-white fill-white" />
              </div>
              {/* 텍스트 타이틀 - 펼쳐졌을 때 투명도 조절로 매끄럽게 노출 */}
              <h1 className="text-base font-serif font-bold tracking-widest text-stone-800 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                OUR STORY
              </h1>
            </div>
          </div>

          {/* 메뉴 내비게이션 */}
          <nav className="flex flex-col gap-2">
            {[
              { id: 'home', label: 'Home', icon: Home },
              { id: 'map', label: 'Map Timeline', icon: Map },
              { id: 'messages', label: 'Messages', icon: MessageCircle },
              { id: 'profile', label: 'Profile Feed', icon: User },
            ].map((menu) => {
              const Icon = menu.icon;
              const isActive = currentTab === menu.id;
              return (
                <button
                  key={menu.id}
                  onClick={() => handleTabChange(menu.id as any)}
                  className={`flex items-center gap-4 h-12 px-3.5 rounded-2xl text-sm font-semibold transition-all overflow-hidden whitespace-nowrap ${
                    isActive 
                      ? 'bg-[#d4af37]/10 text-[#d4af37]' 
                      : 'text-stone-500 hover:bg-stone-50 hover:text-stone-800'
                  }`}
                >
                  <div className="shrink-0">
                    <Icon size={20} className={isActive ? 'text-[#d4af37]' : 'text-stone-400'} />
                  </div>
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    {menu.label}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* 푸터 카피라이트 */}
        <div className="px-2 text-[10px] text-stone-400 font-medium tracking-wide whitespace-nowrap overflow-hidden opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          © 2026 Lovestagram
        </div>
      </aside>

      {/* 2. 메인 콘텐츠 뷰포트 영역 */}
      <main className="flex-1 relative w-full h-full overflow-hidden transition-all duration-300 ease-in-out">
        <AnimatePresence mode="wait">
          {currentTab === 'home' && (
            <motion.div key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full h-full">
              <HomeView />
            </motion.div>
          )}

          {currentTab === 'map' && (
            <motion.div key="map" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full h-full">
              <MapView 
                isLoaded={isLoaded} 
                timeline={timeline} 
                likedEvents={likedEvents} 
                toggleLike={toggleLike} 
                selectedEvent={selectedEvent}
                setSelectedEvent={setSelectedEvent}
                currentAssetIndex={currentAssetIndex}
                setCurrentAssetIndex={setCurrentAssetIndex}
                navigateTimeline={navigateTimeline}
              />
            </motion.div>
          )}

          {currentTab === 'messages' && (
            <motion.div key="messages" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full h-full">
              <MessagesView />
            </motion.div>
          )}

          {currentTab === 'profile' && (
            <motion.div key="profile" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full h-full overflow-y-auto pb-24 lg:pb-12">
              <ProfileView 
                timeline={timeline} 
                onPostClick={(event) => { setSelectedEvent(event); setCurrentAssetIndex(0); }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* [신규 추가된 인스타 DM 피쳐] 전역 왼쪽 하단 대화 모달 팝업 위젯 */}
        <ChatWidget />

        {/* 프로필 탭 전용 인스타 레이아웃 팝업 모달 */}
        <AnimatePresence>
          {currentTab === 'profile' && selectedEvent && (
            <SharedModal
              timeline={timeline}
              selectedEvent={selectedEvent}
              setSelectedEvent={setSelectedEvent}
              currentAssetIndex={currentAssetIndex}
              setCurrentAssetIndex={setCurrentAssetIndex}
              navigateTimeline={navigateTimeline}
              likedEvents={likedEvents}
              toggleLike={toggleLike}
            />
          )}
        </AnimatePresence>
      </main>

      {/* 3. 모바일 전용 하단 고정 내비게이션 바 */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 bg-white/90 backdrop-blur-md border-t border-stone-100 z-[60] px-6 py-4 flex justify-around items-center shadow-[0_-5px_20px_rgba(0,0,0,0.02)]">
        {(['home', 'map', 'messages', 'profile'] as const).map((tab) => {
          const Icons: Record<string, any> = { home: Home, map: Map, messages: MessageCircle, profile: User };
          const Icon = Icons[tab];
          const isMobileActive = currentTab === tab;
          return (
            <button 
              key={tab} 
              onClick={() => handleTabChange(tab)} 
              className={`flex flex-col items-center gap-1 transition-colors p-2 ${
                isMobileActive ? 'text-[#d4af37]' : 'text-stone-400'
              }`}
            >
              <Icon size={22} className={isMobileActive ? 'stroke-[2.5px]' : 'stroke-[2px]'} />
            </button>
          );
        })}
      </div>

    </div>
  );
}