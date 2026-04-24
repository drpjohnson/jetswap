const { Connection, Keypair } = require('@solana/web3.js');
const { PumpFunSDK } = require('pumpdotfun-sdk');
const { AnchorProvider, Wallet } = require('@coral-xyz/anchor');

const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
const wallet = new Wallet(Keypair.generate());
const provider = new AnchorProvider(connection, wallet, { commitment: 'confirmed' });
const sdk = new PumpFunSDK(provider);

console.log("Listening to Pump.fun creates...");
let eventId = sdk.addEventListener("createEvent", (event, slot, signature) => {
  console.log("New Token!", event.name, event.symbol, event.mint.toBase58());
});

setTimeout(() => {
  sdk.removeEventListener(eventId);
  console.log("Done");
  process.exit(0);
}, 10000);
