"use client";

import { useEffect } from "react";
import { formatEther } from "viem";
import { usePortfolioStore, ActivePosition } from "@/store/usePortfolioStore";
import { useWalletStore } from "@/store/useWalletStore";
import { getBurnerClients } from "@/lib/burnerWallet";
import { executeSell } from "@/lib/swapUtils";
import { ROUTER_ABI } from "@/lib/abis";

const ROUTER_ADDRESS = process.env.NEXT_PUBLIC_DEX_ROUTER as `0x${string}`;
const WRAPPED_NATIVE = process.env.NEXT_PUBLIC_WRAPPED_NATIVE as `0x${string}`;

function PositionRow({ pos }: { pos: ActivePosition }) {
  const { updateStatus } = usePortfolioStore();
  const { burnerAccount, updateBalance } = useWalletStore();

  const handleManualSell = async () => {
    if (!burnerAccount) return;
    updateStatus(pos.id, 'selling');
    try {
      const { publicClient, walletClient } = getBurnerClients(burnerAccount);
      const { hash } = await executeSell(
        publicClient,
        walletClient,
        burnerAccount,
        pos.token.address,
        pos.amount,
        100n // 1% slippage for manual sell
      );
      updateStatus(pos.id, 'sold');
      updateBalance();
      alert(`Manual Sell Tx Sent! Hash: ${hash}`);
    } catch (e: any) {
      console.error("Sell failed:", e);
      alert(`Sell Failed: ${e.message}`);
      updateStatus(pos.id, 'active');
    }
  };

  const profitLossRaw = pos.currentValueS - pos.entryValueS;
  const profitLossPercent = Number(pos.entryValueS) > 0 
    ? (Number(profitLossRaw) / Number(pos.entryValueS)) * 100 
    : 0;

  const isProfit = profitLossRaw >= 0n;

  return (
    <div className={`p-3 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/30`}>
      <div className="flex flex-col">
        <span className="text-cyan-400 text-sm font-bold">{pos.token.symbol}</span>
        <span className="text-zinc-500 text-xs truncate max-w-[120px]">{pos.token.address}</span>
      </div>
      
      <div className="flex flex-col text-right">
        <span className="text-zinc-300 text-xs">Value: {parseFloat(formatEther(pos.currentValueS)).toFixed(6)} $S</span>
        <span className={`text-xs font-bold ${isProfit ? 'text-emerald-400' : 'text-rose-500'}`}>
          {isProfit ? '+' : ''}{parseFloat(formatEther(profitLossRaw)).toFixed(6)} $S ({profitLossPercent.toFixed(2)}%)
        </span>
      </div>
      
      <div className="ml-4">
        {pos.status === 'selling' && (
          <button disabled className="text-xs font-bold text-zinc-500 px-3 py-1 rounded border border-zinc-500/50 bg-zinc-800 w-[80px]">SELLING...</button>
        )}
        {pos.status === 'sold' && (
          <button disabled className="text-xs font-bold text-zinc-600 px-3 py-1 rounded border border-zinc-700 bg-zinc-900 w-[80px]">SOLD</button>
        )}
        {pos.status === 'active' && (
          <button 
            onClick={handleManualSell}
            className="text-xs font-bold text-rose-500 px-3 py-1 rounded border border-rose-500/50 bg-rose-500/10 hover:bg-rose-500/20 w-[80px]"
          >
            SELL
          </button>
        )}
      </div>
    </div>
  );
}

export function PositionsPanel() {
  const { positions, updatePositionValue, updateStatus } = usePortfolioStore();
  const { burnerAccount, updateBalance } = useWalletStore();

  useEffect(() => {
    if (!burnerAccount) return;
    const { publicClient, walletClient } = getBurnerClients(burnerAccount);

    const interval = setInterval(async () => {
      const activePositions = usePortfolioStore.getState().positions.filter(p => p.status === 'active');
      
      for (const pos of activePositions) {
        try {
          const path = [pos.token.address, WRAPPED_NATIVE];
          const amountsOut = await publicClient.readContract({
            address: ROUTER_ADDRESS,
            abi: ROUTER_ABI,
            functionName: 'getAmountsOut',
            args: [pos.amount, path]
          }) as bigint[];
          
          const currentValueS = amountsOut[1];
          updatePositionValue(pos.id, currentValueS);

          // Check TP/SL logic
          const profitLossPercent = Number(pos.entryValueS) > 0 
            ? (Number(currentValueS - pos.entryValueS) / Number(pos.entryValueS)) * 100 
            : 0;

          if (profitLossPercent >= pos.tpPercentage || profitLossPercent <= -pos.slPercentage) {
            // Trigger Auto-Sell
            updateStatus(pos.id, 'selling');
            executeSell(
              publicClient,
              walletClient,
              burnerAccount,
              pos.token.address,
              pos.amount,
              200n // 2% slippage for automated panic sells to ensure execution
            ).then(({ hash }) => {
              updateStatus(pos.id, 'sold');
              updateBalance();
              console.log(`Auto-Sell Triggered for ${pos.token.symbol}. Hash: ${hash}`);
            }).catch(e => {
              console.error(`Auto-Sell failed for ${pos.token.symbol}:`, e);
              updateStatus(pos.id, 'active');
            });
          }
        } catch (e) {
          // getAmountsOut might fail if no liquidity
          console.warn(`Could not fetch price for ${pos.token.symbol}`);
        }
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [burnerAccount, updatePositionValue, updateStatus, updateBalance]);

  return (
    <div className="flex flex-col w-full h-full border border-zinc-800 bg-zinc-900 rounded overflow-hidden">
      <div className="p-2 border-b border-zinc-800 bg-zinc-950 flex justify-between items-center">
        <h2 className="text-zinc-500 text-xs">ACTIVE POSITIONS (AUTO TP/SL POLLING)</h2>
        <span className="text-cyan-400 text-xs font-bold">{positions.filter(p => p.status !== 'sold').length}</span>
      </div>
      
      <div className="flex-1 overflow-y-auto max-h-[400px]">
        {positions.length === 0 ? (
          <div className="p-4 text-center text-zinc-600 text-sm italic">
            No active positions
          </div>
        ) : (
          positions.map((p) => <PositionRow key={p.id} pos={p} />)
        )}
      </div>
    </div>
  );
}
