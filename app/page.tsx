import Link from 'next/link'; // Link 추가

export default function Home() {
  return (
    <main className="min-h-screen bg-[#1A1512] flex flex-col items-center justify-center p-8"> 
      {/* 배경색을 스크린샷과 일치하는 어두운 톤(#1A1512)으로 조정했습니다 */}
      <div className="text-center space-y-6">
        <h1 className="text-4xl font-light text-[#D4AF37] tracking-widest uppercase">
          JON & MINNIE
        </h1>
        <div className="h-[1px] w-24 bg-[#D4AF37] mx-auto opacity-50"></div>
        <p className="text-lg text-[#C5B4A2] font-light">
          우리의 소중한 기록이 시작되는 곳
        </p>
        
        <div className="pt-12 flex flex-col gap-4">
          <Link 
            href="/proposal" 
            className="px-12 py-3 border border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black transition-all duration-500 uppercase text-sm tracking-widest"
          >
            FOR MINNIE (Proposal)
          </Link>
          <Link 
            href="/invitation" 
            className="px-12 py-3 bg-[#332A22] text-[#C5B4A2] hover:bg-[#4A3F35] transition-all duration-500 uppercase text-sm tracking-widest"
          >
            WEDDING INVITATION
          </Link>
        </div>
      </div>
    </main>
  );
}