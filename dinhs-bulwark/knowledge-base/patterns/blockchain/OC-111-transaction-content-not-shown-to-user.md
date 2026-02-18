# OC-111: Transaction Content Not Shown to User

**Category:** Blockchain Interaction
**Severity:** HIGH
**Auditors:** CHAIN-01
**CWE:** CWE-356 (Product UI does not Warn User of Unsafe Actions)
**OWASP:** N/A — Blockchain-specific

## Description

When a dApp requests a user to sign a Solana transaction, the user should be able to see what the transaction will do before approving it. Applications that present blind signing requests — or that construct transactions in ways that prevent wallet simulation from showing meaningful information — expose users to signing malicious transactions.

Solana wallet applications like Phantom simulate transactions to display balance changes before the user approves. However, applications can undermine this protection by using `signTransaction` instead of `signAndSendTransaction` (skipping the wallet's full simulation flow), by constructing transactions with instructions that wallet parsers cannot decode, or by presenting misleading UI that implies the transaction does something different from its actual content.

The Solana phishing campaigns of 2025 exploited this by crafting transactions whose simulation showed zero balance changes (no SOL or token transfers) but actually executed account ownership reassignment. Users saw "no changes" and approved, not realizing the transaction transferred control of their accounts to the attacker.

## Detection

```
grep -rn "signTransaction(" --include="*.ts" --include="*.js" | grep -v "signAndSend"
grep -rn "signAllTransactions(" --include="*.ts" --include="*.js"
grep -rn "serializeMessage" --include="*.ts" --include="*.js"
```

Look for: use of `signTransaction` without a client-side simulation preview, batch signing via `signAllTransactions` without individual transaction display, server-built transactions sent to wallet without content display.

## Vulnerable Code

```typescript
import { useWallet } from "@solana/wallet-adapter-react";

// VULNERABLE: Blind signing — user signs without seeing transaction details
function ClaimButton({ serializedTx }: { serializedTx: string }) {
  const { signTransaction } = useWallet();

  const handleClaim = async () => {
    const tx = Transaction.from(Buffer.from(serializedTx, "base64"));
    // No preview, no simulation result shown to user
    const signed = await signTransaction!(tx);
    await fetch("/api/submit", {
      method: "POST",
      body: signed.serialize(),
    });
  };

  return <button onClick={handleClaim}>Claim Reward</button>;
}
```

## Secure Code

```typescript
import { useWallet, useConnection } from "@solana/wallet-adapter-react";

// SECURE: Simulate, display results, then use signAndSendTransaction
function ClaimButton({ claimInstruction }: { claimInstruction: TransactionInstruction }) {
  const { sendTransaction, publicKey } = useWallet();
  const { connection } = useConnection();

  const handleClaim = async () => {
    const tx = new Transaction().add(claimInstruction);
    tx.feePayer = publicKey!;
    tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    // Simulate and show user what will happen
    const sim = await connection.simulateTransaction(tx);
    if (sim.value.err) {
      alert("Transaction would fail — not submitting");
      return;
    }
    // signAndSendTransaction lets wallet show its own simulation preview
    const sig = await sendTransaction(tx, connection);
    await connection.confirmTransaction(sig, "confirmed");
  };

  return <button onClick={handleClaim}>Claim Reward</button>;
}
```

## Impact

Users who sign transactions without understanding their content can unknowingly approve fund transfers, token approvals, account ownership changes, or program authority modifications. Wallet drainer attacks on Solana rely entirely on tricking users into blind signing. Single incidents have resulted in losses exceeding $3 million.

## References

- SlowMist: Solana phishing via hidden ownership reassignment (December 2025)
- Phantom docs: signAndSendTransaction provides wallet simulation preview
- Blockaid: wallet drainer techniques exploiting blind signing
- Chainalysis: Understanding Crypto Drainers — $494M stolen via drainers in 2024
