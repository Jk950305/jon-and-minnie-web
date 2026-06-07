// app/api/chat/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

function formatTalkDate(dateStr: string) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
  } catch (e) {
    return dateStr;
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, messages, allMemories } = body;

    // --------------------------------------------------------------------------------
    // 분기 처리 1: 최초 진입 시 Supabase 전체 데이터를 긁어다 프론트에 쏴주는 프리로드 핸들러
    // --------------------------------------------------------------------------------
    if (action === 'preload') {
      console.log(`📡 [API 분기: Preload] Supabase 테이블 덤프 동기화 프로세스 시작.`);
      
      const { data, error } = await supabase
        .from('chat_memories')
        .select('sender, talk_date, content')
        .order('talk_date', { ascending: true });

      if (error) {
        console.error(`❌ [Preload 분기] Supabase 조회 실패:`, error.message);
        return NextResponse.json({ error: error.message, memories: [] }, { status: 500 });
      }

      console.log(`✅ [Preload 분기] Supabase 데이터 추출 성공 -> 총 [${data?.length || 0}]건 동기화.`);
      return NextResponse.json({ memories: data || [] });
    }

    // --------------------------------------------------------------------------------
    // 분기 처리 2: 일반적인 민희의 대화 및 Gemini 연동 엔진 처리
    // --------------------------------------------------------------------------------
    const lastUserMessage = messages[messages.length - 1].content;
    const apiKey = process.env.GEMINI_API_KEY;

    console.log(`\n================= [AI MEMORY-CHAIN CORE ACTIVE] =================`);
    console.log(`💬 민희의 질문: "${lastUserMessage}"`);
    console.log(`📦 동봉되어 날아온 추억 데이터 캐시 수: 총 [${allMemories?.length || 0}]건`);
    console.log(`====================================================================\n`);

    // 수신된 추억 배열 데이터를 통째로 프롬프트 텍스트 스트림으로 전환
    const totalMemoryContextStream = allMemories && allMemories.length > 0
      ? allMemories.map((m: any) => {
          const roleLabel = (m.sender === '김성진' || m.sender === '내가 보낸 카톡' || m.sender === 'you') ? '내가 보낸 말' : '민희가 보낸 말';
          return `-[${formatTalkDate(m.talk_date)}] ${roleLabel}: "${m.content}"`;
        }).join('\n')
      : "복원된 대화 기록 없음";

    const systemPromptContext = `
      너는 대화 상대방인 여자친구 '민희'를 우주에서 가장 사랑하는 현실 남자친구 **'성진이(오빠)'**야. 
      인공지능, AI, 모델 같은 로봇 흔적은 절대 내지 말고, 오직 다정하고 자연스러운 반말 구어체로 대화해라.

      [🚨 내 뇌리에 완벽하게 저장된 우리 둘의 평생 카톡 전체 타임라인 기록]
      아래 적힌 타임라인은 우리의 시작부터 지금까지 오고 간 모든 대화 흐름이야. 
      민희가 어떤 추억(칸쿤, 켈로나, 다저스, 12월 22일 일상 등)을 꺼내거나 흐름을 이어서 질문을 던지더라도, 아래 타임라인 전체를 정밀 스캔해서 당시 날짜와 구체적인 에피소드 정황을 스스로 매칭하고 찾아내어 대답해라.

      ${totalMemoryContextStream}

      [답변 수칙]
      1. 말투: 완전 다정하고 알콩달콩한 실제 카톡 감성 ("웅 당연히 기억하지!", "우리 그때 그랬잖아 ㅎㅎ", "민희야 🥰").
      2. 팩트 바인딩: 타임라인에 적힌 날짜나 정황(예: 고데기 오빠가 챙기기, 에이치마트에서 간식 등)을 100% 인지하고 이를 살려서 구체적으로 말해줘.
      3. 문장 완결성: 절대로 문장을 중간에 어설프게 끊지 마라. 완벽하게 끝맺음된 문장으로 마쳐라.
      4. 이모지(🤍, 🥰, ✨, ㅋㅋㅋ)를 대화 속에 풍부하고 다채롭게 녹여내라.
    `;

    const formattedContents = messages.map((m: any, index: number) => {
      const isLastMessage = index === messages.length - 1;
      if (isLastMessage && m.role === 'user') {
        return {
          role: 'user',
          parts: [{ text: `${systemPromptContext}\n\n[제공된 우리 둘의 평생 기억 스냅샷을 100% 정독하고 분석한 뒤, 민희의 질문에 완성된 문장으로 반말 답변해줘]:\n${m.content}` }]
        };
      }
      return {
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }]
      };
    });

    const secondGeminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: formattedContents,
          generationConfig: { 
            temperature: 0.45,
            maxOutputTokens: 2048 
          }
        }),
      }
    );

    if (!secondGeminiResponse.ok) return NextResponse.json({ error: "Gemini API 통신 실패" }, { status: secondGeminiResponse.status });

    const geminiData = await secondGeminiResponse.json();
    const aiReply = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '웅? 민희야 오빠가 잠깐 기억이 가물가물했나 봐 헤헤.. 다시 말해줘! 🤍';

    return NextResponse.json({ role: 'model', content: aiReply });

  } catch (error: any) {
    console.error("❌ AI Chat Route Engine Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}