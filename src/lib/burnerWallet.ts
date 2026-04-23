import { createWalletClient, createPublicClient, http, type PrivateKeyAccount } from 'viem';
import { privateKeyToAccount, generatePrivateKey } from 'viem/accounts';
import { sonic } from 'viem/chains';

const STORAGE_KEY = 'sonic_burner_key';

export function getOrCreateBurnerWallet(): PrivateKeyAccount {
  if (typeof window === 'undefined') {
    // Return a dummy for SSR, real one loads on client
    return privateKeyToAccount(generatePrivateKey());
  }

  let key = localStorage.getItem(STORAGE_KEY) as `0x${string}` | null;
  if (!key) {
    key = generatePrivateKey();
    localStorage.setItem(STORAGE_KEY, key);
  }

  return privateKeyToAccount(key);
}

export function getBurnerClients(account: PrivateKeyAccount) {
  const rpcHttp = process.env.NEXT_PUBLIC_SONIC_RPC_HTTP || 'https://rpc.soniclabs.com';
  
  const publicClient = createPublicClient({
    chain: {
      ...sonic,
      rpcUrls: {
        default: { http: [rpcHttp] },
        public: { http: [rpcHttp] },
      }
    },
    transport: http(rpcHttp),
  });

  const walletClient = createWalletClient({
    account,
    chain: {
      ...sonic,
      rpcUrls: {
        default: { http: [rpcHttp] },
        public: { http: [rpcHttp] },
      }
    },
    transport: http(rpcHttp),
  });

  return { publicClient, walletClient };
}
