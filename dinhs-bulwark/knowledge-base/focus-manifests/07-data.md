# Focus Manifest: Data Security
<!-- Lists KB files for this category's auditor agents to load. -->
<!-- Agent reads this manifest to know which pattern files + core reference to include in context. -->

## Core Patterns (always load)

### Data Security (OC-156–185)
- patterns/data/OC-156-database-connection-without-tls.md
- patterns/data/OC-157-database-credentials-hardcoded.md
- patterns/data/OC-158-connection-pool-exhaustion-vulnerability.md
- patterns/data/OC-159-sensitive-data-stored-unencrypted.md
- patterns/data/OC-160-database-user-with-excessive-privileges.md
- patterns/data/OC-161-migration-with-destructive-operation.md
- patterns/data/OC-162-redis-memcached-without-authentication.md
- patterns/data/OC-163-cache-poisoning-via-user-controlled-key.md
- patterns/data/OC-164-sensitive-data-cached-without-ttl.md
- patterns/data/OC-165-cache-key-collision-predictability.md
- patterns/data/OC-166-deserialization-of-cached-objects.md
- patterns/data/OC-167-unrestricted-file-type-upload.md
- patterns/data/OC-168-file-size-limit-missing-or-too-large.md
- patterns/data/OC-169-server-side-file-execution-via-upload.md
- patterns/data/OC-170-stored-xss-via-uploaded-html-svg.md
- patterns/data/OC-171-s3-bucket-acl-misconfiguration.md
- patterns/data/OC-172-sensitive-data-in-application-logs.md
- patterns/data/OC-173-stack-traces-exposed-to-users.md
- patterns/data/OC-174-debug-mode-enabled-in-production.md
- patterns/data/OC-175-source-maps-served-in-production.md
- patterns/data/OC-176-log-injection-enabling-log-forging.md
- patterns/data/OC-177-weak-encryption-algorithm.md
- patterns/data/OC-178-hardcoded-encryption-key-or-iv.md
- patterns/data/OC-179-iv-nonce-reuse-in-encryption.md
- patterns/data/OC-180-missing-encryption-for-data-at-rest.md
- patterns/data/OC-181-pii-stored-without-encryption.md
- patterns/data/OC-182-pii-in-logs-or-error-messages.md
- patterns/data/OC-183-no-data-retention-deletion-policy.md
- patterns/data/OC-184-user-data-export-without-authorization.md
- patterns/data/OC-185-right-to-deletion-not-implemented.md

## Cross-Cutting Patterns (load if relevant)

### Secrets — credentials / logging overlap (OC-012, OC-172)
- patterns/secrets/OC-011-secret-in-url-query-parameter.md
- patterns/secrets/OC-012-plaintext-password-in-database.md

### Injection — log injection / deserialization overlap
- patterns/injection/OC-066-prototype-pollution-via-deep-merge.md
- patterns/injection/OC-068-yaml-deserialization-rce.md
- patterns/injection/OC-077-log-injection.md

### Infrastructure — S3 / storage overlap (OC-171)
- patterns/infrastructure/OC-219-public-s3-bucket-storage.md

## Core Reference (always load)
- core/common-false-positives.md
- core/secure-patterns.md
- core/severity-calibration.md

## AI Pitfalls (always load)
- ai-pitfalls/data.md
