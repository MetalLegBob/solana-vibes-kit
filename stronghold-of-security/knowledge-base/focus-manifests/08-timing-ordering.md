# Focus Manifest: Timing & Ordering
<!-- Lists KB files for this focus area's agent to load. -->
<!-- Agent reads this manifest to know which pattern files + core reference to include in context. -->

## Core Patterns (always load)

### Race Conditions / MEV (EP-089–090)
- patterns/race-conditions-mev/EP-089-timestamp-manipulation.md
- patterns/race-conditions-mev/EP-090-simultaneous-operation-race.md

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
- protocols/governance-attacks.md (if governance detected)
