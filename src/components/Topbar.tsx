"use client";

import { useEffect } from "react";
import { useWalletStore } from "@/store/useWalletStore";
import { useAccount, useConnect, useSendTransaction, useSwitchChain, useWaitForTransactionReceipt } from "wagmi";
import { injected } from "wagmi/connectors";
import { parseEther } from "viem";
import { sonic } from "wagmi/chains";

export function Topbar() {
  const { burnerAddress, burnerBalance, isLoaded, initBurner, updateBalance, withdrawAll } = useWalletStore();
  const { address: mainWalletAddress, isConnected, chainId } = useAccount();
  const { connect } = useConnect();
  const { switchChain } = useSwitchChain();
  const { data: hash, sendTransaction } = useSendTransaction();
  
  const { isSuccess } = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (isSuccess) {
      updateBalance();
    }
  }, [isSuccess, updateBalance]);

  useEffect(() => {
    initBurner();
  }, [initBurner]);

  const isCorrectNetwork = chainId === sonic.id;

  const handleFund = () => {
    if (!isConnected) {
      connect({ connector: injected(), chainId: sonic.id });
      return;
    }
    
    if (!isCorrectNetwork && switchChain) {
      switchChain({ chainId: sonic.id });
      return;
    }
    
    if (burnerAddress) {
      sendTransaction({
        to: burnerAddress as `0x${string}`,
        value: parseEther("1"), // Default funding 1 S
      });
    }
  };

  if (!isLoaded) {
    return <div className="h-14 border-b border-zinc-800 bg-zinc-900 flex items-center px-4 animate-pulse" />;
  }

  return (
    <div className="h-14 border-b border-zinc-800 bg-zinc-900 flex items-center justify-between px-4 font-mono text-sm shadow-md">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-zinc-400">BURNER_ID:</span>
          <span className="text-cyan-400 font-bold bg-cyan-950/30 px-2 py-0.5 rounded border border-cyan-900/50">
            {burnerAddress ? `${burnerAddress.slice(0, 6)}...${burnerAddress.slice(-4)}` : "LOADING..."}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-zinc-400">BAL:</span>
          <span className="text-emerald-400 font-bold">
            {Number(burnerBalance).toFixed(4)} $S
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {isConnected ? (
          <div className="text-xs text-zinc-500">
            MAIN_WALLET: {mainWalletAddress?.slice(0, 6)}...{mainWalletAddress?.slice(-4)}
          </div>
        ) : null}
        
        <button
          onClick={handleFund}
          className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 hover:border-emerald-500/40 px-3 py-1 rounded transition-colors"
        >
          {!isConnected 
            ? "[ CONNECT TO FUND ]" 
            : !isCorrectNetwork 
              ? "[ SWITCH TO SONIC ]" 
              : "[ FUND 1 $S ]"}
        </button>
        {isConnected && Number(burnerBalance) > 0 && mainWalletAddress && (
          <button
            onClick={() => withdrawAll(mainWalletAddress)}
            className="bg-rose-500/10 text-rose-500 border border-rose-500/20 hover:bg-rose-500/20 hover:border-rose-500/40 px-3 py-1 rounded transition-colors"
          >
            [ WITHDRAW ALL ]
          </button>
        )}
      </div>
    </div>
  );
}
