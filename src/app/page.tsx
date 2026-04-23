"use client";

import { useState } from "react";
import { Topbar } from "@/components/Topbar";
import { useWalletStore } from "@/store/useWalletStore";
import { executeBuy } from "@/lib/swapUtils";
import { getBurnerClients } from "@/lib/burnerWallet";
import { parseEther } from "viem";
import { LiveRadar } from "@/components/LiveRadar";
import { PositionsPanel } from "@/components/PositionsPanel";

export default function Home() {
  const { burnerAccount, updateBalance } = useWalletStore();
  const [isBuying, setIsBuying] = useState(false);

  const handleTestBuy = async () => {
    if (!burnerAccount) return alert("Burner wallet not loaded!");
    setIsBuying(true);
    try {
      const { publicClient, walletClient } = getBurnerClients(burnerAccount);
      const wSAddress = process.env.NEXT_PUBLIC_WRAPPED_NATIVE as `0x${string}`;
      
      const testToken = "0x29219dd400f2Bf60E5a23d13Be72B486D4038894" as `0x${string}`;
      
      const { hash } = await executeBuy(
        publicClient,
        walletClient,
        burnerAccount,
        testToken,
        parseEther("0.0001"),
        100n // 1% slippage
      );
      
      alert(`Buy Tx Sent! Hash: ${hash}`);
      await publicClient.waitForTransactionReceipt({ hash });
      alert("Buy Tx Confirmed!");
      updateBalance();
    } catch (e: any) {
      console.error(e);
      alert(`Test Buy Failed: ${e.message}`);
    } finally {
      setIsBuying(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col bg-zinc-950 font-mono text-zinc-300">
      <Topbar />
      
      <div className="flex-1 flex flex-col items-center p-4 gap-4 max-w-5xl mx-auto w-full">
        <div className="text-center my-4">
          <h1 className="text-2xl text-cyan-400 mb-1">[ SONIC DEGEN TERMINAL ]</h1>
          <p className="text-sm text-zinc-500">Waiting for snipe targets...</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full h-full min-h-[500px]">
          {/* RADAR PANEL */}
          <div className="h-full">
            <LiveRadar />
          </div>
          
          {/* POSITIONS PANEL */}
          <div className="h-full">
            <PositionsPanel />
          </div>
        </div>

        {/* TEST BUTTON */}
        <button 
          onClick={handleTestBuy}
          disabled={isBuying}
          className="mt-8 border border-rose-500 bg-rose-500/10 text-rose-500 px-6 py-2 rounded hover:bg-rose-500/20 disabled:opacity-50"
        >
          {isBuying ? "[ EXECUTING... ]" : "[ DEBUG: TEST BUY ]"}
        </button>
      </div>
    </main>
  );
}
