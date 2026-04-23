import { create } from 'zustand';
import { type PrivateKeyAccount, formatEther } from 'viem';
import { getOrCreateBurnerWallet, getBurnerClients } from '@/lib/burnerWallet';

interface WalletState {
  burnerAccount: PrivateKeyAccount | null;
  burnerAddress: string | null;
  burnerBalance: string;
  isLoaded: boolean;
  
  initBurner: () => void;
  updateBalance: () => Promise<void>;
  withdrawAll: (destination: string) => Promise<void>;
}

export const useWalletStore = create<WalletState>((set, get) => ({
  burnerAccount: null,
  burnerAddress: null,
  burnerBalance: "0",
  isLoaded: false,

  initBurner: () => {
    try {
      if (get().isLoaded) return;
      const account = getOrCreateBurnerWallet();
      set({ 
        burnerAccount: account, 
        burnerAddress: account.address,
        isLoaded: true 
      });
      get().updateBalance();
    } catch (e) {
      console.error("Failed to init burner wallet", e);
    }
  },

  updateBalance: async () => {
    const { burnerAccount } = get();
    if (!burnerAccount) return;

    try {
      const { publicClient } = getBurnerClients(burnerAccount);
      const balanceWei = await publicClient.getBalance({ address: burnerAccount.address });
      set({ burnerBalance: formatEther(balanceWei) });
    } catch (e) {
      console.error("Failed to fetch balance", e);
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
