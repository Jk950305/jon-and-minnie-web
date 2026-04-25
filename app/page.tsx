// app/page.tsx
export default function Home() {
  return (
    <main className="min-h-screen bg-[#FDFBF7] flex flex-col items-center justify-center p-8">
      <div className="text-center space-y-6">
        <h1 className="text-4xl font-light text-[#4A3F35] tracking-widest">
          JON & MINNIE
        </h1>
        <div className="h-[1px] w-24 bg-[#D4C3B3] mx-auto"></div>
        <p className="text-lg text-[#8C7B6E] font-light">
          우리의 소중한 기록이 시작되는 곳
        </p>
        
        <div className="pt-12 grid grid-cols-1 gap-6">
          <a href="/proposal" className="px-8 py-3 border border-[#D4C3B3] text-[#4A3F35] hover:bg-[#F5F1EA] transition-all">
            FOR MINNIE (Proposal)
          </a>
          <a href="/invitation" className="px-8 py-3 bg-[#4A3F35] text-white hover:bg-[#5D5146] transition-all">
            WEDDING INVITATION
          </a>
        </div>
      </div>
    </main>
  );
}