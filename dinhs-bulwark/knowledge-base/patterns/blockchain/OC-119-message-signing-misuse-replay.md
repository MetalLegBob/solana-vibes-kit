# OC-119: Message Signing Misuse (Replay)

**Category:** Blockchain Interaction
**Severity:** HIGH
**Auditors:** CHAIN-03
**CWE:** CWE-294 (Authentication Bypass by Capture-replay)
**OWASP:** N/A — Blockchain-specific

## Description

Solana wallets can sign arbitrary messages (not just transactions) using `signMessage`. This is commonly used for authentication ("Sign in with Solana"), proving wallet ownership, or off-chain attestation. If the signed message does not include a nonce, timestamp, domain, or other uniqueness factor, the signature can be replayed by an attacker to authenticate as the victim on any service that accepts the same message format.

A signed message like "Welcome to MyApp" is a permanent, reusable credential — anyone who intercepts this signature can replay it indefinitely. The message must be scoped to a specific session, domain, and time window to prevent replay. The SIWS (Sign In With Solana) specification, based on EIP-4361, addresses this by requiring nonce, domain, issued-at timestamp, and expiration fields.

Beyond authentication replay, message signing can be misused if the application does not clearly differentiate between a message signature and a transaction signature. Some wallet drainers present a "sign message" prompt that actually signs data used to construct a valid transaction or token approval off-chain.

## Detection

```
grep -rn "signMessage" --include="*.ts" --include="*.js" --include="*.tsx"
grep -rn "sign.*message\|verify.*message" --include="*.ts" --include="*.js"
grep -rn "nacl\.sign\|tweetnacl\|ed25519" --include="*.ts" --include="*.js"
```

Look for: `signMessage` calls with static or predictable message content, message verification without nonce/timestamp checks, signed messages stored or transmitted without expiry enforcement.

## Vulnerable Code

```typescript
import { useWallet } from "@solana/wallet-adapter-react";
import nacl from "tweetnacl";

// VULNERABLE: Static message — signature can be replayed forever
async function authenticateUser(wallet: any): Promise<string> {
  const message = new TextEncoder().encode("Sign in to MyApp");
  const signature = await wallet.signMessage(message);
  // Send to server — attacker who captures this can replay it
  const res = await fetch("/api/auth", {
    method: "POST",
    body: JSON.stringify({
      publicKey: wallet.publicKey.toBase58(),
      signature: Buffer.from(signature).toString("base64"),
    }),
  });
  return res.json();
}
```

## Secure Code

```typescript
import { useWallet } from "@solana/wallet-adapter-react";
import nacl from "tweetnacl";

// SECURE: Nonce-based, domain-bound, time-limited message signing
async function authenticateUser(wallet: any): Promise<string> {
  // Step 1: Get a server-generated nonce
  const { nonce } = await fetch("/api/auth/nonce").then((r) => r.json());
  // Step 2: Construct SIWS-style message with domain, nonce, timestamp
  const message = [
    `myapp.com wants you to sign in with your Solana account:`,
    wallet.publicKey.toBase58(),
    ``,
    `Sign in to MyApp`,
    ``,
    `URI: https://myapp.com`,
    `Nonce: ${nonce}`,
    `Issued At: ${new Date().toISOString()}`,
    `Expiration Time: ${new Date(Date.now() + 5 * 60_000).toISOString()}`,
  ].join("\n");
  const signature = await wallet.signMessage(new TextEncoder().encode(message));
  // Step 3: Server validates nonce, timestamp, domain, and signature
  const res = await fetch("/api/auth/verify", {
    method: "POST",
    body: JSON.stringify({
      message,
      publicKey: wallet.publicKey.toBase58(),
      signature: Buffer.from(signature).toString("base64"),
    }),
  });
  return res.json();
}
```

## Impact

Replay of signed messages allows an attacker to impersonate a wallet owner on any service that accepts the same message format. This can lead to unauthorized access, account takeover, or fraudulent actions attributed to the victim's wallet. Permanent signatures (no expiry) remain exploitable indefinitely.

## References

- SIWS (Sign In With Solana) specification: https://siws.web3auth.io/spec
- phantom/sign-in-with-solana: reference implementation
- CAIP-122: Chain-agnostic sign-in standard
- Web3Auth: SIWS Security Considerations — nonce and domain binding
