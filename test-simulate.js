const { createPublicClient, http, parseEther } = require('viem');
const { sonic } = require('viem/chains');

const client = createPublicClient({ chain: sonic, transport: http('https://rpc.soniclabs.com') });

async function main() {
  try {
    const feeData = await client.estimateFeesPerGas();
    const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas ? feeData.maxPriorityFeePerGas + 1000000000n : 1000000000n;
    const maxFeePerGas = (feeData.maxFeePerGas || 0n) + maxPriorityFeePerGas;

    const { request } = await client.simulateContract({
      account: '0xBF389Acb91a6466aBa55f7e7546E28937aA574d9',
      address: '0xa6AD18C2aC47803E193F75c3677b14BF19B94883',
      abi: [{"inputs":[{"internalType":"uint256","name":"amountOutMin","type":"uint256"},{"internalType":"address[]","name":"path","type":"address[]"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"deadline","type":"uint256"}],"name":"swapExactETHForTokens","outputs":[{"internalType":"uint256[]","name":"amounts","type":"uint256[]"}],"stateMutability":"payable","type":"function"}],
      functionName: 'swapExactETHForTokens',
      args: [0n, ['0x039e2fB66102314Ce7b64Ce5Ce3E5183bc94aD38', '0x29219dd400f2Bf60E5a23d13Be72B486D4038894'], '0xBF389Acb91a6466aBa55f7e7546E28937aA574d9', BigInt(Math.floor(Date.now() / 1000) + 60)],
      value: parseEther('0.0001')
    });
    console.log("Simulation SUCCESS!");
  } catch (e) {
    console.log("Simulation FAILED:", e.message);
  }
}
main();
