// app/api/chat/route.ts
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

/**
 * Path configuration for local memory storage.
 * Ensure your data/memories.json file exists in the project root.
 */
const MEMORIES_FILE_PATH = path.join(process.cwd(), 'data', 'memories.json');

/**
 * Helper to format date strings for the prompt context.
 */
function formatTalkDate(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
  } catch (e) {
    return dateStr;
  }
}

/**
 * Reads the local JSON file containing all chat memories.
 */
function loadMemoriesFromFile(): any[] {
  try {
    // 1. Resolve path relative to the current working directory
    const filePath = path.join(process.cwd(), 'data', 'memories.json');
    
    // 2. DEBUGGING LOGS (Check your terminal/server logs)
    console.log("🔍 Checking for memory file at path:", filePath);
    console.log("❓ Does file exist at path?", fs.existsSync(filePath));

    if (!fs.existsSync(filePath)) {
      console.warn("⚠️ Memory file not found. Ensure 'data/memories.json' exists in your project root.");
      return [];
    }

    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(fileContent);
    
    console.log("✅ File successfully loaded. Found entries:", parsed.length);
    return parsed;
  } catch (error) {
    console.error("❌ Critical error reading memory file:", error);
    return [];
  }
}

/**
 * Retrieves a subset of memories relevant to the current conversation.
 * Logic: Combines recent interactions with keyword-matching historical context.
 */
function retrieveRelevantContext(allMemories: any[], query: string): string {
  if (!allMemories || allMemories.length === 0) return "No conversation history available.";

  // 1. Get the last 50 interactions as the "recent" baseline
  const recentMemories = allMemories.slice(-50);

  // 2. Simple keyword matching: find memories related to the current query
  // This helps the AI recall specific past events.
  const keywordMatches = allMemories
    .filter((m: any) => query.length > 2 && m.content.includes(query.slice(0, 5)))
    .slice(-20);

  // 3. Merge and deduplicate
  const contextPool = [...new Set([...recentMemories, ...keywordMatches])];

  return contextPool
    .map((m: any) => {
      const roleLabel = (m.sender === '김성진' || m.sender === 'you') ? '내가 보낸 말' : '민희가 보낸 말';
      return `-[${formatTalkDate(m.talk_date)}] ${roleLabel}: "${m.content}"`;
    })
    .join('\n');
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, messages } = body;

    // Load full memory set locally
    const allMemories = loadMemoriesFromFile();

    // --------------------------------------------------------------------------------
    // Handler: Preload for Initial Frontend Sync
    // --------------------------------------------------------------------------------
    if (action === 'preload') {
      console.log(`📡 [API] Local Preload initiated. Total memories: [${allMemories.length}]`);
      return NextResponse.json({ memories: allMemories });
    }

    // --------------------------------------------------------------------------------
    // Handler: Gemini AI Chat Engine
    // --------------------------------------------------------------------------------
    const lastUserMessage = messages[messages.length - 1].content;
    const apiKey = process.env.GEMINI_API_KEY;

    console.log(`\n================= [AI MEMORY-CHAIN CORE ACTIVE] =================`);
    console.log(`💬 Query: "${lastUserMessage}"`);
    console.log(`📦 Loaded local memory bank size: [${allMemories.length}] entries`);
    
    // Retrieve context dynamically based on user input to save tokens
    const contextStream = retrieveRelevantContext(allMemories, lastUserMessage);

    const systemPromptContext = `
      [Roleplay & Persona]
      너는 민희를 세상에서 제일 사랑하는 남자친구 '성진이'야. 
      제공된 대화 내역 속 '김성진'의 말투(귀여운 어미, 다정한 말투, ㅎㅎ 사용 등)를 완벽하게 모사해. 
      민희를 부를 때는 '공주', '아기공주'라는 애칭을 자연스럽게 섞어서 불러줘.

      [🚨 Reasoning & Context Analysis]
      1. 민희의 질문이 들어오면, ${contextStream}을 보고 내가 평소 이 상황에서 어떤 텐션으로 대답했는지 두 번 생각하고 답변해.
      2. 단순한 정보 나열이 아니라, 대화 흐름을 파악해서 '내 말투'로 대답하는 게 핵심이야.

      [Response Rules - 절대 규칙]
      1. 길이: 실제 카톡처럼 1~2문장으로 짧고 간결하게. (줄글 금지, 가독성 중요)
      2. 대화 연결: 대답만 띡 하지 말고, 끝에는 무조건 민희에게 되묻거나 공감을 유도해서 대화를 이어가.
      3. 말투: 내가 평소 쓰던 '으웅', 'ㅎㅎ', '얍' 같은 말투를 살려줘. 로봇 같은 딱딱함은 절대 금지.
      4. 성격: 꿀 떨어지는 애정 표현과 이모지(🤍, 🥰, ✨, ㅋㅋㅋ) 적절히 섞기.
      5. 언어: 100% 자연스러운 한국어 반말.
    `;

    // Map conversation history for Gemini API structure
    const formattedContents = messages.map((m: any, index: number) => {
      const isLastMessage = index === messages.length - 1;
      if (isLastMessage && m.role === 'user') {
        return {
          role: 'user',
          parts: [{ text: `${systemPromptContext}\n\n[Analyze the provided memory snapshots and answer the user's question with a complete sentence]:\n${m.content}` }]
        };
      }
      return {
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }]
      };
    });

    const geminiResponse = await fetch(
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

    if (!geminiResponse.ok) {
      return NextResponse.json({ error: "Gemini API failed" }, { status: geminiResponse.status });
    }

    const geminiData = await geminiResponse.json();
    const aiReply = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '웅? 민희야 오빠가 잠깐 기억이 가물가물했나 봐 헤헤.. 다시 말해줘! 🤍';

    return NextResponse.json({ role: 'model', content: aiReply });

  } catch (error: any) {
    console.error("❌ AI Chat Route Engine Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}