"use client";

import { useSettingsStore } from "@/store/useSettingsStore";

export function SettingsPanel() {
  const { 
    snipeAmountS, defaultTpPercent, defaultSlPercent,
    setSnipeAmount, setTpPercent, setSlPercent
  } = useSettingsStore();

  return (
    <div className="flex flex-col md:flex-row gap-4 border border-zinc-800 bg-zinc-900 rounded p-4 items-center justify-between w-full shadow-lg">
      <div className="flex items-center gap-2">
        <span className="text-zinc-500 text-xs font-bold">BUY AMOUNT ($S)</span>
        <input 
          type="number" 
          step="0.0001"
          value={snipeAmountS} 
          onChange={(e) => setSnipeAmount(e.target.value)}
          className="bg-zinc-950 border border-zinc-700 text-cyan-400 font-bold text-sm px-2 py-1 w-24 rounded focus:outline-none focus:border-cyan-500 transition-colors"
        />
      </div>
      
      <div className="flex items-center gap-2">
        <span className="text-zinc-500 text-xs font-bold">TAKE PROFIT (%)</span>
        <input 
          type="number" 
          value={defaultTpPercent} 
          onChange={(e) => setTpPercent(Number(e.target.value))}
          className="bg-emerald-950 border border-emerald-900 text-emerald-400 font-bold text-sm px-2 py-1 w-20 rounded focus:outline-none focus:border-emerald-500 transition-colors"
        />
      </div>
      
      <div className="flex items-center gap-2">
        <span className="text-zinc-500 text-xs font-bold">STOP LOSS (%)</span>
        <input 
          type="number" 
          value={defaultSlPercent} 
          onChange={(e) => setSlPercent(Number(e.target.value))}
          className="bg-rose-950 border border-rose-900 text-rose-500 font-bold text-sm px-2 py-1 w-20 rounded focus:outline-none focus:border-rose-500 transition-colors"
        />
      </div>
    </div>
  );
}
