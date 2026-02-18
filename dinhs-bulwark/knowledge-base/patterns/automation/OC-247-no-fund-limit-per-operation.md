# OC-247: No Fund Limit Per Operation

**Category:** Automation & Bots
**Severity:** HIGH
**Auditors:** BOT-01
**CWE:** CWE-770 — Allocation of Resources Without Limits or Throttling
**OWASP:** N/A — Domain-specific

## Description

When an automated bot or keeper system can execute operations of any size without per-transaction or per-operation fund limits, a single erroneous or malicious instruction can drain the entire operational wallet. This is one of the most common causes of catastrophic loss in crypto trading bots and DeFi keepers.

In Solana keeper bots (such as those used by Drift Protocol, Marinade, or custom liquidation bots), the operational wallet must hold SOL for gas and potentially additional tokens for liquidation or arbitrage. Without per-operation limits, a bug that miscalculates a swap amount, a manipulated oracle price, or a compromised instruction could cause the bot to commit its entire balance in a single transaction.

Production trading bots like those on Binance or Jupiter should enforce maximum trade sizes as a percentage of portfolio value, with absolute caps that cannot be overridden programmatically. The April 2025 MEV bot exploit ($180K loss) demonstrated that even sophisticated bots can lose their entire balance when access controls and spending limits are absent.

## Detection

```
# Look for swap/transfer amounts derived directly from balance queries
grep -rn "getBalance\|getTokenAccountBalance" --include="*.ts" --include="*.js"
grep -rn "amount.*balance\|balance.*amount" --include="*.ts" --include="*.js"

# Check for missing max amount constants
grep -rn "maxAmount\|MAX_TRADE\|MAX_TRANSFER\|maxLamports\|positionLimit" --include="*.ts" --include="*.js"

# Detect raw balance used as transfer amount
grep -rn "lamports.*balance\|amount.*=.*balance" --include="*.ts"
```

## Vulnerable Code

```typescript
import { Connection, PublicKey } from '@solana/web3.js';

async function liquidatePosition(connection: Connection, targetAccount: PublicKey) {
  // VULNERABLE: Uses entire wallet balance with no cap
  const balance = await connection.getBalance(botWallet.publicKey);
  const amountToUse = balance - 5000; // just leave rent

  const ix = createLiquidationInstruction({
    liquidator: botWallet.publicKey,
    amount: amountToUse, // Could be the entire wallet
    target: targetAccount,
  });

  await sendAndConfirmTransaction(connection, new Transaction().add(ix), [botWallet]);
}
```

## Secure Code

```typescript
import { Connection, PublicKey } from '@solana/web3.js';

const LIMITS = {
  maxPerOperationLamports: 500_000_000,   // 0.5 SOL per liquidation
  maxPercentOfBalance: 0.10,              // Never use more than 10% of balance
  minReserveLamports: 100_000_000,        // Keep 0.1 SOL reserve minimum
  dailyCapLamports: 5_000_000_000,        // 5 SOL daily total
};

let dailySpentLamports = 0;

async function liquidatePosition(connection: Connection, targetAccount: PublicKey) {
  const balance = await connection.getBalance(botWallet.publicKey);
  const maxByPercent = Math.floor(balance * LIMITS.maxPercentOfBalance);
  const maxByAbsolute = LIMITS.maxPerOperationLamports;
  const availableAfterReserve = balance - LIMITS.minReserveLamports;

  const amountToUse = Math.min(maxByPercent, maxByAbsolute, availableAfterReserve);

  if (amountToUse <= 0) {
    logger.warn('Insufficient balance after applying limits');
    return;
  }

  if (dailySpentLamports + amountToUse > LIMITS.dailyCapLamports) {
    logger.error('Daily spending cap reached, halting operations');
    return;
  }

  const ix = createLiquidationInstruction({
    liquidator: botWallet.publicKey,
    amount: amountToUse,
    target: targetAccount,
  });

  await sendAndConfirmTransaction(connection, new Transaction().add(ix), [botWallet]);
  dailySpentLamports += amountToUse;
  logger.info({ amountToUse, dailySpentLamports }, 'Liquidation executed within limits');
}
```

## Impact

- Entire wallet drained by a single malformed transaction
- Amplified loss from oracle manipulation or price feed errors
- No recoverability: once funds are committed on-chain, they cannot be recalled
- Cascading failures when dependent operations lack funding

## References

- MEV Bot exploited for $180K in ETH due to access control vulnerability (April 2025, SlowMist)
- MEV Bot $25M loss via Flashbots relay exploit (April 2023, 5 bots drained)
- Drift Protocol keeper-bots-v2: reference implementation with configurable position limits
- Pickmytrade.io: "Bot Kill Switch" guide on daily loss limits and capital caps (2026)
