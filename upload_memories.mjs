import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// 1. 환경 변수 설정
const envPath = path.resolve(process.cwd(), '.env.local');
dotenv.config({ path: envPath });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// 환경 변수 검증
if (!supabaseUrl || !supabaseKey || !GEMINI_API_KEY) {
    console.error("❌ 환경 변수 로드 실패. .env.local 파일을 확인하세요.");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const START_INDEX = 11580;

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function getEmbedding(text) {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-embedding-001:embedContent?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: 'models/gemini-embedding-001',
            content: { parts: [{ text }] }
        })
    });
    
    if (response.status === 429) throw new Error("429_QUOTA");
    
    const data = await response.json();
    if (data.error) throw new Error(JSON.stringify(data.error));
    
    return data.embedding.values.slice(0, 2000);
}

async function uploadData() {
    const fileContent = fs.readFileSync('./data/memories.json', 'utf-8');
    const memories = JSON.parse(fileContent);
    
    console.log(`🚀 안전 모드 업로드 시작 (Index ${START_INDEX}부터)...`);

    for (let i = START_INDEX; i < memories.length; i += 20) {
        const chunk = memories.slice(i, i + 20);
        const content = chunk.map(m => `${m.sender}: ${m.content}`).join('\n');
        
        try {
            console.log(`[${i}/${memories.length}] 처리 중...`);
            const embedding = await getEmbedding(content);
            
            const { error } = await supabase.from('memory_chunks').insert({
                time_period: chunk[0].talk_date ? chunk[0].talk_date.split(' ')[0] : '알수없음',
                content: content,
                embedding: embedding
            });

            if (error) throw error;
            
            // 💡 안전을 위해 10초 대기 (분당 6회 요청으로 제한)
            await sleep(10000);
            
        } catch (e) {
            if (e.message === "429_QUOTA") {
                console.error(`❌ 할당량 초과! 서버가 지쳤습니다. 15분간 대기합니다... (Index: ${i})`);
                await sleep(900000); // 15분 대기
                i -= 20; // 해당 묶음부터 재시도
            } else {
                console.error(`❌ 일반 에러 발생 (Index ${i}):`, e.message);
                await sleep(30000); // 기타 에러는 30초 대기
            }
        }
    }
    console.log("✅ 업로드 완료!");
}

uploadData();