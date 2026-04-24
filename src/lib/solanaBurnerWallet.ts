import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';

const SOLANA_BURNER_KEY = "solana_burner_key";

export function getOrCreateSolanaBurnerWallet(): Keypair {
  if (typeof window === "undefined") {
    // Return a dummy keypair for SSR
    return Keypair.generate();
  }

  const storedKey = localStorage.getItem(SOLANA_BURNER_KEY);
  if (storedKey) {
    try {
      const secretKey = bs58.decode(storedKey);
      return Keypair.fromSecretKey(secretKey);
    } catch (e) {
      console.error("Invalid stored solana burner key, generating new one");
    }
  }

  const newKeypair = Keypair.generate();
  localStorage.setItem(SOLANA_BURNER_KEY, bs58.encode(newKeypair.secretKey));
  return newKeypair;
}
