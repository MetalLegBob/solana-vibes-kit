# Focus Manifest: API & Network
<!-- Lists KB files for this category's auditor agents to load. -->
<!-- Agent reads this manifest to know which pattern files + core reference to include in context. -->

## Core Patterns (always load)

### API & Network (OC-131–155)
- patterns/api-network/OC-131-mass-assignment-over-posting.md
- patterns/api-network/OC-132-verbose-error-messages-leaking-internals.md
- patterns/api-network/OC-133-missing-rate-limiting-on-sensitive-endpoint.md
- patterns/api-network/OC-134-response-data-over-exposure.md
- patterns/api-network/OC-135-no-request-body-size-limit.md
- patterns/api-network/OC-136-graphql-introspection-in-production.md
- patterns/api-network/OC-137-graphql-query-depth-unlimited.md
- patterns/api-network/OC-138-graphql-batching-attack.md
- patterns/api-network/OC-139-graphql-field-level-authorization-missing.md
- patterns/api-network/OC-140-websocket-without-authentication.md
- patterns/api-network/OC-141-websocket-message-validation-missing.md
- patterns/api-network/OC-142-websocket-broadcast-channel-authorization.md
- patterns/api-network/OC-143-websocket-connection-flooding.md
- patterns/api-network/OC-144-webhook-signature-not-verified.md
- patterns/api-network/OC-145-webhook-replay-attack.md
- patterns/api-network/OC-146-webhook-handler-not-idempotent.md
- patterns/api-network/OC-147-ssrf-via-user-configurable-webhook-url.md
- patterns/api-network/OC-148-webhook-timing-attack-in-signature-comparison.md
- patterns/api-network/OC-149-email-header-injection-crlf.md
- patterns/api-network/OC-150-sms-injection-premium-number-abuse.md
- patterns/api-network/OC-151-notification-content-spoofing.md
- patterns/api-network/OC-152-no-rate-limit-on-notification-sending.md
- patterns/api-network/OC-153-api-versioning-exposes-deprecated-vulnerable-code.md
- patterns/api-network/OC-154-pagination-allowing-full-database-dump.md
- patterns/api-network/OC-155-graphql-subscription-without-auth.md

## Cross-Cutting Patterns (load if relevant)

### Injection — GraphQL injection overlap (OC-080)
- patterns/injection/OC-080-graphql-injection-via-batching.md
- patterns/injection/OC-057-ssrf-to-cloud-metadata.md
- patterns/injection/OC-058-ssrf-to-internal-services.md

### Authentication & Authorization — API key / token overlap
- patterns/auth/OC-040-missing-authorization-on-endpoint.md
- patterns/auth/OC-045-api-key-in-url.md
- patterns/auth/OC-047-token-not-scoped-to-minimum-permissions.md

### Error Handling — rate limiting overlap (OC-133)
- patterns/error-handling/OC-278-missing-rate-limit-on-auth-endpoint.md
- patterns/error-handling/OC-280-request-body-size-unlimited.md

## Core Reference (always load)
- core/common-false-positives.md
- core/secure-patterns.md
- core/severity-calibration.md

## AI Pitfalls (always load)
- ai-pitfalls/api-network.md
