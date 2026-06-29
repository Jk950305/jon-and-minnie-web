// scripts/upload-memories.js
const fs = require('fs');
const path = require('path');

/**
 * Loads environment variables from the .env.local file in the project root.
 */
function loadEnvLocal() {
  const envPath = path.join(__dirname, '../.env.local');
  if (!fs.existsSync(envPath)) {
    console.error("❌ Error: .env.local file not found in the project root.");
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

// Initialize Environment
loadEnvLocal();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("❌ Error: Supabase URL or Service Role Key missing in .env.local.");
  process.exit(1);
}

// Mapping English month names to index
const monthMap = {
  january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
  july: 6, august: 7, september: 8, october: 9, november: 10, december: 11,
  jan: 0, feb: 1, mar: 2, apr: 3, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
};

/**
 * Parses timestamp components into an ISO-like date string.
 */
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

/**
 * Parses a KakaoTalk text file into structured JSON objects.
 */
function parseFileToMessages(filePath, fileType) {
  if (!fs.existsSync(filePath)) {
    console.warn(`⚠️ Warning: File not found: ${filePath}`);
    return [];
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split(/\r?\n/);
  
  const messages = [];
  const ignorePatterns = [
    /들어왔습니다\./, /나갔습니다\./, /^-------/, /^Date Saved/, /KakaoTalk Chats with/
  ];

  // Regex patterns for different file versions
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

/**
 * Helper: Sleep function for rate limiting.
 */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Helper: Network-resilient fetch with retry logic.
 */
async function fetchWithRetry(url, options, retries = 3, delay = 2000) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      if (response.ok) return response;
      
      const errText = await response.text();
      console.warn(`⚠️ Supabase Error (Attempt ${i + 1}/${retries}): ${response.status} - ${errText}`);
    } catch (err) {
      console.warn(`⚠️ Network Error (Attempt ${i + 1}/${retries}): ${err.message}`);
    }
    if (i < retries - 1) {
      console.log(`⏳ Retrying in ${delay / 1000}s...`);
      await sleep(delay);
    }
  }
  throw new Error(`❌ Failed after ${retries} attempts.`);
}

/**
 * Main execution function.
 */
async function main() {
  const filesToUpload = [
    { name: '2018-2020 Chats', type: '2018', path: path.join(__dirname, 'KakaoTalkChats_2018-2020.txt') },
    { name: '2023-2026 Chats', type: '2023', path: path.join(__dirname, 'KakaoTalk Chats_2023-2026.eml') }
  ];

  let allInsertData = [];

  // Step 1: Parse Files
  for (const fileInfo of filesToUpload) {
    console.log(`📦 Processing ${fileInfo.name}...`);
    const parsedMessages = parseFileToMessages(fileInfo.path, fileInfo.type);
    console.log(`✨ Done: ${fileInfo.name} -> Extracted ${parsedMessages.length} messages.`);
    allInsertData = allInsertData.concat(parsedMessages);
  }

  // Step 2: Save to local JSON (This is what your API route will read)
  if (allInsertData.length > 0) {
    const outputDir = path.join(__dirname, '../data');
    const outputPath = path.join(outputDir, 'memories.json');
    
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
    
    fs.writeFileSync(outputPath, JSON.stringify(allInsertData, null, 2));
    console.log(`\n✅ Success: Data saved to ${outputPath}. Total: ${allInsertData.length} entries.`);
  } else {
    console.error("❌ No data extracted.");
    return;
  }

  // Step 3: Upload to Supabase
  console.log(`\n🚀 Uploading to Supabase...`);
  const batchSize = 400;
  for (let i = 0; i < allInsertData.length; i += batchSize) {
    const batch = allInsertData.slice(i, i + batchSize);
    
    try {
      await fetchWithRetry(`${supabaseUrl}/rest/v1/chat_memories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify(batch)
      }, 4, 3000);
      
      console.log(`[Progress] ${Math.min(i + batchSize, allInsertData.length)} / ${allInsertData.length} uploaded.`);
    } catch (e) {
      console.error(`❌ Upload failed at index ${i}:`, e.message);
    }
    await sleep(50);
  }

  console.log('\n🎉 [Success] JSON generated and Supabase upload complete!');
}

main().catch(console.error);