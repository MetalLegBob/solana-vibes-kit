# Focus Manifest: Authentication & Authorization
<!-- Lists KB files for this category's auditor agents to load. -->
<!-- Agent reads this manifest to know which pattern files + core reference to include in context. -->

## Core Patterns (always load)

### Authentication & Authorization (OC-021–048)
- patterns/auth/OC-021-jwt-algorithm-confusion.md
- patterns/auth/OC-022-jwt-secret-in-source-code.md
- patterns/auth/OC-023-missing-jwt-expiry-validation.md
- patterns/auth/OC-024-jwt-audience-issuer-not-validated.md
- patterns/auth/OC-025-weak-password-hashing.md
- patterns/auth/OC-026-bcrypt-with-insufficient-rounds.md
- patterns/auth/OC-027-oauth-redirect-uri-validation-bypass.md
- patterns/auth/OC-028-oauth-state-parameter-missing.md
- patterns/auth/OC-029-brute-force-on-login-with-no-rate-limit.md
- patterns/auth/OC-030-account-enumeration-via-error-messages.md
- patterns/auth/OC-031-account-enumeration-via-timing.md
- patterns/auth/OC-032-session-fixation.md
- patterns/auth/OC-033-session-token-insufficient-entropy.md
- patterns/auth/OC-034-missing-httponly-flag-on-session-cookie.md
- patterns/auth/OC-035-missing-secure-flag-on-session-cookie.md
- patterns/auth/OC-036-missing-samesite-attribute-on-cookies.md
- patterns/auth/OC-037-session-not-invalidated-on-logout.md
- patterns/auth/OC-038-session-not-invalidated-on-password-change.md
- patterns/auth/OC-039-concurrent-session-handling-gaps.md
- patterns/auth/OC-040-missing-authorization-on-endpoint.md
- patterns/auth/OC-041-horizontal-privilege-escalation-idor.md
- patterns/auth/OC-042-vertical-privilege-escalation.md
- patterns/auth/OC-043-authorization-check-only-on-frontend.md
- patterns/auth/OC-044-role-bypass-via-parameter-manipulation.md
- patterns/auth/OC-045-api-key-in-url.md
- patterns/auth/OC-046-refresh-token-reuse-without-rotation.md
- patterns/auth/OC-047-token-not-scoped-to-minimum-permissions.md
- patterns/auth/OC-048-mfa-bypass-via-fallback-mechanism.md

## Cross-Cutting Patterns (load if relevant)

### API & Network — authorization overlap (OC-040–044)
- patterns/api-network/OC-131-mass-assignment-over-posting.md
- patterns/api-network/OC-139-graphql-field-level-authorization-missing.md
- patterns/api-network/OC-140-websocket-without-authentication.md
- patterns/api-network/OC-155-graphql-subscription-without-auth.md

### Web Application Security — CSRF / cookie overlap (OC-028, OC-095–098)
- patterns/web/OC-095-csrf-on-state-changing-endpoint.md
- patterns/web/OC-096-csrf-token-not-validated-server-side.md
- patterns/web/OC-104-cookie-scope-too-broad.md

## Core Reference (always load)
- core/common-false-positives.md
- core/secure-patterns.md
- core/severity-calibration.md

## AI Pitfalls (always load)
- ai-pitfalls/auth.md
