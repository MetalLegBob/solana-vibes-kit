# OC-116: Stale RPC Data in Financial Decision

**Category:** Blockchain Interaction
**Severity:** HIGH
**Auditors:** CHAIN-02
**CWE:** CWE-613 (Insufficient Session Expiration) — analogous: insufficient data freshness
**OWASP:** N/A — Blockchain-specific

## Description

Solana produces blocks approximately every 400 milliseconds, meaning on-chain state changes rapidly. Applications that cache or reuse RPC data without freshness checks risk making financial decisions based on stale state. This includes using cached account balances, token prices, pool reserves, or transaction statuses that no longer reflect the current blockchain state.

A common anti-pattern is fetching a token account balance at application startup and reusing that value for subsequent operations. On Solana's high-throughput network, the balance can change within seconds due to concurrent transactions. Trading bots that use stale price data from a previous slot can execute trades at unfavorable rates. Payment verification systems that cache transaction status checks can miss failed or rolled-back transactions.

The `getLatestBlockhash` response includes a `lastValidBlockHeight` field that indicates when the blockhash expires (typically ~150 blocks or ~60 seconds). Applications that reuse a blockhash beyond its validity window will have their transactions rejected. This is a specific manifestation of the stale data problem.

## Detection

```
grep -rn "getLatestBlockhash\|getRecentBlockhash" --include="*.ts" --include="*.js"
grep -rn "recentBlockhash" --include="*.ts" --include="*.js"
grep -rn "getBalance\|getTokenAccountBalance" --include="*.ts" --include="*.js"
```

Look for: RPC response data stored in variables and reused across multiple operations, blockhash caching without expiry checks, balance data used for calculations without re-fetching.

## Vulnerable Code

```typescript
import { Connection, PublicKey } from "@solana/web3.js";

// VULNERABLE: Cached blockhash and balance used across multiple transactions
class TransactionBuilder {
  private cachedBlockhash: string | null = null;
  private cachedBalance: number | null = null;

  async init(connection: Connection, wallet: PublicKey) {
    // Fetched once, reused for all subsequent transactions
    const { blockhash } = await connection.getLatestBlockhash();
    this.cachedBlockhash = blockhash;
    this.cachedBalance = await connection.getBalance(wallet);
  }

  buildTransfer(amount: number): Transaction {
    if (this.cachedBalance! < amount) throw new Error("Insufficient");
    const tx = new Transaction();
    tx.recentBlockhash = this.cachedBlockhash!; // May be expired
    // Balance may have changed since init()
    return tx;
  }
}
```

## Secure Code

```typescript
import { Connection, PublicKey } from "@solana/web3.js";

// SECURE: Fresh data for each financial operation
class TransactionBuilder {
  constructor(private connection: Connection) {}

  async buildTransfer(wallet: PublicKey, amount: number): Promise<Transaction> {
    // Fresh blockhash for each transaction
    const { blockhash, lastValidBlockHeight } =
      await this.connection.getLatestBlockhash("confirmed");
    // Fresh balance check
    const balance = await this.connection.getBalance(wallet, "confirmed");
    if (balance < amount) {
      throw new Error(`Insufficient balance: ${balance} < ${amount}`);
    }
    const tx = new Transaction();
    tx.recentBlockhash = blockhash;
    tx.lastValidBlockHeight = lastValidBlockHeight;
    return tx;
  }

  async confirmWithExpiry(sig: string, lastValidBlockHeight: number) {
    const result = await this.connection.confirmTransaction({
      signature: sig,
      blockhash: this.lastBlockhash,
      lastValidBlockHeight,
    });
    return result;
  }
}
```

## Impact

Stale data in financial decisions can result in transactions built with expired blockhashes (rejected by the network), trades executed on outdated price data (resulting in losses), or balance checks that do not reflect recent debits (enabling overdraft-like situations). For automated systems processing high volumes, stale data can compound into significant financial impact.

## References

- Solana docs: Transaction Confirmation & Expiration — blockhash validity
- Helius blog: Solana Commitment Levels — data freshness implications
- Solana docs: getLatestBlockhash — lastValidBlockHeight field
