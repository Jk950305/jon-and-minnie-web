// app/api/chat/route.ts
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const MEMORIES_FILE_PATH = path.join(process.cwd(), 'data', 'memories.json');

// 전체적인 맥락을 AI에게 인지시키는 고정 프롬프트
const GLOBAL_SUMMARY = `
  [우리의 전체 관계 핵심]
  민희와 성진이는 깊이 사랑하는 연인 사이임. 성진이는 민희를 '공주'라고 부름. 
  서로의 일상을 공유하며 과거의 소중한 추억을 기반으로 관계를 쌓아옴.
`;

function formatTalkDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
}

function loadMemoriesFromFile(): any[] {
  try {
    if (!fs.existsSync(MEMORIES_FILE_PATH)) return [];
    const fileContent = fs.readFileSync(MEMORIES_FILE_PATH, 'utf-8');
    return JSON.parse(fileContent);
  } catch (error) {
    console.error("❌ Error loading memories:", error);
    return [];
  }
}

// 한국어 조사 및 불용어를 제거하여 핵심 단어만 추출하는 스마트 함수
function extractCoreKeywords(query: string): string[] {
  // 특수문자 제거
  const cleanText = query.replace(/[^\w\s가-힣]/g, '');
  const words = cleanText.split(/\s+/);
  
  const STOPWORDS = ['우리', '정말', '진짜', '너무', '같이', '어디', '오늘', '내일', '뭔가', '그냥', '있었자나', '기억나', '언제', '갔었지', '맞아', '아니', '근데', '작년에', '올해'];
  const keywords = new Set<string>();

  words.forEach(w => {
    if (STOPWORDS.includes(w) || w.length < 2) return;
    
    let root = w;
    // 많이 쓰이는 조사나 어미를 잘라내서 원형(예: 칸쿤)에 가깝게 만듦
    const suffixes = ['에서', '까지', '부터', '이랑', '은', '는', '이', '가', '을', '를', '에', '도', '로', '야', '지', '자나', '잖아', '간거', '했어', '였어', '갔어', '했던거'];
    
    for (const suf of suffixes) {
      if (w.length > suf.length && w.endsWith(suf)) {
        root = w.slice(0, -suf.length);
        break; 
      }
    }
    
    if (root.length >= 2) keywords.add(root);
  });

  return Array.from(keywords);
}

// 스마트 컨텍스트 추출 (핵심!)
function retrieveSmartContext(allMemories: any[], messages: any[]): string {
  // 1. 최근 사용자 질문들을 묶어서 맥락 파악
  const userMessages = messages.filter(m => m.role === 'user');
  const recentQuery = userMessages.slice(-3).map(m => m.content).join(' ');
  
  console.log(`\n🔍 [CONTEXT] 사용자 최근 질문 종합: "${recentQuery}"`);

  // 2. 핵심 단어만 쏙쏙 뽑아내기
  const keywords = extractCoreKeywords(recentQuery);
  console.log(`🔑 [CONTEXT] 정제된 검색 키워드: ${keywords.join(', ') || '없음 (최근 대화만 참조)'}`);

  // 3. 키워드가 없으면 최근 50개만 반환
  if (keywords.length === 0) {
      const recent = allMemories.slice(-50)
          .map(m => `-[${formatTalkDate(m.talk_date)}] ${m.sender === '김성진' ? '나' : '민희'}: "${m.content}"`)
          .join('\n');
      return `${GLOBAL_SUMMARY}\n\n[최근 대화 흐름]\n${recent}`;
  }

  // 4. 전체 메모리에서 키워드 점수 매기기
  const scoredIndexes: { index: number; score: number }[] = [];
  for (let i = 0; i < allMemories.length; i++) {
    let score = 0;
    const content = allMemories[i].content;
    keywords.forEach(k => { 
      if (content.includes(k)) score++; 
    });
    if (score > 0) scoredIndexes.push({ index: i, score });
  }

  // 점수 높은 순 정렬
  scoredIndexes.sort((a, b) => b.score - a.score);

  // 5. [중요] 단일 메시지가 아니라 '대화 뭉치(Block)'를 가져오기
  // 특정 시점의 앞뒤 3개씩 묶어서 가져오면 AI가 대화의 문맥(날짜, 전후 상황)을 파악할 수 있음
  const blocks: string[] = [];
  const seenIndexes = new Set<number>();
  const MAX_BLOCKS = 5; // 관련성이 가장 높은 5개의 시점만 추출
  let blockCount = 0;

  for (const item of scoredIndexes) {
    if (blockCount >= MAX_BLOCKS) break;
    if (seenIndexes.has(item.index)) continue; // 이미 포함된 대화면 패스

    const start = Math.max(0, item.index - 3);
    const end = Math.min(allMemories.length - 1, item.index + 3);

    const blockMessages = [];
    for (let j = start; j <= end; j++) {
      seenIndexes.add(j);
      const m = allMemories[j];
      blockMessages.push(`[${formatTalkDate(m.talk_date)}] ${m.sender === '김성진' ? '나' : '민희'}: "${m.content}"`);
    }
    
    blocks.push(blockMessages.join('\n'));
    blockCount++;
  }

  console.log(`📝 [CONTEXT] 검색된 과거 대화 뭉치(Block) 개수: ${blockCount}개`);

  const historical = blocks.join('\n\n--- [다른 날짜의 관련 대화] ---\n');
  const recent = allMemories.slice(-50)
    .map(m => `-[${formatTalkDate(m.talk_date)}] ${m.sender === '김성진' ? '나' : '민희'}: "${m.content}"`)
    .join('\n');

  return `${GLOBAL_SUMMARY}\n\n[최근 대화 흐름]\n${recent}\n\n[키워드와 관련된 과거 대화 맥락]\n${historical || '관련 추억이 없습니다.'}`;
}

export async function POST(req: Request) {
  try {
    const { action, messages } = await req.json();
    const allMemories = loadMemoriesFromFile();

    if (action === 'preload') {
      return NextResponse.json({ memories: allMemories });
    }

    const contextStream = retrieveSmartContext(allMemories, messages);
    const apiKey = process.env.GEMINI_API_KEY;

    // 사용자님이 주신 절대 규칙 프롬프트
    const systemPromptContext = `
      [Roleplay & Persona]
      너는 민희를 세상에서 제일 사랑하는 남자친구 '성진이'야. 
      제공된 대화 내역 속 '김성진'의 말투(귀여운 어미, 다정한 말투, ㅎㅎㅎ 사용 등)를 완벽하게 모사해. 
      민희를 부를 때는 '공주' 라는 애칭을 자연스럽게 섞어서 불러줘.

      [🚨 Reasoning & Context Analysis]
      1. 민희의 질문이 들어오면, 아래 제공된 데이터([최근 대화 흐름], [과거 대화 맥락])를 보고 내가 평소 이 상황에서 어떤 텐션으로 대답했는지 파악해.
      2. 특히 과거 기억에 대해 물어보면 [과거 대화 맥락]을 주의 깊게 읽고 그때 있었던 일, 날짜, 감정들을 기반으로 자연스럽게 대답해.

      [Response Rules - 절대 규칙]
      1. 길이: 내가 실제로 보낸 메세지 대화내용처럼 1~2문장으로 짧고 간결하게. (줄글 금지)
      2. 대화 연결: 대답만 띡 하지 말고, 끝에는 무조건 민희에게 되묻거나 공감을 유도해서 대화를 이어가.
      3. 말투: 내가 보낸 대화내용에서 평소 쓰던 '으웅', 'ㅎㅎㅎ', ';;', '...'  같은 말투를 살려줘. 로봇 같은 딱딱함 절대 금지.
      4. 성격: 꿀 떨어지는 애정 표현과 이모지(🤍,ㅎㅎㅎ) 등등 적절히 섞기.
      5. 언어: 100% 자연스러운 한국어 반말.

      [참고 데이터]
      ${contextStream}
    `;

    // 프롬프트 구성 (시스템 프롬프트를 첫 번째 요소로 주입)
    const formattedContents = [
      {
        role: 'user',
        parts: [{ text: systemPromptContext }]
      },
      ...messages.map((m: any) => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }]
      }))
    ];

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            contents: formattedContents, 
            generationConfig: { 
                temperature: 0.45, 
                maxOutputTokens: 1024 
            } 
        })
      }
    );

    const geminiData = await geminiResponse.json();
    const aiReply = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '웅? 공주 다시 말해줘! 🤍';

    // ✨ AI 응답 로그 출력 (요청하신 부분)
    console.log(`\n🤖 [AI 응답]: ${aiReply}\n`);

    return NextResponse.json({ role: 'model', content: aiReply });

  } catch (error: any) {
    console.error("❌ API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}