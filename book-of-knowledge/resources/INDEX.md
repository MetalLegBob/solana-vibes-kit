---
skill: book-of-knowledge
type: resource-index
version: "1.3.0"
---

# Book of Knowledge — Resource Index

## Knowledge Base

- `patterns/` — 101 verification patterns across 19 categories
- See Pattern Categories table below for category-to-directory mapping

## Templates

- `../templates/KANI_HARNESS.md` — Kani proof harness template
- `../templates/LITESVM_TEST.md` — LiteSVM runtime test template
- `../templates/PROPTEST_SUITE.md` — Proptest property suite template
- `../templates/REPORT.md` — Final report template

## State Schema

- `state-schema.md` — STATE.json schema documentation

## Agents

- `../agents/math-scanner.md` — Scans files for math regions (Sonnet)
- `../agents/invariant-proposer.md` — Proposes invariants with explanations (Opus)
- `../agents/harness-generator.md` — Generates verification code (Opus)
- `../agents/report-synthesizer.md` — Compiles final report (Opus)

## Pattern Categories

| # | Category | Directory | Count | Signal Keywords |
|---|----------|-----------|-------|----------------|
| 1 | Token swaps | `patterns/token-swaps/` | 10 | swap, liquidity, k-invariant, constant_product, pool |
| 2 | Fee calculations | `patterns/fee-calculations/` | 8 | fee, tax, basis_point, bps, commission |
| 3 | Staking rewards | `patterns/staking-rewards/` | 8 | reward, stake, unstake, epoch, delegation |
| 4 | Interest / yield | `patterns/interest-yield/` | 8 | interest, yield, accrue, compound, apy |
| 5 | LP share mint/burn | `patterns/lp-share/` | 6 | share, lp_token, mint_to, burn_from, proportional |
| 6 | Price oracle math | `patterns/price-oracle/` | 6 | price, oracle, twap, feed, stale |
| 7 | Bonding curves | `patterns/bonding-curves/` | 5 | bonding, curve, supply, reserve, integral |
| 8 | Liquidation math | `patterns/liquidation/` | 5 | liquidat, collateral, threshold, health_factor, bad_debt |
| 9 | Vesting schedules | `patterns/vesting/` | 5 | vest, cliff, unlock, schedule, linear |
| 10 | Auction mechanics | `patterns/auction/` | 4 | auction, bid, dutch, decay, settlement |
| 11 | Collateral ratios | `patterns/collateral-ratios/` | 4 | ltv, collateral_ratio, margin, borrow |
| 12 | Vote / governance | `patterns/vote-governance/` | 4 | vote, weight, quorum, delegation, governance |
| 13 | Token-2022 fees | `patterns/token-2022-fees/` | 4 | transfer_fee, fee_config, epoch_fee, withheld |
| 14 | Royalty / revenue splits | `patterns/royalty-splits/` | 4 | royalty, revenue, split, distribute, share |
| 15 | Decimal normalization | `patterns/decimal-normalization/` | 5 | decimals, normalize, convert, scale, precision |
| 16 | Timestamp / duration | `patterns/timestamp-duration/` | 4 | timestamp, duration, slot, epoch, clock |
| 17 | Leverage / perpetuals | `patterns/leverage-perpetuals/` | 5 | leverage, funding_rate, margin, pnl, position |
| 18 | Randomness / distribution | `patterns/randomness-distribution/` | 3 | random, vrf, seed, distribution, modulo |
| 19 | Bit packing / compression | `patterns/bit-packing/` | 3 | pack, unpack, mask, shift, bitwise |

**Total: 101 patterns (VP-001 through VP-101)**

## Pattern ID Ranges

| Category | Pattern IDs |
|----------|------------|
| Token swaps | VP-001 — VP-010 |
| Fee calculations | VP-011 — VP-018 |
| Staking rewards | VP-019 — VP-026 |
| Interest / yield | VP-027 — VP-034 |
| LP share | VP-035 — VP-040 |
| Price oracle | VP-041 — VP-046 |
| Bonding curves | VP-047 — VP-051 |
| Liquidation | VP-052 — VP-056 |
| Vesting | VP-057 — VP-061 |
| Auction | VP-062 — VP-065 |
| Collateral ratios | VP-066 — VP-069 |
| Vote / governance | VP-070 — VP-073 |
| Token-2022 fees | VP-074 — VP-077 |
| Royalty / revenue splits | VP-078 — VP-081 |
| Decimal normalization | VP-082 — VP-086 |
| Timestamp / duration | VP-087 — VP-090 |
| Leverage / perpetuals | VP-091 — VP-095 |
| Randomness / distribution | VP-096 — VP-098 |
| Bit packing | VP-099 — VP-101 |
