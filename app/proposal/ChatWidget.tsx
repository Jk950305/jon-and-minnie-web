'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, X, Heart, Loader2 } from 'lucide-react';

interface Message {
  role: 'user' | 'model';
  content: string;
}

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [rawMemories, setRawMemories] = useState<any[]>([]); // 평생 카톡 데이터 스냅샷 저장소
  const [isPreloaded, setIsPreloaded] = useState(false); // 로드 여부 플래그
  
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'model',
      content: '안녕 민희야! 우리의 소중한 기록들을 잘 둘러보고 있니? 궁금한 게 있다면 언제든 물어봐 🤍'
    }
  ]);

  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // 🚀 [구조 개혁] 채팅창이 열릴 때 단일 주소(/api/chat)로 데이터를 프리로드 요청
  useEffect(() => {
    async function preloadMemories() {
      if (!isOpen || isPreloaded) return;

      try {
        console.log("📡 [Preload] /api/chat 엔드포인트로 추억 덤프 동기화 요청...");
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'preload' }) // 💡 백엔드 구별용 플래그 전송
        });

        if (!res.ok) {
          const errorText = await res.text();
          console.error(`❌ [Preload Failed] 서버 응답 에러 상태 코드: ${res.status}`);
          return;
        }

        const data = await res.json();
        setRawMemories(data.memories || []);
        setIsPreloaded(true);
        console.log(`✅ [Memories Preloaded] 단일 채널을 통해 총 ${data.memories?.length || 0}개의 추억 스냅샷 동기화 완료.`);
      } catch (err) {
        console.error("❌ [Preload Error] 프리로드 예외 발생:", err);
      }
    }
    preloadMemories();
  }, [isOpen, isPreloaded]);

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  // 비동기 AI 대화 요청 핸들러
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: input };
    const updatedMessages = [...messages, userMessage];

    setMessages(updatedMessages);
    setInput('');
    setIsLoading(true);

    try {
      // 💡 일반 대화 시에도 동일한 /api/chat을 찌르며 로드해둔 카톡 스냅샷을 패킹해서 전송
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          action: 'chat', // 💡 일반 대화 플래그
          messages: updatedMessages,
          allMemories: rawMemories 
        }),
      });

      if (!response.ok) {
        throw new Error('네트워크 백엔드 응답에 에러가 발생했습니다.');
      }

      const data = await response.json();

      if (data.content) {
        setMessages([...updatedMessages, { role: 'model', content: data.content }]);
      } else {
        throw new Error('올바른 응답 포맷을 받지 못했습니다.');
      }
    } catch (error) {
      console.error('AI 대화 연동 에러:', error);
      setMessages([
        ...updatedMessages,
        { role: 'model', content: '공주 미안해.. 서버가 이상해..! 조금만 있다가 다시 말 걸어줘ㅜㅜ 🥺' }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-24 lg:bottom-10 right-6 z-[100] flex flex-col items-end">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20, transformOrigin: 'bottom right' }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            className="mb-4 w-[320px] bg-white rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-rose-100 overflow-hidden flex flex-col"
          >
            {/* 채팅창 헤더 */}
            <div className="bg-rose-50 p-4 flex justify-between items-center border-b border-rose-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-rose-200 flex items-center justify-center">
                  <Heart size={14} className="text-white fill-white" />
                </div>
                <span className="text-sm font-bold text-rose-500">Minnie Bot ✨</span>
              </div>
              <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-rose-100 rounded-full transition-colors">
                <X size={18} className="text-rose-400" />
              </button>
            </div>

            {/* 채팅 내용 영역 */}
            <div className="h-80 p-4 overflow-y-auto flex flex-col gap-3 bg-[#fffafb]">
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-2xl max-w-[80%] shadow-sm ${
                    msg.role === 'user'
                      ? 'self-end bg-rose-400 text-white rounded-br-none'
                      : 'self-start bg-white text-stone-600 border border-rose-50 rounded-bl-none'
                  }`}
                >
                  <p className="text-xs leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                </div>
              ))}

              {isLoading && (
                <div className="self-start bg-white p-3 rounded-2xl rounded-bl-none shadow-sm border border-rose-50 max-w-[80%] flex items-center gap-2">
                  <Loader2 size={12} className="animate-spin text-rose-400" />
                  <span className="text-[10px] text-stone-400">아마 아주 열심히 생각하는 중... 💭</span>
                </div>
              )}
              
              <div ref={chatEndRef} />
            </div>

            {/* 채팅 입력창 폼 */}
            <form onSubmit={handleSendMessage} className="p-4 bg-white border-t border-rose-50">
              <div className="flex items-center gap-2 bg-stone-50 px-4 py-2 rounded-full border border-stone-100">
                <input 
                  type="text" 
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  disabled={isLoading}
                  placeholder={isLoading ? "기다리는 중..." : "메시지 보내기..."} 
                  className="bg-transparent text-xs flex-1 outline-none text-stone-600 disabled:opacity-50"
                />
                <button 
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="text-rose-400 hover:text-rose-500 disabled:opacity-30 transition-opacity"
                >
                  <Send size={16} />
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 핑크색 동그라미 디엠 아이콘 버튼 */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 bg-[#ffb7c5] rounded-full shadow-lg flex items-center justify-center text-white relative overflow-hidden group"
      >
        <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
        {isOpen ? <X size={24} /> : <Send size={24} className="ml-0.5 mt-0.5 rotate-[-20deg]" />}
      </motion.button>
    </div>
  );
}