import { createPublicClient, http, createWalletClient, parseEther, PrivateKeyAccount } from 'viem';
import { sonic } from 'viem/chains';

const publicClient = createPublicClient({ chain: sonic, transport: http('https://rpc.soniclabs.com') });
const walletClient = createWalletClient({ chain: sonic, transport: http('https://rpc.soniclabs.com') });

async function main() {
  const { request } = await publicClient.simulateContract({
    account: '0xBF389Acb91a6466aBa55f7e7546E28937aA574d9' as `0x${string}`,
    address: '0xa6AD18C2aC47803E193F75c3677b14BF19B94883' as `0x${string}`,
    abi: [{"inputs":[{"internalType":"uint256","name":"amountOutMin","type":"uint256"},{"internalType":"address[]","name":"path","type":"address[]"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"deadline","type":"uint256"}],"name":"swapExactETHForTokens","outputs":[{"internalType":"uint256[]","name":"amounts","type":"uint256[]"}],"stateMutability":"payable","type":"function"}] as const,
    functionName: 'swapExactETHForTokens',
    args: [0n, ['0x039e2fB66102314Ce7b64Ce5Ce3E5183bc94aD38', '0x29219dd400f2Bf60E5a23d13Be72B486D4038894'], '0xBF389Acb91a6466aBa55f7e7546E28937aA574d9', 100000n],
    value: parseEther('0.0001')
  });

  request.maxFeePerGas = 100n;
  request.maxPriorityFeePerGas = 100n;
  
  // await walletClient.writeContract(request);
}
