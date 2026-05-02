import { executeQuery } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  console.log('--- API ROUTE START: GET /api/timeline ---');
  const requestStartTime = Date.now();

  try {
    console.log('STEP: Calling executeQuery for timeline table');
    
    // 수정된 executeQuery는 테이블 이름만 받도록 설계되었습니다.
    // 내부적으로 order('event_date', { ascending: false })를 적용하거나 
    // 여기서 직접 supabase 클라이언트를 써도 됩니다.
    const data = await executeQuery('timeline');
    
    const duration = (Date.now() - requestStartTime) / 1000;
    console.log(`STEP: Query successful (Total API Time: ${duration}s)`);
    
    return NextResponse.json(data);
  } catch (error: any) {
    const duration = (Date.now() - requestStartTime) / 1000;
    console.error(`FAILED: API Route Error after ${duration}s`);
    
    return NextResponse.json(
      { 
        error: '데이터를 가져오는데 실패했습니다.',
        message: error.message
      }, 
      { status: 500 }
    );
  } finally {
    console.log('--- API ROUTE END ---');
  }
}