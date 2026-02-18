# OC-127: Frontrunnable Transaction (No MEV Protection)

**Category:** Blockchain Interaction
**Severity:** HIGH
**Auditors:** CHAIN-05
**CWE:** N/A — Blockchain-specific
**OWASP:** N/A — Blockchain-specific

## Description

Maximal Extractable Value (MEV) on Solana allows validators and specialized bots to profit by observing pending transactions and inserting their own transactions before, after, or around them. While Solana's architecture (no public mempool, validator-controlled transaction ordering) was originally thought to limit MEV, the Jito block engine and validator sidecar infrastructure have created a sophisticated MEV ecosystem.

Solana MEV extraction is significant: research from Sandwiched.me (May 2025) analyzed 8.5 billion trades and over $1 trillion in DEX volume, finding over $380 million in atomic arbitrage. Astralane reported 12,000+ SOL extracted from 145,000+ sandwich attacks affecting 59,000+ victims in a single 30-day period (August 2025). A Northeastern University study quantified sandwich attacks facilitated through Jito's infrastructure.

Off-chain applications that construct transactions without MEV protection are vulnerable. Key risk factors include: submitting swap transactions through public RPC endpoints (where validators can inspect them), not using private transaction relays, setting slippage tolerances higher than necessary, and not using Jito bundles or MEV-protected RPC endpoints for sensitive transactions.

## Detection

```
grep -rn "sendTransaction\|sendRawTransaction" --include="*.ts" --include="*.js"
grep -rn "swap\|exchange\|trade" --include="*.ts" --include="*.js" -i
grep -rn "jito\|bundle\|tip" --include="*.ts" --include="*.js" -i
grep -rn "slippage\|minOut\|minimumAmountOut" --include="*.ts" --include="*.js"
```

Look for: swap transactions sent via standard RPC (not MEV-protected), missing Jito bundle usage for sensitive transactions, no private transaction relay, transactions with value-extractable patterns (swaps, liquidations, arbitrage).

## Vulnerable Code

```typescript
import { Connection, Transaction } from "@solana/web3.js";

// VULNERABLE: Swap transaction sent via public RPC — fully frontrunnable
async function executeSwap(
  connection: Connection,
  swapTx: Transaction,
  signer: Keypair
) {
  swapTx.sign(signer);
  // Sent through public RPC — validator can see and frontrun this
  const sig = await connection.sendRawTransaction(swapTx.serialize(), {
    skipPreflight: false,
  });
  return sig;
}
```

## Secure Code

```typescript
import { Connection, Transaction, Keypair } from "@solana/web3.js";

// SECURE: Use Jito bundles or MEV-protected RPC for swap transactions
async function executeSwap(
  swapTx: Transaction,
  signer: Keypair,
  tipAmount: number = 10_000 // lamports tip to Jito
) {
  swapTx.sign(signer);
  // Option 1: Send via Jito bundle endpoint for MEV protection
  const JITO_ENDPOINT = "https://mainnet.block-engine.jito.wtf/api/v1/bundles";
  const bundle = {
    jsonrpc: "2.0",
    id: 1,
    method: "sendBundle",
    params: [[Buffer.from(swapTx.serialize()).toString("base64")]],
  };
  const response = await fetch(JITO_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(bundle),
  });
  return response.json();
}

// Option 2: Use an MEV-protected RPC provider
async function executeSwapProtected(
  swapTx: Transaction,
  signer: Keypair
) {
  // dRPC, Helius, and others offer MEV-protected endpoints
  const protectedRpc = new Connection(process.env.MEV_PROTECTED_RPC_URL!);
  swapTx.sign(signer);
  return protectedRpc.sendRawTransaction(swapTx.serialize());
}
```

## Impact

Frontrun transactions result in worse execution prices for swaps (the user receives fewer tokens), failed liquidation attempts (the attacker liquidates first), and lost arbitrage opportunities. In aggregate, Solana MEV extraction costs users hundreds of millions of dollars annually. Individual swap transactions can lose 1-5% of their value to sandwich attacks.

## References

- Sandwiched.me: State of Solana MEV May 2025 — $380M in atomic arbitrage
- Astralane: Solana MEV Wars — 12,000+ SOL extracted in 30 days (August 2025)
- Northeastern University: Quantifying Sandwich MEV on Jito (October 2025)
- QuickNode: MEV on Solana guide — protection strategies
- dRPC: Stake-weighted QoS and MEV Protection on Solana (April 2025)
