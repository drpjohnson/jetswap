import { PublicClient, WalletClient, PrivateKeyAccount } from 'viem';
import { ROUTER_ABI, ERC20_ABI } from './abis';

export const calculateMinAmountOut = (expectedAmountOut: bigint, slippageBips: bigint): bigint => {
  return (expectedAmountOut * (10000n - slippageBips)) / 10000n;
};

export async function getTokenDetails(publicClient: PublicClient, tokenAddress: `0x${string}`) {
  const [decimals, symbol] = await Promise.all([
    publicClient.readContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: 'decimals'
    }).catch(() => 18),
    publicClient.readContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: 'symbol'
    }).catch(() => 'UNKNOWN')
  ]);
  return { decimals: decimals as number, symbol: symbol as string };
}

export async function executeBuy(
  publicClient: PublicClient,
  walletClient: WalletClient,
  account: PrivateKeyAccount,
  tokenAddress: `0x${string}`,
  amountInS: bigint, // amount of $S (Native) to spend
  slippageBips: bigint = 100n // default 1%
) {
  const ROUTER_ADDRESS = process.env.NEXT_PUBLIC_DEX_ROUTER as `0x${string}`;
  const WRAPPED_NATIVE = process.env.NEXT_PUBLIC_WRAPPED_NATIVE as `0x${string}`;

  if (!ROUTER_ADDRESS || !WRAPPED_NATIVE) throw new Error("Missing environment variables");

  const path = [WRAPPED_NATIVE, tokenAddress];

  // Get Expected Out
  const amountsOut = await publicClient.readContract({
    address: ROUTER_ADDRESS,
    abi: ROUTER_ABI,
    functionName: 'getAmountsOut',
    args: [amountInS, path]
  }) as bigint[];

  const expectedOut = amountsOut[1];
  const amountOutMin = calculateMinAmountOut(expectedOut, slippageBips);
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 60);

  const feeData = await publicClient.estimateFeesPerGas();
  
  // We use maxFeePerGas + small bump for priority to guarantee next block inclusion (as per spec)
  const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas ? feeData.maxPriorityFeePerGas + 1000000000n : 1000000000n;
  const maxFeePerGas = (feeData.maxFeePerGas || 0n) + maxPriorityFeePerGas;

  const { request } = await publicClient.simulateContract({
    account,
    address: ROUTER_ADDRESS,
    abi: ROUTER_ABI,
    functionName: 'swapExactETHForTokens',
    args: [amountOutMin, path, account.address, deadline],
    value: amountInS,
    maxFeePerGas,
    maxPriorityFeePerGas
  });

  const hash = await walletClient.writeContract(request);
  return { hash, expectedOut, amountOutMin };
}

export async function executeSell(
  publicClient: PublicClient,
  walletClient: WalletClient,
  account: PrivateKeyAccount,
  tokenAddress: `0x${string}`,
  amountInToken: bigint,
  slippageBips: bigint = 100n
) {
  const ROUTER_ADDRESS = process.env.NEXT_PUBLIC_DEX_ROUTER as `0x${string}`;
  const WRAPPED_NATIVE = process.env.NEXT_PUBLIC_WRAPPED_NATIVE as `0x${string}`;

  if (!ROUTER_ADDRESS || !WRAPPED_NATIVE) throw new Error("Missing environment variables");

  const path = [tokenAddress, WRAPPED_NATIVE];

  // 1. Check Allowance
  const allowance = await publicClient.readContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: [account.address, ROUTER_ADDRESS]
  }) as bigint;

  const feeData = await publicClient.estimateFeesPerGas();
  const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas ? feeData.maxPriorityFeePerGas + 1000000000n : 1000000000n;
  const maxFeePerGas = (feeData.maxFeePerGas || 0n) + maxPriorityFeePerGas;

  if (allowance < amountInToken) {
    // Need to approve
    const { request: approveReq } = await publicClient.simulateContract({
      account,
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [ROUTER_ADDRESS, amountInToken],
      maxFeePerGas,
      maxPriorityFeePerGas
    });
    const approveHash = await walletClient.writeContract(approveReq);
    await publicClient.waitForTransactionReceipt({ hash: approveHash });
  }

  // Get Expected Out
  const amountsOut = await publicClient.readContract({
    address: ROUTER_ADDRESS,
    abi: ROUTER_ABI,
    functionName: 'getAmountsOut',
    args: [amountInToken, path]
  }) as bigint[];

  const expectedOut = amountsOut[1];
  const amountOutMin = calculateMinAmountOut(expectedOut, slippageBips);
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 60);

  const { request: swapReq } = await publicClient.simulateContract({
    account,
    address: ROUTER_ADDRESS,
    abi: ROUTER_ABI,
    functionName: 'swapExactTokensForETHSupportingFeeOnTransferTokens',
    args: [amountInToken, amountOutMin, path, account.address, deadline],
    maxFeePerGas,
    maxPriorityFeePerGas
  });

  const hash = await walletClient.writeContract(swapReq);
  return { hash, expectedOut, amountOutMin };
}
