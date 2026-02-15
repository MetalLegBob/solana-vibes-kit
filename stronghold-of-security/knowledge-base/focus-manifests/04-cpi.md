# Focus Manifest: CPI
<!-- Lists KB files for this focus area's agent to load. -->
<!-- Agent reads this manifest to know which pattern files + core reference to include in context. -->

## Core Patterns (always load)

### CPI (EP-042–050)
- patterns/cpi/EP-042-arbitrary-cpi-program-substitution.md
- patterns/cpi/EP-043-cpi-signer-privilege-escalation.md
- patterns/cpi/EP-044-cpi-privilege-propagation.md
- patterns/cpi/EP-045-cpi-return-data-spoofing.md
- patterns/cpi/EP-046-missing-cpi-error-propagation.md
- patterns/cpi/EP-047-state-update-before-cpi.md
- patterns/cpi/EP-048-missing-cpi-guard.md
- patterns/cpi/EP-049-unverified-token-program.md
- patterns/cpi/EP-050-cpi-account-injection.md

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
- protocols/bridge-attacks.md (if bridge detected)
