"use client";

import { useEffect, useState } from "react";
import { createPublicClient, webSocket } from "viem";
import { sonic } from "viem/chains";
import { FACTORY_ABI } from "@/lib/abis";
import { useRadarStore, RadarPair } from "@/store/useRadarStore";

import { checkHoneypot } from "@/lib/swapUtils";
import { getBurnerClients } from "@/lib/burnerWallet";
import { useWalletStore } from "@/store/useWalletStore";

const WSS_URL = process.env.NEXT_PUBLIC_SONIC_RPC_WSS || "wss://rpc.soniclabs.com";
const FACTORY_ADDRESS = process.env.NEXT_PUBLIC_DEX_FACTORY as `0x${string}`;
const WRAPPED_NATIVE = process.env.NEXT_PUBLIC_WRAPPED_NATIVE as `0x${string}`;

function RadarRow({ pair }: { pair: RadarPair }) {
  const { markAsOld, setHoneypotStatus } = useRadarStore();
  const { burnerAccount } = useWalletStore();
  const [isBuying, setIsBuying] = useState(false);
  
  useEffect(() => {
    if (pair.isNew) {
      const timer = setTimeout(() => {
        markAsOld(pair.pair);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [pair.isNew, pair.pair, markAsOld]);

  // Background honeypot check
  useEffect(() => {
    if (pair.honeypotStatus === 'pending' && burnerAccount) {
      const runCheck = async () => {
        try {
          const { publicClient } = getBurnerClients(burnerAccount);
          // Which token to check? We want to buy the non-native one.
          const targetToken = pair.token0.toLowerCase() === WRAPPED_NATIVE.toLowerCase() ? pair.token1 : pair.token0;
          const isHoneypot = await checkHoneypot(publicClient, burnerAccount, targetToken);
          setHoneypotStatus(pair.pair, isHoneypot ? 'honeypot' : 'safe');
        } catch (e) {
          setHoneypotStatus(pair.pair, 'honeypot'); // Default to honeypot on any error
        }
      };
      runCheck();
    }
  }, [pair.honeypotStatus, pair.pair, pair.token0, pair.token1, burnerAccount, setHoneypotStatus]);

  const handleSnipe = async () => {
    // This will be implemented in Phase 5 or triggered directly
    alert("Snipe function not fully hooked up to portfolio yet!");
  };

  return (
    <div 
      className={`p-3 border-b border-zinc-800 flex justify-between items-center transition-colors duration-500 ${
        pair.isNew ? "bg-emerald-500/20" : "bg-zinc-900/30 hover:bg-zinc-800/50"
      }`}
    >
      <div className="flex flex-col">
        <span className="text-cyan-400 text-sm font-bold">New Pair Detected</span>
        <span className="text-zinc-500 text-xs truncate w-[140px] md:w-[200px]">{pair.pair}</span>
      </div>
      
      <div className="flex flex-col text-right">
        <span className="text-zinc-400 text-xs">Token0: {pair.token0.slice(0, 6)}...{pair.token0.slice(-4)}</span>
        <span className="text-zinc-400 text-xs">Token1: {pair.token1.slice(0, 6)}...{pair.token1.slice(-4)}</span>
      </div>
      
      <div className="ml-4">
        {pair.honeypotStatus === 'pending' && (
          <button disabled className="text-xs bg-zinc-800 text-zinc-500 px-3 py-1 rounded w-[100px]">SIMULATING...</button>
        )}
        {pair.honeypotStatus === 'honeypot' && (
          <button disabled className="text-xs font-bold text-rose-500 px-3 py-1 rounded border border-rose-500/50 bg-rose-500/10 w-[100px]">[HONEYPOT]</button>
        )}
        {pair.honeypotStatus === 'safe' && (
          <button 
            onClick={handleSnipe}
            disabled={isBuying}
            className="text-xs font-bold text-emerald-400 px-3 py-1 rounded border border-emerald-500/50 bg-emerald-500/10 hover:bg-emerald-500/20 w-[100px]"
          >
            {isBuying ? "BUYING..." : "SNIPE"}
          </button>
        )}
      </div>
    </div>
  );
}

export function LiveRadar() {
  const { pairs, addPair } = useRadarStore();
  const [isListening, setIsListening] = useState(false);

  useEffect(() => {
    if (!FACTORY_ADDRESS) {
      console.warn("No DEX Factory address provided for Radar.");
      return;
    }

    const wssClient = createPublicClient({
      chain: sonic,
      transport: webSocket(WSS_URL),
    });

    const unwatch = wssClient.watchContractEvent({
      address: FACTORY_ADDRESS,
      abi: FACTORY_ABI,
      eventName: 'PairCreated',
      onLogs: (logs) => {
        logs.forEach((log) => {
          const args = log.args as any;
          if (args && args.token0 && args.token1 && args.pair) {
            addPair({
              token0: args.token0,
              token1: args.token1,
              pair: args.pair,
            });
          }
        });
      },
    });

    setIsListening(true);

    return () => {
      unwatch();
      setIsListening(false);
    };
  }, [addPair]);

  return (
    <div className="flex flex-col w-full h-full border border-zinc-800 bg-zinc-900 rounded overflow-hidden">
      <div className="p-2 border-b border-zinc-800 bg-zinc-950 flex justify-between items-center">
        <h2 className="text-zinc-500 text-xs">LIVE RADAR</h2>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isListening ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
          <span className={isListening ? "text-emerald-400 text-xs" : "text-rose-500 text-xs"}>
            {isListening ? "LISTENING" : "OFFLINE"}
          </span>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto max-h-[400px]">
        {pairs.length === 0 ? (
          <div className="p-4 text-center text-zinc-600 text-sm italic">
            Waiting for new pairs to be deployed...
          </div>
        ) : (
          pairs.map((p) => <RadarRow key={p.pair} pair={p} />)
        )}
      </div>
    </div>
  );
}
