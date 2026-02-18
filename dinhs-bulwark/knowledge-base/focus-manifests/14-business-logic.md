# Focus Manifest: Business Logic
<!-- Lists KB files for this category's auditor agents to load. -->
<!-- Agent reads this manifest to know which pattern files + core reference to include in context. -->

## Core Patterns (always load)

### Business Logic (OC-299–312)
- patterns/business-logic/OC-299-state-machine-bypass.md
- patterns/business-logic/OC-300-business-rules-enforced-only-on-frontend.md
- patterns/business-logic/OC-301-negative-quantity-amount-accepted.md
- patterns/business-logic/OC-302-coupon-discount-stacking-abuse.md
- patterns/business-logic/OC-303-feature-flag-enabling-admin-functionality.md
- patterns/business-logic/OC-304-order-of-operations-not-enforced.md
- patterns/business-logic/OC-305-floating-point-for-financial-calculations.md
- patterns/business-logic/OC-306-rounding-error-accumulation.md
- patterns/business-logic/OC-307-integer-overflow-in-amount-calculation.md
- patterns/business-logic/OC-308-double-spend-via-non-atomic-balance-check.md
- patterns/business-logic/OC-309-fee-calculation-manipulation.md
- patterns/business-logic/OC-310-currency-conversion-precision-loss.md
- patterns/business-logic/OC-311-negative-amount-handling.md
- patterns/business-logic/OC-312-reward-yield-calculation-overflow.md

## Cross-Cutting Patterns (load if relevant)

### Error Handling — race condition / double-spend overlap (OC-271–273)
- patterns/error-handling/OC-271-toctou-race-condition.md
- patterns/error-handling/OC-272-double-spend-via-concurrent-requests.md
- patterns/error-handling/OC-273-race-condition-in-balance-check-and-deduction.md
- patterns/error-handling/OC-276-database-transaction-isolation-too-low.md

### Authentication — authorization bypass / frontend-only check overlap
- patterns/auth/OC-040-missing-authorization-on-endpoint.md
- patterns/auth/OC-041-horizontal-privilege-escalation-idor.md
- patterns/auth/OC-043-authorization-check-only-on-frontend.md

### Blockchain — commitment / state desync overlap
- patterns/blockchain/OC-122-on-chain-off-chain-state-desync.md
- patterns/blockchain/OC-123-double-processing-of-blockchain-events.md

## Core Reference (always load)
- core/common-false-positives.md
- core/secure-patterns.md
- core/severity-calibration.md

## AI Pitfalls (always load)
- ai-pitfalls/business-logic.md
