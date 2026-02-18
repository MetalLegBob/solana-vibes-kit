# Focus Manifest: Blockchain Interaction
<!-- Lists KB files for this category's auditor agents to load. -->
<!-- Agent reads this manifest to know which pattern files + core reference to include in context. -->

## Core Patterns (always load)

### Blockchain Interaction (OC-106–130)
- patterns/blockchain/OC-106-transaction-instruction-injection.md
- patterns/blockchain/OC-107-transaction-reordering-before-signing.md
- patterns/blockchain/OC-108-missing-simulation-before-submission.md
- patterns/blockchain/OC-109-simulation-result-not-validated.md
- patterns/blockchain/OC-110-partial-signing-vulnerability.md
- patterns/blockchain/OC-111-transaction-content-not-shown-to-user.md
- patterns/blockchain/OC-112-compute-budget-manipulation.md
- patterns/blockchain/OC-113-rpc-endpoint-spoofing.md
- patterns/blockchain/OC-114-rpc-response-used-in-security-decision.md
- patterns/blockchain/OC-115-no-rpc-failover.md
- patterns/blockchain/OC-116-stale-rpc-data-in-financial-decision.md
- patterns/blockchain/OC-117-processed-commitment-for-financial-operations.md
- patterns/blockchain/OC-118-wallet-adapter-event-injection.md
- patterns/blockchain/OC-119-message-signing-misuse-replay.md
- patterns/blockchain/OC-120-wallet-spoofing-fake-wallet-injection.md
- patterns/blockchain/OC-121-missing-nonce-in-sign-in-with-solana.md
- patterns/blockchain/OC-122-on-chain-off-chain-state-desync.md
- patterns/blockchain/OC-123-double-processing-of-blockchain-events.md
- patterns/blockchain/OC-124-missing-reorg-handling-in-indexer.md
- patterns/blockchain/OC-125-websocket-reconnection-loses-events.md
- patterns/blockchain/OC-126-commitment-level-mismatch-between-read-and-act.md
- patterns/blockchain/OC-127-frontrunnable-transaction-no-mev-protection.md
- patterns/blockchain/OC-128-sandwich-attack-on-swap.md
- patterns/blockchain/OC-129-hardcoded-slippage-too-high.md
- patterns/blockchain/OC-130-off-chain-pda-derivation-mismatch.md

## Cross-Cutting Patterns (load if relevant)

### Automation & Bots — MEV / sandwich overlap (OC-253, OC-258)
- patterns/automation/OC-253-hardcoded-slippage-in-trading-bot.md
- patterns/automation/OC-254-oracle-price-without-staleness-check.md
- patterns/automation/OC-258-bot-sandwichable-transaction.md
- patterns/automation/OC-265-keeper-operating-on-stale-state.md

### Error Handling — race condition overlap
- patterns/error-handling/OC-271-toctou-race-condition.md
- patterns/error-handling/OC-272-double-spend-via-concurrent-requests.md

## Core Reference (always load)
- core/common-false-positives.md
- core/secure-patterns.md
- core/severity-calibration.md

## AI Pitfalls (always load)
- ai-pitfalls/blockchain.md
