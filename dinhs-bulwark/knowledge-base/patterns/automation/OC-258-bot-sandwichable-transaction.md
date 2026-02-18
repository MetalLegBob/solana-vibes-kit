# OC-258: Bot Sandwich-able Transaction

**Category:** Automation & Bots
**Severity:** HIGH
**Auditors:** BOT-02, CHAIN-05
**CWE:** N/A — Domain-specific
**OWASP:** N/A — Domain-specific

## Description

A sandwich attack occurs when an MEV bot detects a pending swap transaction in the mempool, front-runs it with a buy (pushing the price up), lets the victim's transaction execute at a worse price, and then back-runs with a sell to pocket the difference. Trading bots and keepers that submit swap transactions without MEV protection are systematically sandwiched, losing value on every trade.

On Solana, MEV extraction occurs through Jito's block-building infrastructure. Bots can protect their transactions by submitting them as Jito bundles (which are atomic and not visible in the mempool) or by using MEV-protection services like Nozomi. Bots that submit transactions through standard RPC endpoints without these protections are visible to searchers who can sandwich them.

The scale of sandwich attacks is enormous. In March 2025 alone, a single trader lost $215K on a Uniswap stablecoin swap to a sandwich attack. The Ethereum Foundation itself lost $9,101 to a sandwich attack when selling 1.7K ETH on Uniswap V3 in October 2023. On Solana, Jito validators process MEV bundles that extract value from unprotected transactions continuously.

## Detection

```
# Standard RPC submission (no MEV protection)
grep -rn "sendAndConfirmTransaction\|sendRawTransaction\|sendTransaction" --include="*.ts" --include="*.js"
grep -rn "connection\.send" --include="*.ts" | grep -v "jito\|bundle\|nozomi\|protect"

# Check for Jito/Nozomi bundle usage
grep -rn "jito\|Jito\|JitoBundle\|BundleClient\|nozomi\|Nozomi" --include="*.ts" --include="*.js"
grep -rn "searcherClient\|sendBundle\|tipInstruction" --include="*.ts" --include="*.js"

# Swap instructions without MEV protection wrapper
grep -rn "swap\|exchange\|Jupiter\|Raydium\|Orca" --include="*.ts" | grep -v "bundle\|protect\|private"
```

## Vulnerable Code

```typescript
import { Connection, Transaction, sendAndConfirmTransaction } from '@solana/web3.js';

async function executeArbitrage(route: SwapRoute) {
  const connection = new Connection('https://api.mainnet-beta.solana.com');

  // VULNERABLE: Submits swap through public RPC -- visible to all MEV searchers
  const tx = new Transaction();
  tx.add(...route.instructions);

  const sig = await sendAndConfirmTransaction(connection, tx, [wallet]);
  console.log('Arb executed:', sig);
}
```

## Secure Code

```typescript
import { Connection, Transaction, VersionedTransaction } from '@solana/web3.js';
import { SearcherClient } from 'jito-ts/dist/sdk/block-engine/searcher';

const jitoClient = SearcherClient.connect('mainnet.block-engine.jito.wtf');

async function executeArbitrage(route: SwapRoute) {
  const connection = new Connection(process.env.RPC_URL!);

  // Build the swap transaction
  const tx = new Transaction();
  tx.add(...route.instructions);

  // Add Jito tip instruction to incentivize bundle inclusion
  const tipLamports = 10_000; // Tip amount for bundle priority
  tx.add(createJitoTipInstruction(wallet.publicKey, tipLamports));

  tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
  tx.feePayer = wallet.publicKey;
  tx.sign(wallet);

  // Submit as Jito bundle -- atomic, private, not visible in mempool
  const bundle = [tx];
  const bundleId = await jitoClient.sendBundle(bundle);
  logger.info({ bundleId }, 'Submitted MEV-protected bundle');

  // Wait for bundle confirmation
  const result = await waitForBundleConfirmation(bundleId);
  if (!result.confirmed) {
    logger.warn({ bundleId }, 'Bundle was not included, may need to retry');
  }

  return result;
}

// Alternative: Use Nozomi for MEV protection
async function executeWithNozomi(route: SwapRoute) {
  const tx = new Transaction();
  tx.add(...route.instructions);

  // Submit through Nozomi's protected RPC endpoint
  const nozomiConnection = new Connection(process.env.NOZOMI_RPC_URL!);
  const sig = await sendAndConfirmTransaction(nozomiConnection, tx, [wallet]);
  return sig;
}
```

## Impact

- Systematic value extraction on every unprotected swap transaction
- Losses proportional to trade size and slippage tolerance
- Sandwich attackers can extract the full slippage tolerance on each trade
- Arbitrage profits are consumed by MEV extraction, making strategies unprofitable

## References

- Crypto trader lost $215K in Uniswap MEV sandwich attack on USDC swap (March 2025)
- Ethereum Foundation lost $9,101 to MEV sandwich attack on Uniswap V3 (October 2023)
- BlockSec: "Harvesting MEV Bots by Exploiting Vulnerabilities in Flashbots Relay" ($20M profit, April 2023)
- Zellic: "Your Sandwich Is My Lunch: How to Drain MEV Contracts V2" (July 2023)
- PumpSwap SDK: Jito and Nozomi integration for MEV protection
