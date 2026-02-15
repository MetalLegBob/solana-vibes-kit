# Focus Manifest: Oracle
<!-- Lists KB files for this focus area's agent to load. -->
<!-- Agent reads this manifest to know which pattern files + core reference to include in context. -->

## Core Patterns (always load)

### Oracle (EP-021–025)
- patterns/oracle/EP-021-missing-oracle-confidence-check.md
- patterns/oracle/EP-022-stale-oracle-price.md
- patterns/oracle/EP-023-single-oracle-dependency.md
- patterns/oracle/EP-024-amm-spot-price-as-oracle.md
- patterns/oracle/EP-025-no-liquidity-adjustment-on-collateral.md

### Advanced Bypass
- patterns/advanced-bypass/EP-096-exotic-collateral-oracle-manipulation.md

## Core Reference (always load)
- core/secure-patterns.md
- core/common-false-positives.md

## Solana Reference (always load)
- solana/solana-runtime-quirks.md
- solana/anchor-version-gotchas.md

## Conditional (load if detected)
- solana/token-extensions.md (if Token-2022 detected)
- protocols/amm-dex-attacks.md (if AMM/DEX detected)
- protocols/lending-attacks.md (if lending detected)
- protocols/oracle-attacks.md (if oracle system detected)
