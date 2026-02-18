# OC-019: Shared Signing Key Across Services

**Category:** Secrets & Credentials
**Severity:** HIGH
**Auditors:** SEC-01
**CWE:** CWE-522 (Insufficiently Protected Credentials)
**OWASP:** A04:2021 – Insecure Design

## Description

Using the same private signing key across multiple services, microservices, or applications violates the principle of key isolation. When a single key is shared, a compromise of any one service compromises signing authority for all services using that key. This creates a "blast radius" problem where the weakest service in the architecture determines the security of the entire system.

This pattern is common in microservice architectures where a single Solana keypair is shared across a trading bot, a payment processor, and an admin API. It also appears when JWT signing keys are reused across services, or when a single TLS client certificate authenticates multiple independent systems.

The Bybit hack (February 2025) demonstrated how compromising a single signing pathway — in this case, through a malicious Safe Wallet upgrade — enabled a $1.5 billion theft. While that attack targeted the signing infrastructure rather than a shared key, it illustrates how signing authority is the highest-value target. Sharing that authority across services multiplies the attack surface.

## Detection

```
grep -rn "SIGNER_KEY\|SIGNING_KEY\|AUTHORITY_KEY\|ADMIN_KEY" --include="*.env" --include="*.yaml" --include="*.json"
grep -rn "Keypair\.fromSecretKey\|Keypair\.fromSeed" --include="*.ts" --include="*.js"
```

Cross-reference key variable names across services. Look for: the same environment variable name in multiple service configurations, the same key file path referenced by different services, a single keypair used for both admin operations and routine signing.

## Vulnerable Code

```typescript
// Service A: Trading Bot
// .env: SIGNER_KEY=<base58 encoded key>
const signer = Keypair.fromSecretKey(bs58.decode(process.env.SIGNER_KEY!));

// Service B: Payment Processor (SAME key)
// .env: SIGNER_KEY=<same base58 encoded key>
const signer = Keypair.fromSecretKey(bs58.decode(process.env.SIGNER_KEY!));

// Service C: Admin API (SAME key)
// .env: SIGNER_KEY=<same base58 encoded key>
const signer = Keypair.fromSecretKey(bs58.decode(process.env.SIGNER_KEY!));

// Problem: compromising the admin API (perhaps via SSRF or injection)
// gives the attacker the same signing authority used by the trading bot
```

## Secure Code

```typescript
// SECURE: Each service has its own dedicated keypair
// Service A: Trading Bot — only has trade-scoped authority
// .env: TRADING_BOT_KEYPAIR_PATH=/keys/trading-bot.json
const tradingKeypair = loadKeypair(process.env.TRADING_BOT_KEYPAIR_PATH!);

// Service B: Payment Processor — separate key with transfer-only authority
// .env: PAYMENT_KEYPAIR_PATH=/keys/payment-processor.json
const paymentKeypair = loadKeypair(process.env.PAYMENT_KEYPAIR_PATH!);

// Service C: Admin API — separate key, stored in HSM, requires MFA
// .env: ADMIN_KEY_HSM_SLOT=slot-3
const adminKeypair = await loadFromHSM(process.env.ADMIN_KEY_HSM_SLOT!);

// On-chain: Use Solana's authority delegation
// Each service's key is granted minimum necessary on-chain permissions
// Admin key can revoke any service key independently
// Compromising one service does not affect others
```

## Impact

If a shared signing key is compromised through any service that uses it, the attacker gains signing authority over all operations across all services. This means: a vulnerability in a low-priority monitoring service can lead to production fund drainage; an SSRF in an admin panel can expose the same key used by automated trading bots; a developer debugging one service gains implicit access to all services sharing the key.

## References

- Bybit hack: $1.5B loss via compromised signing infrastructure (February 2025)
- CWE-522: Insufficiently Protected Credentials — https://cwe.mitre.org/data/definitions/522.html
- NIST SP 800-57: Key Management — key separation principle
- OWASP A04:2021: Insecure Design — principle of least privilege for credentials
