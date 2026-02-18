# OC-121: Missing Nonce in Sign-In-With-Solana

**Category:** Blockchain Interaction
**Severity:** HIGH
**Auditors:** CHAIN-03
**CWE:** CWE-294 (Authentication Bypass by Capture-replay), CWE-330 (Use of Insufficiently Random Values)
**OWASP:** A07:2021 – Identification and Authentication Failures

## Description

Sign-In With Solana (SIWS) is an authentication protocol where users prove wallet ownership by signing a structured message. The SIWS specification (based on EIP-4361/CAIP-122) requires a server-generated nonce in the signed message to prevent replay attacks. Without a nonce, an attacker who captures a signed authentication message can replay it to authenticate as the victim indefinitely.

The SIWS security considerations documentation explicitly states: "To prevent replay attacks, a nonce should be selected with sufficient entropy for the use case, and the server should assert that the nonce matches the expected value." The nonce must be generated server-side, stored in the session, and validated upon receipt of the signed message. Client-generated nonces are insufficient because the attacker can generate their own.

Additional required fields include `domain` (to prevent cross-site replay), `issuedAt` (timestamp), and `expirationTime` (to limit the signature's validity window). Missing any of these fields weakens the authentication security. Wallets conforming to CAIP standards can check domain bindings to prevent phishing, but this requires the dApp to include the correct domain in the SIWS message.

## Detection

```
grep -rn "signMessage\|signIn" --include="*.ts" --include="*.js" --include="*.tsx"
grep -rn "nonce" --include="*.ts" --include="*.js" | grep -i "sign\|auth\|siws"
grep -rn "sign-in-with-solana\|siws\|SolanaSignIn" --include="*.ts" --include="*.js"
```

Look for: SIWS implementations without server-generated nonces, nonces generated client-side, missing nonce validation on the server, SIWS messages without domain or expiration fields.

## Vulnerable Code

```typescript
// VULNERABLE: No nonce — signed message is replayable forever
// Client:
async function signIn(wallet: any) {
  const message = `Sign in to MyApp\nAddress: ${wallet.publicKey.toBase58()}`;
  const signature = await wallet.signMessage(new TextEncoder().encode(message));
  return fetch("/api/auth", {
    method: "POST",
    body: JSON.stringify({
      publicKey: wallet.publicKey.toBase58(),
      signature: Buffer.from(signature).toString("hex"),
      message,
    }),
  });
}

// Server:
app.post("/api/auth", (req, res) => {
  const { publicKey, signature, message } = req.body;
  // No nonce check, no expiry, no domain validation
  if (verifySignature(publicKey, message, signature)) {
    res.json({ token: generateJWT(publicKey) });
  }
});
```

## Secure Code

```typescript
import crypto from "crypto";
import nacl from "tweetnacl";
import { PublicKey } from "@solana/web3.js";

// SECURE: Server-generated nonce with expiry and domain binding
// Server — generate nonce:
app.get("/api/auth/nonce", (req, res) => {
  const nonce = crypto.randomBytes(32).toString("hex");
  req.session.authNonce = nonce;
  req.session.nonceExpiry = Date.now() + 5 * 60_000; // 5 minutes
  res.json({ nonce });
});

// Server — verify:
app.post("/api/auth/verify", (req, res) => {
  const { publicKey, signature, message } = req.body;
  // Validate nonce matches and hasn't expired
  if (!req.session.authNonce || Date.now() > req.session.nonceExpiry) {
    return res.status(401).json({ error: "Nonce expired" });
  }
  if (!message.includes(`Nonce: ${req.session.authNonce}`)) {
    return res.status(401).json({ error: "Invalid nonce" });
  }
  // Validate domain binding
  if (!message.includes(`URI: https://myapp.com`)) {
    return res.status(401).json({ error: "Domain mismatch" });
  }
  // Verify Ed25519 signature
  const pubkey = new PublicKey(publicKey);
  const verified = nacl.sign.detached.verify(
    new TextEncoder().encode(message),
    Buffer.from(signature, "hex"),
    pubkey.toBytes()
  );
  if (verified) {
    delete req.session.authNonce; // One-time use
    res.json({ token: generateJWT(publicKey) });
  }
});
```

## Impact

Without a nonce, any intercepted SIWS signature grants permanent access to the victim's account. Attackers can capture signatures from network traffic, browser history, server logs, or frontend analytics, then replay them to authenticate as the victim. This is a direct account takeover vulnerability.

## References

- SIWS Security Considerations: https://siws.web3auth.io/security — nonce requirements
- SIWS Specification: https://siws.web3auth.io/spec — message format
- EIP-4361: Sign-In with Ethereum (basis for SIWS)
- CAIP-122: Chain-agnostic sign-in standard
