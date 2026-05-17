'use client';

import '@/styles/map-style.css';
import { useEffect, useState } from 'react';
import { useJsApiLoader } from '@react-google-maps/api';
import { AnimatePresence, motion } from 'framer-motion';
import { Home, Map, MessageCircle, User } from 'lucide-react';
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

  // 탭 변경 제어 (지도에서 다른 탭으로 갈 때 선택된 이벤트를 초기화하여 팝업이나 오작동 방지)
  const handleTabChange = (tab: 'home' | 'map' | 'messages' | 'profile') => {
    setCurrentTab(tab);
    if (tab !== 'map') {
      setSelectedEvent(null);
      setCurrentAssetIndex(0);
    }
  };

  return (
    <div className="relative w-full h-screen bg-[#faf7f5] flex flex-col lg:flex-row justify-between overflow-hidden">
      
      {/* 1. 데스크탑 전용 사이드바 내비게이션 */}
      <aside className="hidden lg:flex flex-col justify-between w-64 h-full bg-white border-r border-stone-100 p-6 z-[60] shrink-0 shadow-[2px_0_20px_rgba(0,0,0,0.01)]">
        <div className="flex flex-col gap-8">
          <div className="px-2 py-4">
            <h1 className="text-xl font-serif font-bold tracking-widest text-stone-800">OUR STORY</h1>
          </div>
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
                  className={`flex items-center gap-4 px-4 py-3.5 rounded-2xl text-sm font-semibold transition-all ${
                    isActive 
                      ? 'bg-[#d4af37]/10 text-[#d4af37]' 
                      : 'text-stone-500 hover:bg-stone-50 hover:text-stone-800'
                  }`}
                >
                  <Icon size={20} className={isActive ? 'text-[#d4af37]' : 'text-stone-400'} />
                  {menu.label}
                </button>
              );
            })}
          </nav>
        </div>
        <div className="px-4 text-xs text-stone-400 font-medium tracking-wide">© 2026 Lovestagram</div>
      </aside>

      {/* 2. 메인 콘텐츠 뷰포트 영역 */}
      <main className="flex-1 relative w-full h-full overflow-hidden">
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