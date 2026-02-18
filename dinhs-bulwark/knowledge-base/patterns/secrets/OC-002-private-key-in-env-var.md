# OC-002: Private Key in Environment Variable Without Encryption

**Category:** Secrets & Credentials
**Severity:** HIGH
**Auditors:** SEC-01
**CWE:** CWE-526 (Exposure of Sensitive Information Through Environmental Variables)
**OWASP:** A02:2021 – Cryptographic Failures

## Description

Storing private keys in environment variables is a step above hardcoding but still exposes key material to significant risk. Environment variables are accessible to any process running under the same user, are often logged by crash reporters, debugging tools, and process managers, and can be read from `/proc/<pid>/environ` on Linux systems.

Palo Alto Networks Unit 42 discovered in 2024 a large-scale extortion campaign that compromised over 110,000 domains by scraping exposed `.env` files from web servers. The campaign harvested 90,000+ credentials including 7,000 cloud service secrets. Trend Micro's research has documented how environment variables in containerized environments are trivially extracted via `docker inspect`, Kubernetes pod specs, or process listing.

The core issue is that environment variables were designed for configuration, not security. Storing raw private key material (base58-encoded Solana keypairs, hex-encoded keys, or JSON arrays) in env vars means the secret exists in plaintext in memory and is exposed through multiple side channels.

## Detection

```
grep -rn "process\.env\.\(PRIVATE_KEY\|SECRET_KEY\|SIGNING_KEY\|WALLET_KEY\|KEYPAIR\)" --include="*.ts" --include="*.js"
grep -rn "fromSecretKey.*process\.env" --include="*.ts" --include="*.js"
grep -rn "PRIVATE_KEY\|SIGNING_KEY\|WALLET_SECRET" --include="*.env" --include="*.env.example"
grep -rn "JSON\.parse.*process\.env.*key" --include="*.ts" --include="*.js"
```

Check for: private key variable names in env files, code that parses env vars into keypairs, deployment configs that pass key material as environment variables.

## Vulnerable Code

```typescript
import { Keypair } from "@solana/web3.js";

// VULNERABLE: Raw private key in environment variable
const keypair = Keypair.fromSecretKey(
  Uint8Array.from(JSON.parse(process.env.SOLANA_PRIVATE_KEY!))
);

// Also vulnerable: base58-encoded key in env var
import bs58 from "bs58";
const signerKey = Keypair.fromSecretKey(
  bs58.decode(process.env.SIGNER_SECRET!)
);
```

## Secure Code

```typescript
import { Keypair } from "@solana/web3.js";
import { readFileSync } from "fs";

// SECURE: Reference a file path, not the key material itself
// Key file stored with chmod 600 permissions, outside of repo
function loadKeypairSecurely(): Keypair {
  const keyPath = process.env.SIGNER_KEYPAIR_PATH;
  if (!keyPath) {
    throw new Error("SIGNER_KEYPAIR_PATH not set");
  }
  const rawKey = JSON.parse(readFileSync(keyPath, "utf-8"));
  const keypair = Keypair.fromSecretKey(Uint8Array.from(rawKey));

  // Zero out the raw key array after loading
  rawKey.fill(0);
  return keypair;
}

// BETTER: Use a secrets manager (AWS Secrets Manager, HashiCorp Vault)
// import { SecretsManager } from "@aws-sdk/client-secrets-manager";
```

## Impact

Attackers who gain read access to the environment (via SSRF to cloud metadata, process listing, container inspection, or `.env` file exposure) obtain the full private key. This enables wallet draining, unauthorized transaction signing, and impersonation. In cloud environments, metadata endpoints (169.254.169.254) often expose environment variables configured in deployment, amplifying risk.

## References

- Palo Alto Unit 42: .env file exploitation campaign affecting 110,000 domains (August 2024)
- Trend Micro: Analyzing the Hidden Danger of Environment Variables for Keeping Secrets (2022)
- CyberArk: "Environment Variables Don't Keep Secrets" — best practices for credential storage
- Arcjet: "Storing secrets in env vars considered harmful" (2024)
- CWE-526: https://cwe.mitre.org/data/definitions/526.html
