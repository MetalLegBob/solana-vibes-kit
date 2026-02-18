# OC-253: Hardcoded Slippage in Trading Bot

**Category:** Automation & Bots
**Severity:** HIGH
**Auditors:** BOT-02
**CWE:** CWE-1188 — Initialization with Hard-Coded Network Resource Configuration Value
**OWASP:** N/A — Domain-specific

## Description

Slippage tolerance defines the maximum price deviation a trader will accept between the expected and actual execution price. When a trading bot hardcodes a high slippage tolerance (e.g., 5-10%), it becomes a profitable target for MEV sandwich attacks, where an attacker front-runs the bot's swap to move the price, lets the bot execute at a worse price, and then back-runs to capture the difference.

In March 2025, a trader lost $215,000 in a sandwich attack on Uniswap v3 while swapping USDC to USDT -- a stablecoin pair that should have near-zero slippage. The attack succeeded because the transaction had a permissive slippage setting. On Solana, the PumpSwap SDK defaults to 500 basis points (5%) slippage, and many bot templates ship with similar defaults. Bots that never adjust this value in production are leaving money on the table on every trade.

Conversely, hardcoding slippage too low causes transactions to fail during volatile markets, leading to missed opportunities and wasted fees. The correct approach is dynamic slippage calculation based on current market conditions, liquidity depth, and trade size.

## Detection

```
# Hardcoded slippage values
grep -rn "slippage.*=.*[0-9]\|slippageBps.*=.*[0-9]\|SLIPPAGE.*=.*[0-9]" --include="*.ts" --include="*.js"
grep -rn "slippage.*500\|slippage.*1000\|slippage.*0\.05\|slippage.*0\.1" --include="*.ts" --include="*.js"

# Default slippage in config objects
grep -rn "DEFAULT.*SLIPPAGE\|defaultSlippage\|SLIPPAGE_BPS" --include="*.ts" --include="*.js"

# Jupiter/Raydium swap calls with hardcoded values
grep -rn "computeRoutes.*slippage\|swap.*slippage\|exchange.*slippage" --include="*.ts" --include="*.js"
```

## Vulnerable Code

```typescript
import { Jupiter } from '@jup-ag/core';

async function executeSwap(inputMint: PublicKey, outputMint: PublicKey, amount: number) {
  const routes = await jupiter.computeRoutes({
    inputMint,
    outputMint,
    amount,
    slippageBps: 500, // VULNERABLE: 5% hardcoded -- sandwich attack magnet
  });

  const bestRoute = routes.routesInfos[0];
  const { execute } = await jupiter.exchange({ routeInfo: bestRoute });
  return await execute();
}
```

## Secure Code

```typescript
import { Jupiter } from '@jup-ag/core';

interface SlippageConfig {
  baseSlippageBps: number;    // Minimum slippage for the pair
  maxSlippageBps: number;     // Absolute maximum
  volatilityMultiplier: number;
}

const PAIR_SLIPPAGE: Record<string, SlippageConfig> = {
  'stable-stable': { baseSlippageBps: 10, maxSlippageBps: 50, volatilityMultiplier: 1.5 },
  'major-major': { baseSlippageBps: 50, maxSlippageBps: 200, volatilityMultiplier: 2.0 },
  'default': { baseSlippageBps: 100, maxSlippageBps: 300, volatilityMultiplier: 2.5 },
};

async function calculateDynamicSlippage(
  inputMint: PublicKey,
  outputMint: PublicKey,
  amount: number
): Promise<number> {
  const pairType = classifyPair(inputMint, outputMint);
  const config = PAIR_SLIPPAGE[pairType] || PAIR_SLIPPAGE['default'];

  // Check current market volatility
  const recentVolatility = await getRecentVolatility(inputMint);
  const adjustedSlippage = Math.ceil(config.baseSlippageBps * (1 + recentVolatility * config.volatilityMultiplier));

  return Math.min(adjustedSlippage, config.maxSlippageBps);
}

async function executeSwap(inputMint: PublicKey, outputMint: PublicKey, amount: number) {
  const slippageBps = await calculateDynamicSlippage(inputMint, outputMint, amount);

  const routes = await jupiter.computeRoutes({
    inputMint,
    outputMint,
    amount,
    slippageBps,
  });

  const bestRoute = routes.routesInfos[0];
  const priceImpact = bestRoute.priceImpactPct;

  // Reject routes with excessive price impact
  if (priceImpact > 0.02) { // 2% price impact is too high
    logger.warn({ priceImpact, slippageBps }, 'Route rejected: excessive price impact');
    return null;
  }

  logger.info({ slippageBps, priceImpact }, 'Executing swap with dynamic slippage');
  const { execute } = await jupiter.exchange({ routeInfo: bestRoute });
  return await execute();
}
```

## Impact

- Sandwich attacks extract value proportional to the slippage tolerance on every trade
- A 5% slippage on a $100K trade means up to $5K extractable by MEV bots
- Stablecoin swaps with high slippage expose the bot to unnecessary loss
- Cumulative slippage losses can exceed trading profits over time

## References

- Crypto trader lost $215K in MEV sandwich attack on Uniswap USDC-USDT swap (March 2025)
- Ethereum Foundation lost $9,101 to MEV sandwich attack on 1.7K ETH swap on Uniswap V3 (October 2023)
- PumpSwap SDK: default SLIPPAGE of 500 bps (5%) -- documentation warns to adjust for production
- Jupiter Exchange: dynamic slippage recommendations based on route price impact
