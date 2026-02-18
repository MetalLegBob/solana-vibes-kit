# OC-001: Hardcoded Private Key in Source

**Category:** Secrets & Credentials
**Severity:** CRITICAL
**Auditors:** SEC-01
**CWE:** CWE-798 (Use of Hard-coded Credentials), CWE-321 (Use of Hard-coded Cryptographic Key)
**OWASP:** A02:2021 – Cryptographic Failures

## Description

Hardcoded private keys occur when a developer embeds a cryptographic private key directly in source code as a string literal, byte array, or Uint8Array. In a Solana off-chain context, this typically means a wallet keypair or signing key stored inline in a bot, relayer, or backend service.

This is the most dangerous secrets pattern because private keys grant full signing authority. In the @solana/web3.js supply chain attack (CVE-2024-54134, December 2024), attackers injected code into versions 1.95.6 and 1.95.7 that exfiltrated private key material from any application using the library. The attack demonstrated that even proper key management can be undermined when dependencies handle key material — but hardcoded keys are trivially extractable without any supply chain compromise.

GitGuardian's 2025 State of Secrets Sprawl report found 23.8 million new credentials leaked on public GitHub in 2024 alone, with 70% of secrets leaked in 2022 still active two years later. Hardcoded private keys are the highest-value subset of these leaks.

## Detection

```
grep -rn "PRIVATE" --include="*.ts" --include="*.js" --include="*.json"
grep -rn "Keypair\.fromSecretKey" --include="*.ts" --include="*.js"
grep -rn "Uint8Array\s*\(\s*\[" --include="*.ts" --include="*.js"
grep -rn "secretKey\s*[:=]" --include="*.ts" --include="*.js"
grep -rn "BEGIN.*PRIVATE KEY" --include="*.ts" --include="*.js" --include="*.pem"
grep -rn "bs58\.decode\s*(" --include="*.ts" --include="*.js"
```

Look for: 64-byte numeric arrays (Solana keypairs), base58-encoded strings of 64+ characters, PEM-formatted keys, hex strings of 64+ characters.

## Vulnerable Code

```typescript
import { Keypair, Connection, Transaction } from "@solana/web3.js";

// VULNERABLE: Private key hardcoded as byte array
const SIGNER_KEYPAIR = Keypair.fromSecretKey(
  Uint8Array.from([
    174, 47, 154, 16, 202, 193, 206, 113, 199, 190, 53, 133, 169, 175,
    31, 56, 222, 53, 138, 189, 224, 216, 117, 173, 10, 149, 53, 45, 73,
    251, 237, 246, 15, 185, 186, 82, 177, 240, 148, 69, 241, 227, 167,
    80, 141, 89, 240, 121, 121, 35, 172, 247, 68, 251, 226, 218, 48,
    63, 176, 109, 168, 89, 238, 135,
  ])
);

async function submitTransaction(tx: Transaction) {
  const connection = new Connection("https://api.mainnet-beta.solana.com");
  tx.sign(SIGNER_KEYPAIR);
  return connection.sendTransaction(tx, [SIGNER_KEYPAIR]);
}
```

## Secure Code

```typescript
import { Keypair, Connection, Transaction } from "@solana/web3.js";
import { readFileSync } from "fs";

// SECURE: Load keypair from file path specified by environment variable
// The keypair file should have restrictive permissions (chmod 600)
function loadKeypair(): Keypair {
  const keyPath = process.env.SIGNER_KEYPAIR_PATH;
  if (!keyPath) {
    throw new Error("SIGNER_KEYPAIR_PATH environment variable not set");
  }
  const keyData = JSON.parse(readFileSync(keyPath, "utf-8"));
  return Keypair.fromSecretKey(Uint8Array.from(keyData));
}

async function submitTransaction(tx: Transaction) {
  const signer = loadKeypair();
  const connection = new Connection(process.env.RPC_URL!);
  tx.sign(signer);
  return connection.sendTransaction(tx, [signer]);
}
```

## Impact

An attacker who obtains a hardcoded private key gains full signing authority over the associated wallet. In a Solana context, this means they can drain all SOL and SPL tokens, sign arbitrary transactions, and impersonate the compromised account. If the key belongs to a program authority, the attacker can upgrade or modify on-chain programs. Source code in git history persists even after the key is removed from the current codebase.

## References

- CVE-2024-54134: @solana/web3.js supply chain attack exfiltrating private keys (December 2024)
- CWE-798: Use of Hard-coded Credentials — https://cwe.mitre.org/data/definitions/798.html
- GitGuardian 2025 State of Secrets Sprawl: 23.8M leaked credentials on GitHub in 2024
- OWASP A02:2021 – Cryptographic Failures
- CVE-2023-39250: Dell Compellent hardcoded encryption key vulnerability
