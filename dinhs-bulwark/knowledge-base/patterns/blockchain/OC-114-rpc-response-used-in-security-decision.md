# OC-114: RPC Response Used in Security Decision

**Category:** Blockchain Interaction
**Severity:** HIGH
**Auditors:** CHAIN-02
**CWE:** CWE-807 (Reliance on Untrusted Inputs in a Security Decision)
**OWASP:** N/A — Blockchain-specific

## Description

Solana RPC responses represent the state of the blockchain at a specific point in time, as reported by a single node. Using these responses as the sole basis for security decisions (e.g., verifying payment receipt, checking account ownership, or validating balances before releasing assets) is dangerous because RPC data can be stale, incorrect, or deliberately fabricated by a compromised node.

A common anti-pattern is checking a user's token balance via `getTokenAccountBalance` and then granting access or releasing goods based on that response alone. The balance could change between the RPC query and the action, the RPC node could be returning cached data, or a malicious RPC could return fabricated balances. Even with a trusted RPC provider, responses reflect a specific slot and commitment level that may not represent the final state.

Server-side applications that verify payments by calling `getTransaction` or `getSignatureStatuses` must also handle the case where the RPC returns null (transaction not yet visible) or returns a status at "processed" commitment that could later be rolled back.

## Detection

```
grep -rn "getBalance\|getTokenAccountBalance" --include="*.ts" --include="*.js" -A 10
grep -rn "getTransaction\|getSignatureStatuses" --include="*.ts" --include="*.js" -A 10
grep -rn "getAccountInfo" --include="*.ts" --include="*.js" -A 10
```

Look for: balance checks followed by access control decisions, transaction lookups used to verify payments without commitment level checks, single RPC call used as sole verification source.

## Vulnerable Code

```typescript
import { Connection, PublicKey } from "@solana/web3.js";

// VULNERABLE: Payment verification using single RPC call at default commitment
async function verifyPayment(connection: Connection, userPubkey: PublicKey): boolean {
  const balance = await connection.getBalance(userPubkey);
  // Trusting RPC response as ground truth for access control
  if (balance >= 1_000_000_000) { // 1 SOL
    grantPremiumAccess(userPubkey.toBase58());
    return true;
  }
  return false;
}
```

## Secure Code

```typescript
import { Connection, PublicKey } from "@solana/web3.js";

// SECURE: Verify actual transaction on-chain at finalized commitment
async function verifyPayment(
  connection: Connection,
  expectedSignature: string,
  expectedPayer: PublicKey,
  expectedAmount: number
): boolean {
  // Use finalized commitment — cannot be rolled back
  const tx = await connection.getTransaction(expectedSignature, {
    commitment: "finalized",
    maxSupportedTransactionVersion: 0,
  });
  if (!tx || tx.meta?.err) {
    return false;  // Transaction not finalized or failed
  }
  // Verify the transaction actually transfers the expected amount
  const preBalance = tx.meta!.preBalances[0];
  const postBalance = tx.meta!.postBalances[0];
  const transferred = preBalance - postBalance - tx.meta!.fee;
  if (transferred < expectedAmount) {
    return false;
  }
  // Cross-validate with a second RPC if handling high-value operations
  return true;
}
```

## Impact

An application that trusts unverified RPC responses for security decisions can be tricked into releasing goods, granting access, or crediting balances for transactions that never occurred, were rolled back, or involved different amounts. This is functionally equivalent to a payment bypass vulnerability.

## References

- Solana docs: Commitment levels — processed vs confirmed vs finalized
- Helius blog: Solana Commitment Levels — security implications
- Chainstack: Solana Transaction Commitment Levels — when to use finalized
