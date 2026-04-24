import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { PumpFunSDK } from 'pumpdotfun-sdk';
import { AnchorProvider } from '@coral-xyz/anchor';

class NodeWallet {
  constructor(public readonly payer: Keypair) {}
  async signTransaction(tx: any): Promise<any> {
    if ("version" in tx) tx.sign([this.payer]);
    else tx.partialSign(this.payer);
    return tx;
  }
  async signAllTransactions(txs: any[]): Promise<any[]> {
    return txs.map(t => {
      if ("version" in t) t.sign([this.payer]);
      else t.partialSign(this.payer);
      return t;
    });
  }
  get publicKey(): PublicKey { return this.payer.publicKey; }
}

export async function executeSolanaBuy(
  connection: Connection,
  keypair: Keypair,
  mintAddress: string,
  amountInSol: number,
  slippageBps: number = 100
) {
  const provider = new AnchorProvider(connection, new NodeWallet(keypair), { commitment: 'confirmed' });
  const sdk = new PumpFunSDK(provider);
  
  const mint = new PublicKey(mintAddress);
  const buyAmountSol = BigInt(Math.floor(amountInSol * 1e9));
  
  const result = await sdk.buy(
    keypair,
    mint,
    buyAmountSol,
    BigInt(slippageBps),
    { unitLimit: 250000, unitPrice: 1000000 }, // High priority fee for sniping
    'confirmed',
    'confirmed'
  );
  
  if (!result.success) throw new Error(String(result.error));
  
  // To track expected out, we'll need to fetch the bonding curve state
  const curve = await sdk.getBondingCurveAccount(mint);
  let expectedTokenOut = 0n;
  if (curve) {
     expectedTokenOut = curve.getBuyPrice(buyAmountSol);
  }
  
  return {
    hash: result.signature || "unknown_hash",
    expectedOut: expectedTokenOut
  };
}

export async function executeSolanaSell(
  connection: Connection,
  keypair: Keypair,
  mintAddress: string,
  amountInTokens: bigint,
  slippageBps: number = 200 // Higher slippage for auto-sells
) {
  const provider = new AnchorProvider(connection, new NodeWallet(keypair), { commitment: 'confirmed' });
  const sdk = new PumpFunSDK(provider);
  
  const mint = new PublicKey(mintAddress);
  
  const result = await sdk.sell(
    keypair,
    mint,
    amountInTokens,
    BigInt(slippageBps),
    { unitLimit: 250000, unitPrice: 2000000 }, // Extremely high priority fee for sells
    'confirmed',
    'confirmed'
  );
  
  if (!result.success) throw new Error(String(result.error));
  
  return { hash: result.signature || "unknown_hash" };
}

export async function getSolanaTokenValue(connection: Connection, mintAddress: string, amountInTokens: bigint): Promise<bigint> {
  const dummyWallet = new NodeWallet(Keypair.generate());
  const provider = new AnchorProvider(connection, dummyWallet, { commitment: 'confirmed' });
  const sdk = new PumpFunSDK(provider);
  const curve = await sdk.getBondingCurveAccount(new PublicKey(mintAddress));
  if (!curve) return 0n;
  
  const globalAccount = await sdk.getGlobalAccount();
  
  // getSellPrice calculates how much SOL you get for X tokens
  return curve.getSellPrice(amountInTokens, globalAccount.feeBasisPoints); 
}
