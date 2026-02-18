# OC-236: Typosquatting Package

**Category:** Supply Chain & Dependencies
**Severity:** CRITICAL
**Auditors:** DEP-01
**CWE:** CWE-506 (Embedded Malicious Code)
**OWASP:** A08:2021 -- Software and Data Integrity Failures

## Description

Typosquatting is an attack where a malicious actor publishes a package with a name that closely resembles a popular legitimate package, hoping developers will install it by mistake. Common techniques include character transposition (e.g., `lodsah` instead of `lodash`), hyphen/underscore confusion (e.g., `cross-env` vs `crossenv`), scope impersonation (e.g., `@solana-web3/js` mimicking `@solana/web3.js`), and character substitution using visually similar Unicode characters.

The npm registry is particularly vulnerable to typosquatting due to its flat namespace, lack of mandatory package verification, and the sheer volume of packages (over 2 million). In October 2024, Veracode identified a campaign of 287 typosquat packages targeting developers using Puppeteer, Bignum.js, and cryptocurrency libraries. The packages used names like `pupeteer` and `puppetere` and executed malicious code on installation. In 2025, the scale escalated: JFrog reported discovering additional compromised packages beyond the initial 18 in the September 2025 npm attack, with some using typosquatting variants of compromised package names to extend the attack surface.

For Solana and cryptocurrency projects, typosquatting is exceptionally dangerous. Attackers specifically target crypto library names because successful installation in a wallet or DeFi application grants direct access to funds. Packages with names similar to `@solana/web3.js`, `@solana/spl-token`, `anchor-lang`, and `@metaplex-foundation` are high-value targets.

## Detection

```
# Check for known typosquat patterns in package.json
# Manual review of dependency names against canonical sources
npx -y @sandworm/audit

# Socket.dev provides typosquat detection
npx socket check

# Compare installed packages against expected list
npm ls --all --json | jq -r '.dependencies | keys[]' | sort > installed.txt
diff expected-packages.txt installed.txt
```

Look for: package names with subtle misspellings, packages with very low download counts compared to the legitimate version, recently published packages that mimic popular library names, unexpected scoped packages that resemble known organizations.

## Vulnerable Code

```json
{
  "dependencies": {
    "@solana/web3js": "^1.95.0",
    "lodsah": "^4.17.21",
    "axois": "^1.7.0",
    "puppeter": "^21.0.0",
    "cross-env": "^7.0.3",
    "electorn": "^28.0.0"
  }
}
```

```bash
# VULNERABLE: Typo in install command, no verification
npm install @soalana/web3.js
npm install expresss
```

## Secure Code

```json
{
  "dependencies": {
    "@solana/web3.js": "^1.95.8",
    "lodash": "^4.17.21",
    "axios": "^1.7.4",
    "puppeteer": "^21.11.0",
    "cross-env": "^7.0.3",
    "electron": "^28.1.0"
  }
}
```

```bash
# SECURE: Verify package before installing
npm info @solana/web3.js  # Check package metadata first
npm install @solana/web3.js --dry-run  # Preview what would be installed
npm install @solana/web3.js  # Install after verification

# Use an allowlist in CI
npx lockfile-lint --type npm --path package-lock.json --allowed-hosts registry.npmjs.org
```

## Impact

A typosquatted package executes attacker-controlled code in the developer's environment, CI/CD pipeline, or production server. Modern typosquat payloads harvest environment variables (including npm tokens, AWS keys, and private keys), install crypto miners, establish reverse shells, or inject backdoors into the application. In Solana contexts, a typosquatted version of @solana/web3.js can intercept all transaction signing operations to drain wallets. The Veracode-reported October 2024 campaign targeting cryptocurrency library users demonstrates this is an active, targeted threat vector.

## References

- Veracode: 287 typosquat packages targeting Puppeteer and crypto libraries (October 2024)
- `crossenv` typosquat of `cross-env`: credential harvesting (2017)
- JFrog: Additional compromised packages via typosquatting in September 2025 npm attack
- Socket.dev: Continuous typosquat detection in npm registry
- CWE-506: https://cwe.mitre.org/data/definitions/506.html
- npm Security: 704,000+ malicious packages identified since 2019 (Sonatype 2024)
