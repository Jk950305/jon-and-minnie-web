'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function ResetPage() {
  const [isLocked, setIsLocked] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // 페이지 진입 시 DB의 현재 상태 조회
    const fetchStatus = async () => {
      const { data, error } = await supabase
        .from('app_settings')
        .select('is_message_unlocked')
        .eq('id', 1)
        .single();

      if (data && !error) {
        // is_message_unlocked가 true면 잠금 해제(UNLOCKED/ON), false면 잠금(LOCKED/OFF)
        setIsLocked(!data.is_message_unlocked);
      }
      setLoading(false);
    };
    fetchStatus();
  }, []);

  const toggleLock = async () => {
    const newState = !isLocked; // 현재 상태의 반대로 전환
    
    // DB 업데이트 실행
    const { error } = await supabase
      .from('app_settings')
      .update({ 
        is_message_unlocked: !newState, // newState가 true(잠김)면 false(unlocked)로
        has_viewed_message: false 
      })
      .eq('id', 1);

    if (!error) {
      setIsLocked(newState);
    } else {
      console.error("업데이트 실패:", error);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">불러오는 중...</div>;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-stone-50">
      <h1 className="text-2xl text-stone-700 font-bold mb-8">프로포즈 페이지 제어</h1>
      
      <button
        onClick={toggleLock}
        className={`relative w-24 h-12 rounded-full transition-colors duration-300 ${
          isLocked ? 'bg-red-500' : 'bg-green-500'
        }`}
      >
        <span
          className={`absolute top-2 w-8 h-8 bg-white rounded-full transition-all duration-300 ${
            isLocked ? 'left-2' : 'left-14'
          }`}
        />
      </button>

      <p className="mt-4 font-medium text-stone-700">
        현재 상태: <span className="font-bold">{isLocked ? 'LOCKED (OFF)' : 'UNLOCKED (ON)'}</span>
      </p>
    </div>
  );
}