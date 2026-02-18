# OC-106: Transaction Instruction Injection

**Category:** Blockchain Interaction
**Severity:** CRITICAL
**Auditors:** CHAIN-01
**CWE:** CWE-74 (Improper Neutralization of Special Elements in Output)
**OWASP:** N/A — Blockchain-specific

## Description

Transaction instruction injection occurs when an attacker can insert, modify, or append arbitrary instructions into a Solana transaction before the user signs it. In Solana's transaction model, a single transaction can contain multiple instructions that execute atomically. A malicious dApp or compromised frontend can bundle legitimate-looking instructions alongside hidden drain instructions.

The December 2024 @solana/web3.js supply chain attack (CVE-2024-54134) demonstrated a related vector: malicious code injected into the library could intercept and modify transactions before signing. In the Solana phishing campaigns documented by SlowMist in late 2025, attackers crafted transactions that appeared to show no balance changes during wallet simulation but actually reassigned account ownership via hidden instructions.

Because Solana transactions are atomic, a user signing a transaction containing a token transfer also signs any injected instructions (such as SetAuthority calls or SOL transfers to attacker wallets). Most wallet UIs display only a summary, making it difficult for users to detect injected instructions.

## Detection

```
grep -rn "transaction\.add(" --include="*.ts" --include="*.js"
grep -rn "new TransactionInstruction" --include="*.ts" --include="*.js"
grep -rn "instructions\.push" --include="*.ts" --include="*.js"
grep -rn "appendTransactionMessageInstruction" --include="*.ts" --include="*.js"
```

Look for: dynamic instruction construction from user input or API responses, instructions added after user review but before signing, transactions built server-side then sent to client for blind signing.

## Vulnerable Code

```typescript
import { Transaction, SystemProgram, PublicKey } from "@solana/web3.js";

// VULNERABLE: Server returns serialized transaction that client signs blindly
async function executeServerTransaction(wallet: any) {
  const response = await fetch("/api/build-transaction", {
    method: "POST",
    body: JSON.stringify({ action: "claim-reward" }),
  });
  const { serializedTx } = await response.json();
  // User signs without inspecting instructions
  const tx = Transaction.from(Buffer.from(serializedTx, "base64"));
  const signed = await wallet.signTransaction(tx);
  return signed;
}
```

## Secure Code

```typescript
import { Transaction, SystemProgram, PublicKey } from "@solana/web3.js";

// SECURE: Build transaction client-side with known, audited instructions
async function claimReward(wallet: any, connection: any, rewardProgram: PublicKey) {
  const tx = new Transaction();
  // Only add instructions the user explicitly expects
  tx.add(
    new TransactionInstruction({
      keys: [{ pubkey: wallet.publicKey, isSigner: true, isWritable: true }],
      programId: rewardProgram,
      data: Buffer.from([/* claim instruction discriminator */]),
    })
  );
  // Simulate first so user can see exact effects
  const simulation = await connection.simulateTransaction(tx);
  if (simulation.value.err) {
    throw new Error(`Simulation failed: ${JSON.stringify(simulation.value.err)}`);
  }
  const signed = await wallet.signTransaction(tx);
  return connection.sendRawTransaction(signed.serialize());
}
```

## Impact

An attacker who injects instructions into a transaction can drain SOL and SPL tokens, reassign token account authority, approve unlimited token delegations, or transfer NFTs. Because Solana transactions are atomic, the victim's signature covers all injected instructions. Losses from phishing-based instruction injection on Solana have exceeded $3 million in single incidents (SlowMist, December 2025).

## References

- CVE-2024-54134: @solana/web3.js supply chain attack (December 2024)
- SlowMist: Solana phishing attacks via ownership reassignment (December 2025)
- Blockaid: Wallet drainer anatomy — malicious dApps injecting drain instructions
- Solana account model: Owner field reassignment via crafted instructions
