const { Connection, PublicKey } = require('@solana/web3.js');
const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
const PUMP_FUN_PROGRAM = new PublicKey('6EF8rrecthR5Dkzon8Nwu78hRvfX9MLnN8e9FjK5e1X');

console.log("Listening to Pump.fun...");
const subId = connection.onLogs(PUMP_FUN_PROGRAM, (logs, ctx) => {
  if (logs.err) return;
  // Look for signature of token creation
  if (logs.logs.some(l => l.includes('Instruction: InitializeMint2'))) {
    console.log("New token created! Signature:", logs.signature);
  }
}, 'confirmed');

setTimeout(() => {
  connection.removeOnLogsListener(subId);
  console.log("Done");
  process.exit(0);
}, 10000);
