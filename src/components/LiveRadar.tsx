"use client";

import { useEffect, useState } from "react";
import { createPublicClient, webSocket } from "viem";
import { sonic } from "viem/chains";
import { FACTORY_ABI } from "@/lib/abis";
import { useRadarStore, RadarPair } from "@/store/useRadarStore";

import { checkHoneypot, executeBuy } from "@/lib/swapUtils";
import { executeSolanaBuy } from "@/lib/pumpUtils";
import { getBurnerClients } from "@/lib/burnerWallet";
import { useWalletStore } from "@/store/useWalletStore";
import { useSettingsStore } from "@/store/useSettingsStore";
import { usePortfolioStore } from "@/store/usePortfolioStore";
import { parseEther } from "viem";
import { Connection, Keypair } from '@solana/web3.js';
import { PumpFunSDK } from 'pumpdotfun-sdk';
import { AnchorProvider } from '@coral-xyz/anchor';

const WSS_URL = process.env.NEXT_PUBLIC_SONIC_RPC_WSS || "wss://rpc.soniclabs.com";
const FACTORY_ADDRESS = process.env.NEXT_PUBLIC_DEX_FACTORY as `0x${string}`;
const WRAPPED_NATIVE = process.env.NEXT_PUBLIC_WRAPPED_NATIVE as `0x${string}`;

function RadarRow({ pair }: { pair: RadarPair }) {
  const { markAsOld, setHoneypotStatus } = useRadarStore();
  const { burnerAccount, solanaBurnerAccount, network } = useWalletStore();
  const [isBuying, setIsBuying] = useState(false);
  const { snipeAmountS, defaultTpPercent, defaultSlPercent } = useSettingsStore();
  
  useEffect(() => {
    if (pair.isNew) {
      const timer = setTimeout(() => {
        markAsOld(pair.pair);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [pair.isNew, pair.pair, markAsOld]);

  // Background honeypot check (EVM only for now)
  useEffect(() => {
    if (pair.network !== 'sonic') return; // Skip honeypot check for Pump.fun tokens initially
    
    if (pair.honeypotStatus === 'pending' && burnerAccount) {
      const runCheck = async () => {
        try {
          const { publicClient } = getBurnerClients(burnerAccount);
          const targetToken = pair.token0.toLowerCase() === WRAPPED_NATIVE.toLowerCase() ? pair.token1 : pair.token0;
          const isHoneypot = await checkHoneypot(publicClient, burnerAccount, targetToken as `0x${string}`);
          setHoneypotStatus(pair.pair, isHoneypot ? 'honeypot' : 'safe');
        } catch (e) {
          setHoneypotStatus(pair.pair, 'honeypot');
        }
      };
      runCheck();
    }
  }, [pair.network, pair.honeypotStatus, pair.pair, pair.token0, pair.token1, burnerAccount, setHoneypotStatus]);

  const { addPosition } = usePortfolioStore();

  const handleSnipe = async () => {
    if (pair.network === 'sonic') {
      if (!burnerAccount) return alert("Burner wallet not loaded!");
      setIsBuying(true);
      try {
        const { publicClient, walletClient } = getBurnerClients(burnerAccount);
        const targetTokenAddress = pair.token0.toLowerCase() === WRAPPED_NATIVE.toLowerCase() ? pair.token1 : pair.token0;
        const amountInS = parseEther(snipeAmountS || "0.001");
        
        const { hash, expectedOut } = await executeBuy(
          publicClient,
          walletClient,
          burnerAccount,
          targetTokenAddress as `0x${string}`,
          amountInS,
          100n
        );
        
        addPosition({
          id: hash,
          token: { address: targetTokenAddress as `0x${string}`, symbol: 'SNIPED', decimals: 18 },
          amount: expectedOut,
          entryValueS: amountInS,
          currentValueS: amountInS,
          tpPercentage: defaultTpPercent,
          slPercentage: defaultSlPercent,
          status: 'active'
        });
      } catch (e: any) {
        console.error(e);
        alert(`Snipe Failed: ${e.message}`);
      } finally {
        setIsBuying(false);
      }
    } else {
      // Solana Snipe
      if (!solanaBurnerAccount) return alert("Solana Burner wallet not loaded!");
      setIsBuying(true);
      try {
        const solanaRpc = process.env.NEXT_PUBLIC_SOLANA_RPC_HTTP || 'https://api.mainnet-beta.solana.com';
        const connection = new Connection(solanaRpc, 'confirmed');
        const amountInSol = parseFloat(snipeAmountS || "0.01"); // Treat setting as SOL
        
        const { hash, expectedOut } = await executeSolanaBuy(
          connection,
          solanaBurnerAccount,
          pair.token0, // Mint Address
          amountInSol,
          100 // 1% slippage
        );
        
        const amountInLamports = BigInt(Math.floor(amountInSol * 1e9));

        addPosition({
          id: hash,
          token: { address: pair.token0 as `0x${string}`, symbol: pair.symbol || 'SNIPED', decimals: 6 },
          amount: expectedOut,
          entryValueS: amountInLamports,
          currentValueS: amountInLamports,
          tpPercentage: defaultTpPercent,
          slPercentage: defaultSlPercent,
          status: 'active'
        });
      } catch (e: any) {
        console.error(e);
        alert(`Solana Snipe Failed: ${e.message}`);
      } finally {
        setIsBuying(false);
      }
    }
  };

  if (pair.network !== network) return null; // Only show pairs for active network

  return (
    <div className={`p-3 border-b border-zinc-800 flex justify-between items-center transition-colors duration-500 ${
        pair.isNew ? (network === 'sonic' ? "bg-emerald-500/20" : "bg-purple-500/20") : "bg-zinc-900/30 hover:bg-zinc-800/50"
      }`}
    >
      <div className="flex flex-col">
        <span className={network === 'sonic' ? "text-cyan-400 text-sm font-bold" : "text-purple-400 text-sm font-bold"}>
          New Pair Detected
        </span>
        <span className="text-zinc-500 text-xs truncate w-[140px] md:w-[200px]">{pair.pair}</span>
      </div>
      
      <div className="flex flex-col text-right">
        {pair.network === 'sonic' ? (
          <>
            <span className="text-zinc-400 text-xs">Token0: {pair.token0.slice(0, 6)}...{pair.token0.slice(-4)}</span>
            <span className="text-zinc-400 text-xs">Token1: {pair.token1.slice(0, 6)}...{pair.token1.slice(-4)}</span>
          </>
        ) : (
          <>
            <span className="text-zinc-400 text-xs">{pair.name}</span>
            <span className="text-zinc-500 text-xs">{pair.symbol}</span>
          </>
        )}
      </div>
      
      <div className="ml-4">
        {pair.network === 'sonic' && pair.honeypotStatus === 'pending' && (
          <button disabled className="text-xs bg-zinc-800 text-zinc-500 px-3 py-1 rounded w-[100px]">SIMULATING...</button>
        )}
        {pair.network === 'sonic' && pair.honeypotStatus === 'honeypot' && (
          <button disabled className="text-xs font-bold text-rose-500 px-3 py-1 rounded border border-rose-500/50 bg-rose-500/10 w-[100px]">[HONEYPOT]</button>
        )}
        {(pair.network === 'solana' || pair.honeypotStatus === 'safe') && (
          <button 
            onClick={handleSnipe}
            disabled={isBuying}
            className={`text-xs font-bold px-3 py-1 rounded border w-[100px] ${
              network === 'sonic' 
                ? 'text-emerald-400 border-emerald-500/50 bg-emerald-500/10 hover:bg-emerald-500/20'
                : 'text-purple-400 border-purple-500/50 bg-purple-500/10 hover:bg-purple-500/20'
            }`}
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
  const { network } = useWalletStore();
  const [isListeningEVM, setIsListeningEVM] = useState(false);
  const [isListeningSVM, setIsListeningSVM] = useState(false);

  useEffect(() => {
    // 1. Sonic (EVM) Listener
    if (!FACTORY_ADDRESS) {
      console.warn("No DEX Factory address provided for Radar.");
    } else {
      const wssClient = createPublicClient({ chain: sonic, transport: webSocket(WSS_URL) });
      const unwatchEVM = wssClient.watchContractEvent({
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
                network: 'sonic'
              });
            }
          });
        },
      });
      setIsListeningEVM(true);

      // Cleanup
      var unwatchSonic = () => {
        unwatchEVM();
        setIsListeningEVM(false);
      }
    }

    // 2. Solana (SVM) Pump.fun Listener
    let sdk: PumpFunSDK | null = null;
    let eventId: number | null = null;
    try {
      const solanaRpc = process.env.NEXT_PUBLIC_SOLANA_RPC_HTTP || 'https://api.mainnet-beta.solana.com';
      const connection = new Connection(solanaRpc, 'confirmed');
      const dummyWallet = {
        publicKey: Keypair.generate().publicKey,
        signTransaction: async (tx: any) => tx,
        signAllTransactions: async (txs: any[]) => txs,
      };
      const provider = new AnchorProvider(connection, dummyWallet, { commitment: 'confirmed' });
      sdk = new PumpFunSDK(provider);

      eventId = sdk.addEventListener("createEvent", (event, slot, signature) => {
        addPair({
          token0: event.mint.toBase58(),
          token1: 'So11111111111111111111111111111111111111112', // WSOL
          pair: event.bondingCurve.toBase58(),
          name: event.name,
          symbol: event.symbol,
          network: 'solana'
        });
      });
      setIsListeningSVM(true);
    } catch (e) {
      console.error("Failed to start Solana Radar", e);
    }

    return () => {
      if (unwatchSonic) unwatchSonic();
      if (sdk && eventId !== null) {
        sdk.removeEventListener(eventId);
        setIsListeningSVM(false);
      }
    };
  }, [addPair]);

  return (
    <div className="flex flex-col w-full h-full border border-zinc-800 bg-zinc-900 rounded overflow-hidden">
      <div className="p-2 border-b border-zinc-800 bg-zinc-950 flex justify-between items-center">
        <h2 className="text-zinc-500 text-xs">LIVE RADAR</h2>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${(network === 'sonic' ? isListeningEVM : isListeningSVM) ? (network === 'sonic' ? 'bg-emerald-500 animate-pulse' : 'bg-purple-500 animate-pulse') : 'bg-rose-500'}`} />
          <span className={(network === 'sonic' ? isListeningEVM : isListeningSVM) ? (network === 'sonic' ? 'text-emerald-400 text-xs' : 'text-purple-400 text-xs') : "text-rose-500 text-xs"}>
            {(network === 'sonic' ? isListeningEVM : isListeningSVM) ? "LISTENING" : "OFFLINE"}
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
