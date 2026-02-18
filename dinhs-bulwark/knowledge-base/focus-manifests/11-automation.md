# Focus Manifest: Automation & Bots
<!-- Lists KB files for this category's auditor agents to load. -->
<!-- Agent reads this manifest to know which pattern files + core reference to include in context. -->

## Core Patterns (always load)

### Automation & Bots (OC-246–265)
- patterns/automation/OC-246-automated-signing-without-approval.md
- patterns/automation/OC-247-no-fund-limit-per-operation.md
- patterns/automation/OC-248-no-kill-switch-emergency-shutdown.md
- patterns/automation/OC-249-infinite-retry-on-failed-operations.md
- patterns/automation/OC-250-fee-escalation-in-retry-loop.md
- patterns/automation/OC-251-no-monitoring-alerting-on-failures.md
- patterns/automation/OC-252-non-idempotent-automated-operation.md
- patterns/automation/OC-253-hardcoded-slippage-in-trading-bot.md
- patterns/automation/OC-254-oracle-price-without-staleness-check.md
- patterns/automation/OC-255-no-maximum-trade-size-limit.md
- patterns/automation/OC-256-no-loss-limit-circuit-breaker.md
- patterns/automation/OC-257-exchange-api-key-with-withdrawal-permission.md
- patterns/automation/OC-258-bot-sandwichable-transaction.md
- patterns/automation/OC-259-poison-message-in-queue-no-dlq.md
- patterns/automation/OC-260-message-processed-multiple-times.md
- patterns/automation/OC-261-queue-without-authentication.md
- patterns/automation/OC-262-unbounded-message-size.md
- patterns/automation/OC-263-message-ordering-assumption-violation.md
- patterns/automation/OC-264-cron-job-overlap-no-lock.md
- patterns/automation/OC-265-keeper-operating-on-stale-state.md

## Cross-Cutting Patterns (load if relevant)

### Blockchain — MEV / slippage / sandwich overlap (OC-127–129)
- patterns/blockchain/OC-127-frontrunnable-transaction-no-mev-protection.md
- patterns/blockchain/OC-128-sandwich-attack-on-swap.md
- patterns/blockchain/OC-129-hardcoded-slippage-too-high.md
- patterns/blockchain/OC-122-on-chain-off-chain-state-desync.md
- patterns/blockchain/OC-123-double-processing-of-blockchain-events.md

### Error Handling — race condition / idempotency overlap
- patterns/error-handling/OC-271-toctou-race-condition.md
- patterns/error-handling/OC-272-double-spend-via-concurrent-requests.md

## Core Reference (always load)
- core/common-false-positives.md
- core/secure-patterns.md
- core/severity-calibration.md

## AI Pitfalls (always load)
- ai-pitfalls/automation.md
