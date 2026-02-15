# Focus Manifest: State Machine
<!-- Lists KB files for this focus area's agent to load. -->
<!-- Agent reads this manifest to know which pattern files + core reference to include in context. -->

## Core Patterns (always load)

### Logic / State Machine (EP-033–041)
- patterns/state-machine/EP-033-cei-violation.md
- patterns/state-machine/EP-034-missing-state-transition-check.md
- patterns/state-machine/EP-035-closed-account-data-reuse.md
- patterns/state-machine/EP-036-account-revival-resurrection.md
- patterns/state-machine/EP-037-reinitialization-attack.md
- patterns/state-machine/EP-038-cross-instruction-state-attack.md
- patterns/state-machine/EP-039-instruction-introspection-abuse.md
- patterns/state-machine/EP-040-closing-account-with-obligations.md
- patterns/state-machine/EP-041-order-book-stale-cache.md

### Resource / DoS (EP-084–088)
- patterns/resource-dos/EP-084-compute-unit-exhaustion.md
- patterns/resource-dos/EP-085-unbounded-iteration.md
- patterns/resource-dos/EP-086-stack-overflow.md
- patterns/resource-dos/EP-087-heap-exhaustion.md
- patterns/resource-dos/EP-088-borsh-deserialization-bomb.md

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
