import { createClient } from '@supabase/supabase-js';

// .env.local에 저장한 키값들을 가져옵니다.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Supabase 클라이언트 초기화 (오라클의 connection pool 역할을 대신합니다)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function executeQuery(tableName: string, queryOptions: any = {}) {
  console.log('--- SUPABASE DEBUG START ---');
  const startTime = Date.now();

  try {
    // 1단계: 환경 변수 체크
    console.log('STEP 1: Checking Credentials');
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Supabase URL or Anon Key is missing in .env.local');
    }

    // 2단계: 데이터 조회 (Oracle의 SELECT query 역할)
    console.log(`STEP 2: Fetching data from [${tableName}] table...`);
    
    // 유연한 조회를 위해 supabase 기본 문법을 사용합니다.
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const duration = (Date.now() - startTime) / 1000;
    console.log(`SUCCESS: Fetched ${data?.length} rows (Duration: ${duration}s)`);

    return data;

  } catch (err: any) {
    console.error('FAILED: Error during Supabase execution');
    console.error(`- Error Message: ${err.message}`);
    
    // Oracle의 NJS-511(타임아웃) 대신 발생할 수 있는 정책 에러 처리
    if (err.message.includes('row-level security')) {
      console.error('ADVICE: Check your RLS policies on the Supabase dashboard.');
    }
    throw err;
  } finally {
    console.log('--- SUPABASE DEBUG END ---');
  }
}