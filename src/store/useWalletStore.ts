import { create } from 'zustand';
import { type PrivateKeyAccount, formatEther } from 'viem';
import { getOrCreateBurnerWallet, getBurnerClients } from '@/lib/burnerWallet';
import { getOrCreateSolanaBurnerWallet } from '@/lib/solanaBurnerWallet';
import { Connection, PublicKey } from '@solana/web3.js';
import type { Keypair } from '@solana/web3.js';

interface WalletState {
  burnerAccount: PrivateKeyAccount | null;
  burnerAddress: string | null;
  burnerBalance: string;
  
  solanaBurnerAccount: Keypair | null;
  solanaAddress: string | null;
  solanaBalance: string;

  isLoaded: boolean;
  network: 'sonic' | 'solana';
  
  setNetwork: (network: 'sonic' | 'solana') => void;
  initBurner: () => void;
  updateBalance: () => Promise<void>;
  withdrawAll: (destination: string) => Promise<void>;
}

export const useWalletStore = create<WalletState>((set, get) => ({
  burnerAccount: null,
  burnerAddress: null,
  burnerBalance: "0",

  solanaBurnerAccount: null,
  solanaAddress: null,
  solanaBalance: "0",

  isLoaded: false,
  network: 'sonic',

  setNetwork: (network) => {
    set({ network });
    get().updateBalance();
  },

  initBurner: () => {
    try {
      if (get().isLoaded) return;
      const account = getOrCreateBurnerWallet();
      const solAccount = getOrCreateSolanaBurnerWallet();
      
      set({ 
        burnerAccount: account, 
        burnerAddress: account.address,
        solanaBurnerAccount: solAccount,
        solanaAddress: solAccount.publicKey.toBase58(),
        isLoaded: true 
      });
      get().updateBalance();
    } catch (e) {
      console.error("Failed to init burner wallet", e);
    }
  },

  updateBalance: async () => {
    const state = get();
    
    // Fetch Sonic Balance
    if (state.burnerAccount) {
      try {
        const { publicClient } = getBurnerClients(state.burnerAccount);
        const balanceWei = await publicClient.getBalance({ address: state.burnerAccount.address });
        set({ burnerBalance: formatEther(balanceWei) });
      } catch (e) {
        console.error("Failed to fetch Sonic balance", e);
      }
    }

    // Fetch Solana Balance
    if (state.solanaAddress) {
      try {
        const connection = new Connection(process.env.NEXT_PUBLIC_SOLANA_RPC_HTTP || "https://api.mainnet-beta.solana.com");
        const balanceLamports = await connection.getBalance(new PublicKey(state.solanaAddress));
        set({ solanaBalance: (balanceLamports / 1e9).toString() });
      } catch (e) {
        console.error("Failed to fetch Solana balance", e);
      }
    }
  },

  withdrawAll: async (destination: string) => {
    const { burnerAccount } = get();
    if (!burnerAccount) return;

    try {
      console.log("Starting withdrawal to", destination);
      const { publicClient, walletClient } = getBurnerClients(burnerAccount);
      const balanceWei = await publicClient.getBalance({ address: burnerAccount.address });
      
      console.log("Current balance:", balanceWei);
      if (balanceWei === 0n) return;

      const feeData = await publicClient.estimateFeesPerGas();
      const maxFeePerGas = feeData.maxFeePerGas || 0n;
      const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas || 0n;
      
      const gasLimit = 21000n;
      const txCost = gasLimit * maxFeePerGas;

      const valueToSend = balanceWei > txCost ? balanceWei - txCost : 0n;
      console.log("Value to send:", valueToSend, "Tx cost:", txCost);
      if (valueToSend <= 0n) {
        console.warn("Balance too low to cover gas");
        return;
      }

      console.log("Sending tx...");
      const hash = await walletClient.sendTransaction({
        to: destination as `0x${string}`,
        value: valueToSend,
        gas: gasLimit,
        maxFeePerGas,
        maxPriorityFeePerGas,
      });

      console.log("Tx sent. Hash:", hash);
      await publicClient.waitForTransactionReceipt({ hash });
      console.log("Tx confirmed");
      await get().updateBalance();
    } catch (e) {
      console.error("Withdrawal failed", e);
    }
  }
}));
