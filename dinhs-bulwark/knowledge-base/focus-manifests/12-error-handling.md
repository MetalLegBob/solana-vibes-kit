# Focus Manifest: Error Handling & Resilience
<!-- Lists KB files for this category's auditor agents to load. -->
<!-- Agent reads this manifest to know which pattern files + core reference to include in context. -->

## Core Patterns (always load)

### Error Handling & Resilience (OC-266–285)
- patterns/error-handling/OC-266-fail-open-error-handling.md
- patterns/error-handling/OC-267-swallowed-exception-hiding-security-failure.md
- patterns/error-handling/OC-268-unhandled-promise-rejection.md
- patterns/error-handling/OC-269-missing-global-error-handler.md
- patterns/error-handling/OC-270-error-recovery-skipping-security-checks.md
- patterns/error-handling/OC-271-toctou-race-condition.md
- patterns/error-handling/OC-272-double-spend-via-concurrent-requests.md
- patterns/error-handling/OC-273-race-condition-in-balance-check-and-deduction.md
- patterns/error-handling/OC-274-file-access-race-condition.md
- patterns/error-handling/OC-275-cache-invalidation-race.md
- patterns/error-handling/OC-276-database-transaction-isolation-too-low.md
- patterns/error-handling/OC-277-shared-mutable-state-without-synchronization.md
- patterns/error-handling/OC-278-missing-rate-limit-on-auth-endpoint.md
- patterns/error-handling/OC-279-redos-regular-expression-dos.md
- patterns/error-handling/OC-280-request-body-size-unlimited.md
- patterns/error-handling/OC-281-connection-pool-exhaustion.md
- patterns/error-handling/OC-282-cpu-exhaustion-via-complex-operation.md
- patterns/error-handling/OC-283-no-timeout-on-external-api-calls.md
- patterns/error-handling/OC-284-algorithmic-complexity-attack.md
- patterns/error-handling/OC-285-memory-exhaustion-via-large-payload.md

## Cross-Cutting Patterns (load if relevant)

### Authentication — rate limiting overlap (OC-029)
- patterns/auth/OC-029-brute-force-on-login-with-no-rate-limit.md

### API & Network — rate limiting / body size overlap (OC-133, OC-135)
- patterns/api-network/OC-133-missing-rate-limiting-on-sensitive-endpoint.md
- patterns/api-network/OC-135-no-request-body-size-limit.md
- patterns/api-network/OC-143-websocket-connection-flooding.md

### Data — verbose error / stack trace overlap
- patterns/data/OC-173-stack-traces-exposed-to-users.md
- patterns/data/OC-174-debug-mode-enabled-in-production.md

## Core Reference (always load)
- core/common-false-positives.md
- core/secure-patterns.md
- core/severity-calibration.md

## AI Pitfalls (always load)
- ai-pitfalls/error-handling.md
