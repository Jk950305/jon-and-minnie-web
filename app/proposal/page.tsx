'use client';

import '@/styles/map-style.css';
import { useEffect, useState } from 'react';
import { useJsApiLoader } from '@react-google-maps/api';
import { useRouter, useSearchParams } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { Home, Map, User, Heart, Gamepad2, MessageCircle, Lock } from 'lucide-react';
import { supabase } from '@/lib/supabase';

import HomeView from './HomeView';
import MapView from './MapView';
import GameView from './GameView';
import ProfileView from './ProfileView';
import MessagesView from './MessagesView';
import SharedModal from './SharedModal';

const libraries: any = ['marker'];

export default function ProposalPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState(false);

  // 💡 URL의 ?tab= 파라미터를 읽어 초기 탭 결정
  const [currentTab, setCurrentTab] = useState<'home' | 'map' | 'messages' | 'game' | 'profile'>(() => {
    const validTabs = ['home', 'map', 'messages', 'game', 'profile'];
    return validTabs.includes(tabParam || '') ? (tabParam as any) : 'home';
  });

  const [timeline, setTimeline] = useState<any[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [currentAssetIndex, setCurrentAssetIndex] = useState<number>(0);

  const [isMessageUnlocked, setIsMessageUnlocked] = useState<boolean>(false);
  const [hasViewedMessage, setHasViewedMessage] = useState<boolean>(false);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
    libraries,
  });

  useEffect(() => {
    const isAuth = sessionStorage.getItem('proposal_auth');
    if (isAuth === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  // 💡 브라우저 뒤로가기/앞으로가기 감지 시 쿼리 파라미터 동기화
  useEffect(() => {
    const validTabs = ['home', 'map', 'messages', 'game', 'profile'];
    if (validTabs.includes(tabParam || '')) {
      setCurrentTab(tabParam as any);
      if (tabParam !== 'map') {
        setSelectedEvent(null);
        setCurrentAssetIndex(0);
      }
    } else if (!tabParam) {
      setCurrentTab('home');
    }
  }, [tabParam]);

  // 💡 [핵심] 홈 탭에서 뒤로가기(백제스처) 발생 시 루트 페이지('/')로 강제 이동
  useEffect(() => {
    const handlePopState = () => {
      if (currentTab === 'home') {
        router.replace('/');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [currentTab, router]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchData = async () => {
      const { data: timelineData } = await supabase
        .from('timeline')
        .select(`*, assets:timeline_assets(asset_url, asset_type)`)
        .order('event_date', { ascending: true });
        
      if (timelineData) {
        const formattedTimeline = timelineData.map((item) => ({
          ...item,
          date: item.event_date ? item.event_date.replace(/-/g, '.') : '',
        }));
        setTimeline(formattedTimeline);
      }

      const { data: settingsData } = await supabase
        .from('app_settings')
        .select('*')
        .eq('id', 1)
        .single();
        
      if (settingsData) {
        setIsMessageUnlocked(settingsData.is_message_unlocked);
        setHasViewedMessage(settingsData.has_viewed_message);
      }
    };
    fetchData();
  }, [isAuthenticated]);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === '20191025') {
      setIsAuthenticated(true);
      sessionStorage.setItem('proposal_auth', 'true');
      router.replace('?tab=home', { scroll: false });
    } else {
      setAuthError(true);
      setPassword('');
    }
  };

  const toggleLike = async (event: any) => {
    const newStatus = !event.liked;
    const { data, error } = await supabase
      .from('timeline')
      .update({ liked: newStatus })
      .eq('id', event.id)
      .select(); 

    if (!error && data && data.length > 0) {
      setTimeline((prev) => prev.map((item) => item.id === event.id ? { ...item, liked: newStatus } : item));
      if (selectedEvent?.id === event.id) setSelectedEvent({ ...selectedEvent, liked: newStatus });
    }
  };

  const navigateTimeline = (direction: 'next' | 'prev') => {
    const currentIndex = timeline.findIndex((e: any) => e.id === selectedEvent.id);
    let nextIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
    if (nextIndex >= 0 && nextIndex < timeline.length) {
      setSelectedEvent(timeline[nextIndex]);
      setCurrentAssetIndex(0);
    }
  };

  // 💡 [핵심] 탭 변경 시 히스토리 스택 최적화
  const handleTabChange = async (tab: 'home' | 'map' | 'messages' | 'game' | 'profile') => {
    if (tab === 'messages' && !isMessageUnlocked) return;
    if (currentTab === tab) return;

    setCurrentTab(tab);

    // 홈 탭이 아닌 다른 탭 간의 이동일 경우 replace를 사용하여 스택이 깊어지는 것을 방지
    // 이렇게 하면 어떤 탭에 있든 뒤로가기를 한 번 누르면 무조건 홈 탭으로 돌아갑니다.
    if (tab === 'home') {
      router.push(`?tab=home`, { scroll: false });
    } else {
      if (currentTab === 'home') {
        router.push(`?tab=${tab}`, { scroll: false });
      } else {
        router.replace(`?tab=${tab}`, { scroll: false });
      }
    }

    if (tab !== 'map') {
      setSelectedEvent(null);
      setCurrentAssetIndex(0);
    }

    if (tab === 'messages' && isMessageUnlocked && !hasViewedMessage) {
      setHasViewedMessage(true);
      await supabase.from('app_settings').update({ has_viewed_message: true }).eq('id', 1);
    }
  };

  const handleGameClear = async () => {
    setIsMessageUnlocked(true);
    setHasViewedMessage(false);
    await supabase.from('app_settings').update({ is_message_unlocked: true, has_viewed_message: false }).eq('id', 1);
  };

  const menuItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'map', label: 'Map Timeline', icon: Map },
    { 
      id: 'messages', 
      label: isMessageUnlocked ? 'Messages' : 'Locked', 
      icon: isMessageUnlocked ? MessageCircle : Lock 
    },
    { id: 'game', label: 'Play Game', icon: Gamepad2 },
    { id: 'profile', label: 'Profile Feed', icon: User },
  ] as const;

  if (!isAuthenticated) {
    return (
      <main className="min-h-screen bg-[#1A1512] flex flex-col items-center justify-center p-8 font-sans transition-opacity duration-700"> 
        <form onSubmit={handleLoginSubmit} className="text-center space-y-6 w-full max-w-sm">
          <h1 className="text-4xl font-light text-[#D4AF37] tracking-widest uppercase">
            JON & MINNIE
          </h1>
          <div className="h-[1px] w-24 bg-[#D4AF37] mx-auto opacity-50 mb-8"></div>
          
          <div className="space-y-2 mb-10">
            <p className="text-lg text-[#C5B4A2] font-light">
              우리의 연애가 시작된 날
            </p>
            <p className="text-xs text-[#C5B4A2]/50 font-light tracking-widest">
              (YYYYMMDD)
            </p>
          </div>
          
          <div className="flex flex-col gap-6 items-center pt-4">
            <input 
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setAuthError(false);
              }}
              placeholder="********"
              className={`w-48 bg-transparent border-b ${authError ? 'border-red-500/80 text-red-400' : 'border-[#D4AF37]/50 text-[#D4AF37]'} text-center text-xl tracking-widest py-2 focus:outline-none focus:border-[#D4AF37] transition-colors`}
              autoFocus
            />
            
            <div className="h-6">
              {authError && (
                <p className="text-red-400/80 text-xs tracking-wider">
                  비밀번호가 일치하지 않습니다.
                </p>
              )}
            </div>

            <button 
              type="submit"
              className="mt-4 px-12 py-3 border border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black transition-all duration-500 uppercase text-sm tracking-widest w-full max-w-[200px]"
            >
              ENTER
            </button>
          </div>
        </form>
      </main>
    );
  }

  const isScrollableTab = currentTab === 'home' || currentTab === 'profile';

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      transition={{ duration: 1 }} 
      className={`relative w-full bg-[#faf7f5] flex ${
        isScrollableTab ? 'min-h-screen' : 'h-screen overflow-hidden'
      }`}
    >
      <div className="hidden lg:block w-20 shrink-0" />

      <aside className="hidden lg:flex flex-col justify-between w-20 hover:w-64 h-screen fixed top-0 left-0 bg-white border-r border-stone-100 p-4 hover:p-6 z-[60] shadow-[2px_0_20px_rgba(0,0,0,0.01)] transition-all duration-300 ease-in-out group">
        <div className="flex flex-col gap-8">
          <div className="h-14 flex items-center relative whitespace-nowrap px-1">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-amber-200 to-rose-400 flex items-center justify-center shadow-sm shrink-0 ml-1.5 group-hover:ml-0 transition-all duration-300">
                <Heart size={15} className="text-white fill-white" />
              </div>
              <h1 className="text-base font-serif font-bold tracking-widest text-stone-800 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                OUR STORY
              </h1>
            </div>
          </div>

          <nav className="flex flex-col gap-2">
            {menuItems.map((menu) => {
              const Icon = menu.icon;
              const isActive = currentTab === menu.id;
              const isLocked = menu.id === 'messages' && !isMessageUnlocked;
              const showBadge = menu.id === 'messages' && isMessageUnlocked && !hasViewedMessage;

              return (
                <button
                  key={menu.id}
                  onClick={() => handleTabChange(menu.id as any)}
                  className={`flex items-center gap-4 h-12 px-3.5 rounded-2xl text-sm font-semibold transition-all overflow-hidden whitespace-nowrap ${
                    isActive 
                      ? 'bg-[#d4af37]/10 text-[#d4af37]' 
                      : isLocked
                      ? 'text-stone-300 cursor-not-allowed'
                      : 'text-stone-500 hover:bg-stone-50 hover:text-stone-800'
                  }`}
                >
                  <div className="shrink-0 relative">
                    <Icon size={20} className={isActive ? 'text-[#d4af37]' : isLocked ? 'text-stone-300' : 'text-stone-400'} />
                    {showBadge && (
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-blue-500 rounded-full border-2 border-white" />
                    )}
                  </div>
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    {menu.label}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="px-2 text-[10px] text-stone-400 font-medium tracking-wide whitespace-nowrap overflow-hidden opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          © 2026 Lovestagram
        </div>
      </aside>

      <main className={`flex-1 relative w-full transition-all duration-300 ease-in-out ${
        isScrollableTab ? 'min-h-screen' : 'h-screen overflow-hidden'
      }`}>
        <AnimatePresence mode="wait">
          {currentTab === 'home' && (
            <motion.div key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full min-h-screen pb-20 lg:pb-0">
              <HomeView />
            </motion.div>
          )}

          {currentTab === 'map' && (
            <motion.div key="map" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full h-screen pb-20 lg:pb-0">
              <MapView 
                isLoaded={isLoaded} 
                timeline={timeline} 
                toggleLike={toggleLike} 
                selectedEvent={selectedEvent} 
                setSelectedEvent={setSelectedEvent}
                currentAssetIndex={currentAssetIndex} 
                setCurrentAssetIndex={setCurrentAssetIndex}
                navigateTimeline={navigateTimeline}
              />
            </motion.div>
          )}

          {currentTab === 'game' && (
            <motion.div key="game" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full h-screen pb-20 lg:pb-0">
              <GameView onGameClear={handleGameClear} />
            </motion.div>
          )}

          {currentTab === 'messages' && (
            <motion.div key="messages" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full h-screen pb-20 lg:pb-0">
              <MessagesView />
            </motion.div>
          )}

          {currentTab === 'profile' && (
            <motion.div key="profile" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full min-h-screen pb-24 lg:pb-12">
              <ProfileView timeline={timeline} toggleLike={toggleLike} onPostClick={(event) => { setSelectedEvent(event); setCurrentAssetIndex(0); }} />
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {currentTab === 'profile' && selectedEvent && (
            <>
              <motion.div
                key="profile-modal-backdrop"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setSelectedEvent(null)}
                className="fixed inset-0 z-[90] bg-black/30 backdrop-blur-md cursor-pointer"
              />
              <SharedModal
                timeline={timeline} event={selectedEvent} onClose={() => setSelectedEvent(null)}
                currentAssetIndex={currentAssetIndex} setCurrentAssetIndex={setCurrentAssetIndex} navigateTimeline={navigateTimeline} toggleLike={toggleLike}
                className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[100] w-[92vw] sm:w-full"
              />
            </>
          )}
        </AnimatePresence>
      </main>

      <div className="lg:hidden fixed bottom-0 inset-x-0 bg-white/90 backdrop-blur-md border-t border-stone-100 z-[60] px-6 py-4 flex justify-around items-center shadow-[0_-5px_20px_rgba(0,0,0,0.02)]">
        {menuItems.map((menu) => {
          const Icon = menu.icon;
          const isMobileActive = currentTab === menu.id;
          const showBadge = menu.id === 'messages' && isMessageUnlocked && !hasViewedMessage;

          return (
            <button 
              key={menu.id} 
              onClick={() => handleTabChange(menu.id as any)} 
              className={`flex flex-col items-center gap-1 transition-colors p-2 relative ${isMobileActive ? 'text-[#d4af37]' : menu.id === 'messages' && !isMessageUnlocked ? 'text-stone-300' : 'text-stone-400'}`}
            >
              <Icon size={22} className={isMobileActive ? 'stroke-[2.5px]' : 'stroke-[2px]'} />
              {showBadge && (
                <span className="absolute top-1 right-2 w-2.5 h-2.5 bg-blue-500 rounded-full border-[1.5px] border-white" />
              )}
            </button>
          );
        })}
      </div>
    </motion.div>
  );
}