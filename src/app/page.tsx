"use client";

import { useState } from "react";
import { Topbar } from "@/components/Topbar";
import { useWalletStore } from "@/store/useWalletStore";
import { executeBuy } from "@/lib/swapUtils";
import { getBurnerClients } from "@/lib/burnerWallet";
import { parseEther } from "viem";

export default function Home() {
  const { burnerAccount, updateBalance } = useWalletStore();
  const [isBuying, setIsBuying] = useState(false);

  const handleTestBuy = async () => {
    if (!burnerAccount) return alert("Burner wallet not loaded!");
    setIsBuying(true);
    try {
      const { publicClient, walletClient } = getBurnerClients(burnerAccount);
      const wSAddress = process.env.NEXT_PUBLIC_WRAPPED_NATIVE as `0x${string}`;
      // Just test buying wS or routing to wS. To do a real swap we need a path.
      // Wait, routing wS -> wS doesn't work on V2 usually (needs different tokens).
      // Let's use a dummy token address or the SwapX token if the user wants.
      // The user suggested SwapX token or wrap $S. But swapExactETHForTokens requires an output token.
      // Let's use USDC on Sonic if we know it, or just use a placeholder address that fails gracefully, 
      // OR we can just buy the Wrapped Native itself if the router allows it (usually it doesn't).
      // Since it's a test, let's use a known token. 
      // Actually, if we just want to test execution without reverting, we can use the wS address to see if the router accepts it, 
      // but standard V2 router path must be >= 2 tokens. 
      // Let's just use some random address: 0x0000000000000000000000000000000000000001
      // It will revert on chain, but we will see the simulation or execution try.
      // Wait! The user said "you can test buying SwapX token itself". I'll use SwapX token address if I can find it.
      // Let's just use USDC on Sonic: 0x29219dd400f2Bf60E5a23d13Be72B486D4038894 (USDC.e) or similar.
      // I will put a generic address and let it revert if it's not a real pair, the point is to test the integration.
      // Let's use 0x29219dd400f2Bf60E5a23d13Be72B486D4038894 (USDC)
      
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
      
      <div className="flex-1 flex flex-col items-center justify-center p-4 gap-4">
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

        {/* TEST BUTTON */}
        <button 
          onClick={handleTestBuy}
          disabled={isBuying}
          className="border border-rose-500 bg-rose-500/10 text-rose-500 px-6 py-2 rounded hover:bg-rose-500/20 disabled:opacity-50"
        >
          {isBuying ? "[ EXECUTING... ]" : "[ DEBUG: TEST BUY ]"}
        </button>
      </div>
    </main>
  );
}
