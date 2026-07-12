import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const API_KEY = process.env.GEMINI_API_KEY;

async function listModels() {
    console.log("🔍 구글 API 서버 응답 데이터를 가공 없이 그대로 출력합니다...");
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${API_KEY}`);
        const data = await response.json();

        // 에러를 방지하기 위해 가공하지 않고 전체 JSON을 그대로 출력
        console.log(JSON.stringify(data, null, 2));
        
    } catch (e) {
        console.error("❌ 연결 에러:", e.message);
    }
}

listModels();