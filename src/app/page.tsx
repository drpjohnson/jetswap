import { Topbar } from "@/components/Topbar";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col bg-zinc-950 font-mono text-zinc-300">
      <Topbar />
      
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="border border-zinc-800 bg-zinc-900/50 p-6 rounded-lg text-center shadow-lg w-full max-w-2xl">
          <h1 className="text-xl text-cyan-400 mb-2">[ SONIC DEGEN TERMINAL ]</h1>
          <p className="text-sm text-zinc-500 mb-6">Awaiting incoming pairs...</p>
          
          <div className="grid grid-cols-2 gap-4 text-left">
            <div className="p-4 border border-zinc-800 bg-zinc-900 rounded">
              <h2 className="text-zinc-500 text-xs mb-1">RADAR STATUS</h2>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-emerald-400">ONLINE</span>
              </div>
            </div>
            
            <div className="p-4 border border-zinc-800 bg-zinc-900 rounded">
              <h2 className="text-zinc-500 text-xs mb-1">ACTIVE POSITIONS</h2>
              <div className="text-cyan-400">0</div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
