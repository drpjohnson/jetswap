# Product Requirements Document (PRD) & Tech Spec
## Project: Sonic Degen Terminal (Web3 Fast-Trading Application)

### 1. Project Overview & AI Agent Instructions
**Context:** This is a decentralized trading terminal on the Sonic blockchain designed for high-speed, aggressive memecoin trading ("sniping" and "degening").
**AI Agent Instructions:**
* **STRICT STACK:** You MUST use Next.js 14+ (App Router), React, TypeScript, Tailwind CSS, shadcn/ui, `viem` (v2), `wagmi`, and Zustand. DO NOT use `ethers.js`.
* **MODULARITY:** Write small, pure functions. Separate Web3 logic from UI components.
* **NO MOCKING:** Unless explicitly asked, write real `viem` contract calls. 
* **TYPES FIRST:** Always define TypeScript interfaces before implementing logic.

---

### 2. Design System & UI Guidelines (Tailwind)
The UI must feel like a Bloomberg terminal for crypto degens. Fast, dark, high contrast.
* **Colors:** * Background: strictly dark (`bg-zinc-950` or `bg-black`).
  * Panels/Cards: `bg-zinc-900`, `border-zinc-800`.
  * Positive/Profit/Buy: `text-emerald-400` and `bg-emerald-500/10`.
  * Negative/Loss/Sell: `text-rose-500` and `bg-rose-500/10`.
  * Brand/Accent: `text-cyan-400`.
* **Typography:** Use a monospaced font (`font-mono`) for ALL numbers, prices, and addresses to prevent UI layout shifts during rapid updates.
* **Spacing:** Use compact layouts (`p-2`, `gap-2`). Degens want maximum information on one screen without scrolling.

---

### 3. Core Data Models (TypeScript Interfaces)

```typescript
interface Token {
  address: `0x${string}`;
  symbol: string;
  decimals: number;
}

interface ActivePosition {
  token: Token;
  amount: bigint;
  entryPriceUSD: number;
  currentPriceUSD: number;
  tpPercentage?: number; 
  slPercentage?: number; 
}
```

---

### 4. Critical Math & Logic Instructions for AI
**CRITICAL:** Web3 JS cannot handle floating-point math accurately. You MUST use `BigInt` for all on-chain calculations.
* **Slippage Calculation:** Use Basis Points (BIPS) where 1% = 100 BIPS.
  ```typescript
  // Formula to calculate minimum amount out with slippage
  const calculateMinAmountOut = (expectedAmountOut: bigint, slippageBips: bigint): bigint => {
    return (expectedAmountOut * (10000n - slippageBips)) / 10000n;
  }
  ```
* **Gas Settings (Sonic Network):** Sonic is fast and cheap. To guarantee next-block inclusion, always manually set `maxPriorityFeePerGas` slightly higher than the network average using `viem`'s `estimateFeesPerGas`.

---

### 5. Smart Contract ABIs (Standard Uniswap V2 Fork)
Do not guess the ABIs. Use these exact minimal ABIs for interaction:

* **Factory ABI (For Module B - Radar):**
  ```json
  [{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"token0","type":"address"},{"indexed":true,"internalType":"address","name":"token1","type":"address"},{"indexed":false,"internalType":"address","name":"pair","type":"address"},{"indexed":false,"internalType":"uint256","name":"","type":"uint256"}],"name":"PairCreated","type":"event"}]
  ```
* **Router ABI (For Module C - Execution Engine):**
  ```json
  [
    {"inputs":[{"internalType":"uint256","name":"amountOutMin","type":"uint256"},{"internalType":"address[]","name":"path","type":"address[]"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"deadline","type":"uint256"}],"name":"swapExactETHForTokens","outputs":[{"internalType":"uint256[]","name":"amounts","type":"uint256[]"}],"stateMutability":"payable","type":"function"},
    {"inputs":[{"internalType":"uint256","name":"amountIn","type":"uint256"},{"internalType":"uint256","name":"amountOutMin","type":"uint256"},{"internalType":"address[]","name":"path","type":"address[]"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"deadline","type":"uint256"}],"name":"swapExactTokensForETHSupportingFeeOnTransferTokens","outputs":[],"stateMutability":"nonpayable","type":"function"},
    {"inputs":[{"internalType":"uint256","name":"amountIn","type":"uint256"},{"internalType":"address[]","name":"path","type":"address[]"}],"name":"getAmountsOut","outputs":[{"internalType":"uint256[]","name":"amounts","type":"uint256[]"}],"stateMutability":"view","type":"function"}
  ]
  ```
* **ERC20 ABI (For Approvals & Balances):**
  ```json
  [
    {"inputs":[{"internalType":"address","name":"account","type":"address"}],"name":"balanceOf","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"internalType":"address","name":"spender","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"approve","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"}
  ]
  ```

---

### 6. Module Specifications

#### Module A: The Burner Wallet System
**Goal:** 1-click execution without browser extension popups.
* **Logic:**
    1.  On load, check `localStorage` for `sonic_burner_key`.
    2.  If missing, generate via `generatePrivateKey()` from `viem/accounts`. Save raw string to `localStorage`.
    3.  Create a `LocalAccount` and `WalletClient` using `viem` connected to the Sonic RPC.
    4.  **UI:** Display the burner address, its native `$S` balance, and a "Fund Wallet" button (triggers a simple send transaction from the user's connected Wagmi main wallet).

#### Module B: Live Radar (Backend Event Listener)
**Goal:** Detect new pairs instantly.
* **Logic:**
    1.  Connect to Sonic WSS RPC using `viem` `createPublicClient` with `webSocketTransport`.
    2.  Use `watchContractEvent` on the Factory Contract for the `PairCreated` event using the ABI provided above.
    3.  Broadcast to Frontend UI.
* **UI:** A streaming list. Newest at the top. Flash background green for 1 second on a new entry.

#### Module C: Execution Engine (Swaps)
**Goal:** Lightning-fast buys/sells.
* **Logic:**
    1.  For Buys: Call `swapExactETHForTokens` with `msg.value` as the amount of `$S`.
    2.  For Sells: First check `allowance`. If 0, call `approve` on ERC20, then call `swapExactTokensForETHSupportingFeeOnTransferTokens`.
    3.  Set `deadline` to `Math.floor(Date.now() / 1000) + 60` (1 minute).
    4.  Sign and broadcast with the Burner Wallet.
    5.  Toast notification on success/fail.

#### Module D: Security & Anti-Honeypot
**Goal:** Prevent buying un-sellable tokens.
* **Logic:**
    1.  Before the UI enables the "Buy" button, trigger a background simulation.
    2.  Use `viem`'s `simulateContract`.
    3.  Simulate a Buy -> Simulate a Sell.
    4.  If the Sell simulation reverts, mark row as **[HONEYPOT]** in red text and disable buy buttons.

#### Module E: Automated Exits (Auto TP/SL)
**Goal:** Protect profits automatically.
* **Logic:**
    1.  Store `ActivePosition` in Zustand state.
    2.  Background loop queries `getAmountsOut` every 3 seconds for active positions.
    3.  If TP/SL condition is met, automatically trigger the Sell function from Module C.

---

### 7. Environment Variables (.env.local)
Agent: Use these placeholders and instruct the user to fill them.
```env
NEXT_PUBLIC_SONIC_RPC_HTTP="[https://rpc.soniclabs.com](https://rpc.soniclabs.com)"
NEXT_PUBLIC_SONIC_RPC_WSS="wss://rpc.soniclabs.com"
NEXT_PUBLIC_DEX_ROUTER="" # Standard V2 Router on Sonic
NEXT_PUBLIC_DEX_FACTORY="" # Standard V2 Factory on Sonic
NEXT_PUBLIC_WRAPPED_NATIVE="" # wS Token
```

---

### 8. Execution Plan (Milestones for AI)
**Agent MUST halt and ask for approval after completing each Phase.**
* **Phase 1:** Setup Next.js, Tailwind, Zustand. Implement the Burner Wallet creation, storage, and funding UI.
* **Phase 2:** Build the Web3 Swap Utils using the provided ABIs and `viem` to execute buys/sells with the burner wallet.
* **Phase 3:** Create the Event Listener for `PairCreated` and build the real-time Radar UI.
* **Phase 4:** Integrate the Honeypot simulation logic.
* **Phase 5:** Implement the Portfolio tracking and Auto TP/SL polling loop.
