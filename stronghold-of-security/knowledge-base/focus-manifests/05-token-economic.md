# Focus Manifest: Token & Economic
<!-- Lists KB files for this focus area's agent to load. -->
<!-- Agent reads this manifest to know which pattern files + core reference to include in context. -->

## Core Patterns (always load)

### Token / SPL (EP-051–057)
- patterns/token-spl/EP-051-token-account-owner-mismatch.md
- patterns/token-spl/EP-052-native-sol-wrapping-confusion.md
- patterns/token-spl/EP-053-orphaned-token-account-rent-lock.md
- patterns/token-spl/EP-054-token-2022-transfer-fee-not-accounted.md
- patterns/token-spl/EP-055-token-2022-transfer-hook-reentrancy.md
- patterns/token-spl/EP-056-token-2022-confidential-transfer-bypass.md
- patterns/token-spl/EP-057-token-2022-non-transferable-bypass.md

### Economic / DeFi (EP-058–067)
- patterns/economic-defi/EP-058-flash-loan-price-manipulation.md
- patterns/economic-defi/EP-059-vault-donation-inflation-attack.md
- patterns/economic-defi/EP-060-missing-slippage-protection.md
- patterns/economic-defi/EP-061-bonding-curve-instant-arbitrage.md
- patterns/economic-defi/EP-062-reward-calculation-gaming.md
- patterns/economic-defi/EP-063-interest-rate-manipulation.md
- patterns/economic-defi/EP-064-jit-liquidity-extraction.md
- patterns/economic-defi/EP-065-liquidation-mev.md
- patterns/economic-defi/EP-066-governance-flash-loan-attack.md
- patterns/economic-defi/EP-067-multi-hop-price-impact-amplification.md

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
- protocols/staking-attacks.md (if staking detected)
- protocols/governance-attacks.md (if governance detected)
