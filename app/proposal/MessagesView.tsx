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
  "안녕 나의 아기공주민희야!",
  "우리 연애하기 전에 밤늦게 만나 서로를 알아가던 설렘들 기억나?",
  "깊은 대화를 나누며 서로에게 조금씩 스며들던 그 밤들,",
  "그렇게 우리가 연인이 되었던 순간은 내 생애 가장 큰 행운이었어.",
  "때로는 서툴러 다투기도 하고 상처 주고 아프게 할 때도 있었지만,",
  "그 시간들이 있었기에 지금 우리가 서로를 더 깊이 이해할 수 있는 거겠지?",
  "장난치며 수다 떨던 가벼운 일상부터 진지한 고민까지,",
  "민희가 환하게 웃을 때면, 내 세상도 덩달아 눈부시게 밝아졌어.",
  "맛있는 걸 먹을 때면 자연스레 네 생각이 가장 먼저 났고,",
  "예쁜 곳에 갈 때면 '나중에 민희랑 꼭 다시 와야지' 다짐하곤 했어.",
  "어느새 나의 모든 계절 속에는 너라는 온기가 가득 채워져 있더라.",
  "너와 함께 보낸 날들은 인생에서 가장 따뜻한 봄이었고,",
  "가장 시원한 여름이자, 포근하고 아름다운 가을과 겨울이었어.",
  "너무 신기한 게 시간이 흐를수록 민희를 향한 마음이 점점 커진다는 거야.",
  "익숙함 속에서 피어나는 이 편안함이 정말 소중하다고 생각해.",
  "많이 부족한 나를 따뜻하게 안아주고 사랑해줘서 너무 고마워.",
  "앞으로도 민희가 언제나 기댈 수 있게 옆에서 든든한 나무가 되어줄게.",
  "지금까지 우리가 함께 그려온 이 수많은 추억들로 인해,",
  "앞으로 두 손 맞잡고 만들어갈 우리의 내일이 너무나도 기대가 돼.",
  "서로를 향한 마음이 깊어져 온 이 모든 추억들을 되돌아보면,",
  "나는 매일 민희를 점점 더 많이 사랑하고 있음을 느껴."
];

// Stage 2: Proposal Letter (Focus on future promises & sincerity)
const PROPOSAL_TEXT = 
`세상에서 내가 가장 사랑하는 아기공주민희야!
우리가 함께한 지난 시간들을 가만히 되새겨보니,
이제 다가올 내일이 두렵기보다는 설렘으로 가득 차.
서로의 손을 꼭 잡고 묵묵히 걸어갈 우리의 길 위에서,
어떤 계절이 와도 우리는 지금처럼 잘 해낼 거라 믿어.
매일 아침 눈을 뜨면 가장 먼저 너에게 입맞추고,
잠들기 전 하루의 끝을 너와 온전히 나누는 소중한 일들,
그 평범하고 소소한 일상이 우리에겐 특별한 기적이 될 거야.
너의 곁에서 언제나 단단하고 든든한 안식처가 되어줄게.
우리가 함께 맞이할 모든 시간을 온 마음으로 사랑하며,
그 안에서 우리의 미래를 조금 더 구체적으로 그려보고 싶어.
내 인생에서 민희가 없는 미래는 상상조차 할 수 없을 만큼,
너와 함께 그려나갈 우리의 내일이 세상 무엇보다 기대돼.
영원이라는 약속을 우리 서로 천천히 정성껏 채워가고,
앞으로도 항상 같은 곳을 바라보며 나란히 걷자!
나의 어제이자 오늘, 그리고 가장 눈부신 내일인 너에게,
이제는 연인을 넘어 평생을 함께할 동반자가 되어줬으면 해.`;

// Automatically convert to an array based on line breaks (\n)
const letterLines = PROPOSAL_TEXT.split('\n').filter(line => line.trim() !== '');

// ==========================================

interface Asset {
  url: string;
  type: 'image' | 'video';
  name: string;
}

export default function CinematicProposalView() {
  const [stage, setStage] = useState<number>(0);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isReady, setIsReady] = useState<boolean>(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerStage2 = useRef<NodeJS.Timeout | null>(null);
  const timerStage3 = useRef<NodeJS.Timeout | null>(null);

  // 1. Load Supabase Storage Data
  useEffect(() => {
    const fetchAssets = async () => {
      //console.log("[Step 1] Starting Supabase data load...");
      
      try {
        //console.log(`[Request] Requesting list for bucket: '${BUCKET_NAME}'...`);
        const { data, error } = await supabase.storage.from(BUCKET_NAME).list('');
        
        if (error) {
          //console.error("❌ [Error] Failed to load data:", error);
          throw error;
        }

        //console.log("[Response] Raw data received from Supabase:", data);

        if (data && data.length > 0) {
          const sortedData = data
            .filter(file => file.name && !file.name.startsWith('.') && file.name !== '.emptyFolder')
            .sort((a, b) => a.name.localeCompare(b.name));

          //console.log(`[Sort Complete] Found a total of ${sortedData.length} valid files:`, sortedData);

          const formattedAssets: Asset[] = sortedData.map(file => {
            const { data: { publicUrl } } = supabase.storage.from(BUCKET_NAME).getPublicUrl(file.name);
            const isVideo = /\.(mp4|mov|webm)$/i.test(file.name);
            return { url: publicUrl, type: isVideo ? 'video' : 'image', name: file.name };
          });
          
          //console.log("[Final Assets Created] Ready to display on screen:", formattedAssets);
          setAssets(formattedAssets);
        } else {
          //console.warn("[Warning] Received data is empty! (Empty array)");
        }
      } catch (err) {
        console.error("[Exception Occurred]:", err);
      } finally {
        setIsReady(true);
      }
    };

    fetchAssets();

    return () => {
      if (timerStage2.current) clearTimeout(timerStage2.current);
      if (timerStage3.current) clearTimeout(timerStage3.current);
    };
  }, []);

  // 2. Cinematic Playback Logic
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
    timerStage2.current = setTimeout(() => setStage(2), 180000);
    timerStage3.current = setTimeout(() => setStage(3), 247000);
  };

  // 3. Replay (Return to start)
  const handleReplay = () => {
    if (timerStage2.current) clearTimeout(timerStage2.current);
    if (timerStage3.current) clearTimeout(timerStage3.current);
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
  const intervalPerMessage = PROPOSAL_MESSAGES.length > 0 ? tunnelDuration / PROPOSAL_MESSAGES.length : 7500;

  return (
    // Note: Changed h-full to h-[100dvh] to prevent clipping by mobile address bar/menu bar
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

        {/* ================= STAGE 1: Memory Tunnel (Slide panning applied inside photo) ================= */}
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
                      duration: 12, // Total duration
                      times: [0, 0.1, 0.9, 1], // Appears at 10% time, maintained until 90%, disappears quickly in the last 10% (prevents overlap)
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
              
              {/* Overlay on image (inner shadow effect) */}
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_30%,rgba(0,0,0,0.8)_100%)] z-10" />
            </div>

            {/* 20-line message container */}
            <div className="mt-8 md:mt-12 text-center w-full max-w-xl px-6 relative z-20 h-[100px] flex items-center justify-center">
              {PROPOSAL_MESSAGES.map((message, index) => {
                const messageDurationSec = intervalPerMessage / 1000;
                return (
                  <motion.p
                    key={`message-${index}`}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{
                      opacity: [0, 1, 1, 0],
                      y: [15, 0, 0, -15],
                    }}
                    transition={{
                      duration: messageDurationSec,
                      delay: index * messageDurationSec,
                      ease: "easeInOut",
                      times: [0, 0.1, 0.9, 1]
                    }}
                    className="absolute text-white/90 text-[14px] md:text-lg lg:text-xl font-medium leading-[2.5] md:leading-[3] drop-shadow-md text-shadow-lg w-full break-keep"
                  >
                    {message}
                  </motion.p>
                );
              })}
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
            className="absolute inset-0 z-20 flex flex-col items-center justify-center px-2 overflow-hidden bg-black"
          >
            <div className="w-full flex flex-col items-center text-center">
              {letterLines.map((line, index) => (
                <motion.p
                  key={`letter-${index}`}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 3, delay: index * 4, ease: "easeOut" }}
                  className={`text-white/90 font-medium whitespace-nowrap text-[clamp(10px,3vw,20px)] md:text-xl drop-shadow-md text-shadow-lg
                    ${index === 0 ? 'text-rose-200 text-[clamp(14px,4vw,24px)] md:text-2xl mb-8 md:mb-12' : 'mb-3 md:mb-5'}
                  `}
                >
                  {line}
                </motion.p>
              ))}
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
              className="relative z-10 flex flex-col items-center text-center px-6"
            >
              <h1 className="font-serif font-bold text-3xl md:text-5xl text-stone-900 mb-8 leading-relaxed tracking-tight break-keep drop-shadow-[0_2px_8px_rgba(0,0,0,0.4)]">
                나의 하나뿐인 아기공주 민희야,<br/> 
                나랑 결혼해줄래?
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