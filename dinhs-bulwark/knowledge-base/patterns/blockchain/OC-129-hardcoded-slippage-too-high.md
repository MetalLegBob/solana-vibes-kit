# OC-129: Hardcoded Slippage Too High

**Category:** Blockchain Interaction
**Severity:** MEDIUM
**Auditors:** CHAIN-05
**CWE:** CWE-1188 (Initialization with Hard-Coded Network Resource Configuration Value)
**OWASP:** N/A — Blockchain-specific

## Description

Hardcoded slippage tolerance in DEX swap operations is a common anti-pattern in Solana dApps. Slippage tolerance defines the maximum acceptable price deviation between the quoted price and the execution price. When hardcoded too high, it creates a permanent MEV extraction opportunity; when hardcoded too low, it causes transactions to fail during volatile periods.

A hardcoded slippage of 5% (500 basis points) on a SOL/USDC swap means the user is willing to accept up to 5% worse execution. On a $10,000 swap, that is $500 of guaranteed extractable value for sandwich bots. Appropriate slippage depends on the pair's liquidity depth, current volatility, and trade size — stablecoin pairs might need only 0.1%, while low-liquidity meme tokens might need 2-5%.

The issue is compounded when AI code generators produce swap code: they typically generate a single hardcoded slippage value (often 1-5%) without considering pair characteristics. The Carbium documentation recommends: 5-10 bps for stablecoins, 10-50 bps for major pairs, and 50-100 bps for volatile tokens. Hardcoded values that do not adapt to these tiers leave money on the table or cause unnecessary failures.

## Detection

```
grep -rn "slippage.*=.*[0-9]" --include="*.ts" --include="*.js"
grep -rn "slippageBps.*=\|SLIPPAGE.*=" --include="*.ts" --include="*.js"
grep -rn "slippage_bps\|slippagePercent" --include="*.ts" --include="*.js"
```

Look for: numeric slippage values assigned as constants, slippage parameters not configurable or not derived from market conditions, slippage > 100 bps (1%) for major pairs, slippage > 500 bps (5%) for any pair.

## Vulnerable Code

```typescript
// VULNERABLE: Hardcoded 5% slippage for all swaps regardless of pair
const SLIPPAGE_BPS = 500; // 5% — far too high for most pairs

async function getSwapQuote(inputMint: string, outputMint: string, amount: number) {
  return fetch(
    `https://quote-api.jup.ag/v6/quote?` +
    `inputMint=${inputMint}&outputMint=${outputMint}` +
    `&amount=${amount}&slippageBps=${SLIPPAGE_BPS}`
  ).then((r) => r.json());
}
```

## Secure Code

```typescript
// SECURE: Dynamic slippage based on pair characteristics
const STABLECOINS = new Set([
  "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // USDC
  "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB", // USDT
]);
const MAJOR_TOKENS = new Set([
  "So11111111111111111111111111111111111111112",     // wSOL
  // ... other major tokens
]);

function calculateSlippageBps(inputMint: string, outputMint: string, amount: number): number {
  const isStablePair = STABLECOINS.has(inputMint) && STABLECOINS.has(outputMint);
  const isMajorPair = MAJOR_TOKENS.has(inputMint) || MAJOR_TOKENS.has(outputMint);
  if (isStablePair) return 10;      // 0.1%
  if (isMajorPair) return 50;       // 0.5%
  // For unknown/volatile tokens, allow more but cap it
  const MAX_SLIPPAGE_BPS = 300;     // 3% absolute maximum
  return Math.min(100, MAX_SLIPPAGE_BPS); // 1% default, 3% max
}

async function getSwapQuote(inputMint: string, outputMint: string, amount: number) {
  const slippageBps = calculateSlippageBps(inputMint, outputMint, amount);
  return fetch(
    `https://quote-api.jup.ag/v6/quote?` +
    `inputMint=${inputMint}&outputMint=${outputMint}` +
    `&amount=${amount}&slippageBps=${slippageBps}`
  ).then((r) => r.json());
}
```

## Impact

Excessively high slippage directly translates to extractable value for MEV bots. A 5% slippage on a $100,000 swap gives away up to $5,000 to sandwich bots. Even at the recommended 0.5% for major pairs, the difference between 0.5% and a hardcoded 5% on a $50,000 trade is $2,250 of unnecessary exposure. Over time, hardcoded high slippage compounds into significant losses for application users.

## References

- Carbium docs: Slippage settings — recommended values by pair type
- Hacken: Front-Running in Blockchain — slippage as MEV defense
- Cube Exchange: What is Slippage in Crypto — tolerance guidance
- Solflare: Why is my swap failing — slippage troubleshooting
