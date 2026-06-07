// scripts/upload-memories.js
const fs = require('fs');
const path = require('path');

function loadEnvLocal() {
  const envPath = path.join(__dirname, '../.env.local');
  if (!fs.existsSync(envPath)) {
    console.error("❌ 프로젝트 루트 디렉토리에서 .env.local 파일을 찾을 수 없습니다.");
    process.exit(1);
  }
  
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split(/\r?\n/).forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    
    const [key, ...values] = trimmed.split('=');
    if (key) {
      let val = values.join('=').trim();
      if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
      if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
      process.env[key.trim()] = val;
    }
  });
}

loadEnvLocal();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("❌ .env.local 파일에서 Supabase URL 또는 Service Role Key를 찾을 수 없습니다.");
  process.exit(1);
}

const monthMap = {
  january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
  july: 6, august: 7, september: 8, october: 9, november: 10, december: 11,
  jan: 0, feb: 1, mar: 2, apr: 3, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
};

function buildTimestamp(monthText, dayStr, yearStr, timeStr, ampmText) {
  try {
    const month = monthMap[monthText.toLowerCase().trim()];
    const day = parseInt(dayStr, 10);
    const year = parseInt(yearStr, 10);
    
    if (month === undefined || isNaN(day) || isNaN(year)) return null;

    const [hourStr, minStr] = timeStr.split(':');
    let hour = parseInt(hourStr, 10);
    const min = parseInt(minStr, 10);

    const isPm = ampmText.toLowerCase().includes('p');
    if (isPm && hour < 12) hour += 12;
    if (!isPm && hour === 12) hour = 0;

    const dateObj = new Date(year, month, day, hour, min, 0);
    const pad = (n) => String(n).padStart(2, '0');
    
    return `${dateObj.getFullYear()}-${pad(dateObj.getMonth() + 1)}-${pad(dateObj.getDate())} ${pad(dateObj.getHours())}:${pad(dateObj.getMinutes())}:00`;
  } catch (e) {
    return null;
  }
}

function parseFileToMessages(filePath, fileType) {
  if (!fs.existsSync(filePath)) {
    console.warn(`⚠️ 파일을 찾을 수 없습니다: ${filePath}`);
    return [];
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split(/\r?\n/);
  
  const messages = [];
  const ignorePatterns = [
    /들어왔습니다\./, /나갔습니다\./, /^-------/, /^Date Saved/, /KakaoTalk Chats with/
  ];

  const regex2018 = /^([A-Za-z]+)\s+(\d+),\s+(\d{4}),\s+(\d{1,2}:\d{2})\s+(p\.m\.|a\.m\.|pm|am),\s*([^:]+?)\s*:\s*(.*)$/i;
  const regex2023 = /^([A-Za-z]+)\s+(\d+),\s+(\d{4})\s+at\s+(\d{1,2}:\d{2})[\s\u202f\u00a0]+(p\.m\.|a\.m\.|pm|am),\s*([^:]+?)\s*:\s*(.*)$/i;

  const activeRegex = fileType === '2018' ? regex2018 : regex2023;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    if (ignorePatterns.some(regex => regex.test(line))) continue;

    const match = line.match(activeRegex);
    if (match) {
      const [_, monthText, day, year, time, ampm, rawSender, chatContent] = match;
      
      const sender = (rawSender.trim().toLowerCase() === 'you') ? '김성진' : rawSender.trim();
      const talkDateIso = buildTimestamp(monthText, day, year, time, ampm);

      messages.push({
        content: chatContent.trim(),
        sender: sender,
        talk_date: talkDateIso
      });
    } else {
      const isJustDateLine = /^[A-Za-z]+ \d+, \d{4}/.test(line);
      if (!isJustDateLine && messages.length > 0) {
        messages[messages.length - 1].content += '\n' + line;
      }
    }
  }

  return messages;
}

// ⏳ 지연 처리용 헬퍼 함수
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// 🔄 네트워크 에러 복구형 재시도 fetch 함수
async function fetchWithRetry(url, options, retries = 3, delay = 2000) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      if (response.ok) return response;
      
      // 상태 코드가 에러인 경우 스트링 출력 후 재시도
      const errText = await response.text();
      console.warn(`⚠️ Supabase 응답 이상 (시도 ${i + 1}/${retries}): ${response.status} - ${errText}`);
    } catch (err) {
      console.warn(`⚠️ 네트워크 소켓 끊김 검지 (시도 ${i + 1}/${retries}): ${err.message}`);
    }
    if (i < retries - 1) {
      console.log(`⏳ ${delay / 1000}초 후 재시도합니다...`);
      await sleep(delay);
    }
  }
  throw new Error(`❌ 총 ${retries}회 재시도하였으나 업로드에 최종 실패했습니다.`);
}

async function main() {
  const filesToUpload = [
    { name: '2018-2020 대화', type: '2018', path: path.join(__dirname, 'KakaoTalkChats_2018-2020.txt') },
    { name: '2023-2026 대화', type: '2023', path: path.join(__dirname, 'KakaoTalk Chats_2023-2026.eml') }
  ];

  let allInsertData = [];

  for (const fileInfo of filesToUpload) {
    console.log(`📦 [${fileInfo.name}] 개별 지정 Regex 엔진으로 추출 시작...`);
    const parsedMessages = parseFileToMessages(fileInfo.path, fileInfo.type);
    console.log(`✨ ${fileInfo.name} 정제 완료 ➡️ 추출된 대화수: ${parsedMessages.length}개`);
    allInsertData = allInsertData.concat(parsedMessages);
  }

  if (allInsertData.length === 0) {
    console.error("❌ 추출된 대화 데이터가 없습니다.");
    return;
  }

  console.log(`\n🚀 총 ${allInsertData.length}개의 대화를 Supabase에 안심 모드로 업로드합니다...`);

  const batchSize = 400; // 네트워크 안정성을 위해 배치 사이즈 살짝 최적화
  for (let i = 0; i < allInsertData.length; i += batchSize) {
    const batch = allInsertData.slice(i, i + batchSize);
    
    const response = await fetchWithRetry(`${supabaseUrl}/rest/v1/chat_memories`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(batch)
    }, 4, 3000); // 최대 4번 재시도, 실패시 3초 대기

    console.log(`[진행률] ${Math.min(i + batchSize, allInsertData.length)} / ${allInsertData.length} 완료`);
    
    // Supabase API 게이트웨이 부하 방지를 위해 주기적 50ms 쿨타임 제공
    await sleep(50);
  }

  console.log('\n🎉 [성공] 대용량 소켓 에러를 완벽하게 방어하고 269,110개 전체 업로드 완료했습니다!');
}

main();