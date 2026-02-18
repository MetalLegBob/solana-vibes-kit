# OC-003: Mnemonic/Seed Phrase in Config File

**Category:** Secrets & Credentials
**Severity:** CRITICAL
**Auditors:** SEC-01
**CWE:** CWE-312 (Cleartext Storage of Sensitive Information)
**OWASP:** A02:2021 – Cryptographic Failures

## Description

A mnemonic seed phrase (typically 12 or 24 BIP-39 words) is the master secret from which all wallet keys are derived. Storing a mnemonic in a configuration file — whether JSON, YAML, TOML, or `.env` — creates a single point of compromise that exposes every derived key and address. Unlike a single private key, a seed phrase typically controls an entire hierarchy of wallets.

This pattern frequently appears in development configurations that get carried into production, or in deployment files for bots and relayers. Researchers scanning public Docker Hub images found over 10,000 images leaking credentials, with many containing seed phrases and wallet configurations. The EMERALDWHALE operation (October 2024) specifically targeted exposed Git configurations and extracted secrets including mnemonics from over 15,000 repositories.

The danger is amplified by the permanence of seed phrases: while API keys can be rotated, a compromised seed phrase requires moving all assets across all derived wallets, a complex operation that many teams fail to complete before funds are drained.

## Detection

```
grep -rn "mnemonic\|seed.phrase\|seed_phrase\|seedPhrase\|MNEMONIC" --include="*.ts" --include="*.js" --include="*.json" --include="*.yaml" --include="*.yml" --include="*.toml" --include="*.env"
grep -rn "\"[a-z]\+\( [a-z]\+\)\{11,23\}\"" --include="*.ts" --include="*.js" --include="*.json" --include="*.env"
grep -rn "fromMnemonic\|mnemonicToSeed\|derivePath" --include="*.ts" --include="*.js"
```

Look for: 12- or 24-word strings in config files, variables named `mnemonic` or `seed`, BIP-39/BIP-44 derivation path patterns like `m/44'/501'/0'/0'`.

## Vulnerable Code

```typescript
import { Keypair } from "@solana/web3.js";
import * as bip39 from "bip39";
import { derivePath } from "ed25519-hd-key";

// VULNERABLE: Mnemonic stored in config file loaded at startup
import config from "./config.json";
// config.json: { "mnemonic": "abandon ability able about above absent ..." }

const seed = bip39.mnemonicToSeedSync(config.mnemonic);
const derivedSeed = derivePath("m/44'/501'/0'/0'", seed.toString("hex")).key;
const keypair = Keypair.fromSeed(derivedSeed);
```

## Secure Code

```typescript
import { Keypair } from "@solana/web3.js";
import * as bip39 from "bip39";
import { derivePath } from "ed25519-hd-key";
import { readFileSync } from "fs";

// SECURE: Load mnemonic from a secrets manager or encrypted file
// Never store in a config file that could be committed to version control
async function loadKeypairFromSecretManager(): Promise<Keypair> {
  // Option 1: File reference with strict permissions
  const mnemonicPath = process.env.MNEMONIC_FILE_PATH;
  if (!mnemonicPath) throw new Error("MNEMONIC_FILE_PATH not set");

  const mnemonic = readFileSync(mnemonicPath, "utf-8").trim();
  const seed = bip39.mnemonicToSeedSync(mnemonic);
  const derivedSeed = derivePath("m/44'/501'/0'/0'", seed.toString("hex")).key;
  const keypair = Keypair.fromSeed(derivedSeed);

  // Zero out intermediate values
  seed.fill(0);
  return keypair;
}

// Option 2: Use hardware wallet or KMS for signing (preferred for production)
```

## Impact

A compromised mnemonic exposes the entire wallet hierarchy. An attacker can derive all child keys and drain assets from every associated address. In a Solana context, this means all SOL, SPL tokens, and any program authorities derived from the seed are compromised. The attacker also gains the ability to derive future keys the victim might use, enabling persistent access even after partial remediation.

## References

- EMERALDWHALE: 15,000 cloud credentials stolen via exposed Git configs (Sysdig, October 2024)
- Flare Research: Over 10,000 Docker Hub images leaking credentials (2024)
- CWE-312: Cleartext Storage of Sensitive Information — https://cwe.mitre.org/data/definitions/312.html
- BIP-39 specification: Mnemonic code for generating deterministic keys
