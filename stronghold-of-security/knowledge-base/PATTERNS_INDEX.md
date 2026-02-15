# Exploit Patterns Index
<!-- Master catalog — agents read this to identify relevant patterns, then load individual files. -->
<!-- Total: 128 patterns across 21 categories -->

## Account Validation
| EP | Name | Severity | File |
|----|------|----------|------|
| EP-001 | Missing Signer Check | CRITICAL | patterns/account-validation/EP-001-missing-signer-check.md |
| EP-002 | Missing Owner Check | CRITICAL | patterns/account-validation/EP-002-missing-owner-check.md |
| EP-003 | Account Type Cosplay / Discriminator Bypass | CRITICAL | patterns/account-validation/EP-003-account-type-cosplay-discriminator-bypass.md |
| EP-004 | PDA Seed Collision | HIGH | patterns/account-validation/EP-004-pda-seed-collision.md |
| EP-005 | Bump Seed Canonicalization | HIGH | patterns/account-validation/EP-005-bump-seed-canonicalization.md |
| EP-006 | Unchecked Sysvar Account | HIGH | patterns/account-validation/EP-006-unchecked-sysvar-account.md |
| EP-007 | Account Relationship Not Verified | CRITICAL | patterns/account-validation/EP-007-account-relationship-not-verified.md |
| EP-008 | Cross-Account Data Mismatch | HIGH | patterns/account-validation/EP-008-cross-account-data-mismatch.md |
| EP-009 | Duplicate Mutable Accounts | CRITICAL | patterns/account-validation/EP-009-duplicate-mutable-accounts.md |
| EP-010 | Unchecked Token Mint | CRITICAL | patterns/account-validation/EP-010-unchecked-token-mint.md |
| EP-011 | Rent Siphoning | MEDIUM | patterns/account-validation/EP-011-rent-siphoning.md |
| EP-012 | Account Realloc Without Safeguards | MEDIUM | patterns/account-validation/EP-012-account-realloc-without-safeguards.md |
| EP-013 | Mint Authority Not Verified | HIGH | patterns/account-validation/EP-013-mint-authority-not-verified.md |
| EP-014 | ALT Account Substitution | HIGH | patterns/account-validation/EP-014-alt-account-substitution.md |

## Arithmetic
| EP | Name | Severity | File |
|----|------|----------|------|
| EP-015 | Integer Overflow/Underflow | CRITICAL | patterns/arithmetic/EP-015-integer-overflow-underflow.md |
| EP-016 | Precision Loss in Division | MEDIUM | patterns/arithmetic/EP-016-precision-loss-in-division.md |
| EP-017 | Decimal Normalization Errors | CRITICAL | patterns/arithmetic/EP-017-decimal-normalization-errors.md |
| EP-018 | Float Arithmetic in Financial Logic | HIGH | patterns/arithmetic/EP-018-float-arithmetic-in-financial-logic.md |
| EP-019 | Rounding Direction Favoring User | HIGH | patterns/arithmetic/EP-019-rounding-direction-favoring-user.md |
| EP-020 | Unsafe Type Casting | HIGH | patterns/arithmetic/EP-020-unsafe-type-casting.md |

## Oracle
| EP | Name | Severity | File |
|----|------|----------|------|
| EP-021 | Missing Oracle Confidence Check | CRITICAL | patterns/oracle/EP-021-missing-oracle-confidence-check.md |
| EP-022 | Stale Oracle Price | HIGH | patterns/oracle/EP-022-stale-oracle-price.md |
| EP-023 | Single Oracle Dependency | HIGH | patterns/oracle/EP-023-single-oracle-dependency.md |
| EP-024 | AMM Spot Price as Oracle | CRITICAL | patterns/oracle/EP-024-amm-spot-price-as-oracle.md |
| EP-025 | No Liquidity Adjustment on Collateral | HIGH | patterns/oracle/EP-025-no-liquidity-adjustment-on-collateral.md |

## Access Control
| EP | Name | Severity | File |
|----|------|----------|------|
| EP-026 | Missing Authority Constraint | CRITICAL | patterns/access-control/EP-026-missing-authority-constraint.md |
| EP-027 | Confused Deputy / Authority Mismatch | CRITICAL | patterns/access-control/EP-027-confused-deputy-authority-mismatch.md |
| EP-028 | Delegate Authority Misuse | HIGH | patterns/access-control/EP-028-delegate-authority-misuse.md |
| EP-029 | Missing Freeze Check | MEDIUM | patterns/access-control/EP-029-missing-freeze-check.md |
| EP-030 | Token Authority Confusion | HIGH | patterns/access-control/EP-030-token-authority-confusion.md |
| EP-031 | Multi-Sig Duplicate Signer Bypass | CRITICAL | patterns/access-control/EP-031-multi-sig-duplicate-signer-bypass.md |
| EP-032 | PDA Authority Without Derivation Check | CRITICAL | patterns/access-control/EP-032-pda-authority-without-derivation-check.md |

## Logic / State Machine
| EP | Name | Severity | File |
|----|------|----------|------|
| EP-033 | CEI Violation | CRITICAL | patterns/state-machine/EP-033-cei-violation.md |
| EP-034 | Missing State Transition Check | MEDIUM | patterns/state-machine/EP-034-missing-state-transition-check.md |
| EP-035 | Closed Account Data Reuse | HIGH | patterns/state-machine/EP-035-closed-account-data-reuse.md |
| EP-036 | Account Revival / Resurrection | HIGH | patterns/state-machine/EP-036-account-revival-resurrection.md |
| EP-037 | Reinitialization Attack | HIGH | patterns/state-machine/EP-037-reinitialization-attack.md |
| EP-038 | Cross-Instruction State Attack | CRITICAL | patterns/state-machine/EP-038-cross-instruction-state-attack.md |
| EP-039 | Instruction Introspection Abuse | HIGH | patterns/state-machine/EP-039-instruction-introspection-abuse.md |
| EP-040 | Closing Account With Obligations | HIGH | patterns/state-machine/EP-040-closing-account-with-obligations.md |
| EP-041 | Order Book Stale Cache | MEDIUM | patterns/state-machine/EP-041-order-book-stale-cache.md |

## CPI
| EP | Name | Severity | File |
|----|------|----------|------|
| EP-042 | Arbitrary CPI / Program Substitution | CRITICAL | patterns/cpi/EP-042-arbitrary-cpi-program-substitution.md |
| EP-043 | CPI Signer Privilege Escalation | CRITICAL | patterns/cpi/EP-043-cpi-signer-privilege-escalation.md |
| EP-044 | CPI Privilege Propagation | HIGH | patterns/cpi/EP-044-cpi-privilege-propagation.md |
| EP-045 | CPI Return Data Spoofing | HIGH | patterns/cpi/EP-045-cpi-return-data-spoofing.md |
| EP-046 | Missing CPI Error Propagation | HIGH | patterns/cpi/EP-046-missing-cpi-error-propagation.md |
| EP-047 | State Update Before CPI | HIGH | patterns/cpi/EP-047-state-update-before-cpi.md |
| EP-048 | Missing CPI Guard | HIGH | patterns/cpi/EP-048-missing-cpi-guard.md |
| EP-049 | Unverified Token Program | CRITICAL | patterns/cpi/EP-049-unverified-token-program.md |
| EP-050 | CPI Account Injection | HIGH | patterns/cpi/EP-050-cpi-account-injection.md |

## Token / SPL
| EP | Name | Severity | File |
|----|------|----------|------|
| EP-051 | Token Account Owner Mismatch | HIGH | patterns/token-spl/EP-051-token-account-owner-mismatch.md |
| EP-052 | Native SOL Wrapping Confusion | MEDIUM | patterns/token-spl/EP-052-native-sol-wrapping-confusion.md |
| EP-053 | Orphaned Token Account Rent Lock | LOW | patterns/token-spl/EP-053-orphaned-token-account-rent-lock.md |
| EP-054 | Token-2022 Transfer Fee Not Accounted | HIGH | patterns/token-spl/EP-054-token-2022-transfer-fee-not-accounted.md |
| EP-055 | Token-2022 Transfer Hook Reentrancy | HIGH | patterns/token-spl/EP-055-token-2022-transfer-hook-reentrancy.md |
| EP-056 | Token-2022 Confidential Transfer Bypass | MEDIUM | patterns/token-spl/EP-056-token-2022-confidential-transfer-bypass.md |
| EP-057 | Token-2022 Non-Transferable Bypass | MEDIUM | patterns/token-spl/EP-057-token-2022-non-transferable-bypass.md |

## Economic / DeFi
| EP | Name | Severity | File |
|----|------|----------|------|
| EP-058 | Flash Loan Price Manipulation | CRITICAL | patterns/economic-defi/EP-058-flash-loan-price-manipulation.md |
| EP-059 | Vault Donation / Inflation Attack | CRITICAL | patterns/economic-defi/EP-059-vault-donation-inflation-attack.md |
| EP-060 | Missing Slippage Protection | HIGH | patterns/economic-defi/EP-060-missing-slippage-protection.md |
| EP-061 | Bonding Curve Instant Arbitrage | CRITICAL | patterns/economic-defi/EP-061-bonding-curve-instant-arbitrage.md |
| EP-062 | Reward Calculation Gaming | HIGH | patterns/economic-defi/EP-062-reward-calculation-gaming.md |
| EP-063 | Interest Rate Manipulation | HIGH | patterns/economic-defi/EP-063-interest-rate-manipulation.md |
| EP-064 | JIT Liquidity Extraction | MEDIUM | patterns/economic-defi/EP-064-jit-liquidity-extraction.md |
| EP-065 | Liquidation MEV | MEDIUM | patterns/economic-defi/EP-065-liquidation-mev.md |
| EP-066 | Governance Flash Loan Attack | CRITICAL | patterns/economic-defi/EP-066-governance-flash-loan-attack.md |
| EP-067 | Multi-Hop Price Impact Amplification | MEDIUM | patterns/economic-defi/EP-067-multi-hop-price-impact-amplification.md |

## Key Management
| EP | Name | Severity | File |
|----|------|----------|------|
| EP-068 | Single Admin Key | CRITICAL | patterns/key-management/EP-068-single-admin-key.md |
| EP-069 | No Admin Key Rotation | HIGH | patterns/key-management/EP-069-no-admin-key-rotation.md |
| EP-070 | Sensitive Data in Logs | HIGH | patterns/key-management/EP-070-sensitive-data-in-logs.md |
| EP-071 | Unprotected Upgrade Authority | CRITICAL | patterns/key-management/EP-071-unprotected-upgrade-authority.md |
| EP-072 | No Emergency Pause | MEDIUM | patterns/key-management/EP-072-no-emergency-pause.md |
| EP-073 | Excessive Admin Privileges | HIGH | patterns/key-management/EP-073-excessive-admin-privileges.md |
| EP-074 | No Timelock on Parameter Changes | HIGH | patterns/key-management/EP-074-no-timelock-on-parameter-changes.md |

## Initialization
| EP | Name | Severity | File |
|----|------|----------|------|
| EP-075 | Double Initialization | HIGH | patterns/initialization/EP-075-double-initialization.md |
| EP-076 | Front-Runnable Init / Pre-Funding DoS | HIGH | patterns/initialization/EP-076-front-runnable-init-pre-funding-dos.md |
| EP-077 | Incomplete Field Init | MEDIUM | patterns/initialization/EP-077-incomplete-field-init.md |
| EP-078 | Pool Init Without Launch Delay | LOW | patterns/initialization/EP-078-pool-init-without-launch-delay.md |

## Upgrade / Governance
| EP | Name | Severity | File |
|----|------|----------|------|
| EP-079 | Governance Voting Period Manipulation | HIGH | patterns/upgrade-governance/EP-079-governance-voting-period-manipulation.md |
| EP-080 | No Quorum Requirement | MEDIUM | patterns/upgrade-governance/EP-080-no-quorum-requirement.md |
| EP-081 | Immediate Proposal Execution | HIGH | patterns/upgrade-governance/EP-081-immediate-proposal-execution.md |
| EP-082 | No Voting Power Snapshot | HIGH | patterns/upgrade-governance/EP-082-no-voting-power-snapshot.md |
| EP-083 | Upgrade Without Notice | HIGH | patterns/upgrade-governance/EP-083-upgrade-without-notice.md |

## Resource / DoS
| EP | Name | Severity | File |
|----|------|----------|------|
| EP-084 | Compute Unit Exhaustion | MEDIUM | patterns/resource-dos/EP-084-compute-unit-exhaustion.md |
| EP-085 | Unbounded Iteration | MEDIUM | patterns/resource-dos/EP-085-unbounded-iteration.md |
| EP-086 | Stack Overflow | MEDIUM | patterns/resource-dos/EP-086-stack-overflow.md |
| EP-087 | Heap Exhaustion | MEDIUM | patterns/resource-dos/EP-087-heap-exhaustion.md |
| EP-088 | Borsh Deserialization Bomb | HIGH | patterns/resource-dos/EP-088-borsh-deserialization-bomb.md |

## Race Conditions / MEV
| EP | Name | Severity | File |
|----|------|----------|------|
| EP-089 | Timestamp Manipulation | MEDIUM | patterns/race-conditions-mev/EP-089-timestamp-manipulation.md |
| EP-090 | Simultaneous Operation Race | HIGH | patterns/race-conditions-mev/EP-090-simultaneous-operation-race.md |

## Advanced Bypass
| EP | Name | Severity | File |
|----|------|----------|------|
| EP-091 | Custom Overflow Guard Bypass | CRITICAL | patterns/advanced-bypass/EP-091-custom-overflow-guard-bypass.md |
| EP-092 | Deprecated Sysvar Account Injection | CRITICAL | patterns/advanced-bypass/EP-092-deprecated-sysvar-account-injection.md |
| EP-093 | Off-Chain TOCTOU / Race Condition | HIGH | patterns/advanced-bypass/EP-093-off-chain-toctou-race-condition.md |
| EP-094 | Bonding Curve Graduation Exploit | HIGH | patterns/advanced-bypass/EP-094-bonding-curve-graduation-exploit.md |
| EP-095 | Supply Chain / Dependency Poisoning | CRITICAL | patterns/advanced-bypass/EP-095-supply-chain-dependency-poisoning.md |
| EP-096 | Exotic Collateral Oracle Manipulation | HIGH | patterns/advanced-bypass/EP-096-exotic-collateral-oracle-manipulation.md |
| EP-097 | Plaintext Key Storage / Transmission | CRITICAL | patterns/advanced-bypass/EP-097-plaintext-key-storage-transmission.md |

## Audit & Incident Patterns
| EP | Name | Severity | File |
|----|------|----------|------|
| EP-098 | CPI Destination Account Injection in Multi-Step Operations | CRITICAL | patterns/audit-incident/EP-098-cpi-destination-account-injection-in-multi-step-operations.md |
| EP-099 | Business Logic Inversion / Algorithm Direction Error | HIGH | patterns/audit-incident/EP-099-business-logic-inversion-algorithm-direction-error.md |
| EP-100 | ZK Proof Forgery / Verification Bypass | CRITICAL | patterns/audit-incident/EP-100-zk-proof-forgery-verification-bypass.md |
| EP-101 | Liquidity Extraction by Privileged Account | CRITICAL | patterns/audit-incident/EP-101-liquidity-extraction-by-privileged-account.md |
| EP-102 | Registry / List Composition Attack (Omission/Duplication) | CRITICAL | patterns/audit-incident/EP-102-registry-list-composition-attack-omission-duplication.md |
| EP-103 | ATA Assumption Failure in Migration/Claim | MEDIUM | patterns/audit-incident/EP-103-ata-assumption-failure-in-migration-claim.md |
| EP-104 | Cross-Chain Message Non-Recoverability | HIGH | patterns/audit-incident/EP-104-cross-chain-message-non-recoverability.md |
| EP-105 | Fee Exclusion from Pool Accounting Invariants | HIGH | patterns/audit-incident/EP-105-fee-exclusion-from-pool-accounting-invariants.md |

## Bug Bounty & Disclosure Patterns
| EP | Name | Severity | File |
|----|------|----------|------|
| EP-106 | Lamport Transfer Write-Demotion Trap | HIGH | patterns/bug-bounty/EP-106-lamport-transfer-write-demotion-trap.md |
| EP-107 | AccountInfo::realloc Out-of-Bounds Memory Corruption | CRITICAL | patterns/bug-bounty/EP-107-accountinforealloc-out-of-bounds-memory-corruption.md |
| EP-108 | Remaining Account Spoofing in Extension Patterns | CRITICAL | patterns/bug-bounty/EP-108-remaining-account-spoofing-in-extension-patterns.md |
| EP-109 | LP Deposit Rounding Drain | CRITICAL | patterns/bug-bounty/EP-109-lp-deposit-rounding-drain.md |
| EP-110 | Inter-Transaction Account Hijack (Rent Thief) | MEDIUM | patterns/bug-bounty/EP-110-inter-transaction-account-hijack-rent-thief.md |

## Niche Exploit Patterns
| EP | Name | Severity | File |
|----|------|----------|------|
| EP-111 | TOCTOU Simulation Evasion (On-Chain) | CRITICAL | patterns/niche-exploits/EP-111-toctou-simulation-evasion-on-chain.md |
| EP-112 | Validator MEV Sandwich Extraction | INFO | patterns/niche-exploits/EP-112-validator-mev-sandwich-extraction.md |
| EP-113 | Frontend/DNS Hijack Attack | CRITICAL | patterns/niche-exploits/EP-113-frontend-dns-hijack-attack.md |

## Cross-Chain Lessons
| EP | Name | Severity | File |
|----|------|----------|------|
| EP-114 | Flash Loan Governance Takeover | CRITICAL | patterns/cross-chain/EP-114-flash-loan-governance-takeover.md |
| EP-115 | Donation/Reserve Function Solvency Bypass | CRITICAL | patterns/cross-chain/EP-115-donation-reserve-function-solvency-bypass.md |
| EP-116 | Vault Share Price Manipulation via Donation | HIGH | patterns/cross-chain/EP-116-vault-share-price-manipulation-via-donation.md |
| EP-117 | Upgrade Initialization Gap | CRITICAL | patterns/cross-chain/EP-117-upgrade-initialization-gap.md |
| EP-118 | Flash Loan Account State Migration Bypass | CRITICAL | patterns/cross-chain/EP-118-flash-loan-account-state-migration-bypass.md |

## Protocol-Specific Patterns
| EP | Name | Severity | File |
|----|------|----------|------|
| EP-119 | Fee/Revenue Destination Account Hijacking | HIGH | patterns/protocol-specific/EP-119-fee-revenue-destination-account-hijacking.md |
| EP-120 | Oracle Write-Lock Arbitrage Prevention (Solana-Specific) | CRITICAL | patterns/protocol-specific/EP-120-oracle-write-lock-arbitrage-prevention-solana-specific.md |
| EP-121 | Legacy Keyset / Guardian Set Expiration Bypass | CRITICAL | patterns/protocol-specific/EP-121-legacy-keyset-guardian-set-expiration-bypass.md |
| EP-122 | Programmable Asset Rule Bypass via Alternative Execution Path | CRITICAL | patterns/protocol-specific/EP-122-programmable-asset-rule-bypass-via-alternative-execution-path.md |

## Infrastructure & Verification Patterns
| EP | Name | Severity | File |
|----|------|----------|------|
| EP-123 | Ed25519 Instruction Sysvar Offset Manipulation | CRITICAL | patterns/infrastructure/EP-123-ed25519-instruction-sysvar-offset-manipulation.md |
| EP-124 | Validator Client Crash Chain (Network-Level DoS) | CRITICAL | patterns/infrastructure/EP-124-validator-client-crash-chain-network-level-dos.md |
| EP-125 | Multi-Client Consensus Divergence | CRITICAL | patterns/infrastructure/EP-125-multi-client-consensus-divergence.md |

## Gap Analysis Patterns
| EP | Name | Severity | File |
|----|------|----------|------|
| EP-126 | Multisig / ACL Role Escalation | CRITICAL | patterns/gap-analysis/EP-126-multisig-acl-role-escalation.md |
| EP-127 | Perpetual DEX Attack Patterns | HIGH | patterns/gap-analysis/EP-127-perpetual-dex-attack-patterns.md |
| EP-128 | Third-Party Service Authority Hijack (Staking/Custody API) | CRITICAL | patterns/gap-analysis/EP-128-third-party-service-authority-hijack-staking-custody-api.md |
