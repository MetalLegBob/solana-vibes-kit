# OC-255: No Maximum Trade Size Limit

**Category:** Automation & Bots
**Severity:** HIGH
**Auditors:** BOT-02
**CWE:** CWE-770 — Allocation of Resources Without Limits or Throttling
**OWASP:** N/A — Domain-specific

## Description

Trading bots that accept trade size parameters from external signals, strategy engines, or user input without enforcing a maximum bound can execute trades that are far larger than intended. A miscalculated signal, an integer overflow in size computation, or a malicious input can cause the bot to commit its entire portfolio in a single trade.

This differs from OC-247 (no fund limit per operation) in that it specifically targets the trade size parameter of swap/order instructions. Even if the bot has a per-operation fund limit, a missing trade size cap can cause the bot to attempt orders that exceed available liquidity, resulting in massive slippage. The March 2025 Uniswap sandwich attack targeted a $220K swap that had no size-based slippage protection -- the trade was too large for the available liquidity depth, creating a profitable sandwich opportunity.

On Solana DEXes like Jupiter and Raydium, large trades against thin liquidity pools can move the price by 50% or more within a single transaction. A bot that calculates trade size based on a percentage without capping the absolute amount can accidentally execute market-moving trades that benefit MEV extractors.

## Detection

```
# Look for trade size calculations without caps
grep -rn "amount.*=.*balance\|tradeSize\|orderSize\|swapAmount" --include="*.ts" --include="*.js"
grep -rn "MAX_TRADE_SIZE\|maxTradeSize\|maxOrderSize\|maxSwapAmount" --include="*.ts" --include="*.js"

# Percentage-based sizing without absolute limits
grep -rn "balance.*\*.*0\.\|portfolio.*\*.*percent" --include="*.ts" --include="*.js"

# Jupiter/Raydium swap amounts from untrusted input
grep -rn "computeRoutes.*amount\|swap.*amount\|exchange.*amount" --include="*.ts" --include="*.js"
```

## Vulnerable Code

```typescript
interface TradeSignal {
  token: string;
  direction: 'buy' | 'sell';
  sizePercent: number; // e.g., 0.50 = 50% of portfolio
}

async function executeSignal(signal: TradeSignal) {
  const balance = await connection.getBalance(wallet.publicKey);
  // VULNERABLE: No max cap -- a signal of sizePercent=1.0 uses entire balance
  const tradeAmount = Math.floor(balance * signal.sizePercent);

  const routes = await jupiter.computeRoutes({
    inputMint: SOL_MINT,
    outputMint: new PublicKey(signal.token),
    amount: tradeAmount,
    slippageBps: 300,
  });

  const { execute } = await jupiter.exchange({ routeInfo: routes.routesInfos[0] });
  return await execute();
}
```

## Secure Code

```typescript
const TRADE_LIMITS = {
  maxAbsoluteLamports: 1_000_000_000,  // 1 SOL absolute max per trade
  maxPercentOfBalance: 0.05,            // 5% of portfolio per trade
  maxPercentOfLiquidity: 0.02,          // 2% of pool liquidity
  minTradeAmountLamports: 10_000_000,   // 0.01 SOL minimum (avoid dust)
};

async function executeSignal(signal: TradeSignal) {
  // Validate signal bounds
  if (signal.sizePercent <= 0 || signal.sizePercent > 1) {
    throw new Error(`Invalid signal sizePercent: ${signal.sizePercent}`);
  }

  const balance = await connection.getBalance(wallet.publicKey);
  const requestedAmount = Math.floor(balance * signal.sizePercent);

  // Apply absolute and percentage caps
  const maxByPercent = Math.floor(balance * TRADE_LIMITS.maxPercentOfBalance);
  const tradeAmount = Math.min(requestedAmount, maxByPercent, TRADE_LIMITS.maxAbsoluteLamports);

  if (tradeAmount < TRADE_LIMITS.minTradeAmountLamports) {
    logger.info('Trade too small after applying limits, skipping');
    return null;
  }

  const routes = await jupiter.computeRoutes({
    inputMint: SOL_MINT,
    outputMint: new PublicKey(signal.token),
    amount: tradeAmount,
    slippageBps: 100,
  });

  // Verify price impact is acceptable
  const bestRoute = routes.routesInfos[0];
  if (bestRoute.priceImpactPct > 0.01) {
    logger.warn({ priceImpact: bestRoute.priceImpactPct }, 'Trade rejected: price impact too high');
    return null;
  }

  logger.info({ tradeAmount, priceImpact: bestRoute.priceImpactPct }, 'Executing capped trade');
  const { execute } = await jupiter.exchange({ routeInfo: bestRoute });
  return await execute();
}
```

## Impact

- Entire portfolio committed in a single bad trade
- Massive slippage on oversized orders against thin liquidity
- Market impact makes the bot's own trade the primary source of loss
- MEV bots specifically target large orders with known slippage tolerance

## References

- Crypto trader lost $215K in sandwich attack: oversized stablecoin swap (March 2025)
- PumpSwap SDK: configurable trade amount parameters but no built-in max cap
- Nadcab: "90% of failed bot traders ignored position limits and stop losses"
- Alpaca trading bot: Constitution v1.0 mandates position limits and mandatory stop losses
