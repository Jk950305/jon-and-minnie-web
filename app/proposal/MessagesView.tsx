'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Heart, RotateCcw, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase'; // Import the Supabase client configured for the project

// ==========================================
// ⚙️ 1. Configuration Area
// ==========================================

const BUCKET_NAME = 'letters';
const BGM_FILE = '/assets/True_Song.mp3';

// Stage 1: Memory Tunnel (Focus on storytelling & shared history)
const PROPOSAL_MESSAGES = [
  "안녕 공주! 진심이 담긴 노래 대신에 진심이 담긴 편지를 써보려 해.",
  "우리 연애하기 전부터 밤늦게 만나서 얘기 나눴던 거 기억나?",
  "걱정도 많고 설렘도 가득했던 그 시간들이 벌써 7년이나 지났어.",
  "그렇게 2019년 10월 25일 우리가 연인이 되었던 날이 아직도 생생해.",
  "때로는 서툴러 다투기도 하고 상처 주고 아프게 할 때도 있었지만,",
  "그 시간들이 있었기에 지금 우리가 서로를 더 깊이 이해할 수 있는 거겠지?",
  "장난치며 수다 떨던 가벼운 일상부터 진지한 고민까지,",
  "민희가 환하게 웃을 때면, 내 세상도 덩달아 눈부시게 밝아졌어.",
  "예쁜 곳에 갈 때면 자연스레 공주 생각이 가장 먼저 났고,",
  "맛있는 걸 먹을 때면 '민희랑 꼭 다시 와야지' 다짐하곤 했어.",
  "어느새 나의 모든 삶 속에는 민희가 함께 녹아들어 있더라.",
  "너와 함께 보낸 날들은 인생에서 가장 따뜻한 봄이었고,",
  "가장 시원한 여름이자, 포근하고 아름다운 가을과 겨울이었어.",
  "너무 신기한 게 시간이 흐를수록 민희를 향한 마음이 점점 커진다는 거야.",
  "익숙함 속에서 피어나는 이 편안함이 정말 소중하다고 생각해.",
  "많이 부족한 나를 따뜻하게 안아주고 사랑해줘서 너무 고마워.",
  "앞으로도 민희가 언제나 기댈 수 있게 옆에서 든든한 나무가 되어줄게.",
  "지금까지 우리가 함께 지내온 이 수많은 추억들로 인해,",
  "앞으로 두 손 맞잡고 만들어갈 우리의 내일이 너무나도 기대가 돼.",
  "서로를 향한 마음이 깊어져 온 이 모든 추억들을 되돌아보면,",
  "나는 매일 민희를 점점 더 많이 사랑하고 있음을 느껴."
];

// Stage 2: Proposal Letter (Focus on future promises & sincerity)
const PROPOSAL_TEXT = 
`나를 누구보다 잘 알고, 내가 누구보다 사랑하는 민희야! 
우리가 함께한 지난 시간들을 가만히 되돌아보니까,
이제 다가올 내일이 두렵기보다는 설렘으로 가득해.
서로의 손을 꼭 잡고 앞으로 걸어갈 우리의 길 위에서,
어떠한 상황 속에서도 우리는 지금처럼 잘 해낼 거라 믿어.
매일 아침 눈을 뜨면 가장 먼저 반갑게 손 흔들며 인사하고,
잠들기 전 그날 하루의 일상을 서로 공유하며 얘기하는 일들,
그 평범하고 소소한 일상이 우리에겐 특별한 기적이 될 거야.
너의 곁에서 언제나 든든한 버팀목이자 안식처가 되어줄게.
우리가 함께 맞이할 모든 순간마다 진심을 다 해 사랑하면서
이제 우리의 미래를 보다 더 구체적으로 계획해 보고 싶어.
내 인생에서 민희가 없는 미래는 상상조차 할 수 없을 만큼,
너와 함께 그려 나갈 우리의 내일이 세상 무엇보다 기대돼.
영원이라는 약속을 우리 서로 천천히 정성껏 채워 가고,
앞으로도 항상 같은 곳을 바라보면서 나란히 걸어나가보자!
나의 어제이자 오늘, 그리고 가장 눈부신 내일인 너에게,
이제는 연인을 넘어 평생을 함께할 너의 편이 되어주고 싶어.`;

// Automatically convert to an array based on line breaks (\n)
const letterLines = PROPOSAL_TEXT.split('\n').filter(line => line.trim() !== '');

interface Asset {
  url: string;
  type: 'image' | 'video';
  name: string;
}

export default function CinematicProposalView() {
  const [stage, setStage] = useState<number>(0);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isReady, setIsReady] = useState<boolean>(false);
  
  const [msgIndex, setMsgIndex] = useState<number>(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // 1. Load Supabase Storage Data
  useEffect(() => {
    const fetchAssets = async () => {
      try {
        const { data, error } = await supabase.storage.from(BUCKET_NAME).list('');
        
        if (error) throw error;

        if (data && data.length > 0) {
          const sortedData = data
            .filter(file => file.name && !file.name.startsWith('.') && file.name !== '.emptyFolder')
            .sort((a, b) => a.name.localeCompare(b.name));

          const formattedAssets: Asset[] = sortedData.map(file => {
            const { data: { publicUrl } } = supabase.storage.from(BUCKET_NAME).getPublicUrl(file.name);
            const isVideo = /\.(mp4|mov|webm)$/i.test(file.name);
            return { url: publicUrl, type: isVideo ? 'video' : 'image', name: file.name };
          });
          
          setAssets(formattedAssets);
        }
      } catch (err) {
        console.error("[Exception Occurred]:", err);
      } finally {
        setIsReady(true);
      }
    };

    fetchAssets();
  }, []);

  // 2-1. Stage 1 Timer Logic (Typewriter & Transition)
  useEffect(() => {
    if (stage === 1) {
      setMsgIndex(0);
      const intervalTime = (180000 - 2000) / PROPOSAL_MESSAGES.length;
      let currentIdx = 0;

      const timer = setInterval(() => {
        currentIdx++;
        if (currentIdx < PROPOSAL_MESSAGES.length) {
          setMsgIndex(currentIdx);
        } else {
          clearInterval(timer);
          setTimeout(() => {
            setStage(2);
          }, 2000);
        }
      }, intervalTime);

      return () => clearInterval(timer);
    }
  }, [stage]);

  // 2-2. Stage 2 Timer Logic (Transition)
  useEffect(() => {
    if (stage === 2) {
      const stageTimer = setTimeout(() => {
        setStage(3);
      }, 67000);

      return () => {
        clearTimeout(stageTimer);
      };
    }
  }, [stage]);

  // 3. Start Cinematic Playback
  const startCinematic = async () => {
    const { data } = await supabase
      .from('app_settings')
      .select('is_message_unlocked')
      .eq('id', 1)
      .single();

    if (!data || data.is_message_unlocked === false) {
      alert("아직 준비되지 않았습니다. 관리자 페이지에서 잠금을 해제해주세요.");
      return;
    }

    setStage(0.5);

    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch((e) => console.error("🔇 BGM playback failed:", e));
    }

    setTimeout(() => setStage(1), 3000);
  };

  // 4. Replay (Return to start)
  const handleReplay = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setStage(0);
  };

  const tunnelAssets = assets.slice(0, -1);
  const finalAsset = assets.length > 0 ? assets[assets.length - 1] : null;

  const tunnelDuration = 180000;
  const intervalPerAsset = tunnelAssets.length > 0 ? tunnelDuration / tunnelAssets.length : 7500;

  return (
    <div className="w-full h-[100dvh] relative overflow-hidden bg-black flex items-center justify-center font-sans">
      <audio ref={audioRef} src={BGM_FILE} />

      <AnimatePresence mode="wait">
        {/* ================= STAGE 0: Start Button ================= */}
        {stage === 0 && (
          <motion.div
            key="stage-0"
            initial={{ opacity: 0, backgroundColor: "#fff" }}
            animate={{ opacity: 1, backgroundColor: "#fff" }}
            exit={{ opacity: 0, transition: { duration: 3 } }}
            className="absolute inset-0 flex flex-col items-center justify-center z-50 text-stone-800"
          >
            <motion.div animate={{ y: [0, -10, 0] }} transition={{ repeat: Infinity, duration: 3 }} className="mb-8">
              <Heart size={40} className="text-pink-300 opacity-90" fill="currentColor" />
            </motion.div>
            
            <h1 className="text-2xl md:text-3xl font-light tracking-[0.2em] mb-4 opacity-90">
              우리의 시간 기록실
            </h1>
            
            {!isReady ? (
              <div className="flex items-center gap-2 text-stone-400 text-sm mb-12">
                <Loader2 size={16} className="animate-spin text-rose-400" />
                추억을 불러오는 중...
              </div>
            ) : (
              <p className="text-stone-500 text-sm mb-12 font-light">
                소리를 켜고, 아래 버튼을 눌러 추억을 열어보세요.
              </p>
            )}

            <button
              onClick={startCinematic}
              disabled={!isReady || assets.length === 0}
              className="flex items-center gap-3 px-8 py-4 rounded-full bg-stone-100 border border-stone-200 hover:bg-stone-200 transition-all shadow-sm font-medium group disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Play size={18} className="group-hover:scale-110 transition-transform text-stone-700" />
              {assets.length === 0 && isReady ? '데이터 없음 (콘솔 확인)' : '추억 열어보기'}
            </button>
          </motion.div>
        )}

        {/* ================= STAGE 1: Memory Tunnel ================= */}
        {stage === 1 && (
          <motion.div key="stage-1" className="absolute inset-0 z-10 bg-black flex flex-col items-center justify-center">

            {/* Photo container */}
            <div className="relative w-[85%] max-w-[550px] aspect-[3/4] md:aspect-[4/5] rounded-2xl overflow-hidden shadow-2xl shadow-black">
              {tunnelAssets.map((asset, index) => {
                const panDirectionX = index % 2 === 0 ? ['0%', '-6%'] : ['-3%', '0%'];
                const panDirectionY = index % 3 === 0 ? ['0%', '-5%'] : ['-2%', '0%'];

                const panVariations = [
                  ['50% 0%', '50% 100%'],
                  ['0% 50%', '100% 50%'],
                  ['50% 100%', '50% 0%'],
                  ['100% 50%', '0% 50%'],
                  ['0% 0%', '100% 100%'],
                ];
                const objectPan = panVariations[index % panVariations.length];

                return (
                  <motion.div
                    key={`asset-${index}`}
                    className="absolute inset-0"
                    initial={{ opacity: 0, scale: 2, x: 0, y: 0 }}
                    animate={{
                      opacity: [0, 1, 1, 0],
                      scale: [1.02, 1.1],
                      x: panDirectionX,
                      y: panDirectionY
                    }}
                    transition={{
                      duration: 12,
                      times: [0, 0.1, 0.9, 1],
                      ease: "easeInOut",
                      delay: (index * intervalPerAsset) / 1000
                    }}
                  >
                    {asset.type === 'video' ? (
                      <motion.video
                        src={asset.url} autoPlay loop muted playsInline
                        className="w-full h-full object-cover opacity-85"
                        animate={{ objectPosition: objectPan }}
                        transition={{ duration: 12, ease: "linear", delay: (index * intervalPerAsset) / 1000 }}
                      />
                    ) : (
                      <motion.img
                        src={asset.url} alt={`Memory ${index}`}
                        className="w-full h-full object-cover opacity-85"
                        animate={{ objectPosition: objectPan }}
                        transition={{ duration: 12, ease: "linear", delay: (index * intervalPerAsset) / 1000 }}
                      />
                    )}
                  </motion.div>
                );
              })}
              
              {/* Overlay on image */}
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_30%,rgba(0,0,0,0.8)_100%)] z-10" />
            </div>

            {/* Stage 1 Message Container (사진과 동일한 가로폭 비율, 줄바꿈 방지) */}
            <div className="mt-6 md:mt-8 w-[85%] max-w-[550px] mx-auto relative z-20 flex items-center justify-center min-h-[50px]">
              <AnimatePresence mode="wait">
                {PROPOSAL_MESSAGES[msgIndex] && (
                  <motion.p
                    key={msgIndex}
                    variants={{
                      hidden: { opacity: 0, y: 10 },
                      visible: {
                        opacity: 1,
                        y: 0,
                        transition: { staggerChildren: 0.04 }
                      },
                      exit: { opacity: 0, y: -10, transition: { duration: 0.4 } }
                    }}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="w-full text-white/95 text-[clamp(11px,3.2vw,19px)] font-medium leading-[1.6] drop-shadow-md text-shadow-lg text-center whitespace-nowrap"
                  >
                    {PROPOSAL_MESSAGES[msgIndex].split("").map((char, charIndex) => (
                      <motion.span
                        key={charIndex}
                        variants={{
                          hidden: { opacity: 0 },
                          visible: { opacity: 1 }
                        }}
                      >
                        {char === " " ? "\u00A0" : char}
                      </motion.span>
                    ))}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}

        {/* ================= STAGE 2: Letter with sincerity ================= */}
        {stage === 2 && (
          <motion.div
            key="stage-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 3 } }}
            className="absolute inset-0 z-20 flex flex-col items-center justify-center py-4 overflow-hidden bg-black"
          >
            {/* 짧은 쪽(vmin)을 기준으로 반응형 확대/축소 적용하여 모바일에서도 꽉 차고 웅장하게 표시 */}
            <div className="w-full h-full flex flex-col items-center justify-center px-4 md:px-0">
              <div className="flex flex-col items-stretch w-fit max-w-full">
                {letterLines.map((line, index) => (
                  <motion.p
                    key={`letter-${index}`}
                    initial="hidden"
                    animate="visible"
                    variants={{
                      hidden: { opacity: 1 }, 
                      visible: { 
                        opacity: 1, 
                        transition: { 
                          delayChildren: index * 3.4, 
                          staggerChildren: 0.05 
                        } 
                      }
                    }}
                    className="w-full flex justify-between text-white/95 font-medium whitespace-nowrap drop-shadow-md text-shadow-lg tracking-tight text-[clamp(12px,2.6vmin,22px)] mb-1.5 md:mb-2 lg:mb-2.5"
                  >
                    {line.split("").map((char, charIndex) => (
                      <motion.span
                        key={charIndex}
                        variants={{
                          hidden: { opacity: 0, y: 3 }, 
                          visible: { opacity: 1, y: 0 }
                        }}
                      >
                        {char === " " ? "\u00A0" : char}
                      </motion.span>
                    ))}
                  </motion.p>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* ================= STAGE 3: Proposal Ending & Replay Button ================= */}
        {stage === 3 && (
          <motion.div
            key="stage-3"
            initial={{ opacity: 0, backgroundColor: "#000" }}
            animate={{ opacity: 1, backgroundColor: "#fff" }}
            transition={{ duration: 4 }}
            className="absolute inset-0 z-30 flex flex-col items-center justify-center overflow-hidden"
          >
            {/* Final asset background effect */}
            {finalAsset && (
              <motion.div
                initial={{ opacity: 0, scale: 1.1 }}
                animate={{ opacity: 0.6, scale: 1 }}
                transition={{ duration: 6, delay: 2 }}
                className="absolute inset-3 md:inset-6 flex items-center justify-center overflow-hidden rounded-3xl md:rounded-[2.5rem] bg-stone-900 shadow-2xl"
              >
                {finalAsset.type === 'video' ? (
                  <video 
                    src={finalAsset.url} 
                    autoPlay 
                    muted 
                    playsInline 
                    className="w-full h-full object-cover" 
                  />
                ) : (
                  <img 
                    src={finalAsset.url} 
                    alt="Final Memory" 
                    className="w-full h-full object-cover" 
                  />
                )}
                <div className="absolute inset-0 bg-white/30 backdrop-blur-[2px]" /> 
              </motion.div>
            )}

            {/* Final text */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 2.5, delay: 5, ease: "easeOut" }}
              className="relative z-10 flex flex-col items-center text-center px-4 w-full"
            >
              <h1 className=" text-[clamp(16px,4.5vw,36px)] md:text-6xl text-stone-800 mb-1 leading-relaxed tracking-tight drop-shadow-[0_8px_8px_rgba(0,0,0,0.3)] flex flex-col items-center gap-2">
                <span className="whitespace-nowrap">나의 하나뿐인 아기공주 민희야,</span>
                <span className="whitespace-nowrap">나랑 결혼해줄래?</span>
              </h1>
            </motion.div>

            {/* Replay button */}
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 15 }}
              onClick={handleReplay}
              className="absolute bottom-[8dvh] right-8 p-3 bg-stone-900/20 hover:bg-stone-900/40 text-stone-700 rounded-full shadow-sm transition-all z-50 backdrop-blur-md"
              aria-label="Replay"
            >
              <RotateCcw size={20} strokeWidth={2.5} />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}