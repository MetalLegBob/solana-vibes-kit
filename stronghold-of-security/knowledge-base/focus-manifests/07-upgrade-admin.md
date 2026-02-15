# Focus Manifest: Upgrade & Admin
<!-- Lists KB files for this focus area's agent to load. -->
<!-- Agent reads this manifest to know which pattern files + core reference to include in context. -->

## Core Patterns (always load)

### Upgrade / Governance (EP-079–083)
- patterns/upgrade-governance/EP-079-governance-voting-period-manipulation.md
- patterns/upgrade-governance/EP-080-no-quorum-requirement.md
- patterns/upgrade-governance/EP-081-immediate-proposal-execution.md
- patterns/upgrade-governance/EP-082-no-voting-power-snapshot.md
- patterns/upgrade-governance/EP-083-upgrade-without-notice.md

### Advanced Bypass
- patterns/advanced-bypass/EP-094-bonding-curve-graduation-exploit.md

## Core Reference (always load)
- core/secure-patterns.md
- core/common-false-positives.md

## Solana Reference (always load)
- solana/solana-runtime-quirks.md
- solana/anchor-version-gotchas.md

## Conditional (load if detected)
- solana/token-extensions.md (if Token-2022 detected)
- protocols/governance-attacks.md (if governance detected)
- protocols/amm-dex-attacks.md (if AMM/DEX detected)
