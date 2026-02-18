# OC-010: Shared Secrets Across Environments

**Category:** Secrets & Credentials
**Severity:** HIGH
**Auditors:** SEC-02
**CWE:** CWE-668 (Exposure of Resource to Wrong Sphere)
**OWASP:** A05:2021 – Security Misconfiguration

## Description

Using the same secrets (API keys, database passwords, signing keys) across development, staging, and production environments breaks environment isolation. A compromise of any single environment — typically the least-secured one — grants access to all environments including production. Developers with access to staging secrets automatically gain production access.

This pattern is common when teams copy `.env` files between environments, use a single set of cloud credentials across all deployments, or share a single wallet keypair for testing and production. Microsoft's Cloud Security Benchmark and Google's Secret Manager best practices both emphasize environment segmentation as a fundamental requirement.

In the crypto context, sharing a signing key between testnet and mainnet is especially dangerous. Development environments have weaker access controls, more people with access, and more debugging tools that might expose secrets.

## Detection

```
grep -rn "production\|staging\|development" --include="*.env" --include="*.env.*"
diff .env.staging .env.production 2>/dev/null | grep -i "key\|secret\|password"
grep -rn "if.*NODE_ENV.*production" --include="*.ts" --include="*.js" | grep -i "key\|secret"
```

Compare secrets across environment files. Look for: identical values in `.env.staging` and `.env.production`, same database connection strings, same API keys, same wallet addresses between testnet and mainnet configurations.

## Vulnerable Code

```typescript
// VULNERABLE: Same signing key used in all environments
// .env.development, .env.staging, and .env.production all contain:
// SIGNER_KEY=5KJxo9...same_base58_key...

const signerKey = process.env.SIGNER_KEY!;

// The signing key that controls mainnet funds is also used
// in development where any team member can access it
async function signTransaction(tx: Transaction) {
  const keypair = Keypair.fromSecretKey(bs58.decode(signerKey));
  tx.sign(keypair);
  return tx;
}
```

## Secure Code

```typescript
// SECURE: Each environment has isolated credentials
// Environment-specific secrets are managed in separate vault paths
// - vault/dev/signer-key
// - vault/staging/signer-key
// - vault/prod/signer-key (restricted access)

import { getSecret } from "./secrets-manager";

async function signTransaction(tx: Transaction) {
  const env = process.env.NODE_ENV || "development";
  const keyName = `${env}/signer-key`;

  // Each environment has its own key in a secrets manager
  // Production keys require additional approval to access
  const secretKey = await getSecret(keyName);
  const keypair = Keypair.fromSecretKey(bs58.decode(secretKey));
  tx.sign(keypair);
  return tx;
}

// Additionally:
// - Development uses devnet/testnet with throwaway keys
// - Staging uses separate mainnet keys with low-balance wallets
// - Production keys are in HSMs with multi-party access controls
```

## Impact

A developer's compromised workstation, a staging environment breach, or a leaked development `.env` file grants immediate production access. In the crypto context, the same keypair controlling testnet and mainnet funds means that any developer who can debug the staging bot can drain the production wallet. Cross-environment credential sharing defeats the purpose of environment isolation entirely.

## References

- Microsoft: Best practices for protecting secrets — environment segmentation
- Google Cloud: Secret Manager best practices — project-level separation
- CWE-668: Exposure of Resource to Wrong Sphere — https://cwe.mitre.org/data/definitions/668.html
- OWASP A05:2021 Security Misconfiguration: environment isolation requirements
