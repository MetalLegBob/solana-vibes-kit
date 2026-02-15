# Focus Manifest: Arithmetic
<!-- Lists KB files for this focus area's agent to load. -->
<!-- Agent reads this manifest to know which pattern files + core reference to include in context. -->

## Core Patterns (always load)

### Arithmetic (EP-015–020)
- patterns/arithmetic/EP-015-integer-overflow-underflow.md
- patterns/arithmetic/EP-016-precision-loss-in-division.md
- patterns/arithmetic/EP-017-decimal-normalization-errors.md
- patterns/arithmetic/EP-018-float-arithmetic-in-financial-logic.md
- patterns/arithmetic/EP-019-rounding-direction-favoring-user.md
- patterns/arithmetic/EP-020-unsafe-type-casting.md

### Advanced Bypass
- patterns/advanced-bypass/EP-091-custom-overflow-guard-bypass.md

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
